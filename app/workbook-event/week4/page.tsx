'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  MapPin,
  Info,
  Building,
  Home,
  Coffee,
  Zap,
  Music,
  X,
  Plus,
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { useWorkbookStorage } from '@/hooks/useWorkbookStorage'
import { useWorkbookNavigation } from '@/hooks/useWorkbookNavigation'
import { useProjectSettings } from '@/hooks/useProjectSettings'
import { useProjectSummary } from '@/hooks/useProjectSummary'
import { WorkbookHeader } from '@/components/workbook/WorkbookHeader'
import { WorkbookFooter } from '@/components/workbook/WorkbookFooter'
import { WorkbookNavigation } from '@/components/workbook/WorkbookNavigation'
import { ProjectSettingsModal } from '@/components/workbook/ProjectSettingsModal'
import { ProjectSummaryModal } from '@/components/workbook/ProjectSummaryModal'
import { WorkbookStatusBar } from '@/components/WorkbookStatusBar'
import { useProjectAccess } from '@/hooks/useProjectAccess'

export const dynamic = 'force-dynamic'

// 공간 타입 옵션
const VENUE_TYPES = [
  { id: 'indoor_convention', label: '실내 (컨벤션/홀)', icon: Building },
  { id: 'outdoor_park', label: '야외 (공원/광장)', icon: MapPin },
  { id: 'cafe_complex', label: '카페/복합문화공간', icon: Coffee },
  { id: 'gym', label: '체육관', icon: Zap },
  { id: 'popup_space', label: '팝업 전용 공간', icon: Home },
  { id: 'other', label: '기타', icon: Music },
]

// 물리적 제약 사항 옵션
const CONSTRAINT_OPTIONS = [
  '소음 제한',
  '전기 용량 부족',
  '주차 불가',
  '화기 사용 금지',
  '층고 제한',
  '반입구 크기 제한',
  '온도 조절 불가',
  '통풍 불량',
  '화장실 부족',
  '날씨 영향',
  '기타',
]

interface EventWeek4Data {
  basicInfo: {
    eventName: string // 행사명(가제)
    concept: string // 한 줄 컨셉
    startDate: string // 시작일
    endDate: string // 종료일
    operatingHours: string // 운영 시간 (예: "10:00 - 22:00")
    eventType: string // 행사 유형 (1회차에서 불러오기)
    eventGoals: string[] // 행사 목적 (1회차에서 불러오기)
  }
  kpi: {
    targetVisitors: string // 모객 목표
    targetRevenue: string // 매출 목표
    targetViral: string // 바이럴 목표
    expectedEffect: string // 기대 효과 (정성 목표)
  }
  venue: {
    type: string // 공간 타입
    area: string // 면적 (평)
    areaM2: string // 면적 (㎡)
    capacity: string // 수용 인원
    budgetCap: string // 총 예산 범위
    constraints: string[] // 물리적 제약 사항
    customConstraint: string // 기타 제약 사항
  }
  is_submitted?: boolean
}

