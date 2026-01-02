'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Calendar,
  Target,
  Search,
  TrendingUp,
  FileText,
  Copy,
  Check,
  Plus,
  X,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { useWorkbookStorage } from '@/hooks/useWorkbookStorage'
import { useWorkbookNavigation } from '@/hooks/useWorkbookNavigation'
import { useProjectSettings } from '@/hooks/useProjectSettings'
import { useProjectSummary, SummaryType } from '@/hooks/useProjectSummary'
import { WorkbookHeader } from '@/components/workbook/WorkbookHeader'
import { WorkbookSection } from '@/components/workbook/WorkbookSection'
import { WorkbookFooter } from '@/components/workbook/WorkbookFooter'
import { WorkbookNavigation } from '@/components/workbook/WorkbookNavigation'
import { ProjectSettingsModal } from '@/components/workbook/ProjectSettingsModal'
import { ProjectSummaryModal } from '@/components/workbook/ProjectSummaryModal'
import { WorkbookStatusBar } from '@/components/WorkbookStatusBar'
import { useProjectAccess } from '@/hooks/useProjectAccess'

export const dynamic = 'force-dynamic'

// 행사 유형 옵션
const EVENT_TYPES = [
  '팝업스토어',
  '전시회',
  '페스티벌/축제',
  '플리마켓',
  '세미나/컨퍼런스',
  '기업 행사',
  '기타',
]

// 핵심 목적 옵션
const EVENT_GOALS = [
  '브랜딩(인지도)',
  '판매(매출)',
  '커뮤니티(팬덤)',
  '교육/정보전달',
  '네트워킹',
  '기타',
]

// 플랫폼 옵션
const PLATFORMS = [
  '인스타그램',
  '틱톡',
  '유튜브',
  '뉴스',
  '기타',
]

interface TrendLog {
  id: number
  platform: string
  keyword: string
  volume: string
  link: string
  insight: string
}

interface EventWeek1Data {
  eventCriteria: {
    type: string
    goals: string[]
  }
  keywords: string[]
  trendLogs: TrendLog[]
  insightReport: {
    prompt: string
    result: string
  }
  is_submitted?: boolean
}

