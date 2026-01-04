'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Calendar,
  Clock,
  CheckSquare,
  Plus,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
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
import { useWorkbookCredit } from '@/hooks/useWorkbookCredit'
import { EVENT_TRANSLATIONS } from '@/i18n/translations'
import { useLanguage } from '@/contexts/LanguageContext'

export const dynamic = 'force-dynamic'

// 파트 구분 옵션 (다국어 지원)
const getTaskParts = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const parts = EVENT_TRANSLATIONS[safeLang].session11.taskParts
  return [parts.planning, parts.design, parts.marketing]
}

// 시점별 기본 과업 템플릿 (다국어 지원)
const getDefaultTasksByPhase = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const parts = EVENT_TRANSLATIONS[safeLang].session11.taskParts
  const tasks = EVENT_TRANSLATIONS[safeLang].session11.defaultTasks
  return {
    'D-30': [
      { part: parts.planning, task: tasks.d30.venueContract },
      { part: parts.planning, task: tasks.d30.vendorSelection },
      { part: parts.planning, task: tasks.d30.permitReview },
    ],
    'D-14': [
      { part: parts.design, task: tasks.d14.productionOrder },
      { part: parts.marketing, task: tasks.d14.contentRelease },
      { part: parts.marketing, task: tasks.d14.preBookingOpen },
    ],
    'D-7': [
      { part: parts.planning, task: tasks.d7.itemListCheck },
      { part: parts.planning, task: tasks.d7.staffTraining },
      { part: parts.planning, task: tasks.d7.rehearsalPrep },
    ],
    'D-1': [
      { part: parts.design, task: tasks.d1.onSiteSetup },
      { part: parts.planning, task: tasks.d1.rehearsal },
    ],
    'D+7': [
      { part: parts.planning, task: tasks.d7post.settlement },
      { part: parts.planning, task: tasks.d7post.report },
      { part: parts.marketing, task: tasks.d7post.thankYou },
    ],
  }
}

// 사후 관리 카테고리 (다국어 지원)
const getPostEventCategories = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const T = EVENT_TRANSLATIONS[safeLang].session11
  const items = T.postEventItems
  return {
    [T.teardown]: [
      items.teardown.rentalReturn,
      items.teardown.wasteDisposal,
      items.teardown.facilityCheck,
      items.teardown.restoration,
    ],
    [T.settlement]: [
      items.settlement.invoice,
      items.settlement.staffPayment,
      items.settlement.budgetSummary,
      items.settlement.contractArchive,
    ],
    [T.dataFeedback]: [
      items.dataFeedback.photoBackup,
      items.dataFeedback.visitorData,
      items.dataFeedback.snsMonitoring,
      items.dataFeedback.dataAnalysis,
    ],
  }
}

interface TaskCard {
  id: string
  part: string // 파트 구분
  task: string // 과업 내용
  completed: boolean // 완료 여부
  memo: string // 담당자 지정이나 비고
}

interface TimelinePhase {
  phase: string // D-30, D-14, D-7, D-1, D+7
  tasks: TaskCard[]
}

interface CueSheetRow {
  id: string
  time: string // 시작 시간 (HH:MM)
  duration: string // 소요 시간 (분)
  program: string // 프로그램/내용
  audioVisual: string // 기술 감독용 메모
  staff: string // 스태프 R&R
}

interface PostEventChecklist {
  category: string // 카테고리
  items: Array<{ id: string; item: string; completed: boolean }> // 체크리스트 항목
}

interface EventWeek11Data {
  projectSchedule: {
    kickOff: string // 준비 시작일
    dDay: string // 행사 당일 (4회차에서 불러옴)
    wrapUp: string // 프로젝트 종료일
  }
  timeline: TimelinePhase[]
  cueSheet: CueSheetRow[]
  postEvent: PostEventChecklist[]
  is_submitted?: boolean
}

