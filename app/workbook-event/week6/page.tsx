'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  MapPin,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Plus,
  X,
  GripVertical,
  Smile,
  Frown,
  Meh,
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

// 예약 플랫폼 옵션
const BOOKING_CHANNELS = [
  '네이버 예약',
  '이벤터스',
  '캐치테이블',
  '구글폼',
  '자사 홈페이지',
  '인스타그램 DM',
  '카카오톡 채널',
  '기타',
]

// 표준 여정 단계
const STANDARD_JOURNEY_STEPS = [
  { id: 'entry', label: '입장', icon: '🚪' },
  { id: 'wait', label: '대기', icon: '⏳' },
  { id: 'experience', label: '체험/관람', icon: '🎨' },
  { id: 'rest', label: '휴식', icon: '☕' },
  { id: 'purchase', label: '구매/F&B', icon: '🛍️' },
  { id: 'exit', label: '퇴장', icon: '👋' },
]

// 감정 옵션
const EMOTION_OPTIONS = [
  { value: 'excited', label: '기대됨', icon: '😊' },
  { value: 'happy', label: '신남', icon: '🤩' },
  { value: 'neutral', label: '보통', icon: '😐' },
  { value: 'bored', label: '지루함', icon: '😑' },
  { value: 'disappointed', label: '아쉬움', icon: '😔' },
  { value: 'satisfied', label: '만족', icon: '😌' },
]

  // 해결 방안 아이디어
const SOLUTION_IDEAS = [
  '대기열 관리 앱 사용 (나우웨이팅 등)',
  '사전 안내방송 및 스태프 배치',
  '대기 공간 내 즐길 거리 배치',
  '동선 분리 (입/출구 구분)',
  '타임슬롯 예약 분산',
  'VIP 라인 운영',
  '기타',
]

interface BookingFlow {
  step: number
  title: string
  description: string
  friction?: string // 이탈 요인
}

interface JourneyStep {
  id: string
  label: string
  icon: string
  action: string // 행동
  emotion: string // 감정
  touchpoint: string // 접점
  duration: string // 예상 체류 시간
  isBottleneck: boolean // 병목 구간 여부
  solution: string // 해결 방안
  selectedSolutions: string[] // 선택된 해결 방안 옵션
  customSolution: string // 기타 직접 입력 해결 방안
}

interface EventWeek6Data {
  booking: {
    requiresBooking: boolean // 사전 예약 필요 여부
    channel: string[] // 예약 채널
    customChannel: string // 기타 채널
    flow: BookingFlow[] // 신청 흐름
  }
  journey: {
    steps: JourneyStep[] // 여정 단계
  }
  selfCheck: {
    consistency: string // 일관성
    convenience: string // 편의성
    experience: string // 경험 관리
    closing: string // 마무리
  }
  is_submitted?: boolean
}