function EventWeek4PageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''

  // 권한 검증
  useProjectAccess(projectId)

  // Hooks
  const { loadStepData, saveStepData, submitStep, loading: storageLoading } = useWorkbookStorage(
    projectId
  )
  const {
    isScrolled,
    allSteps,
    loadSteps,
    getWeekTitle,
    getStepStatus: getBaseStepStatus,
    getPhaseProgress: getBasePhaseProgress,
    getOverallProgress: getBaseOverallProgress,
    registerProgressCalculator,
  } = useWorkbookNavigation(projectId)
  const {
    projectInfo,
    loadProjectInfo,
    updateProjectTitle,
    deleteProject,
    updateTeamMembers,
    hideProject,
    unhideProject,
  } = useProjectSettings(projectId)
  const { generateSummary } = useProjectSummary()

  // State
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')

  // 1회차 데이터 (행사 유형/목적)
  const [eventTypeFromWeek1, setEventTypeFromWeek1] = useState('')
  const [eventGoalsFromWeek1, setEventGoalsFromWeek1] = useState<string[]>([])

  // 3회차 레퍼런스 데이터 (툴팁용)
  const [referenceData, setReferenceData] = useState<any>(null)
  const [showReferenceTooltip, setShowReferenceTooltip] = useState<string | null>(null)

  // 행사 기본 정보
  const [basicInfo, setBasicInfo] = useState({
    eventName: '',
    concept: '',
    startDate: '',
    endDate: '',
    operatingHours: '',
    eventType: '',
    eventGoals: [] as string[],
  })

  // 목표 설정 (KPI)
  const [kpi, setKpi] = useState({
    targetVisitors: '',
    targetRevenue: '',
    targetViral: '',
    expectedEffect: '',
  })

  // 환경 및 공간 분석
  const [venue, setVenue] = useState({
    type: '',
    area: '',
    areaM2: '',
    capacity: '',
    budgetCap: '',
    constraints: [] as string[],
    customConstraint: '',
  })

  // 면적 환산 함수 (평 → ㎡)
  const convertAreaToM2 = (pyeong: string) => {
    const num = parseFloat(pyeong.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) return ''
    return (num * 3.3058).toFixed(2)
  }

  // 면적 환산 함수 (㎡ → 평)
  const convertAreaToPyeong = (m2: string) => {
    const num = parseFloat(m2.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) return ''
    return (num / 3.3058).toFixed(2)
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 기본 정보
    total += 5
    if (basicInfo.eventName.trim()) filled += 1
    if (basicInfo.concept.trim()) filled += 1
    if (basicInfo.startDate.trim()) filled += 1
    if (basicInfo.endDate.trim()) filled += 1
    if (basicInfo.operatingHours.trim()) filled += 1

    // KPI
    total += 4
    if (kpi.targetVisitors.trim()) filled += 1
    if (kpi.targetRevenue.trim()) filled += 1
    if (kpi.targetViral.trim()) filled += 1
    if (kpi.expectedEffect.trim()) filled += 1

    // 공간 분석
    total += 4
    if (venue.type.trim()) filled += 1
    if (venue.area.trim() || venue.areaM2.trim()) filled += 1
    if (venue.capacity.trim()) filled += 1
    if (venue.budgetCap.trim()) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(4 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.basicInfo) {
        total += 5
        if (data.basicInfo.eventName?.trim()) filled += 1
        if (data.basicInfo.concept?.trim()) filled += 1
        if (data.basicInfo.startDate?.trim()) filled += 1
        if (data.basicInfo.endDate?.trim()) filled += 1
        if (data.basicInfo.operatingHours?.trim()) filled += 1
      } else {
        total += 5
      }

      if (data.kpi) {
        total += 4
        if (data.kpi.targetVisitors?.trim()) filled += 1
        if (data.kpi.targetRevenue?.trim()) filled += 1
        if (data.kpi.targetViral?.trim()) filled += 1
        if (data.kpi.expectedEffect?.trim()) filled += 1
      } else {
        total += 4
      }

      if (data.venue) {
        total += 4
        if (data.venue.type?.trim()) filled += 1
        if (data.venue.area?.trim() || data.venue.areaM2?.trim()) filled += 1
        if (data.venue.capacity?.trim()) filled += 1
        if (data.venue.budgetCap?.trim()) filled += 1
      } else {
        total += 4
      }

      return total > 0 ? Math.round((filled / total) * 100) : 0
    })
  }, [registerProgressCalculator])

  // 저장
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const eventData: EventWeek4Data = {
      basicInfo: {
        ...basicInfo,
        eventType: eventTypeFromWeek1,
        eventGoals: eventGoalsFromWeek1,
      },
      kpi,
      venue,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(4, eventData, progress)

      if (success) {
        setToastMessage('임시 저장되었습니다.')
        setToastVisible(true)
        loadSteps()
      } else {
        setToastMessage('저장 중 오류가 발생했습니다.')
        setToastVisible(true)
      }
    } catch (error: any) {
      console.error('저장 오류:', error)
      setToastMessage('저장 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  // 제출
  const handleSubmit = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    if (
      !confirm(
        isSubmitted
          ? '워크북 제출을 회수하시겠습니까?'
          : '워크북을 제출하시겠습니까?\n제출 후에는 수정이 제한됩니다.'
      )
    ) {
      return
    }

    const eventData: EventWeek4Data = {
      basicInfo: {
        ...basicInfo,
        eventType: eventTypeFromWeek1,
        eventGoals: eventGoalsFromWeek1,
      },
      kpi,
      venue,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(4, eventData, newSubmittedState, progress)

    if (success) {
      setIsSubmitted(newSubmittedState)
      setToastMessage(
        newSubmittedState ? '워크북이 제출되었습니다.' : '제출이 회수되었습니다.'
      )
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('처리 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  // 초기화
  const handleReset = () => {
    if (!confirm('모든 입력 내용을 초기화하시겠습니까?')) return

    setBasicInfo({
      eventName: '',
      concept: '',
      startDate: '',
      endDate: '',
      operatingHours: '',
      eventType: '',
      eventGoals: [],
    })
    setKpi({
      targetVisitors: '',
      targetRevenue: '',
      targetViral: '',
      expectedEffect: '',
    })
    setVenue({
      type: '',
      area: '',
      areaM2: '',
      capacity: '',
      budgetCap: '',
      constraints: [],
      customConstraint: '',
    })
    setIsSubmitted(false)
  }

  // 프로젝트 설정
  const handleUpdateProjectTitle = async () => {
    const success = await updateProjectTitle(newProjectTitle)
    if (success) {
      setShowSettings(false)
      setToastMessage('프로젝트명이 변경되었습니다.')
      setToastVisible(true)
    } else {
      setToastMessage('프로젝트명 변경 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    const success = await deleteProject()
    if (success) {
      router.push('/dashboard')
    } else {
      setToastMessage('프로젝트 삭제 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  // 프로젝트 요약
  const handleProjectSummary = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const summary = await generateSummary(projectId, projectInfo?.title || null)
    if (summary) {
      setSummaryPrompt(summary)
      setShowProjectSummary(true)
    } else {
      setToastMessage('워크북 데이터가 없습니다.')
      setToastVisible(true)
    }
  }

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryPrompt)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('복사 실패')
      setToastVisible(true)
    }
  }

  // 1회차 데이터 로드 (행사 유형/목적)
  useEffect(() => {
    const loadWeek1Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(1)
        if (data && (data as any).eventCriteria) {
          const week1Data = data as any
          if (week1Data.eventCriteria.type) {
            setEventTypeFromWeek1(week1Data.eventCriteria.type)
            setBasicInfo((prev) => ({ ...prev, eventType: week1Data.eventCriteria.type }))
          }
          if (week1Data.eventCriteria.goals && Array.isArray(week1Data.eventCriteria.goals)) {
            setEventGoalsFromWeek1(week1Data.eventCriteria.goals)
            setBasicInfo((prev) => ({ ...prev, eventGoals: week1Data.eventCriteria.goals }))
          }
        }
      } catch (error) {
        console.error('1회차 데이터 로드 오류:', error)
      }
    }

    loadWeek1Data()
  }, [projectId, loadStepData])

  // 3회차 레퍼런스 데이터 로드
  useEffect(() => {
    const loadWeek3Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(3)
        if (data && (data as any).references) {
          setReferenceData(data)
        }
      } catch (error) {
        console.error('3회차 데이터 로드 오류:', error)
      }
    }

    loadWeek3Data()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(4)
      if (data) {
        const eventData = data as EventWeek4Data
        if (eventData.basicInfo) {
          setBasicInfo({
            ...eventData.basicInfo,
            eventType: eventData.basicInfo.eventType || eventTypeFromWeek1,
            eventGoals: eventData.basicInfo.eventGoals || eventGoalsFromWeek1,
          })
        }
        if (eventData.kpi) {
          setKpi(eventData.kpi)
        }
        if (eventData.venue) {
          setVenue(eventData.venue)
        }
        if (eventData.is_submitted !== undefined) {
          setIsSubmitted(eventData.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps, eventTypeFromWeek1, eventGoalsFromWeek1])

  // 실시간 업데이트 구독
  useEffect(() => {
    if (!projectId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`project-steps-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_steps',
          filter: `project_id=eq.${projectId}&step_number=eq.4`,
        },
        async () => {
          const data = await loadStepData(4)
          if (data) {
            const eventData = data as EventWeek4Data
            if (eventData.basicInfo) {
              setBasicInfo({
                ...eventData.basicInfo,
                eventType: eventData.basicInfo.eventType || eventTypeFromWeek1,
                eventGoals: eventData.basicInfo.eventGoals || eventGoalsFromWeek1,
              })
            }
            if (eventData.kpi) {
              setKpi(eventData.kpi)
            }
            if (eventData.venue) {
              setVenue(eventData.venue)
            }
            if (eventData.is_submitted !== undefined) {
              setIsSubmitted(eventData.is_submitted)
            }
          }
          loadSteps()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, loadStepData, loadProjectInfo, loadSteps, eventTypeFromWeek1, eventGoalsFromWeek1])

  const progress = calculateProgress()
  const readonly = isSubmitted

  // 이벤트 워크북용 회차 제목
  const getEventWeekTitle = useCallback((week: number): string => {
    const eventTitles: { [key: number]: string } = {
      1: 'Phase 1 - 행사 방향성 설정 및 트렌드 헌팅',
      2: 'Phase 1 - 타겟 페르소나',
      3: 'Phase 1 - 레퍼런스 벤치마킹 및 정량 분석',
      4: 'Phase 1 - 행사 개요 및 환경 분석',
      5: 'Phase 2 - 세계관 및 스토리텔링',
      6: 'Phase 2 - 방문객 여정 지도',
      7: 'Phase 2 - 킬러 콘텐츠 및 바이럴 기획',
      8: 'Phase 2 - 마스터 플랜',
      9: 'Phase 3 - 행사 브랜딩',
      10: 'Phase 3 - 공간 조감도',
      11: 'Phase 3 - D-Day 통합 실행 계획',
      12: 'Phase 3 - 최종 피칭 및 검증',
    }
    return eventTitles[week] || `${week}회차`
  }, [])

  const getStepStatus = (weekNumber: number) => {
    return getBaseStepStatus(weekNumber)
  }

  const getPhaseProgress = (phase: number) => {
    return getBasePhaseProgress(phase as 1 | 2 | 3)
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress()
  }

  // 레퍼런스 데이터 평균 계산
  const getReferenceAverage = (field: 'visitors' | 'revenue' | 'viral') => {
    if (!referenceData || !referenceData.references || !Array.isArray(referenceData.references)) {
      return null
    }

    const validRefs = referenceData.references.filter((ref: any) => {
      if (field === 'visitors') {
        return ref.officialVisitors?.trim() || ref.estimatedVisitors?.trim()
      } else if (field === 'revenue') {
        return ref.budget?.trim()
      }
      return false
    })

    if (validRefs.length === 0) return null

    const values = validRefs.map((ref: any) => {
      if (field === 'visitors') {
        return parseFloat(ref.officialVisitors || ref.estimatedVisitors || '0')
      } else if (field === 'revenue') {
        return parseFloat(ref.budget?.replace(/[^0-9.]/g, '') || '0')
      }
      return 0
    })

    const average = values.reduce((a, b) => a + b, 0) / values.length
    return average
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">프로젝트 ID 필요</h3>
              <p className="text-gray-600 text-sm mb-4">
                프로젝트 ID가 제공되지 않았습니다. 대시보드에서 프로젝트를 선택해주세요.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                대시보드로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastMessage.includes('오류') ? 'error' : 'success'}
      />
      <WorkbookHeader
        title="Phase 1: Data - 4회: 행사 개요 및 환경 분석"
        description="행사의 구체적인 스펙과 물리적 제약 조건을 확정하여 현실적인 기획의 기준을 수립합니다."
        phase="Phase 1: Data"
        isScrolled={isScrolled}
        currentWeek={4}
        overallProgress={getOverallProgress()}
        phase1Progress={getPhaseProgress(1)}
        phase2Progress={getPhaseProgress(2)}
        phase3Progress={getPhaseProgress(3)}
        isSubmitted={isSubmitted}
        themeColor="indigo"
      />

      <div className="flex min-h-[calc(100vh-140px)]">
        <WorkbookNavigation
          projectId={projectId}
          currentWeek={4}
          isScrolled={isScrolled}
          projectInfo={projectInfo}
          allSteps={allSteps}
          getWeekTitle={getEventWeekTitle}
          getStepStatus={getStepStatus}
          onSettingsClick={() => {
            setShowSettings(true)
            setNewProjectTitle(projectInfo?.title || '')
          }}
          onProjectSummaryClick={handleProjectSummary}
          themeColor="indigo"
        />

        <ProjectSettingsModal
          isOpen={showSettings}
          projectTitle={projectInfo?.title || ''}
          newProjectTitle={newProjectTitle}
          onClose={() => setShowSettings(false)}
          onTitleChange={setNewProjectTitle}
          onSave={handleUpdateProjectTitle}
          onDelete={handleDeleteProject}
          isTeam={projectInfo?.is_team || false}
          teamCode={projectInfo?.team_code || null}
          memberEmails={projectInfo?.member_emails || []}
          onUpdateTeamMembers={async (emails: string[]) => {
            const success = await updateTeamMembers(emails)
            if (success) {
              await loadProjectInfo()
            }
            return success
          }}
          onHideProject={async () => {
            const success = await hideProject()
            if (success) {
              await loadProjectInfo()
            }
            return success
          }}
          onUnhideProject={async () => {
            const success = await unhideProject()
            if (success) {
              await loadProjectInfo()
            }
            return success
          }}
          isOwner={projectInfo?.is_owner || false}
          isHidden={projectInfo?.is_hidden || false}
        />

        <ProjectSummaryModal
          isOpen={showProjectSummary}
          summaryPrompt={summaryPrompt}
          onClose={() => setShowProjectSummary(false)}
          onCopy={handleCopySummary}
        />

        <main className="flex-1 pb-16">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* 행사 기본 정보 빌더 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">행사 기본 정보 빌더</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    1~3회차 분석 내용을 바탕으로 행사의 정체성을 확정합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 행사명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    행사명(가제) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={basicInfo.eventName}
                    onChange={(e) => setBasicInfo({ ...basicInfo, eventName: e.target.value })}
                    disabled={readonly}
                    placeholder="예: 2024 서울 팝업 페스티벌"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 한 줄 컨셉 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    한 줄 컨셉 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={basicInfo.concept}
                    onChange={(e) => setBasicInfo({ ...basicInfo, concept: e.target.value })}
                    disabled={readonly}
                    placeholder="예: 데이터로 검증된 트렌드를 공간으로 구현하다"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 개최 일정 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    개최 일정 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">시작일</label>
                      <input
                        type="date"
                        value={basicInfo.startDate}
                        onChange={(e) => setBasicInfo({ ...basicInfo, startDate: e.target.value })}
                        disabled={readonly}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">종료일</label>
                      <input
                        type="date"
                        value={basicInfo.endDate}
                        onChange={(e) => setBasicInfo({ ...basicInfo, endDate: e.target.value })}
                        disabled={readonly}
                        min={basicInfo.startDate || undefined}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs text-gray-600 mb-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      운영 시간 (일별)
                    </label>
                    <input
                      type="text"
                      value={basicInfo.operatingHours}
                      onChange={(e) =>
                        setBasicInfo({ ...basicInfo, operatingHours: e.target.value })
                      }
                      disabled={readonly}
                      placeholder="예: 10:00 - 22:00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* 목표 설정 (KPI Dashboard) */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">목표 설정 (KPI Dashboard)</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    행사의 성공 여부를 판단할 수 있는 정량적/정성적 지표를 설정합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 정량 목표 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">정량 목표</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* 모객 목표 */}
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        모객 목표 (명)
                        {getReferenceAverage('visitors') && (
                          <button
                            type="button"
                            onMouseEnter={() => setShowReferenceTooltip('visitors')}
                            onMouseLeave={() => setShowReferenceTooltip(null)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="레퍼런스 평균 확인"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        )}
                      </label>
                      <input
                        type="text"
                        value={kpi.targetVisitors}
                        onChange={(e) => setKpi({ ...kpi, targetVisitors: e.target.value })}
                        disabled={readonly}
                        placeholder="예: 50000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {showReferenceTooltip === 'visitors' && getReferenceAverage('visitors') && (
                        <div className="absolute z-10 mt-2 p-3 bg-indigo-600 text-white text-xs rounded-lg shadow-lg">
                          레퍼런스 평균: 약{' '}
                          {Math.round(getReferenceAverage('visitors')!).toLocaleString()}명
                        </div>
                      )}
                    </div>

                    {/* 매출 목표 */}
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        매출 목표 (만원)
                        {getReferenceAverage('revenue') && (
                          <button
                            type="button"
                            onMouseEnter={() => setShowReferenceTooltip('revenue')}
                            onMouseLeave={() => setShowReferenceTooltip(null)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="레퍼런스 평균 확인"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        )}
                      </label>
                      <input
                        type="text"
                        value={kpi.targetRevenue}
                        onChange={(e) => setKpi({ ...kpi, targetRevenue: e.target.value })}
                        disabled={readonly}
                        placeholder="예: 5000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {showReferenceTooltip === 'revenue' && getReferenceAverage('revenue') && (
                        <div className="absolute z-10 mt-2 p-3 bg-indigo-600 text-white text-xs rounded-lg shadow-lg">
                          레퍼런스 평균 예산: 약{' '}
                          {Math.round(getReferenceAverage('revenue')!).toLocaleString()}만원
                        </div>
                      )}
                    </div>

                    {/* 바이럴 목표 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        바이럴 목표 (게시물 수)
                      </label>
                      <input
                        type="text"
                        value={kpi.targetViral}
                        onChange={(e) => setKpi({ ...kpi, targetViral: e.target.value })}
                        disabled={readonly}
                        placeholder="예: 1000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 정성 목표 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">정성 목표</h4>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    기대 효과
                  </label>
                  <textarea
                    value={kpi.expectedEffect}
                    onChange={(e) => setKpi({ ...kpi, expectedEffect: e.target.value })}
                    disabled={readonly}
                    rows={4}
                    placeholder="예: 브랜드의 영한 이미지를 20대에게 각인시킨다"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* 환경 및 공간 분석 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">환경 및 공간 분석</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    행사가 열릴 물리적 공간의 특성과 제약 사항을 정의합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 공간 타입 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    공간 타입 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {VENUE_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setVenue({ ...venue, type: type.id })}
                          disabled={readonly}
                          className={`p-4 border-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            venue.type === type.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          <Icon className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-xs font-medium">{type.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 규모 입력 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">규모</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        면적 (평)
                      </label>
                      <input
                        type="text"
                        value={venue.area}
                        onChange={(e) => {
                          const newArea = e.target.value
                          setVenue({
                            ...venue,
                            area: newArea,
                            areaM2: convertAreaToM2(newArea),
                          })
                        }}
                        disabled={readonly}
                        placeholder="예: 200"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {venue.area && (
                        <p className="text-xs text-gray-500 mt-1">
                          약 {convertAreaToM2(venue.area)} ㎡
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        면적 (㎡)
                      </label>
                      <input
                        type="text"
                        value={venue.areaM2}
                        onChange={(e) => {
                          const newM2 = e.target.value
                          setVenue({
                            ...venue,
                            areaM2: newM2,
                            area: convertAreaToPyeong(newM2),
                          })
                        }}
                        disabled={readonly}
                        placeholder="예: 661"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {venue.areaM2 && (
                        <p className="text-xs text-gray-500 mt-1">
                          약 {convertAreaToPyeong(venue.areaM2)} 평
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        수용 인원 (명)
                      </label>
                      <input
                        type="text"
                        value={venue.capacity}
                        onChange={(e) => setVenue({ ...venue, capacity: e.target.value })}
                        disabled={readonly}
                        placeholder="예: 500"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 총 예산 범위 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    총 예산 범위 (Budget Cap) <span className="text-red-500">*</span>
                  </label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-yellow-800 flex items-start gap-2">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        이 예산은 이후 8회차(상세 예산 수립)의 기준이 됩니다.
                      </span>
                    </p>
                  </div>
                  <input
                    type="text"
                    value={venue.budgetCap}
                    onChange={(e) => setVenue({ ...venue, budgetCap: e.target.value })}
                    disabled={readonly}
                    placeholder="예: 10000 (만원)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 물리적 제약 사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    물리적 제약 사항
                  </label>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-orange-800 flex items-start gap-2">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        제약 사항은 추후 8회차(공간 조닝) 및 11회차(운영 계획)에서 경고 메시지를 띄우는 기준으로 활용되므로 꼼꼼한 입력을 유도합니다.
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {CONSTRAINT_OPTIONS.map((constraint) => (
                      <button
                        key={constraint}
                        type="button"
                        onClick={() => {
                          const isSelected = venue.constraints.includes(constraint)
                          setVenue({
                            ...venue,
                            constraints: isSelected
                              ? venue.constraints.filter((c) => c !== constraint)
                              : [...venue.constraints, constraint],
                            customConstraint:
                              constraint === '기타' && !isSelected
                                ? venue.customConstraint
                                : constraint === '기타' && isSelected
                                ? ''
                                : venue.customConstraint,
                          })
                        }}
                        disabled={readonly}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          venue.constraints.includes(constraint)
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {constraint}
                      </button>
                    ))}
                  </div>
                  {venue.constraints.includes('기타') && (
                    <div>
                      <input
                        type="text"
                        value={venue.customConstraint}
                        onChange={(e) =>
                          setVenue({ ...venue, customConstraint: e.target.value })
                        }
                        disabled={readonly}
                        placeholder="기타 제약 사항을 입력하세요"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <WorkbookFooter
              progress={progress}
              loading={storageLoading}
              isSubmitted={isSubmitted}
              projectId={projectId}
              readonly={readonly}
              onReset={handleReset}
              onSave={handleSave}
              onSubmit={handleSubmit}
              themeColor="indigo"
            />
          </div>
        </main>
      </div>

      {/* 하단 상태 바 */}
      {projectId && <WorkbookStatusBar projectId={projectId} />}
    </div>
  )
}

export default function EventWeek4Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <EventWeek4PageContent />
    </Suspense>
  )
}