function EventWeek11PageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const { language } = useLanguage()
  const safeLanguage = language || 'ko'
  const T = EVENT_TRANSLATIONS[safeLanguage]?.session11 || EVENT_TRANSLATIONS['ko'].session11
  const TASK_PARTS = getTaskParts(safeLanguage)
  const DEFAULT_TASKS_BY_PHASE = getDefaultTasksByPhase(safeLanguage)
  const POST_EVENT_CATEGORIES = getPostEventCategories(safeLanguage)

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
  const { checkAndDeductCredit } = useWorkbookCredit(projectId, 11)

  // State
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')

  // 4회차 참고 정보
  const [week4Info, setWeek4Info] = useState<{
    startDate: string
    endDate: string
    operatingHours: string
  }>({
    startDate: '',
    endDate: '',
    operatingHours: '',
  })

  // 프로젝트 기간
  const [projectSchedule, setProjectSchedule] = useState({
    kickOff: '',
    dDay: '',
    wrapUp: '',
  })

  // D-Day 통합 타임라인
  const [timeline, setTimeline] = useState<TimelinePhase[]>([])
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)

  // 행사 당일 큐시트
  const [cueSheet, setCueSheet] = useState<CueSheetRow[]>([])

  // 사후 관리 체크리스트
  const [postEvent, setPostEvent] = useState<PostEventChecklist[]>([])

  // 프로젝트 기간 변경 시 타임라인 업데이트
  useEffect(() => {
    if (!projectSchedule.dDay) return

    const dDayDate = new Date(projectSchedule.dDay)
    const phases: TimelinePhase[] = []

    // D-30
    const dMinus30 = new Date(dDayDate)
    dMinus30.setDate(dMinus30.getDate() - 30)
    if (!projectSchedule.kickOff || new Date(projectSchedule.kickOff) <= dMinus30) {
      phases.push({
        phase: 'D-30',
        tasks: timeline.find((t) => t.phase === 'D-30')?.tasks || [],
      })
    }

    // D-14
    const dMinus14 = new Date(dDayDate)
    dMinus14.setDate(dMinus14.getDate() - 14)
    phases.push({
      phase: 'D-14',
      tasks: timeline.find((t) => t.phase === 'D-14')?.tasks || [],
    })

    // D-7
    const dMinus7 = new Date(dDayDate)
    dMinus7.setDate(dMinus7.getDate() - 7)
    phases.push({
      phase: 'D-7',
      tasks: timeline.find((t) => t.phase === 'D-7')?.tasks || [],
    })

    // D-1
    const dMinus1 = new Date(dDayDate)
    dMinus1.setDate(dMinus1.getDate() - 1)
    phases.push({
      phase: 'D-1',
      tasks: timeline.find((t) => t.phase === 'D-1')?.tasks || [],
    })

    // D+7
    const dPlus7 = new Date(dDayDate)
    dPlus7.setDate(dPlus7.getDate() + 7)
    if (!projectSchedule.wrapUp || new Date(projectSchedule.wrapUp) >= dPlus7) {
      phases.push({
        phase: 'D+7',
        tasks: timeline.find((t) => t.phase === 'D+7')?.tasks || [],
      })
    }

    // 기존 타임라인이 있으면 유지, 없으면 기본 템플릿 사용
    const updatedTimeline = phases.map((phase) => {
      const existing = timeline.find((t) => t.phase === phase.phase)
      if (existing && existing.tasks.length > 0) {
        return existing
      }
      // 기본 템플릿 사용
      const defaultTasks = DEFAULT_TASKS_BY_PHASE[phase.phase] || []
      return {
        phase: phase.phase,
        tasks: defaultTasks.map((task, idx) => ({
          id: `${phase.phase}-${idx}`,
          part: task.part,
          task: task.task,
          completed: false,
          memo: '',
        })),
      }
    })

    setTimeline(updatedTimeline)
  }, [projectSchedule.dDay, projectSchedule.kickOff, projectSchedule.wrapUp])

  // 사후 관리 체크리스트 초기화 (언어 변경 시에도 업데이트)
  useEffect(() => {
    const categories = getPostEventCategories(safeLanguage)
    const initialChecklist: PostEventChecklist[] = Object.entries(categories).map(
      ([category, items]) => ({
        category,
        items: items.map((item, idx) => ({
          id: `${category}-${idx}`,
          item,
          completed: false,
        })),
      })
    )
    // 기존 체크 상태를 유지하면서 텍스트만 업데이트
    if (postEvent.length === 0) {
      setPostEvent(initialChecklist)
    } else {
      // 언어가 변경되면 텍스트를 업데이트하되 완료 상태는 유지
      setPostEvent((prev) => {
        const updated = initialChecklist.map((newCat, newIdx) => {
          const prevCat = prev[newIdx]
          if (prevCat && prevCat.items.length === newCat.items.length) {
            // 같은 인덱스의 항목들의 완료 상태를 유지
            return {
              ...newCat,
              items: newCat.items.map((newItem, itemIdx) => ({
                ...newItem,
                completed: prevCat.items[itemIdx]?.completed || false,
              })),
            }
          }
          return newCat
        })
        return updated
      })
    }
  }, [safeLanguage])

  // 총 기간 계산
  const totalPeriod = useMemo(() => {
    if (!projectSchedule.kickOff || !projectSchedule.wrapUp) return null

    const start = new Date(projectSchedule.kickOff)
    const end = new Date(projectSchedule.wrapUp)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    const dDay = projectSchedule.dDay ? new Date(projectSchedule.dDay) : null
    const prepDays = dDay
      ? Math.ceil(Math.abs(dDay.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : null

    return { total: diffDays, prep: prepDays }
  }, [projectSchedule])

  // 타임라인 과업 추가
  const addTimelineTask = (phase: string) => {
    setTimeline(
      timeline.map((t) => {
        if (t.phase === phase) {
          return {
            ...t,
            tasks: [
              ...t.tasks,
              {
                id: `${phase}-${Date.now()}`,
                part: '기획/운영',
                task: '',
                completed: false,
                memo: '',
              },
            ],
          }
        }
        return t
      })
    )
  }

  // 타임라인 과업 삭제
  const removeTimelineTask = (phase: string, taskId: string) => {
    setTimeline(
      timeline.map((t) => {
        if (t.phase === phase) {
          return {
            ...t,
            tasks: t.tasks.filter((task) => task.id !== taskId),
          }
        }
        return t
      })
    )
  }

  // 타임라인 과업 업데이트
  const updateTimelineTask = (phase: string, taskId: string, field: keyof TaskCard, value: any) => {
    setTimeline(
      timeline.map((t) => {
        if (t.phase === phase) {
          return {
            ...t,
            tasks: t.tasks.map((task) =>
              task.id === taskId ? { ...task, [field]: value } : task
            ),
          }
        }
        return t
      })
    )
  }

  // 큐시트 행 추가
  const addCueSheetRow = () => {
    setCueSheet([
      ...cueSheet,
      {
        id: Date.now().toString(),
        time: '',
        duration: '',
        program: '',
        audioVisual: '',
        staff: '',
      },
    ])
  }

  // 큐시트 행 삭제
  const removeCueSheetRow = (id: string) => {
    setCueSheet(cueSheet.filter((row) => row.id !== id))
  }

  // 큐시트 행 업데이트
  const updateCueSheetRow = (id: string, field: keyof CueSheetRow, value: any) => {
    setCueSheet(cueSheet.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  // 큐시트 행 순서 변경
  const moveCueSheetRow = (id: string, direction: 'up' | 'down') => {
    const index = cueSheet.findIndex((row) => row.id === id)
    if (index === -1) return

    if (direction === 'up' && index > 0) {
      const newCueSheet = [...cueSheet]
      ;[newCueSheet[index - 1], newCueSheet[index]] = [
        newCueSheet[index],
        newCueSheet[index - 1],
      ]
      setCueSheet(newCueSheet)
    } else if (direction === 'down' && index < cueSheet.length - 1) {
      const newCueSheet = [...cueSheet]
      ;[newCueSheet[index], newCueSheet[index + 1]] = [
        newCueSheet[index + 1],
        newCueSheet[index],
      ]
      setCueSheet(newCueSheet)
    }
  }

  // 사후 관리 체크리스트 토글
  const togglePostEventItem = (category: string, itemId: string) => {
    setPostEvent(
      postEvent.map((cat) => {
        if (cat.category === category) {
          return {
            ...cat,
            items: cat.items.map((item) =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          }
        }
        return cat
      })
    )
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 프로젝트 기간
    total += 3 // kickOff, dDay, wrapUp
    if (projectSchedule.kickOff) filled += 1
    if (projectSchedule.dDay) filled += 1
    if (projectSchedule.wrapUp) filled += 1

    // 타임라인 (최소 1개 시점의 1개 과업)
    total += 1
    if (timeline.some((t) => t.tasks.length > 0)) filled += 1

    // 큐시트 (최소 1개 행)
    total += 1
    if (cueSheet.length > 0) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(11 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.projectSchedule) {
        total += 3
        if (data.projectSchedule.kickOff) filled += 1
        if (data.projectSchedule.dDay) filled += 1
        if (data.projectSchedule.wrapUp) filled += 1
      } else {
        total += 3
      }

      total += 1
      if (data.timeline?.some((t: any) => t.tasks?.length > 0)) filled += 1

      total += 1
      if (data.cueSheet?.length > 0) filled += 1

      return total > 0 ? Math.round((filled / total) * 100) : 0
    })
  }, [registerProgressCalculator])

  // 저장
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage(language === 'ko' ? '프로젝트 ID가 필요합니다.' : 'Project ID is required.')
      setToastVisible(true)
      return
    }

    // 최초 1회 저장 시 크레딧 차감
    try {
      await checkAndDeductCredit()
    } catch (error: any) {
      setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
      setToastVisible(true)
      return
    }

    const eventData: EventWeek11Data = {
      projectSchedule,
      timeline,
      cueSheet,
      postEvent,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(11, eventData, progress)

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
      setToastMessage(language === 'ko' ? '프로젝트 ID가 필요합니다.' : 'Project ID is required.')
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

    // 제출 시에도 크레딧 차감 (저장 시 차감 안 했을 경우)
    if (!isSubmitted) {
      try {
        await checkAndDeductCredit()
      } catch (error: any) {
        setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
        setToastVisible(true)
        return
      }
    }

    const eventData: EventWeek11Data = {
      projectSchedule,
      timeline,
      cueSheet,
      postEvent,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(11, eventData, newSubmittedState, progress)

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

    setProjectSchedule({
      kickOff: '',
      dDay: '',
      wrapUp: '',
    })
    setTimeline([])
    setCueSheet([])
    setPostEvent([])
    setIsSubmitted(false)
  }

  // 프로젝트 설정
  const handleUpdateProjectTitle = async () => {
    const success = await updateProjectTitle(newProjectTitle)
    if (success) {
      setShowSettings(false)
      setToastMessage(language === 'ko' ? '프로젝트명이 변경되었습니다.' : 'Project name has been changed.')
      setToastVisible(true)
    } else {
      setToastMessage(language === 'ko' ? '프로젝트명 변경 중 오류가 발생했습니다.' : 'Error occurred while changing project name.')
      setToastVisible(true)
    }
  }

  const handleDeleteProject = async () => {
    const confirmMsg = language === 'ko' 
      ? '정말 이 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
      : 'Are you sure you want to delete this project?\nThis action cannot be undone.'
    if (!confirm(confirmMsg)) {
      return
    }

    const success = await deleteProject()
    if (success) {
      router.push('/dashboard')
    } else {
      setToastMessage(language === 'ko' ? '프로젝트 삭제 중 오류가 발생했습니다.' : 'Error occurred while deleting project.')
      setToastVisible(true)
    }
  }

  // 프로젝트 요약
  const handleProjectSummary = async () => {
    if (!projectId) {
      setToastMessage(language === 'ko' ? '프로젝트 ID가 필요합니다.' : 'Project ID is required.')
      setToastVisible(true)
      return
    }

    const summary = await generateSummary(projectId, projectInfo?.title || null)
    if (summary) {
      setSummaryPrompt(summary)
      setShowProjectSummary(true)
    } else {
      setToastMessage(language === 'ko' ? '워크북 데이터가 없습니다.' : 'No workbook data available.')
      setToastVisible(true)
    }
  }

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryPrompt)
      setToastMessage(language === 'ko' ? '프롬프트가 클립보드에 복사되었습니다.' : 'Prompt copied to clipboard.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage(language === 'ko' ? '복사 실패' : 'Copy failed')
      setToastVisible(true)
    }
  }

  // 4회차 데이터 로드
  useEffect(() => {
    const loadWeek4Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(4)
        if (data && (data as any).basicInfo) {
          const bi = (data as any).basicInfo
          setWeek4Info({
            startDate: bi.startDate || '',
            endDate: bi.endDate || '',
            operatingHours: bi.operatingHours || '',
          })
          // D-Day 자동 설정
          if (bi.startDate && !projectSchedule.dDay) {
            setProjectSchedule((prev) => ({ ...prev, dDay: bi.startDate }))
          }
        }
      } catch (error) {
        console.error('4회차 데이터 로드 오류:', error)
      }
    }

    loadWeek4Data()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(11)
      if (data) {
        const eventData = data as EventWeek11Data
        if (eventData.projectSchedule) {
          setProjectSchedule(eventData.projectSchedule)
        }
        if (eventData.timeline) {
          setTimeline(eventData.timeline)
        }
        if (eventData.cueSheet) {
          setCueSheet(eventData.cueSheet)
        }
        if (eventData.postEvent) {
          setPostEvent(eventData.postEvent)
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
          filter: `project_id=eq.${projectId}&step_number=eq.11`,
        },
        async () => {
          const data = await loadStepData(11)
          if (data) {
            const eventData = data as EventWeek11Data
            if (eventData.projectSchedule) {
              setProjectSchedule(eventData.projectSchedule)
            }
            if (eventData.timeline) {
              setTimeline(eventData.timeline)
            }
            if (eventData.cueSheet) {
              setCueSheet(eventData.cueSheet)
            }
            if (eventData.postEvent) {
              setPostEvent(eventData.postEvent)
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
    // 사이드바는 항상 영어 (Global Shell)
    const titles = EVENT_TRANSLATIONS.en.titles
    const title = titles[week - 1] || `Week ${week}`
    return title
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
              <h3 className="font-semibold text-gray-900 mb-2">{language === 'ko' ? '프로젝트 ID 필요' : 'Project ID Required'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'ko' ? '프로젝트 ID가 제공되지 않았습니다. 대시보드에서 프로젝트를 선택해주세요.' : 'Project ID was not provided. Please select a project from the dashboard.'}
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                {language === 'ko' ? '대시보드로 이동' : 'Go to Dashboard'}
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
        title={getWeekTitle(11)}
        description={EVENT_TRANSLATIONS[safeLanguage]?.descriptions?.[10] || EVENT_TRANSLATIONS['ko'].descriptions[10]}
        phase="Phase 3: Prototype"
        isScrolled={isScrolled}
        currentWeek={11}
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
          currentWeek={11}
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
            {/* 프로젝트 기간 설정 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{T.projectPeriod}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {T.projectPeriodDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {T.kickoffDate}
                  </label>
                  <input
                    type="date"
                    value={projectSchedule.kickOff}
                    onChange={(e) =>
                      setProjectSchedule({ ...projectSchedule, kickOff: e.target.value })
                    }
                    disabled={readonly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {T.dday}
                  </label>
                  <input
                    type="date"
                    value={projectSchedule.dDay}
                    onChange={(e) =>
                      setProjectSchedule({ ...projectSchedule, dDay: e.target.value })
                    }
                    disabled={readonly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">{T.linkToWeek4}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {T.wrapupDate}
                  </label>
                  <input
                    type="date"
                    value={projectSchedule.wrapUp}
                    onChange={(e) =>
                      setProjectSchedule({ ...projectSchedule, wrapUp: e.target.value })
                    }
                    disabled={readonly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 총 기간 요약 */}
              {totalPeriod && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-sm text-indigo-900">
                    <strong>{language === 'ko' ? '총 준비 기간:' : 'Total Prep Period:'}</strong> {totalPeriod.prep}{T.days}
                    {totalPeriod.total && (
                      <span className="ml-4">
                        <strong>{T.totalPeriod}:</strong> {totalPeriod.total}{T.days}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* D-Day 통합 타임라인 */}
            {timeline.length > 0 && (
              <div className="glass rounded-2xl shadow-lg p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-indigo-600" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{T.integratedTimeline}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {T.integratedTimelineDesc}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (allExpanded) {
                        setExpandedPhases(new Set())
                        setAllExpanded(false)
                      } else {
                        setExpandedPhases(new Set(timeline.map((p) => p.phase)))
                        setAllExpanded(true)
                      }
                    }}
                    disabled={readonly}
                    className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {allExpanded ? T.collapse : T.expand}
                  </button>
                </div>

                {/* 아코디언 형식 타임라인 */}
                <div className="space-y-2">
                  {timeline.map((phase) => {
                    const isExpanded = expandedPhases.has(phase.phase)
                    const completedCount = phase.tasks.filter((t) => t.completed).length
                    const totalCount = phase.tasks.length

                    return (
                      <div
                        key={phase.phase}
                        className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                      >
                        {/* 아코디언 헤더 */}
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedPhases)
                            if (isExpanded) {
                              newExpanded.delete(phase.phase)
                            } else {
                              newExpanded.add(phase.phase)
                            }
                            setExpandedPhases(newExpanded)
                            setAllExpanded(newExpanded.size === timeline.length)
                          }}
                          disabled={readonly}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="font-semibold text-gray-900">{phase.phase}</span>
                            {totalCount > 0 && (
                              <span className="text-xs text-gray-500">
                                ({completedCount}/{totalCount} {language === 'ko' ? '완료' : 'completed'})
                              </span>
                            )}
                          </div>
                        </button>

                        {/* 아코디언 콘텐츠 */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                            {phase.tasks.length === 0 ? (
                              <p className="text-sm text-gray-500 py-4 text-center">
                                {language === 'ko' ? '과업이 없습니다. 아래 버튼을 클릭하여 추가하세요.' : 'No tasks. Click the button below to add.'}
                              </p>
                            ) : (
                              phase.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                                >
                                  <div className="flex items-start gap-4">
                                    <input
                                      type="checkbox"
                                      checked={task.completed}
                                      onChange={(e) =>
                                        updateTimelineTask(phase.phase, task.id, 'completed', e.target.checked)
                                      }
                                      disabled={readonly}
                                      className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          {T.part}
                                        </label>
                                        <select
                                          value={task.part}
                                          onChange={(e) =>
                                            updateTimelineTask(phase.phase, task.id, 'part', e.target.value)
                                          }
                                          disabled={readonly}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                          {TASK_PARTS.map((part) => (
                                            <option key={part} value={part}>
                                              {part}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          {T.task}
                                        </label>
                                        <input
                                          type="text"
                                          value={task.task}
                                          onChange={(e) =>
                                            updateTimelineTask(phase.phase, task.id, 'task', e.target.value)
                                          }
                                          disabled={readonly}
                                          placeholder={language === 'ko' ? '과업 내용 입력' : 'Enter task'}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            {T.memo}
                                          </label>
                                          <input
                                            type="text"
                                            value={task.memo}
                                            onChange={(e) =>
                                              updateTimelineTask(phase.phase, task.id, 'memo', e.target.value)
                                            }
                                            disabled={readonly}
                                            placeholder={language === 'ko' ? '담당자/비고' : 'Person in charge/Notes'}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeTimelineTask(phase.phase, task.id)}
                                          disabled={readonly}
                                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <X className="w-5 h-5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}

                            <button
                              type="button"
                              onClick={() => addTimelineTask(phase.phase)}
                              disabled={readonly}
                              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-600"
                            >
                              <Plus className="w-4 h-4 inline mr-1" />
                              {T.addTask}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 행사 당일 큐시트 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{T.onSiteCueSheet}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {T.onSiteCueSheetDesc}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">{language === 'ko' ? '순서' : 'Order'}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                        {T.time}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                        {T.duration}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                        {T.program}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                        {T.audioVisual}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                        {T.staff}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">{language === 'ko' ? '작업' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cueSheet.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                          {language === 'ko' ? '큐시트 행을 추가해주세요.' : 'Please add cue sheet rows.'}
                        </td>
                      </tr>
                    ) : (
                      cueSheet.map((row, index) => (
                        <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-3 py-3">
                            <input
                              type="time"
                              value={row.time}
                              onChange={(e) => updateCueSheetRow(row.id, 'time', e.target.value)}
                              disabled={readonly}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={row.duration}
                              onChange={(e) => updateCueSheetRow(row.id, 'duration', e.target.value)}
                              disabled={readonly}
                              placeholder={language === 'ko' ? '분' : 'min'}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={row.program}
                              onChange={(e) => updateCueSheetRow(row.id, 'program', e.target.value)}
                              disabled={readonly}
                              placeholder={language === 'ko' ? '프로그램/내용' : 'Program/Content'}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={row.audioVisual}
                              onChange={(e) => updateCueSheetRow(row.id, 'audioVisual', e.target.value)}
                              disabled={readonly}
                              placeholder={language === 'ko' ? '기술 감독용 메모' : 'Technical Director Notes'}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={row.staff}
                              onChange={(e) => updateCueSheetRow(row.id, 'staff', e.target.value)}
                              disabled={readonly}
                              placeholder={language === 'ko' ? '스태프 R&R' : 'Staff R&R'}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveCueSheetRow(row.id, 'up')}
                                disabled={readonly || index === 0}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={language === 'ko' ? '위로 이동' : 'Move Up'}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveCueSheetRow(row.id, 'down')}
                                disabled={readonly || index === cueSheet.length - 1}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={language === 'ko' ? '아래로 이동' : 'Move Down'}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCueSheetRow(row.id)}
                                disabled={readonly}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={language === 'ko' ? '삭제' : 'Delete'}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <button
                  type="button"
                  onClick={addCueSheetRow}
                  disabled={readonly}
                  className="mt-4 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-600"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  {T.addRow}
                </button>
              </div>
            </div>

            {/* 사후 관리 체크리스트 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <CheckSquare className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{T.postEventChecklist}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {T.postEventChecklistDesc}
                  </p>
                </div>
              </div>

              {/* 가로로 한 줄 배치 */}
              <div className="flex flex-wrap gap-4">
                {postEvent.map((category) =>
                  category.items.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        item.completed
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => togglePostEventItem(category.category, item.id)}
                        disabled={readonly}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <span className="text-sm whitespace-nowrap">
                        {item.item}
                      </span>
                    </label>
                  ))
                )}
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

export default function EventWeek11Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중... / Loading...</p>
          </div>
        </div>
      }
    >
      <EventWeek11PageContent />
    </Suspense>
  )
}