function EventWeek6PageContent() {
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

  // 5회차 세계관 정보
  const [week5Universe, setWeek5Universe] = useState<string>('')

  // 사전 신청 프로세스
  const [requiresBooking, setRequiresBooking] = useState(true)
  const [bookingChannel, setBookingChannel] = useState<string[]>([])
  const [customChannel, setCustomChannel] = useState('')
  const [bookingFlow, setBookingFlow] = useState<BookingFlow[]>([
    { step: 1, title: '인지/접속', description: '', friction: '' },
    { step: 2, title: '정보 입력', description: '', friction: '' },
    { step: 3, title: '결제/확정', description: '', friction: '' },
    { step: 4, title: '티켓 수령', description: '', friction: '' },
  ])

  // 동선 시뮬레이터
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>(() =>
    STANDARD_JOURNEY_STEPS.map((step) => ({
      ...step,
      action: '',
      emotion: '',
      touchpoint: '',
      duration: '',
      isBottleneck: false,
      solution: '',
      selectedSolutions: [],
      customSolution: '',
    }))
  )

  // 기획 가이드
  const [selfCheck, setSelfCheck] = useState({
    consistency: '',
    convenience: '',
    experience: '',
    closing: '',
  })

  // 예약 채널 토글
  const toggleBookingChannel = (channel: string) => {
    if (channel === '기타') {
      if (bookingChannel.includes('기타')) {
        setBookingChannel(bookingChannel.filter((c) => c !== '기타'))
        setCustomChannel('')
      } else {
        setBookingChannel([...bookingChannel, '기타'])
      }
    } else {
      if (bookingChannel.includes(channel)) {
        setBookingChannel(bookingChannel.filter((c) => c !== channel))
      } else {
        setBookingChannel([...bookingChannel, channel])
      }
    }
  }

  // 여정 단계 추가
  const [newStepLabel, setNewStepLabel] = useState('')
  const [showNewStepForm, setShowNewStepForm] = useState(false)

  const addJourneyStep = () => {
    if (!newStepLabel.trim()) {
      setToastMessage('단계명을 입력해주세요.')
      setToastVisible(true)
      return
    }
    const newStep: JourneyStep = {
      id: `custom-${Date.now()}`,
      label: newStepLabel.trim(),
      icon: '⭐',
      action: '',
      emotion: '',
      touchpoint: '',
      duration: '',
      isBottleneck: false,
      solution: '',
    }
    setJourneySteps([...journeySteps, newStep])
    setNewStepLabel('')
    setShowNewStepForm(false)
  }

  // 여정 단계 삭제
  const removeJourneyStep = (id: string) => {
    if (journeySteps.length <= 1) {
      setToastMessage('최소 1개의 단계는 유지해야 합니다.')
      setToastVisible(true)
      return
    }
    setJourneySteps(journeySteps.filter((step) => step.id !== id))
  }

  // 여정 단계 업데이트
  const updateJourneyStep = (id: string, field: keyof JourneyStep, value: any) => {
    setJourneySteps(
      journeySteps.map((step) => (step.id === id ? { ...step, [field]: value } : step))
    )
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 사전 신청 프로세스
    if (requiresBooking) {
      total += 1
      if (bookingChannel.length > 0) filled += 1

      total += 4
      bookingFlow.forEach((flow) => {
        if (flow.description.trim()) filled += 1
      })
    } else {
      total += 1 // 사전 예약 불필요 체크
      filled += 1
    }

    // 동선 시뮬레이터
    total += journeySteps.length * 3 // action, emotion, touchpoint
    journeySteps.forEach((step) => {
      if (step.action.trim()) filled += 1
      if (step.emotion) filled += 1
      if (step.touchpoint.trim()) filled += 1
    })

    // 혼잡도 관리
    total += journeySteps.length
    journeySteps.forEach((step) => {
      if (step.duration.trim()) filled += 1
    })

    // 기획 가이드
    total += 4
    if (selfCheck.consistency.trim()) filled += 1
    if (selfCheck.convenience.trim()) filled += 1
    if (selfCheck.experience.trim()) filled += 1
    if (selfCheck.closing.trim()) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(6 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.booking) {
        if (data.booking.requiresBooking) {
          total += 1
          if (data.booking.channel && data.booking.channel.length > 0) filled += 1

          if (data.booking.flow && Array.isArray(data.booking.flow)) {
            total += data.booking.flow.length
            data.booking.flow.forEach((flow: any) => {
              if (flow.description?.trim()) filled += 1
            })
          } else {
            total += 4
          }
        } else {
          total += 1
          filled += 1
        }
      } else {
        total += 1
      }

      if (data.journey && data.journey.steps && Array.isArray(data.journey.steps)) {
        total += data.journey.steps.length * 3
        data.journey.steps.forEach((step: any) => {
          if (step.action?.trim()) filled += 1
          if (step.emotion) filled += 1
          if (step.touchpoint?.trim()) filled += 1
        })

        total += data.journey.steps.length
        data.journey.steps.forEach((step: any) => {
          if (step.duration?.trim()) filled += 1
        })
      } else {
        total += 6 * 4 // 기본 단계 수 * 필드 수
      }

      if (data.selfCheck) {
        total += 4
        if (data.selfCheck.consistency?.trim()) filled += 1
        if (data.selfCheck.convenience?.trim()) filled += 1
        if (data.selfCheck.experience?.trim()) filled += 1
        if (data.selfCheck.closing?.trim()) filled += 1
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

    const eventData: EventWeek6Data = {
      booking: {
        requiresBooking,
        channel: bookingChannel,
        customChannel: bookingChannel.includes('기타') ? customChannel : '',
        flow: bookingFlow,
      },
      journey: {
        steps: journeySteps,
      },
      selfCheck,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(6, eventData, progress)

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

    const eventData: EventWeek6Data = {
      booking: {
        requiresBooking,
        channel: bookingChannel,
        customChannel: bookingChannel.includes('기타') ? customChannel : '',
        flow: bookingFlow,
      },
      journey: {
        steps: journeySteps,
      },
      selfCheck,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(6, eventData, newSubmittedState, progress)

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

    setRequiresBooking(true)
    setBookingChannel([])
    setCustomChannel('')
    setBookingFlow([
      { step: 1, title: '인지/접속', description: '', friction: '' },
      { step: 2, title: '정보 입력', description: '', friction: '' },
      { step: 3, title: '결제/확정', description: '', friction: '' },
      { step: 4, title: '티켓 수령', description: '', friction: '' },
    ])
    setJourneySteps(
      STANDARD_JOURNEY_STEPS.map((step) => ({
        ...step,
        action: '',
        emotion: '',
        touchpoint: '',
        duration: '',
        isBottleneck: false,
        solution: '',
        selectedSolutions: [],
        customSolution: '',
      }))
    )
    setSelfCheck({
      consistency: '',
      convenience: '',
      experience: '',
      closing: '',
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

  // 5회차 세계관 정보 로드
  useEffect(() => {
    const loadWeek5Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(5)
        if (data && (data as any).universe) {
          const universe = (data as any).universe
          const universeText = [
            universe.concept,
            universe.portal,
            universe.journey,
            universe.character,
          ]
            .filter(Boolean)
            .join('\n')
          setWeek5Universe(universeText)
        }
      } catch (error) {
        console.error('5회차 데이터 로드 오류:', error)
      }
    }

    loadWeek5Data()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(6)
      if (data) {
        const eventData = data as EventWeek6Data
        if (eventData.booking) {
          setRequiresBooking(eventData.booking.requiresBooking ?? true)
          setBookingChannel(eventData.booking.channel || [])
          setCustomChannel(eventData.booking.customChannel || '')
          if (eventData.booking.flow && eventData.booking.flow.length > 0) {
            setBookingFlow(eventData.booking.flow)
          }
        }
        if (eventData.journey && eventData.journey.steps) {
          // 기존 데이터 호환성을 위해 selectedSolutions와 customSolution 기본값 설정
          const stepsWithDefaults = eventData.journey.steps.map((step: any) => ({
            ...step,
            selectedSolutions: step.selectedSolutions || [],
            customSolution: step.customSolution || '',
          }))
          setJourneySteps(stepsWithDefaults)
        }
        if (eventData.selfCheck) {
          setSelfCheck(eventData.selfCheck)
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
          filter: `project_id=eq.${projectId}&step_number=eq.6`,
        },
        async () => {
          const data = await loadStepData(6)
          if (data) {
            const eventData = data as EventWeek6Data
            if (eventData.booking) {
              setRequiresBooking(eventData.booking.requiresBooking ?? true)
              setBookingChannel(eventData.booking.channel || [])
              setCustomChannel(eventData.booking.customChannel || '')
              if (eventData.booking.flow && eventData.booking.flow.length > 0) {
                setBookingFlow(eventData.booking.flow)
              }
            }
            if (eventData.journey && eventData.journey.steps) {
              // 기존 데이터 호환성을 위해 selectedSolutions와 customSolution 기본값 설정
              const stepsWithDefaults = eventData.journey.steps.map((step: any) => ({
                ...step,
                selectedSolutions: step.selectedSolutions || [],
                customSolution: step.customSolution || '',
              }))
              setJourneySteps(stepsWithDefaults)
            }
            if (eventData.selfCheck) {
              setSelfCheck(eventData.selfCheck)
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
        title="Phase 2: Insight - 6회: 방문객 여정 지도"
        description="사전 신청부터 현장 입장, 관람, 퇴장까지 방문객의 모든 경험 단계를 시각화하고, 병목 구간을 예측하여 원활한 운영 계획을 수립합니다."
        phase="Phase 2: Insight"
        isScrolled={isScrolled}
        currentWeek={6}
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
          currentWeek={6}
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
            {/* 사전 신청 프로세스 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">사전 신청 프로세스</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    방문객이 행사에 오기 위해 거쳐야 하는 예약 및 등록 과정을 설계합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 신청 유무 설정 */}
                <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      사전 예약 필요 여부
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      사전 예약이 필요 없는 행사는 현장 방문 전용으로 설정할 수 있습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!readonly) {
                        setRequiresBooking(!requiresBooking)
                        if (!requiresBooking) {
                          // 사전 예약 필요로 변경 시 기본 플로우 초기화
                          setBookingFlow([
                            { step: 1, title: '인지/접속', description: '', friction: '' },
                            { step: 2, title: '정보 입력', description: '', friction: '' },
                            { step: 3, title: '결제/확정', description: '', friction: '' },
                            { step: 4, title: '티켓 수령', description: '', friction: '' },
                          ])
                        } else {
                          // 현장 방문 전용으로 변경 시 채널 초기화
                          setBookingChannel([])
                          setCustomChannel('')
                        }
                      }
                    }}
                    disabled={readonly}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      requiresBooking ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        requiresBooking ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {requiresBooking && (
                  <>
                    {/* 채널 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        예약 플랫폼 선택
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {BOOKING_CHANNELS.map((channel) => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => toggleBookingChannel(channel)}
                            disabled={readonly}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              bookingChannel.includes(channel)
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {channel}
                          </button>
                        ))}
                      </div>
                      {bookingChannel.includes('기타') && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={customChannel}
                            onChange={(e) => setCustomChannel(e.target.value)}
                            disabled={readonly}
                            placeholder="기타 예약 플랫폼을 입력하세요"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>

                    {/* 신청 흐름 빌더 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        신청 흐름 빌더
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {bookingFlow.map((flow, index) => (
                          <div key={flow.step} className="border border-gray-200 rounded-lg p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold">
                                {flow.step}
                              </div>
                              <h4 className="text-sm font-semibold text-gray-900">{flow.title}</h4>
                            </div>
                            {index < bookingFlow.length - 1 && (
                              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 hidden md:block">
                                <ArrowRight className="w-5 h-5 text-indigo-400" />
                              </div>
                            )}
                            <div className="space-y-3 flex-1">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">설명</label>
                                <textarea
                                  value={flow.description}
                                  onChange={(e) => {
                                    const newFlow = [...bookingFlow]
                                    newFlow[index].description = e.target.value
                                    setBookingFlow(newFlow)
                                  }}
                                  disabled={readonly}
                                  rows={3}
                                  placeholder={`예: ${
                                    flow.step === 1
                                      ? 'SNS 프로필 링크 클릭 또는 광고 배너를 통해 접속'
                                      : flow.step === 2
                                      ? '이름, 연락처, 동반인 수, 방문 희망 일시 입력'
                                      : flow.step === 3
                                      ? '무료 행사인 경우 바로 확정 알림 발송, 유료인 경우 결제 후 확정'
                                      : 'QR코드를 통한 입장 확인 또는 현장에서 신분증 확인'
                                  }`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  이탈 요인 (Friction)
                                </label>
                                <textarea
                                  value={flow.friction || ''}
                                  onChange={(e) => {
                                    const newFlow = [...bookingFlow]
                                    newFlow[index].friction = e.target.value
                                    setBookingFlow(newFlow)
                                  }}
                                  disabled={readonly}
                                  rows={2}
                                  placeholder="예: 복잡한 정보 입력 양식, 결제 오류 등"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed bg-red-50"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 동선 시뮬레이터 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">동선 시뮬레이터</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      행사장 내에서의 물리적 이동 경로와 심리적 변화를 단계별로 정리합니다.
                    </p>
                  </div>
                </div>
                {!showNewStepForm ? (
                  <button
                    type="button"
                    onClick={() => setShowNewStepForm(true)}
                    disabled={readonly}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    단계 추가
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newStepLabel}
                      onChange={(e) => setNewStepLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addJourneyStep()
                        } else if (e.key === 'Escape') {
                          setShowNewStepForm(false)
                          setNewStepLabel('')
                        }
                      }}
                      placeholder="단계명을 입력하세요"
                      autoFocus
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={addJourneyStep}
                      disabled={readonly || !newStepLabel.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewStepForm(false)
                        setNewStepLabel('')
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-max pb-4" style={{ minWidth: `${journeySteps.length * 320}px` }}>
                  {journeySteps.map((step, index) => (
                    <div key={step.id} className="border border-gray-200 rounded-lg p-5 min-w-[300px] max-w-[300px] flex-shrink-0 relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{step.icon}</span>
                          <div className="flex-1">
                            {readonly ? (
                              <h4 className="text-sm font-semibold text-gray-900">{step.label}</h4>
                            ) : (
                              <input
                                type="text"
                                value={step.label}
                                onChange={(e) => updateJourneyStep(step.id, 'label', e.target.value)}
                                className="w-full px-2 py-1 text-sm font-semibold text-gray-900 border border-transparent rounded focus:border-indigo-300 focus:ring-1 focus:ring-indigo-500"
                                placeholder="단계명"
                              />
                            )}
                          </div>
                        </div>
                        {journeySteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeJourneyStep(step.id)}
                            disabled={readonly}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {index < journeySteps.length - 1 && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 z-10">
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-300 flex items-center justify-center shadow-md">
                            <ArrowRight className="w-5 h-5 text-indigo-600" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 mb-4">
                        {/* 행동 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            행동 (Action)
                          </label>
                          <textarea
                            value={step.action}
                            onChange={(e) => updateJourneyStep(step.id, 'action', e.target.value)}
                            disabled={readonly}
                            rows={2}
                            placeholder="예: 키오스크 주문, 포토존 촬영"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* 감정 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            감정 (Emotion)
                          </label>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            {EMOTION_OPTIONS.map((emotion) => (
                              <button
                                key={emotion.value}
                                type="button"
                                onClick={() => updateJourneyStep(step.id, 'emotion', emotion.value)}
                                disabled={readonly}
                                className={`p-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  step.emotion === emotion.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title={emotion.label}
                              >
                                <span className="text-lg">{emotion.icon}</span>
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={
                              EMOTION_OPTIONS.find((e) => e.value === step.emotion)?.label || ''
                            }
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs text-gray-500 cursor-not-allowed"
                            placeholder="감정을 선택하세요"
                          />
                        </div>

                        {/* 접점 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            접점 (Touchpoint)
                          </label>
                          <textarea
                            value={step.touchpoint}
                            onChange={(e) => updateJourneyStep(step.id, 'touchpoint', e.target.value)}
                            disabled={readonly}
                            rows={2}
                            placeholder="예: 스태프, 안내판, 리플렛"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                    {/* 예상 체류 시간 및 병목 구간 */}
                    <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                      <div className="flex items-end gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">예상체류시간</label>
                          <input
                            type="text"
                            value={step.duration}
                            onChange={(e) => updateJourneyStep(step.id, 'duration', e.target.value)}
                            disabled={readonly}
                            placeholder="예: 10분"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const currentStep = journeySteps.find(s => s.id === step.id)
                            if (!currentStep) return
                            
                            const newIsBottleneck = !currentStep.isBottleneck
                            
                            // 상태를 한 번에 업데이트
                            setJourneySteps(journeySteps.map((s) => {
                              if (s.id === step.id) {
                                if (!newIsBottleneck) {
                                  // 병목 해제 시 해결 방안 초기화
                                  return {
                                    ...s,
                                    isBottleneck: false,
                                    selectedSolutions: [],
                                    customSolution: '',
                                    solution: '',
                                  }
                                } else {
                                  // 병목 활성화
                                  return {
                                    ...s,
                                    isBottleneck: true,
                                  }
                                }
                              }
                              return s
                            }))
                          }}
                          disabled={readonly}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                            step.isBottleneck
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          {step.isBottleneck ? (
                            <CheckCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-400 rounded flex-shrink-0" />
                          )}
                          <span>병목구간</span>
                        </button>
                      </div>

                      {/* 해결 방안 선택 */}
                      {step.isBottleneck && (
                        <div className="space-y-3">
                          <label className="block text-xs font-medium text-gray-700">
                            해결 방안 선택
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {SOLUTION_IDEAS.map((idea, idx) => {
                              const isSelected = (step.selectedSolutions || []).includes(idea)
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const currentStep = journeySteps.find(s => s.id === step.id)
                                    if (!currentStep) return
                                    
                                    const selectedSolutions = currentStep.selectedSolutions || []
                                    let newSelectedSolutions: string[]
                                    
                                    if (idea === '기타') {
                                      // 기타는 토글 방식
                                      if (selectedSolutions.includes('기타')) {
                                        newSelectedSolutions = selectedSolutions.filter(s => s !== '기타')
                                        // 기타 해제 시 customSolution도 초기화
                                        setJourneySteps(journeySteps.map((s) => {
                                          if (s.id === step.id) {
                                            const solutions = newSelectedSolutions
                                              .filter(s => s !== '기타')
                                            return {
                                              ...s,
                                              selectedSolutions: newSelectedSolutions,
                                              customSolution: '',
                                              solution: solutions.join('\n'),
                                            }
                                          }
                                          return s
                                        }))
                                        return
                                      } else {
                                        newSelectedSolutions = [...selectedSolutions, '기타']
                                      }
                                    } else {
                                      // 다른 옵션들은 다중 선택 가능 (토글 방식)
                                      if (selectedSolutions.includes(idea)) {
                                        newSelectedSolutions = selectedSolutions.filter(s => s !== idea)
                                      } else {
                                        newSelectedSolutions = [...selectedSolutions, idea]
                                      }
                                    }
                                    
                                    // 상태 업데이트
                                    setJourneySteps(journeySteps.map((s) => {
                                      if (s.id === step.id) {
                                        const solutions = newSelectedSolutions
                                          .filter(sol => sol !== '기타')
                                          .concat(newSelectedSolutions.includes('기타') && currentStep.customSolution ? [currentStep.customSolution] : [])
                                        return {
                                          ...s,
                                          selectedSolutions: newSelectedSolutions,
                                          solution: solutions.join('\n'),
                                        }
                                      }
                                      return s
                                    }))
                                  }}
                                  disabled={readonly}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-md'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {isSelected ? (
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 border-2 border-gray-400 rounded flex-shrink-0" />
                                  )}
                                  <span>{idea}</span>
                                </button>
                              )
                            })}
                          </div>
                          
                          {(step.selectedSolutions || []).includes('기타') && (
                            <div>
                              <label className="block text-xs text-gray-600 mb-2">
                                기타 의견 입력
                              </label>
                              <textarea
                                value={step.customSolution || ''}
                                onChange={(e) => {
                                  const currentStep = journeySteps.find(s => s.id === step.id)
                                  if (!currentStep) return
                                  
                                  const customValue = e.target.value
                                  const selectedSolutions = currentStep.selectedSolutions || []
                                  const solutions = selectedSolutions
                                    .filter(s => s !== '기타')
                                    .concat(customValue ? [customValue] : [])
                                  
                                  setJourneySteps(journeySteps.map((s) => {
                                    if (s.id === step.id) {
                                      return {
                                        ...s,
                                        customSolution: customValue,
                                        solution: solutions.join('\n'),
                                      }
                                    }
                                    return s
                                  }))
                                }}
                                disabled={readonly}
                                rows={2}
                                placeholder="의견을 입력하세요"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* 기획 가이드 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">기획 가이드 (Self-Check)</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    여정 지도를 완성한 후 스스로 점검해볼 수 있는 질문입니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    일관성: 신청 페이지의 톤앤매너와 현장의 분위기가 일치하는가?
                  </label>
                  <textarea
                    value={selfCheck.consistency}
                    onChange={(e) => setSelfCheck({ ...selfCheck, consistency: e.target.value })}
                    disabled={readonly}
                    rows={3}
                    placeholder="예: 신청 페이지도 몽환적이고 미래지향적인 디자인으로 통일하여 일관된 경험 제공"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    편의성: 티켓 확인부터 입장까지 1분 이내에 가능한가?
                  </label>
                  <textarea
                    value={selfCheck.convenience}
                    onChange={(e) => setSelfCheck({ ...selfCheck, convenience: e.target.value })}
                    disabled={readonly}
                    rows={3}
                    placeholder="예: QR코드 자동 인식 시스템으로 30초 이내 입장 가능"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경험 관리: 대기 시간이 지루하지 않도록 어떤 장치를 마련했는가?
                  </label>
                  <textarea
                    value={selfCheck.experience}
                    onChange={(e) => setSelfCheck({ ...selfCheck, experience: e.target.value })}
                    disabled={readonly}
                    rows={3}
                    placeholder="예: 대기 공간에 포토존과 미리보기 영상 제공"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    마무리: 퇴장하는 순간 방문객의 손에 쥐어지거나 기억에 남는 것은 무엇인가?
                  </label>
                  <textarea
                    value={selfCheck.closing}
                    onChange={(e) => setSelfCheck({ ...selfCheck, closing: e.target.value })}
                    disabled={readonly}
                    rows={3}
                    placeholder="예: 한정판 기념품 수령 또는 SNS 공유 이벤트 참여"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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

export default function EventWeek6Page() {
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
      <EventWeek6PageContent />
    </Suspense>
  )
}

