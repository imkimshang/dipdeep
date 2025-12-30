'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Lightbulb,
  MessageSquare,
  Target,
  AlertCircle,
  FileText,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Send,
  Undo2,
  Rocket,
  CheckSquare,
  Settings,
  X,
  FileDown,
  Trash2,
} from 'lucide-react'
import { Toast } from '@/components/Toast'

interface ProblemLog {
  id: number
  title: string
  description: string
  goal: string
}

interface Mission1 {
  question: string
  reflection: string
}

interface Mission2 {
  context: string
  task: string
  reflection: string
}

interface Mission3 {
  role: string
  context: string
  task: string
  reflection: string
}

interface PromptStudio {
  mission1: Mission1
  mission2: Mission2
  mission3: Mission3
}

interface Week1Data {
  problemLog: ProblemLog[]
  promptStudio: PromptStudio
  is_submitted?: boolean
}

export default function Week1Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [projectIdInput, setProjectIdInput] = useState(projectId || '')
  const [allSteps, setAllSteps] = useState<
    Array<{
      id: string
      project_id: string | null
      step_number: number | null
      step_data: any
      ai_feedback: any
    }>
  >([])

  const [problemLog, setProblemLog] = useState<ProblemLog[]>([
    { id: 1, title: '', description: '', goal: '' },
    { id: 2, title: '', description: '', goal: '' },
    { id: 3, title: '', description: '', goal: '' },
  ])

  const [activeMission, setActiveMission] = useState<1 | 2 | 3>(1)
  const [copied, setCopied] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [projectInfo, setProjectInfo] = useState<{ title: string | null; id: string } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')

  const [promptStudio, setPromptStudio] = useState<PromptStudio>({
    mission1: {
      question: '',
      reflection: '',
    },
    mission2: {
      context: '',
      task: '',
      reflection: '',
    },
    mission3: {
      role: '',
      context: '',
      task: '',
      reflection: '',
    },
  })

  // Handle scroll for header shrinking
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Week titles mapping
  const getWeekTitle = (week: number): string => {
    const titles: { [key: number]: string } = {
      1: 'Phase 1 - 문제 발견과 목표 설정',
      2: 'Phase 1 - 데이터 탐색 및 교차 검증',
      3: 'Phase 1 - 가상 페르소나 설정 및 설문 설계',
      4: 'Phase 1 - 문제 정의',
      5: 'Phase 2 - 인사이트 도출',
      6: 'Phase 2 - 의미 탐구',
      7: 'Phase 2 - 패턴 분석',
      8: 'Phase 2 - 핵심 가치 발견',
      9: 'Phase 3 - 프로토타입 기획',
      10: 'Phase 3 - 프로토타입 설계',
      11: 'Phase 3 - 프로토타입 구현',
      12: 'Phase 3 - 검증과 개선',
    }
    return titles[week] || `Week ${week}`
  }

  // Load project info and steps data
  useEffect(() => {
    const loadData = async () => {
      const currentProjectId = projectId || projectIdInput
      if (!currentProjectId) return

      try {
        // Load project info
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: project } = await supabase
            .from('projects')
            .select('title, id')
            .eq('id', currentProjectId)
            .eq('user_id', user.id)
            .single()

          if (project) {
            const proj = project as { title: string | null; id: string }
            setProjectInfo({ title: proj.title, id: proj.id })
            setNewProjectTitle(proj.title || '')
          }
        }

        // Load all steps for navigation
        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', currentProjectId)
          .order('step_number', { ascending: true })

        if (steps) {
          setAllSteps(steps as any[])
        }

        // Load current week (week 1) data
        const { data: step } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', currentProjectId)
          .eq('step_number', 1)
          .single() as any

        if (step?.step_data) {
          const data = step.step_data as Week1Data
          if (data.problemLog) {
            setProblemLog(data.problemLog)
          }
          if (data.promptStudio) {
            setPromptStudio(data.promptStudio)
          }
          if (data.is_submitted) {
            setIsSubmitted(data.is_submitted)
          }
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error)
      }
    }

    loadData()
  }, [projectId, projectIdInput, supabase])

  // Refresh steps after save/submit
  const refreshSteps = async () => {
    if (!projectIdInput.trim()) return
    try {
      const { data: steps } = await supabase
        .from('project_steps')
        .select('*')
        .eq('project_id', projectIdInput)
        .order('step_number', { ascending: true })
      if (steps) {
        setAllSteps(steps)
      }
    } catch (error) {
      console.error('Steps 로드 오류:', error)
    }
  }

  // Get step status for navigation
  const getStepStatus = (stepNumber: number) => {
    const step = allSteps.find((s) => (s as any).step_number === stepNumber)
    if (!step || !(step as any).step_data) {
      return { hasData: false, isSubmitted: false, progress: 0 }
    }
    
    const data = step.step_data as any
    const hasData = !!data
    const isSubmitted = data.is_submitted || false
    
    // Calculate progress for this step (simplified - can be enhanced per step)
    let filledFields = 0
    let totalFields = 0
    
    if (stepNumber === 1) {
      // Week 1 specific calculation
      if (data.problemLog) {
        data.problemLog.forEach((p: any) => {
          totalFields += 3
          if (p.title?.trim()) filledFields++
          if (p.description?.trim()) filledFields++
          if (p.goal?.trim()) filledFields++
        })
      }
      if (data.promptStudio) {
        if (data.promptStudio.mission1) totalFields += 2
        if (data.promptStudio.mission2) totalFields += 3
        if (data.promptStudio.mission3) totalFields += 4
        // Count filled fields for prompt studio
        if (data.promptStudio.mission1?.question?.trim()) filledFields++
        if (data.promptStudio.mission1?.reflection?.trim()) filledFields++
        if (data.promptStudio.mission2?.context?.trim()) filledFields++
        if (data.promptStudio.mission2?.task?.trim()) filledFields++
        if (data.promptStudio.mission2?.reflection?.trim()) filledFields++
        if (data.promptStudio.mission3?.role?.trim()) filledFields++
        if (data.promptStudio.mission3?.context?.trim()) filledFields++
        if (data.promptStudio.mission3?.task?.trim()) filledFields++
        if (data.promptStudio.mission3?.reflection?.trim()) filledFields++
      }
    } else {
      // For other weeks, check if step_data exists
      totalFields = 10 // Default assumption
      filledFields = hasData ? 5 : 0 // Simplified
    }
    
    const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0
    
    return { hasData, isSubmitted, progress }
  }

  // Calculate phase progress
  const getPhaseProgress = (phase: 1 | 2 | 3) => {
    const phaseWeeks = {
      1: [1, 2, 3, 4],
      2: [5, 6, 7, 8],
      3: [9, 10, 11, 12],
    }

    const weeks = phaseWeeks[phase]
    let totalProgress = 0
    let completedWeeks = 0

    weeks.forEach((week) => {
      const status = getStepStatus(week)
      if (status.hasData) {
        totalProgress += status.progress
        completedWeeks++
      }
    })

    return completedWeeks > 0
      ? Math.round(totalProgress / completedWeeks)
      : 0
  }

  // Calculate overall progress
  const getOverallProgress = () => {
    let totalProgress = 0
    let completedWeeks = 0

    for (let week = 1; week <= 12; week++) {
      const status = getStepStatus(week)
      if (status.hasData) {
        totalProgress += status.progress
        completedWeeks++
      }
    }

    return completedWeeks > 0
      ? Math.round(totalProgress / completedWeeks)
      : 0
  }

  const handleProblemLogChange = (
    index: number,
    field: keyof ProblemLog,
    value: string
  ) => {
    const updated = [...problemLog]
    updated[index] = { ...updated[index], [field]: value }
    setProblemLog(updated)
  }

  const handleMission1Change = (
    field: keyof Mission1,
    value: string
  ) => {
    setPromptStudio({
      ...promptStudio,
      mission1: { ...promptStudio.mission1, [field]: value },
    })
  }

  const handleMission2Change = (
    field: keyof Mission2,
    value: string
  ) => {
    setPromptStudio({
      ...promptStudio,
      mission2: { ...promptStudio.mission2, [field]: value },
    })
  }

  const handleMission3Change = (
    field: keyof Mission3,
    value: string
  ) => {
    setPromptStudio({
      ...promptStudio,
      mission3: { ...promptStudio.mission3, [field]: value },
    })
  }

  const getPreviewText = (): string => {
    if (activeMission === 2) {
      let text = ''
      if (promptStudio.mission2.context) {
        text += `Context:\n${promptStudio.mission2.context}\n\n`
      }
      if (promptStudio.mission2.task) {
        text += `Task:\n${promptStudio.mission2.task}`
      }
      return text
    } else if (activeMission === 3) {
      let text = ''
      if (promptStudio.mission3.role) {
        text += `Role:\n${promptStudio.mission3.role}\n\n`
      }
      if (promptStudio.mission3.context) {
        text += `Context:\n${promptStudio.mission3.context}\n\n`
      }
      if (promptStudio.mission3.task) {
        text += `Task:\n${promptStudio.mission3.task}`
      }
      return text
    }
    return ''
  }

  const handleCopyPreview = async () => {
    const previewText = getPreviewText()
    if (previewText) {
      try {
        await navigator.clipboard.writeText(previewText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('복사 실패:', err)
      }
    }
  }

  // Calculate progress based on filled fields
  const calculateProgress = (): number => {
    let filledFields = 0
    let totalFields = 0

    // ProblemLog: 3 cards x 3 fields = 9 fields
    problemLog.forEach((problem) => {
      totalFields += 3
      if (problem.title.trim()) filledFields++
      if (problem.description.trim()) filledFields++
      if (problem.goal.trim()) filledFields++
    })

    // Mission1: 2 fields
    totalFields += 2
    if (promptStudio.mission1.question.trim()) filledFields++
    if (promptStudio.mission1.reflection.trim()) filledFields++

    // Mission2: 3 fields
    totalFields += 3
    if (promptStudio.mission2.context.trim()) filledFields++
    if (promptStudio.mission2.task.trim()) filledFields++
    if (promptStudio.mission2.reflection.trim()) filledFields++

    // Mission3: 4 fields
    totalFields += 4
    if (promptStudio.mission3.role.trim()) filledFields++
    if (promptStudio.mission3.context.trim()) filledFields++
    if (promptStudio.mission3.task.trim()) filledFields++
    if (promptStudio.mission3.reflection.trim()) filledFields++

    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0
  }

  const handleReset = () => {
    if (
      !confirm(
        '모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return
    }

    setProblemLog([
      { id: 1, title: '', description: '', goal: '' },
      { id: 2, title: '', description: '', goal: '' },
      { id: 3, title: '', description: '', goal: '' },
    ])
    setPromptStudio({
      mission1: { question: '', reflection: '' },
      mission2: { context: '', task: '', reflection: '' },
      mission3: { role: '', context: '', task: '', reflection: '' },
    })
    setIsSubmitted(false)
    setToastMessage('모든 데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  const handleSave = async () => {
    if (!projectIdInput.trim()) {
      alert('프로젝트 ID를 입력해주세요.')
      return
    }

    setLoading(true)
    setSaved(false)

    try {
      // Verify project exists and user has access
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectIdInput)
        .eq('user_id', user.id)
        .single()

      if (!project) {
        alert('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.')
        return
      }

      // Calculate progress
      const progress = calculateProgress()

      // Prepare data
      const week1Data: Week1Data = {
        problemLog,
        promptStudio,
        is_submitted: isSubmitted,
      }

      // Upsert to project_steps
      const { error } = await supabase
        .from('project_steps')
        .upsert(
          {
            project_id: projectIdInput,
            step_number: 1,
            step_data: week1Data,
          } as any,
          {
            onConflict: 'project_id,step_number',
          }
        )

      if (error) throw error

      // Update project progress
      await (supabase.from('projects') as any).update({
        current_step: 1,
        progress_rate: progress,
      }).eq('id', projectIdInput)

      setToastMessage('저장되었습니다.')
      setToastVisible(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await refreshSteps()
    } catch (error: any) {
      setToastMessage('저장 중 오류가 발생했습니다: ' + error.message)
      setToastVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProjectTitle = async () => {
    if (!projectInfo || !newProjectTitle.trim()) {
      setToastMessage('프로젝트명을 입력해주세요.')
      setToastVisible(true)
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { error } = await (supabase.from('projects') as any).update({
        title: newProjectTitle.trim(),
      }).eq('id', projectInfo.id).eq('user_id', user.id)

      if (error) throw error

      setProjectInfo({ ...projectInfo, title: newProjectTitle.trim() })
      setShowSettings(false)
      setToastMessage('프로젝트명이 변경되었습니다.')
      setToastVisible(true)
    } catch (error: any) {
      setToastMessage('프로젝트명 변경 중 오류가 발생했습니다: ' + error.message)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      if (!projectInfo) return

      // Delete project steps first (due to foreign key constraint)
      await supabase.from('project_steps').delete().eq('project_id', projectInfo.id)

      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectInfo.id)
        .eq('user_id', user.id)

      if (error) throw error

      setToastMessage('프로젝트가 삭제되었습니다.')
      setToastVisible(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error: any) {
      setToastMessage('프로젝트 삭제 중 오류가 발생했습니다: ' + error.message)
      setToastVisible(true)
    }
  }

  const generateProjectSummary = async () => {
    try {
      const currentProjectId = projectId || projectIdInput
      if (!currentProjectId) {
        setToastMessage('프로젝트 ID가 필요합니다.')
        setToastVisible(true)
        return
      }

      // Load all steps
      const { data: steps } = await supabase
        .from('project_steps')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('step_number', { ascending: true })

      if (!steps || steps.length === 0) {
        setToastMessage('워크북 데이터가 없습니다.')
        setToastVisible(true)
        return
      }

      // Generate summary prompt based on all week data
      let summary = `프로젝트명: ${projectInfo?.title || '미정'}\n\n`
      summary += `=== 12주차 워크북 요약 ===\n\n`

      steps.forEach((step: any) => {
        const weekNum = step.step_number
        const data = step.step_data as any

        summary += `[${weekNum}주차]\n`
        if (data) {
          // Week 1
          if (weekNum === 1 && data.problemLog) {
            summary += `- 문제 발견: ${data.problemLog
              .map((p: any) => p.title)
              .filter(Boolean)
              .join(', ')}\n`
            if (data.promptStudio) {
              summary += `- 프롬프트 훈련 완료\n`
            }
          }
          // Week 2
          else if (weekNum === 2) {
            if (data.aiSearchLog && data.aiSearchLog.length > 0) {
              summary += `- AI 검색 기록: ${data.aiSearchLog.length}건\n`
            }
            if (data.factCheckTable && data.factCheckTable.length > 0) {
              summary += `- 팩트체크 항목: ${data.factCheckTable.length}건\n`
            }
          }
          // Other weeks - simplified
          else {
            const hasData = Object.keys(data).some(
              (key) => key !== 'is_submitted' && data[key]
            )
            summary += hasData ? `- 작성 완료\n` : `- 미작성\n`
          }

          if (data.is_submitted) {
            summary += `- 제출 상태: 완료\n`
          }
        }
        summary += `\n`
      })

      summary += `\n위 내용을 바탕으로 프레젠테이션 슬라이드를 만들기 위한 프롬프트를 작성해주세요.`
      summary += `\n프로젝트의 핵심 가치와 성과를 강조하고, Phase별로 구분하여 구조화된 슬라이드 아웃라인을 제안해주세요.`

      setSummaryPrompt(summary)
      setShowProjectSummary(true)
    } catch (error: any) {
      setToastMessage('요약 생성 중 오류가 발생했습니다: ' + error.message)
      setToastVisible(true)
    }
  }

  const copySummaryPrompt = async () => {
    try {
      await navigator.clipboard.writeText(summaryPrompt)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('복사 실패')
      setToastVisible(true)
    }
  }

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

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectIdInput)
        .eq('user_id', user.id)
        .single()

      if (!project) {
        setToastMessage('프로젝트를 찾을 수 없습니다.')
        setToastVisible(true)
        return
      }

      const progress = calculateProgress()
      const newSubmittedState = !isSubmitted

      const week1Data: Week1Data = {
        problemLog,
        promptStudio,
        is_submitted: newSubmittedState,
      }

      const { error } = await (supabase.from('project_steps') as any).upsert(
        {
          project_id: projectIdInput,
          step_number: 1,
          step_data: week1Data,
        },
        {
          onConflict: 'project_id,step_number',
        }
      )

      if (error) throw error

      await (supabase.from('projects') as any).update({
        current_step: 1,
        progress_rate: progress,
      }).eq('id', projectIdInput)

      setIsSubmitted(newSubmittedState)
      setToastMessage(
        newSubmittedState ? '워크북이 제출되었습니다.' : '제출이 회수되었습니다.'
      )
      setToastVisible(true)
      await refreshSteps()
    } catch (error: any) {
      setToastMessage('처리 중 오류가 발생했습니다: ' + error.message)
      setToastVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const progress = calculateProgress()

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastMessage.includes('오류') ? 'error' : 'success'}
      />
      {/* Header */}
      <header
        className={`glass border-b border-gray-100/50 backdrop-blur-2xl sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-4'
        }`}
      >
        <div className="container mx-auto px-4">
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all text-sm font-medium ${
              isScrolled ? 'mb-2' : 'mb-4'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            {isScrolled ? '' : '대시보드로 돌아가기'}
          </Link>
          <div className="flex items-start gap-6">
            {/* Left: Title and Description */}
            <div className="flex-1">
              <div className={`flex items-center gap-3 ${isScrolled ? 'mb-1' : 'mb-3'}`}>
                <div
                  className={`rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all ${
                    isScrolled ? 'w-8 h-8' : 'w-10 h-10'
                  }`}
                >
                  <Sparkles className={`text-white ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
                </div>
                <h1
                  className={`font-bold text-gray-900 tracking-tight transition-all ${
                    isScrolled ? 'text-lg' : 'text-2xl'
                  }`}
                >
                  Phase 1: Data - 1주차: 문제 발견과 목표 설정
                </h1>
              </div>
              {!isScrolled && (
                <p className="text-gray-600 text-sm">
                  일상 속 불편함을 발견하고, AI 프롬프트 작성 기초를 다집니다.
                </p>
              )}
            </div>

            {/* Right: Statistics Cards */}
            <div className={`flex gap-2 ${isScrolled ? 'gap-1.5' : 'gap-3'}`}>
              {/* Overall Progress */}
              <div
                className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm transition-all ${
                  isScrolled ? 'p-2 min-w-[100px]' : 'p-3 min-w-[140px]'
                }`}
              >
                <div className={`flex items-center justify-between ${isScrolled ? 'mb-1' : 'mb-2'}`}>
                  <h3 className="text-xs font-semibold text-gray-700">Overall</h3>
                  <Rocket className={`text-indigo-600 ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                </div>
                <div
                  className={`font-bold text-gray-900 mb-1 ${isScrolled ? 'text-base' : 'text-xl'}`}
                >
                  {getOverallProgress()}%
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${getOverallProgress()}%` }}
                  />
                </div>
              </div>

              {/* Phase 1: Data */}
              <div
                className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm transition-all ${
                  isScrolled ? 'p-2 min-w-[90px]' : 'p-3 min-w-[120px]'
                }`}
              >
                <div className={`flex items-center justify-between ${isScrolled ? 'mb-1' : 'mb-2'}`}>
                  <h3 className="text-xs font-semibold text-gray-700">Phase 1</h3>
                  <CheckSquare className={`text-indigo-600 ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                </div>
                <div
                  className={`font-bold text-gray-900 mb-1 ${isScrolled ? 'text-base' : 'text-xl'}`}
                >
                  {getPhaseProgress(1)}%
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${getPhaseProgress(1)}%` }}
                  />
                </div>
              </div>

              {/* Phase 2: Insight */}
              <div
                className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm transition-all ${
                  isScrolled ? 'p-2 min-w-[90px]' : 'p-3 min-w-[120px]'
                }`}
              >
                <div className={`flex items-center justify-between ${isScrolled ? 'mb-1' : 'mb-2'}`}>
                  <h3 className="text-xs font-semibold text-gray-700">Phase 2</h3>
                  <CheckSquare className={`text-indigo-600 ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                </div>
                <div
                  className={`font-bold text-gray-900 mb-1 ${isScrolled ? 'text-base' : 'text-xl'}`}
                >
                  {getPhaseProgress(2)}%
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${getPhaseProgress(2)}%` }}
                  />
                </div>
              </div>

              {/* Phase 3: Prototype */}
              <div
                className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm transition-all ${
                  isScrolled ? 'p-2 min-w-[90px]' : 'p-3 min-w-[120px]'
                }`}
              >
                <div className={`flex items-center justify-between ${isScrolled ? 'mb-1' : 'mb-2'}`}>
                  <h3 className="text-xs font-semibold text-gray-700">Phase 3</h3>
                  <CheckSquare className={`text-indigo-600 ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                </div>
                <div
                  className={`font-bold text-gray-900 mb-1 ${isScrolled ? 'text-base' : 'text-xl'}`}
                >
                  {getPhaseProgress(3)}%
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${getPhaseProgress(3)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Sidebar - Navigation */}
        <aside
          className={`glass border-r border-gray-200/50 sticky transition-all duration-300 ${
            isScrolled ? 'top-[60px]' : 'top-[140px]'
          } h-[calc(100vh-140px)] overflow-y-auto`}
        >
          <div className="p-3">
            {/* Project Info */}
            {projectInfo && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">
                    {projectInfo.title || '프로젝트명 없음'}
                  </h4>
                  <button
                    onClick={() => {
                      setShowSettings(true)
                      setNewProjectTitle(projectInfo.title || '')
                    }}
                    className="flex-shrink-0 p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="설정"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <h3 className="text-xs font-semibold text-gray-700 mb-2">주차별 워크북</h3>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => {
                const status = getStepStatus(week)
                const isCurrentWeek = week === 1
                const isFilled = status.hasData
                const isSubmitted = status.isSubmitted
                const progress = status.progress

                return (
                  <Link
                    key={week}
                    href={`/workbook/week${week}?projectId=${projectId || projectIdInput}`}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 group ${
                      isCurrentWeek
                        ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-700 font-semibold'
                        : isSubmitted
                        ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                        : isFilled
                        ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-white flex items-center justify-center font-bold text-xs">
                      {week}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium leading-tight">
                        {getWeekTitle(week)}
                      </div>
                      {isFilled && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className={`h-1 rounded-full transition-all ${
                              isSubmitted
                                ? 'bg-green-600'
                                : isCurrentWeek
                                ? 'bg-indigo-600'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isSubmitted && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-600" title="제출됨" />
                      )}
                      {isFilled && !isSubmitted && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="작성 중" />
                      )}
                      {!isFilled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" title="미작성" />
                      )}
                    </div>
                  </Link>
                )
              })}

              {/* Project Summary Button */}
              <button
                onClick={generateProjectSummary}
                className="mt-4 w-full py-2.5 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                프로젝트 요약
              </button>
            </div>
          </div>
        </aside>

        {/* Settings Modal */}
        {showSettings && projectInfo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">프로젝트 설정</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    프로젝트명
                  </label>
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="프로젝트명을 입력하세요"
                    className="input-field"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdateProjectTitle}
                    className="btn-primary flex-1"
                  >
                    <Check className="w-4 h-4" />
                    저장
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="btn-secondary border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Summary Modal */}
        {showProjectSummary && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">프로젝트 요약 프롬프트</h3>
                <button
                  onClick={() => setShowProjectSummary(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {summaryPrompt}
                  </pre>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={copySummaryPrompt}
                  className="btn-primary flex-1"
                >
                  <Copy className="w-4 h-4" />
                  프롬프트 복사
                </button>
                <button
                  onClick={() => setShowProjectSummary(false)}
                  className="btn-secondary"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* Project ID Input */}
            {!projectId && (
              <div className="glass rounded-xl p-6 mb-8 border-l-4 border-indigo-600">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  프로젝트 ID 입력
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  저장하려면 프로젝트 ID가 필요합니다. 대시보드에서 프로젝트를
                  생성한 후 ID를 입력하세요.
                </p>
                <input
                  type="text"
                  value={projectIdInput}
                  onChange={(e) => setProjectIdInput(e.target.value)}
                  placeholder="프로젝트 ID를 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

            {/* Section 1: Problem Log */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">
              섹션 1: 일상 불편함 관찰 (Problem Log)
            </h2>
          </div>
          <p className="text-gray-600 mb-6">
            일상에서 발견한 불편함 3가지를 기록하고, 각각에 대한 해결 목표를
            설정해보세요.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {problemLog.map((problem, index) => (
              <div
                key={problem.id}
                className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    불편함 {index + 1}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      불편함 제목
                    </label>
                    <input
                      type="text"
                      value={problem.title}
                      onChange={(e) =>
                        handleProblemLogChange(index, 'title', e.target.value)
                      }
                      placeholder="예: 매일 점심 메뉴 고르기 어려움"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상세 상황 설명
                    </label>
                    <textarea
                      value={problem.description}
                      onChange={(e) =>
                        handleProblemLogChange(
                          index,
                          'description',
                          e.target.value
                        )
                      }
                      rows={4}
                      placeholder="언제, 어디서, 어떤 상황에서 이 불편함이 발생하는지 자세히 설명해주세요."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Target className="w-4 h-4 inline mr-1 text-indigo-600" />
                      나의 해결 목표 (Goal)
                    </label>
                    <textarea
                      value={problem.goal}
                      onChange={(e) =>
                        handleProblemLogChange(index, 'goal', e.target.value)
                      }
                      rows={3}
                      placeholder="이 불편함을 해결하기 위한 나의 목표를 구체적으로 작성해주세요."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

            {/* Section 2: Prompt Studio */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">
              섹션 2: 3단계 프롬프트 훈련 (Prompt Studio)
            </h2>
          </div>
          <p className="text-gray-600 mb-6">
            같은 질문을 3가지 방식으로 점진적으로 개선해보세요. 단계별로
            구조화되어 갈수록 더 명확하고 효과적인 프롬프트가 됩니다.
          </p>

          {/* Mission Tabs */}
          <div className="flex gap-1 mb-8 p-1 bg-gray-100 rounded-xl inline-flex">
            <button
              onClick={() => setActiveMission(1)}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeMission === 1
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Mission 1: 자유 형식
            </button>
            <button
              onClick={() => setActiveMission(2)}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeMission === 2
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Mission 2: 맥락 + 과업
            </button>
            <button
              onClick={() => setActiveMission(3)}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeMission === 3
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Mission 3: R-C-T
            </button>
          </div>

          {/* Mission 1 Content */}
          {activeMission === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  자유 형식 질문
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  평소 AI에게 질문하듯 자유롭게 입력해보세요.
                </p>
                <textarea
                  value={promptStudio.mission1.question}
                  onChange={(e) =>
                    handleMission1Change('question', e.target.value)
                  }
                  rows={6}
                  placeholder="평소 AI에게 질문하듯 자유롭게 입력해보세요."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  결과 및 회고
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  AI의 답변은 어땠나요? 만족스러웠나요? 느낀 점을 기록해보세요.
                </p>
                <textarea
                  value={promptStudio.mission1.reflection}
                  onChange={(e) =>
                    handleMission1Change('reflection', e.target.value)
                  }
                  rows={6}
                  placeholder="AI의 답변은 어땠나요? 만족스러웠나요? 느낀 점을 기록해보세요."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                />
              </div>
            </div>
          )}

          {/* Mission 2 Content */}
          {activeMission === 2 && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    맥락 (Context)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    AI에게 필요한 배경지식, 상황 정보를 알려주세요.
                  </p>
                  <textarea
                    value={promptStudio.mission2.context}
                    onChange={(e) =>
                      handleMission2Change('context', e.target.value)
                    }
                    rows={8}
                    placeholder="AI에게 필요한 배경지식, 상황 정보를 알려주세요."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    과업 (Task)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    AI가 수행해야 할 구체적인 명령을 내려주세요.
                  </p>
                  <textarea
                    value={promptStudio.mission2.task}
                    onChange={(e) =>
                      handleMission2Change('task', e.target.value)
                    }
                    rows={8}
                    placeholder="AI가 수행해야 할 구체적인 명령을 내려주세요."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    결과 및 회고
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    1단계 질문과 비교했을 때 답변의 품질이 어떻게 달라졌나요?
                  </p>
                  <textarea
                    value={promptStudio.mission2.reflection}
                    onChange={(e) =>
                      handleMission2Change('reflection', e.target.value)
                    }
                    rows={6}
                    placeholder="1단계 질문과 비교했을 때 답변의 품질이 어떻게 달라졌나요?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  />
                </div>
              </div>

              {/* Preview Panel */}
              <div>
                <div className="sticky top-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      프롬프트 미리보기
                    </h3>
                    <button
                      onClick={handleCopyPreview}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                        copied
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                          : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg active:scale-95'
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
                          복사
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl border border-gray-700/50 min-h-[500px] backdrop-blur-sm">
                    {/* Subtle gradient overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10 pointer-events-none" />
                    {/* Content */}
                    <div className="relative p-8 min-h-[500px]">
                      <pre className="text-gray-100 whitespace-pre-wrap font-mono text-sm leading-relaxed tracking-wide">
                        {getPreviewText() ? (
                          <span className="text-gray-50">
                            {getPreviewText().split('\n').map((line, i) => {
                              // Highlight labels (Role:, Context:, Task:)
                              if (line.match(/^(Role|Context|Task):/)) {
                                return (
                                  <span key={i}>
                                    <span className="text-indigo-400 font-semibold">
                                      {line.match(/^(Role|Context|Task):/)?.[0]}
                                    </span>
                                    {line.replace(/^(Role|Context|Task):/, '')}
                                    {'\n'}
                                  </span>
                                )
                              }
                              return (
                                <span key={i}>
                                  {line}
                                  {'\n'}
                                </span>
                              )
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">
                            맥락과 과업을 입력하면 미리보기가 표시됩니다.
                          </span>
                        )}
                      </pre>
                    </div>
                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mission 3 Content */}
          {activeMission === 3 && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    역할 (Role)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    AI에게 특정 전문가의 역할을 부여해주세요.
                  </p>
                  <textarea
                    value={promptStudio.mission3.role}
                    onChange={(e) =>
                      handleMission3Change('role', e.target.value)
                    }
                    rows={6}
                    placeholder="AI에게 특정 전문가의 역할을 부여해주세요."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    맥락 (Context)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    AI에게 필요한 배경지식, 상황 정보를 알려주세요.
                  </p>
                  <textarea
                    value={promptStudio.mission3.context}
                    onChange={(e) =>
                      handleMission3Change('context', e.target.value)
                    }
                    rows={6}
                    placeholder="AI에게 필요한 배경지식, 상황 정보를 알려주세요."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    과업 (Task)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    AI가 수행해야 할 구체적인 명령을 내려주세요.
                  </p>
                  <textarea
                    value={promptStudio.mission3.task}
                    onChange={(e) =>
                      handleMission3Change('task', e.target.value)
                    }
                    rows={6}
                    placeholder="AI가 수행해야 할 구체적인 명령을 내려주세요."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    결과 및 회고
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    최고의 답변을 얻었나요? RCT 프롬프트의 위력을 기록해보세요.
                  </p>
                  <textarea
                    value={promptStudio.mission3.reflection}
                    onChange={(e) =>
                      handleMission3Change('reflection', e.target.value)
                    }
                    rows={6}
                    placeholder="최고의 답변을 얻었나요? RCT 프롬프트의 위력을 기록해보세요."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  />
                </div>
              </div>

              {/* Preview Panel */}
              <div>
                <div className="sticky top-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      프롬프트 미리보기
                    </h3>
                    <button
                      onClick={handleCopyPreview}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                        copied
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                          : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg active:scale-95'
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
                          복사
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl border border-gray-700/50 min-h-[500px] backdrop-blur-sm">
                    {/* Subtle gradient overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10 pointer-events-none" />
                    {/* Content */}
                    <div className="relative p-8 min-h-[500px]">
                      <pre className="text-gray-100 whitespace-pre-wrap font-mono text-sm leading-relaxed tracking-wide">
                        {getPreviewText() ? (
                          <span className="text-gray-50">
                            {getPreviewText().split('\n').map((line, i) => {
                              // Highlight labels (Role:, Context:, Task:)
                              if (line.match(/^(Role|Context|Task):/)) {
                                return (
                                  <span key={i}>
                                    <span className="text-indigo-400 font-semibold">
                                      {line.match(/^(Role|Context|Task):/)?.[0]}
                                    </span>
                                    {line.replace(/^(Role|Context|Task):/, '')}
                                    {'\n'}
                                  </span>
                                )
                              }
                              return (
                                <span key={i}>
                                  {line}
                                  {'\n'}
                                </span>
                              )
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">
                            역할, 맥락, 과업을 입력하면 미리보기가 표시됩니다.
                          </span>
                        )}
                      </pre>
                    </div>
                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

            {/* Progress Indicator */}
            <div className="glass rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">작성 진척률</h3>
            <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            입력 필드 중 {Math.round((progress / 100) * 18)}/18개 필드가 작성되었습니다.
          </p>
        </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={handleReset}
            disabled={loading || !projectIdInput.trim()}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading || !projectIdInput.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? '저장 중...' : '임시 저장'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading || !projectIdInput.trim()}
              className={`btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                isSubmitted
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitted ? (
                <>
                  <Undo2 className="w-4 h-4" />
                  제출 회수
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  제출하기
                </>
              )}
            </button>
          </div>
        </div>

            {isSubmitted && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  이 워크북은 제출되었습니다. 제출 회수 버튼을 눌러 수정할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

