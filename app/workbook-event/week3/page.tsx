'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Plus,
  X,
  Trash2,
  BarChart3,
  TrendingUp,
  Image as ImageIcon,
  ExternalLink,
  Target,
  DollarSign,
  Users,
  Calendar,
  Square,
  Info,
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

// 핵심 목표 옵션
const CORE_GOALS = [
  '브랜딩(인지도)',
  '판매(매출)',
  '커뮤니티(팬덤)',
  '교육/정보전달',
  '네트워킹',
  '기타',
]

interface ReferenceCard {
  id: number
  name: string // 행사명
  imageUrl: string // 이미지 링크
  coreGoal: string // 핵심 목표
  budget: string // 총 예산 (추정)
  officialVisitors: string // 공개된 방문객 수
  estimatedVisitors: string // 예상 방문객 수
  duration: string // 기간 (일)
  scale: string // 규모 (평)
  pros: string // 배울 점
  cons: string // 아쉬운 점
}

interface EventWeek3Data {
  references: ReferenceCard[]
  swot: {
    strength: string // 강점
    weakness: string // 약점
    opportunity: string // 기회
    threat: string // 위협
  }
  is_submitted?: boolean
}

function EventWeek3PageContent() {
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

  // 레퍼런스 데이터
  const [references, setReferences] = useState<ReferenceCard[]>([
    {
      id: 1,
      name: '',
      imageUrl: '',
      coreGoal: '',
      budget: '',
      officialVisitors: '',
      estimatedVisitors: '',
      duration: '',
      scale: '',
      pros: '',
      cons: '',
    },
  ])

  // SWOT 분석
  const [swot, setSwot] = useState({
    strength: '',
    weakness: '',
    opportunity: '',
    threat: '',
  })

  // 레퍼런스 추가
  const addReference = () => {
    const newId = Math.max(...references.map((r) => r.id), 0) + 1
    setReferences([
      ...references,
      {
        id: newId,
        name: '',
        imageUrl: '',
        coreGoal: '',
        budget: '',
        officialVisitors: '',
        estimatedVisitors: '',
        duration: '',
        scale: '',
        pros: '',
        cons: '',
      },
    ])
  }

  // 레퍼런스 삭제
  const removeReference = (id: number) => {
    if (references.length > 1) {
      setReferences(references.filter((r) => r.id !== id))
    }
  }

  // 레퍼런스 업데이트
  const updateReference = (id: number, field: keyof ReferenceCard, value: string) => {
    setReferences(
      references.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value }
        }
        return r
      })
    )
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 레퍼런스 데이터 (최소 3개 권장)
    references.forEach((ref) => {
      total += 2 // name, coreGoal
      if (ref.name.trim()) filled += 1
      if (ref.coreGoal.trim()) filled += 1

      total += 4 // budget, officialVisitors, estimatedVisitors, duration
      if (ref.budget.trim()) filled += 1
      if (ref.officialVisitors.trim()) filled += 1
      if (ref.estimatedVisitors.trim()) filled += 1
      if (ref.duration.trim()) filled += 1

      total += 2 // pros, cons
      if (ref.pros.trim()) filled += 1
      if (ref.cons.trim()) filled += 1
    })

    // SWOT 분석
    total += 4
    if (swot.strength.trim()) filled += 1
    if (swot.weakness.trim()) filled += 1
    if (swot.opportunity.trim()) filled += 1
    if (swot.threat.trim()) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(3 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.references && Array.isArray(data.references)) {
        data.references.forEach((ref: any) => {
          total += 2
          if (ref.name?.trim()) filled += 1
          if (ref.coreGoal?.trim()) filled += 1

          total += 4
          if (ref.budget?.trim()) filled += 1
          if (ref.officialVisitors?.trim()) filled += 1
          if (ref.estimatedVisitors?.trim()) filled += 1
          if (ref.duration?.trim()) filled += 1

          total += 2
          if (ref.pros?.trim()) filled += 1
          if (ref.cons?.trim()) filled += 1
        })
      } else {
        total += 8 // 최소 1개 레퍼런스 기준
      }

      if (data.swot) {
        total += 4
        if (data.swot.strength?.trim()) filled += 1
        if (data.swot.weakness?.trim()) filled += 1
        if (data.swot.opportunity?.trim()) filled += 1
        if (data.swot.threat?.trim()) filled += 1
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

    const eventData: EventWeek3Data = {
      references,
      swot,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(3, eventData, progress)

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

    const eventData: EventWeek3Data = {
      references,
      swot,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(3, eventData, newSubmittedState, progress)

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

    setReferences([
      {
        id: 1,
        name: '',
        imageUrl: '',
        coreGoal: '',
        budget: '',
        officialVisitors: '',
        estimatedVisitors: '',
        duration: '',
        scale: '',
        pros: '',
        cons: '',
      },
    ])
    setSwot({
      strength: '',
      weakness: '',
      opportunity: '',
      threat: '',
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

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(3)
      if (data) {
        const eventData = data as EventWeek3Data
        if (eventData.references && Array.isArray(eventData.references)) {
          setReferences(eventData.references)
        }
        if (eventData.swot) {
          setSwot(eventData.swot)
        }
        if (eventData.is_submitted !== undefined) {
          setIsSubmitted(eventData.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

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
          filter: `project_id=eq.${projectId}&step_number=eq.3`,
        },
        async () => {
          const data = await loadStepData(3)
          if (data) {
            const eventData = data as EventWeek3Data
            if (eventData.references && Array.isArray(eventData.references)) {
              setReferences(eventData.references)
            }
            if (eventData.swot) {
              setSwot(eventData.swot)
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
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

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
        title="Phase 1: Data - 3회: 레퍼런스 벤치마킹 및 정량 분석"
        description="유사 행사의 성공/실패 요인을 분석하고, 핵심 지표를 비교하여 객관적인 기준을 마련합니다."
        phase="Phase 1: Data"
        isScrolled={isScrolled}
        currentWeek={3}
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
          currentWeek={3}
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
            {/* 레퍼런스 데이터 카드 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">레퍼런스 데이터 카드</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      경쟁하거나 참고할 만한 행사의 정보를 정량적/정성적으로 분석합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    <strong>가이드:</strong> 최소 3개 이상의 레퍼런스를 분석해보세요. 다양한 유형의 행사를 비교하면 더 객관적인 기준을 마련할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {references.map((ref, index) => (
                  <div
                    key={ref.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors bg-white"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-gray-900">레퍼런스 {index + 1}</h3>
                      </div>
                      {references.length > 1 && !readonly && (
                        <button
                          onClick={() => removeReference(ref.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="레퍼런스 삭제"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="flex lg:flex-row flex-col gap-6">
                      {/* 포스터/키비주얼 이미지 영역 (왼쪽) */}
                      <div className="flex-shrink-0 space-y-3" style={{ width: '200px' }}>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          포스터/키비주얼
                        </h4>
                        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-[3/4] flex items-center justify-center relative">
                          {/* 실제 이미지 */}
                          {ref.imageUrl ? (
                            <img
                              key={`${ref.id}-${ref.imageUrl}`}
                              src={ref.imageUrl}
                              alt={ref.name || '레퍼런스 포스터/키비주얼'}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                // 더미 이미지 표시
                                const dummyDiv = target.parentElement?.querySelector('.dummy-image')
                                if (dummyDiv) {
                                  dummyDiv.classList.remove('hidden')
                                }
                              }}
                              onLoad={(e) => {
                                // 이미지 로드 성공 시 더미 이미지 숨김
                                const target = e.target as HTMLImageElement
                                const dummyDiv = target.parentElement?.querySelector('.dummy-image')
                                if (dummyDiv) {
                                  dummyDiv.classList.add('hidden')
                                }
                              }}
                            />
                          ) : null}
                          {/* 더미 이미지 (링크가 없거나 로드 실패 시 표시) */}
                          <div className={`dummy-image absolute inset-0 ${ref.imageUrl ? 'hidden' : ''} w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-100 to-gray-200`}>
                            <ImageIcon className="w-16 h-16 text-gray-400 mb-3" />
                            <p className="text-xs text-gray-500 text-center">
                              포스터/키비주얼
                              <br />
                              이미지 링크를 입력하세요
                            </p>
                          </div>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={ref.imageUrl}
                            onChange={(e) => updateReference(ref.id, 'imageUrl', e.target.value)}
                            disabled={readonly}
                            placeholder="이미지 URL을 입력하세요"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          {ref.imageUrl && (
                            <a
                              href={ref.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block text-center text-xs text-indigo-600 hover:text-indigo-800 transition-colors flex items-center justify-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              새 탭에서 열기
                            </a>
                          )}
                        </div>
                      </div>

                      {/* 기본 정보 및 정량 데이터 (오른쪽) */}
                      <div className="flex-1 space-y-6 min-w-0">
                        {/* 기본 정보 */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            기본 정보
                          </h4>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              행사명 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={ref.name}
                              onChange={(e) => updateReference(ref.id, 'name', e.target.value)}
                              disabled={readonly}
                              placeholder="예: 더현대 서울 팝업"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              핵심 목표 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {CORE_GOALS.map((goal) => (
                                <button
                                  key={goal}
                                  type="button"
                                  onClick={() => updateReference(ref.id, 'coreGoal', goal)}
                                  disabled={readonly}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    ref.coreGoal === goal
                                      ? 'bg-indigo-600 text-white shadow-md'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {goal}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 정량 데이터 */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            정량 데이터
                          </h4>

                          <div className="space-y-3">
                            {/* 첫 번째 줄: 예산, 기간, 규모 */}
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  총 예산 (만원)
                                </label>
                                <input
                                  type="text"
                                  value={ref.budget}
                                  onChange={(e) => updateReference(ref.id, 'budget', e.target.value)}
                                  disabled={readonly}
                                  placeholder="예: 5000"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  기간 (일)
                                </label>
                                <input
                                  type="text"
                                  value={ref.duration}
                                  onChange={(e) => updateReference(ref.id, 'duration', e.target.value)}
                                  disabled={readonly}
                                  placeholder="예: 30"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  규모 (평)
                                </label>
                                <input
                                  type="text"
                                  value={ref.scale}
                                  onChange={(e) => updateReference(ref.id, 'scale', e.target.value)}
                                  disabled={readonly}
                                  placeholder="예: 200"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>
                            </div>

                            {/* 두 번째 줄: 공개 방문객 수, 예상 방문객 수 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  공개 방문객 수
                                </label>
                                <input
                                  type="text"
                                  value={ref.officialVisitors}
                                  onChange={(e) =>
                                    updateReference(ref.id, 'officialVisitors', e.target.value)
                                  }
                                  disabled={readonly}
                                  placeholder="예: 50000"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  예상 방문객 수
                                </label>
                                <input
                                  type="text"
                                  value={ref.estimatedVisitors}
                                  onChange={(e) =>
                                    updateReference(ref.id, 'estimatedVisitors', e.target.value)
                                  }
                                  disabled={readonly}
                                  placeholder="예: 45000"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>
                  </div>

                    {/* 정성 분석 */}
                    <div className="grid lg:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-semibold text-green-700 mb-2">
                          Pros (배울 점)
                        </label>
                        <textarea
                          value={ref.pros}
                          onChange={(e) => updateReference(ref.id, 'pros', e.target.value)}
                          disabled={readonly}
                          rows={4}
                          placeholder="이 행사에서 우리 행사에 적용하고 싶은 장점을 작성하세요."
                          className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-red-700 mb-2">
                          Cons (아쉬운 점)
                        </label>
                        <textarea
                          value={ref.cons}
                          onChange={(e) => updateReference(ref.id, 'cons', e.target.value)}
                          disabled={readonly}
                          rows={4}
                          placeholder="반면교사로 삼아야 할 단점이나 개선 포인트를 작성하세요."
                          className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* 레퍼런스 추가 버튼 */}
                {!readonly && (
                  <button
                    onClick={addReference}
                    className="w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-indigo-600 font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    레퍼런스 추가
                  </button>
                )}
              </div>
            </div>

            {/* SWOT 분석 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Square className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">SWOT 분석</h2>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                레퍼런스 분석을 통해 도출된 인사이트를 내 행사의 전략으로 연결합니다.
              </p>

              {/* SWOT 매트릭스 */}
              <div className="grid grid-cols-2 gap-4">
                {/* Strength (강점) */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                      S
                    </div>
                    <h4 className="font-semibold text-green-900">Strength (강점)</h4>
                  </div>
                  <p className="text-xs text-green-700 mb-2">
                    레퍼런스 대비 우리 행사가 가진 내부적 강점
                  </p>
                  <textarea
                    value={swot.strength}
                    onChange={(e) => setSwot({ ...swot, strength: e.target.value })}
                    disabled={readonly}
                    rows={6}
                    placeholder="예: 저예산으로도 고품질 콘텐츠 제작 가능, 강한 SNS 커뮤니티 보유"
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none disabled:bg-green-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Weakness (약점) */}
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                      W
                    </div>
                    <h4 className="font-semibold text-red-900">Weakness (약점)</h4>
                  </div>
                  <p className="text-xs text-red-700 mb-2">
                    예산 부족, 인지도 부족 등 내부적 약점
                  </p>
                  <textarea
                    value={swot.weakness}
                    onChange={(e) => setSwot({ ...swot, weakness: e.target.value })}
                    disabled={readonly}
                    rows={6}
                    placeholder="예: 브랜드 인지도 낮음, 제한된 예산, 체험형 콘텐츠 제작 경험 부족"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none disabled:bg-red-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Opportunity (기회) */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      O
                    </div>
                    <h4 className="font-semibold text-blue-900">Opportunity (기회)</h4>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">
                    경쟁 행사의 Cons에서 발견한 외부적 기회 요인
                  </p>
                  <textarea
                    value={swot.opportunity}
                    onChange={(e) => setSwot({ ...swot, opportunity: e.target.value })}
                    disabled={readonly}
                    rows={6}
                    placeholder="예: 경쟁 행사의 단점(혼잡도, 접근성)을 개선할 수 있는 기회"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none disabled:bg-blue-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-blue-600 mt-2 italic">
                    💡 팁: 경쟁사의 Cons를 우리의 Opportunity로 바꿔보세요.
                  </p>
                </div>

                {/* Threat (위협) */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm">
                      T
                    </div>
                    <h4 className="font-semibold text-orange-900">Threat (위협)</h4>
                  </div>
                  <p className="text-xs text-orange-700 mb-2">
                    유사 시기 개최되는 대형 행사 등 외부적 위협 요인
                  </p>
                  <textarea
                    value={swot.threat}
                    onChange={(e) => setSwot({ ...swot, threat: e.target.value })}
                    disabled={readonly}
                    rows={6}
                    placeholder="예: 같은 기간 대형 브랜드 행사 개최, 날씨 불확실성, 공간 대여비 상승"
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none disabled:bg-orange-100 disabled:cursor-not-allowed"
                  />
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

export default function EventWeek3Page() {
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
      <EventWeek3PageContent />
    </Suspense>
  )
}