function EventWeek1PageContent() {
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
  const [summaryType, setSummaryType] = useState<SummaryType>('proposal')
  const [copied, setCopied] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  // 행사 기준 설정
  const [eventType, setEventType] = useState('')
  const [eventGoals, setEventGoals] = useState<string[]>([])
  const [customGoal, setCustomGoal] = useState('')

  // 키워드 리스트
  const [keywords, setKeywords] = useState<string[]>([])

  // 트렌드 로그 (최대 3개)
  const [trendLogs, setTrendLogs] = useState<TrendLog[]>([
    { id: 1, platform: '', keyword: '', volume: '', link: '', insight: '' },
    { id: 2, platform: '', keyword: '', volume: '', link: '', insight: '' },
    { id: 3, platform: '', keyword: '', volume: '', link: '', insight: '' },
  ])

  // 인사이트 리포트
  const [insightPrompt, setInsightPrompt] = useState('')
  const [insightResult, setInsightResult] = useState('')

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 행사 기준 설정 (25%)
    total += 1
    if (eventType) filled += 0.25
    total += 1
    if (eventGoals.length > 0) filled += 0.25

    // 키워드 (15%)
    total += 1
    if (keywords.length > 0) filled += 0.15

    // 트렌드 로그 (30%)
    if (trendLogs.length > 0) {
      trendLogs.forEach((log) => {
        total += 5
        if (log.platform.trim()) filled += 0.06
        if (log.keyword.trim()) filled += 0.06
        if (log.volume.trim()) filled += 0.06
        if (log.link.trim()) filled += 0.06
        if (log.insight.trim()) filled += 0.06
      })
    }

    // 인사이트 리포트 (30%)
    total += 2
    if (insightPrompt.trim()) filled += 0.15
    if (insightResult.trim()) filled += 0.15

    return Math.round((filled / total) * 100)
  }

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

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 1) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber)
  }

  const getPhaseProgress = (phase: 1 | 2 | 3) => {
    return getBasePhaseProgress(phase)
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress()
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(1, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      // 행사 기준 설정
      if (data.eventCriteria) {
        total += 1
        if (data.eventCriteria.type) filled += 0.25
        total += 1
        if (data.eventCriteria.goals && data.eventCriteria.goals.length > 0) filled += 0.25
      } else {
        total += 2
      }

      // 키워드
      total += 1
      if (data.keywords && data.keywords.length > 0) filled += 0.15

      // 트렌드 로그
      if (data.trendLogs && Array.isArray(data.trendLogs)) {
        data.trendLogs.forEach((log: any) => {
          total += 5
          if (log.platform?.trim()) filled += 0.06
          if (log.keyword?.trim()) filled += 0.06
          if (log.volume?.trim()) filled += 0.06
          if (log.link?.trim()) filled += 0.06
          if (log.insight?.trim()) filled += 0.06
        })
      }

      // 인사이트 리포트
      if (data.insightReport) {
        total += 2
        if (data.insightReport.prompt?.trim()) filled += 0.15
        if (data.insightReport.result?.trim()) filled += 0.15
      } else {
        total += 2
      }

      return Math.round((filled / total) * 100)
    })
  }, [registerProgressCalculator])

  // 데이터 로드
  useEffect(() => {
    const supabase = createClient()
    
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(1)
      if (data) {
        const eventData = data as EventWeek1Data
        if (eventData.eventCriteria) {
          setEventType(eventData.eventCriteria.type || '')
          const goals = eventData.eventCriteria.goals || []
          // 기타가 아닌 목적과 기타 목적 분리
          const standardGoals = goals.filter((g: string) => EVENT_GOALS.includes(g))
          const customGoals = goals.filter((g: string) => !EVENT_GOALS.includes(g))
          if (customGoals.length > 0) {
            setEventGoals([...standardGoals, '기타'])
            setCustomGoal(customGoals[0] || '')
          } else {
            setEventGoals(standardGoals)
            setCustomGoal('')
          }
        }
        if (eventData.keywords) {
          setKeywords(eventData.keywords || [])
        }
        if (eventData.trendLogs) {
          // 최대 3개로 고정, 부족하면 빈 항목 추가
          const logs = eventData.trendLogs || []
          while (logs.length < 3) {
            logs.push({ id: logs.length + 1, platform: '', keyword: '', volume: '', link: '', insight: '' })
          }
          setTrendLogs(logs.slice(0, 3))
        } else {
          setTrendLogs([
            { id: 1, platform: '', keyword: '', volume: '', link: '', insight: '' },
            { id: 2, platform: '', keyword: '', volume: '', link: '', insight: '' },
            { id: 3, platform: '', keyword: '', volume: '', link: '', insight: '' },
          ])
        }
        if (eventData.insightReport) {
          setInsightPrompt(eventData.insightReport.prompt || '')
          setInsightResult(eventData.insightReport.result || '')
        }
        if (eventData.is_submitted !== undefined) {
          setIsSubmitted(eventData.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()

    // 실시간 업데이트 구독
    const channel = supabase
      .channel(`project-steps-${projectId}-week1`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_steps',
          filter: `project_id=eq.${projectId}&step_number=eq.1`,
        },
        async () => {
          const data = await loadStepData(1)
          if (data) {
            const eventData = data as EventWeek1Data
            if (eventData.eventCriteria) {
              setEventType(eventData.eventCriteria.type || '')
              const goals = eventData.eventCriteria.goals || []
              const standardGoals = goals.filter((g: string) => EVENT_GOALS.includes(g))
              const customGoals = goals.filter((g: string) => !EVENT_GOALS.includes(g))
              if (customGoals.length > 0) {
                setEventGoals([...standardGoals, '기타'])
                setCustomGoal(customGoals[0] || '')
              } else {
                setEventGoals(standardGoals)
                setCustomGoal('')
              }
            }
            if (eventData.keywords) {
              setKeywords(eventData.keywords || [])
            }
            if (eventData.trendLogs) {
              const logs = eventData.trendLogs || []
              while (logs.length < 3) {
                logs.push({ id: logs.length + 1, platform: '', keyword: '', volume: '', link: '', insight: '' })
              }
              setTrendLogs(logs.slice(0, 3))
            } else {
              setTrendLogs([
                { id: 1, platform: '', keyword: '', volume: '', link: '', insight: '' },
                { id: 2, platform: '', keyword: '', volume: '', link: '', insight: '' },
                { id: 3, platform: '', keyword: '', volume: '', link: '', insight: '' },
              ])
            }
            if (eventData.insightReport) {
              setInsightPrompt(eventData.insightReport.prompt || '')
              setInsightResult(eventData.insightReport.result || '')
            }
            if (eventData.is_submitted !== undefined) {
              setIsSubmitted(eventData.is_submitted)
            }
          }
          loadSteps()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_steps',
          filter: `project_id=eq.${projectId}&step_number=eq.1`,
        },
        async () => {
          const data = await loadStepData(1)
          if (data) {
            const eventData = data as EventWeek1Data
            if (eventData.eventCriteria) {
              setEventType(eventData.eventCriteria.type || '')
              const goals = eventData.eventCriteria.goals || []
              const standardGoals = goals.filter((g: string) => EVENT_GOALS.includes(g))
              const customGoals = goals.filter((g: string) => !EVENT_GOALS.includes(g))
              if (customGoals.length > 0) {
                setEventGoals([...standardGoals, '기타'])
                setCustomGoal(customGoals[0] || '')
              } else {
                setEventGoals(standardGoals)
                setCustomGoal('')
              }
            }
            if (eventData.keywords) {
              setKeywords(eventData.keywords || [])
            }
            if (eventData.trendLogs) {
              const logs = eventData.trendLogs || []
              while (logs.length < 3) {
                logs.push({ id: logs.length + 1, platform: '', keyword: '', volume: '', link: '', insight: '' })
              }
              setTrendLogs(logs.slice(0, 3))
            } else {
              setTrendLogs([
                { id: 1, platform: '', keyword: '', volume: '', link: '', insight: '' },
                { id: 2, platform: '', keyword: '', volume: '', link: '', insight: '' },
                { id: 3, platform: '', keyword: '', volume: '', link: '', insight: '' },
              ])
            }
            if (eventData.insightReport) {
              setInsightPrompt(eventData.insightReport.prompt || '')
              setInsightResult(eventData.insightReport.result || '')
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

  // 행사 유형 선택
  const selectEventType = (type: string) => {
    setEventType(type)
  }

  // 목적 토글
  const toggleGoal = (goal: string) => {
    if (goal === '기타') {
      // 기타를 선택하면 커스텀 입력 활성화
      if (eventGoals.includes('기타')) {
        setEventGoals(eventGoals.filter((g) => g !== '기타'))
        setCustomGoal('')
      } else {
        setEventGoals([...eventGoals, '기타'])
      }
    } else {
      if (eventGoals.includes(goal)) {
        setEventGoals(eventGoals.filter((g) => g !== goal))
      } else {
        setEventGoals([...eventGoals, goal])
      }
    }
  }

  // 키워드 추가
  const addKeyword = () => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed])
      setKeywordInput('')
    }
  }

  // 키워드 삭제
  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword))
  }

  // 트렌드 로그는 최대 3개로 고정, 삭제 기능 제거

  // 트렌드 로그 업데이트
  const updateTrendLog = (id: number, field: keyof TrendLog, value: string) => {
    setTrendLogs(
      trendLogs.map((log) => (log.id === id ? { ...log, [field]: value } : log))
    )
  }

  // 프롬프트 생성
  useEffect(() => {
    const generatePrompt = () => {
      let prompt = `# 역할 부여\n당신은 전문 행사 기획자이자 트렌드 분석가입니다.\n\n`
      
      prompt += `# 기획 배경\n`
      prompt += `저는 지금 ${eventType || '[행사 유형]'} 형태의 행사를 기획 중이며, 가장 중요한 목적은 ${eventGoals.length > 0 ? eventGoals.join(', ') : '[핵심 목적]'}입니다.\n`
      prompt += `주요 관심 키워드는 ${keywords.length > 0 ? keywords.join(', ') : '[키워드 리스트]'}입니다.\n\n`

      if (trendLogs.some((log) => log.keyword || log.platform || log.insight)) {
        prompt += `# 수집된 데이터 (참고용)\n`
        prompt += `제가 직접 조사한 트렌드 데이터는 다음과 같습니다:\n`
        trendLogs.forEach((log, index) => {
          if (log.keyword || log.platform || log.insight) {
            prompt += `\n[데이터 ${index + 1}]\n`
            if (log.platform) prompt += `- 플랫폼: ${log.platform}\n`
            if (log.keyword) prompt += `- 검색어: ${log.keyword}\n`
            if (log.volume) prompt += `- 수치: ${log.volume}\n`
            if (log.insight) prompt += `- 인사이트: ${log.insight}\n`
          }
        })
        prompt += `\n`
      }

      prompt += `# 요청 사항\n`
      prompt += `위 정보를 바탕으로 '2024-2025 해당 분야의 핵심 트렌드 3가지'를 요약해주세요.\n`
      prompt += `각 트렌드는 다음 구조로 작성해주세요:\n`
      prompt += `1. 트렌드 키워드 (이모지 포함)\n`
      prompt += `2. 현상 분석 (데이터에 기반한 설명)\n`
      prompt += `3. 기획 적용 포인트 (이 행사에 어떻게 적용할 수 있을지 제안)\n\n`
      prompt += `전문적이고 통찰력 있는 어조로 답변해주세요.\n`
      prompt += `**중요: 전체 답변은 1000자 이내로 간결하게 작성해주세요.**`

      setInsightPrompt(prompt)
    }

    generatePrompt()
  }, [eventType, eventGoals, keywords, trendLogs])

  // 프롬프트 복사
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(insightPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('복사 실패')
      setToastVisible(true)
    }
  }

  // 저장
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    // 기타 목적이 선택되어 있으면 customGoal도 포함
    const finalGoals = eventGoals.includes('기타') && customGoal.trim()
      ? [...eventGoals.filter(g => g !== '기타'), customGoal.trim()]
      : eventGoals

    const eventData: EventWeek1Data = {
      eventCriteria: {
        type: eventType,
        goals: finalGoals,
      },
      keywords,
      trendLogs,
      insightReport: {
        prompt: insightPrompt,
        result: insightResult,
      },
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(1, eventData, progress)

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
    if (
      !confirm(
        isSubmitted
          ? '제출을 회수하시겠습니까?\n제출 후 다시 편집할 수 있습니다.'
          : '워크북을 제출하시겠습니까?\n제출 후에도 회수하여 수정할 수 있습니다.'
      )
    ) {
      return
    }

    // 기타 목적이 선택되어 있으면 customGoal도 포함
    const finalGoals = eventGoals.includes('기타') && customGoal.trim()
      ? [...eventGoals.filter(g => g !== '기타'), customGoal.trim()]
      : eventGoals

    const eventData: EventWeek1Data = {
      eventCriteria: {
        type: eventType,
        goals: finalGoals,
      },
      keywords,
      trendLogs,
      insightReport: {
        prompt: insightPrompt,
        result: insightResult,
      },
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(1, eventData, newSubmittedState, progress)

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
    if (
      !confirm(
        '모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return
    }

    setEventType('')
    setEventGoals([])
    setCustomGoal('')
    setKeywords([])
    setTrendLogs([
      { id: 1, platform: '', keyword: '', volume: '', link: '', insight: '' },
      { id: 2, platform: '', keyword: '', volume: '', link: '', insight: '' },
      { id: 3, platform: '', keyword: '', volume: '', link: '', insight: '' },
    ])
    setInsightPrompt('')
    setInsightResult('')
    setIsSubmitted(false)
    setToastMessage('모든 데이터가 초기화되었습니다.')
    setToastVisible(true)
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
    if (
      !confirm(
        '프로젝트를 삭제하시겠습니까?\n모든 워크북 데이터가 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return
    }

    try {
      const success = await deleteProject()
      if (success) {
        setToastMessage('프로젝트가 삭제되었습니다. 대시보드로 이동합니다...')
        setToastVisible(true)
      } else {
        setToastMessage('프로젝트 삭제 중 오류가 발생했습니다.')
        setToastVisible(true)
      }
    } catch (error: any) {
      console.error('삭제 처리 중 오류:', error)
      setToastMessage(`프로젝트 삭제 실패: ${error.message || '알 수 없는 오류'}`)
      setToastVisible(true)
    }
  }

  const handleProjectSummary = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    // 기본값은 proposal로 설정
    const summary = await generateSummary(projectId, projectInfo?.title || null, summaryType)
    if (summary) {
      setSummaryPrompt(summary)
      setShowProjectSummary(true)
    } else {
      setToastMessage('워크북 데이터가 없습니다.')
      setToastVisible(true)
    }
  }

  // 요약 타입 변경 핸들러
  const handleSummaryTypeChange = async (type: SummaryType) => {
    setSummaryType(type)
    if (type === 'proposal-create') {
      // 추후 적용: AI API 연동
      return
    }
    
    if (projectId) {
      const summary = await generateSummary(projectId, projectInfo?.title || null, type)
      if (summary) {
        setSummaryPrompt(summary)
      }
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

  const progress = calculateProgress()
  const readonly = isSubmitted

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">프로젝트 ID 필요</h3>
              <p className="text-sm text-gray-600">
                URL에 projectId 파라미터가 필요합니다.
              </p>
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
        title="Phase 1: Data - 1회: 행사 방향성 설정 및 트렌드 헌팅"
        description="기획하려는 행사의 유형과 핵심 목적을 정의하고, 트렌드 데이터를 수집하여 정리합니다."
        phase="Phase 1: Data"
        isScrolled={isScrolled}
        currentWeek={1}
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
          currentWeek={1}
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
          onTypeChange={handleSummaryTypeChange}
          summaryType={summaryType}
          projectType={projectInfo?.type || null}
        />

        <main className="flex-1 pb-16">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* Section 1: 행사 기준 설정 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  섹션 1: 행사 기준 설정
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                기획하려는 행사의 유형과 핵심 목적을 명확히 정의하세요.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    행사 유형 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => selectEventType(type)}
                        disabled={readonly}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          eventType === type
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {!eventType && (
                    <p className="mt-2 text-xs text-gray-500">
                      행사 유형을 선택해주세요.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    핵심 목적 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_GOALS.map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        disabled={readonly}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          eventGoals.includes(goal)
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                  {eventGoals.includes('기타') && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customGoal}
                        onChange={(e) => setCustomGoal(e.target.value)}
                        disabled={readonly}
                        placeholder="기타 목적을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}
                  {eventGoals.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      하나 이상의 목적을 선택해주세요.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: 관심 키워드 빌더 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Search className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  섹션 2: 관심 키워드 빌더
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                어떤 검색어로 트렌드를 찾으시겠습니까? 행사 유형에 맞는 키워드를 입력하세요.
              </p>

              <div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addKeyword()
                      }
                    }}
                    disabled={readonly}
                    placeholder={eventType ? `${eventType} 관련 키워드를 입력하세요 (예: 성수 팝업, 더현대 팝업)` : '키워드를 입력하세요'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    disabled={readonly || !keywordInput.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    추가
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  키워드를 입력하고 <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> 키를 누르면 추가됩니다.
                </p>

                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                      >
                        {keyword}
                        {!readonly && (
                          <button
                            type="button"
                            onClick={() => removeKeyword(keyword)}
                            className="text-indigo-700 hover:text-indigo-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: 트렌드 데이터 로깅 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  섹션 3: 트렌드 데이터 로깅
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                소셜 미디어와 뉴스에서 수집한 트렌드 데이터를 체계적으로 정리하세요. (최대 3개)
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                {trendLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        트렌드 데이터 {index + 1}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          플랫폼
                        </label>
                        <select
                          value={log.platform}
                          onChange={(e) => updateTrendLog(log.id, 'platform', e.target.value)}
                          disabled={readonly}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">선택하세요</option>
                          {PLATFORMS.map((platform) => (
                            <option key={platform} value={platform}>
                              {platform}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          검색어
                        </label>
                        <input
                          type="text"
                          value={log.keyword}
                          onChange={(e) => updateTrendLog(log.id, 'keyword', e.target.value)}
                          disabled={readonly}
                          placeholder="실제 검색한 키워드"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수치(Volume)
                        </label>
                        <input
                          type="text"
                          value={log.volume}
                          onChange={(e) => updateTrendLog(log.id, 'volume', e.target.value)}
                          disabled={readonly}
                          placeholder="예: 게시물 수, 조회수 등"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          링크
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={log.link}
                            onChange={(e) => updateTrendLog(log.id, 'link', e.target.value)}
                            disabled={readonly}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          {log.link && (
                            <a
                              href={log.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              title="새 창에서 열기"
                            >
                              <LinkIcon className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          인사이트/메모
                        </label>
                        <textarea
                          value={log.insight}
                          onChange={(e) => updateTrendLog(log.id, 'insight', e.target.value)}
                          disabled={readonly}
                          rows={3}
                          placeholder="해당 데이터에서 발견한 점을 자유롭게 기록하세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: 트렌드 분석 리포트 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  섹션 4: 트렌드 분석 리포트
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                수집한 데이터를 바탕으로 AI에게 질문할 프롬프트를 생성하고, 분석 결과를 정리하세요.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      프롬프트 생성기
                    </label>
                    <button
                      type="button"
                      onClick={copyPrompt}
                      disabled={!insightPrompt || readonly}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          복사하기
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={insightPrompt}
                    readOnly
                    rows={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm resize-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    위 프롬프트를 복사하여 ChatGPT 등 AI 도구에 붙여넣어 사용하세요.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    분석 결과 에디터
                  </label>
                  <textarea
                    value={insightResult}
                    onChange={(e) => setInsightResult(e.target.value)}
                    disabled={readonly}
                    rows={20}
                    placeholder="AI의 답변을 붙여넣거나, 직접 요약 정리하세요.

예시 구조:
1. 트렌드 키워드 (이모지 포함)
   - 현상 분석
   - 기획 적용 포인트

2. 트렌드 키워드 (이모지 포함)
   - 현상 분석
   - 기획 적용 포인트

3. 트렌드 키워드 (이모지 포함)
   - 현상 분석
   - 기획 적용 포인트"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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

export default function EventWeek1Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <EventWeek1PageContent />
    </Suspense>
  )
}

