'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Lightbulb,
  MessageSquare,
  Target,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { useWorkbookStorage } from '@/hooks/useWorkbookStorage'
import { useWorkbookNavigation } from '@/hooks/useWorkbookNavigation'
import { useProjectSettings } from '@/hooks/useProjectSettings'
import { useProjectSummary } from '@/hooks/useProjectSummary'
import { WorkbookHeader } from '@/components/workbook/WorkbookHeader'
import { WorkbookSection } from '@/components/workbook/WorkbookSection'
import { WorkbookFooter } from '@/components/workbook/WorkbookFooter'
import { WorkbookNavigation } from '@/components/workbook/WorkbookNavigation'
import { ProjectSettingsModal } from '@/components/workbook/ProjectSettingsModal'
import { ProjectSummaryModal } from '@/components/workbook/ProjectSummaryModal'

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
  const projectId = searchParams.get('projectId') || ''

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
  const [copied, setCopied] = useState(false)

  const [problemLog, setProblemLog] = useState<ProblemLog[]>([
    { id: 1, title: '', description: '', goal: '' },
    { id: 2, title: '', description: '', goal: '' },
    { id: 3, title: '', description: '', goal: '' },
  ])

  const [activeMission, setActiveMission] = useState<1 | 2 | 3>(1)

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

  // Custom progress calculation for week 1 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 문제 발견과 목표 설정 (가중치: 40%)
    const section1Weight = 40
    let section1Filled = 0
    let section1Total = 0

    // Problem Log 계산: 리스트 항목이 0개일 때는 0%, 1개 이상일 때부터 계산
    if (problemLog.length > 0) {
      problemLog.forEach((problem) => {
        section1Total += 3
        if (problem.title.trim()) section1Filled++
        if (problem.description.trim()) section1Filled++
        if (problem.goal.trim()) section1Filled++
      })
    }

    const section1Progress = section1Total > 0 
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: 프롬프트 스튜디오 (가중치: 60%)
    const section2Weight = 60
    let section2Filled = 0
    let section2Total = 0

    // Mission 1
    section2Total += 2
    if (promptStudio.mission1.question.trim()) section2Filled++
    if (promptStudio.mission1.reflection.trim()) section2Filled++

    // Mission 2
    section2Total += 3
    if (promptStudio.mission2.context.trim()) section2Filled++
    if (promptStudio.mission2.task.trim()) section2Filled++
    if (promptStudio.mission2.reflection.trim()) section2Filled++

    // Mission 3
    section2Total += 4
    if (promptStudio.mission3.role.trim()) section2Filled++
    if (promptStudio.mission3.context.trim()) section2Filled++
    if (promptStudio.mission3.task.trim()) section2Filled++
    if (promptStudio.mission3.reflection.trim()) section2Filled++

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 전체 진척도 = 섹션별 완료율 * 섹션 가중치의 합
    const totalProgress = Math.min(section1Progress + section2Progress, 100)
    return Math.round(totalProgress)
  }

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

  // Week 1 진행률 계산 함수를 등록 (Supabase 데이터 기반)
  useEffect(() => {
    registerProgressCalculator(1, (data: any) => {
      // 섹션 1: 문제 발견과 목표 설정 (가중치: 40%)
      const section1Weight = 40
      let section1Filled = 0
      let section1Total = 0

      if (data.problemLog && Array.isArray(data.problemLog) && data.problemLog.length > 0) {
        data.problemLog.forEach((p: any) => {
          section1Total += 3
          if (p.title?.trim()) section1Filled++
          if (p.description?.trim()) section1Filled++
          if (p.goal?.trim()) section1Filled++
        })
      }

      const section1Progress = section1Total > 0
        ? Math.min((section1Filled / section1Total) * 100, section1Weight)
        : 0

      // 섹션 2: 프롬프트 스튜디오 (가중치: 60%)
      const section2Weight = 60
      let section2Filled = 0
      let section2Total = 0

      if (data.promptStudio) {
        if (data.promptStudio.mission1) {
          section2Total += 2
          if (data.promptStudio.mission1.question?.trim()) section2Filled++
          if (data.promptStudio.mission1.reflection?.trim()) section2Filled++
        }
        if (data.promptStudio.mission2) {
          section2Total += 3
          if (data.promptStudio.mission2.context?.trim()) section2Filled++
          if (data.promptStudio.mission2.task?.trim()) section2Filled++
          if (data.promptStudio.mission2.reflection?.trim()) section2Filled++
        }
        if (data.promptStudio.mission3) {
          section2Total += 4
          if (data.promptStudio.mission3.role?.trim()) section2Filled++
          if (data.promptStudio.mission3.context?.trim()) section2Filled++
          if (data.promptStudio.mission3.task?.trim()) section2Filled++
          if (data.promptStudio.mission3.reflection?.trim()) section2Filled++
        }
      }

      const section2Progress = section2Total > 0
        ? Math.min((section2Filled / section2Total) * 100, section2Weight)
        : 0

      const totalProgress = Math.min(section1Progress + section2Progress, 100)
      return Math.round(totalProgress)
    })
  }, [registerProgressCalculator])

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(1)
      if (data) {
        const week1Data = data as Week1Data
        if (week1Data.problemLog) {
          setProblemLog(week1Data.problemLog)
        }
        if (week1Data.promptStudio) {
          setPromptStudio(week1Data.promptStudio)
        }
        if (week1Data.is_submitted !== undefined) {
          setIsSubmitted(week1Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])


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
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const week1Data: Week1Data = {
      problemLog,
      promptStudio,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()
    const success = await saveStepData(1, week1Data, progress)

    if (success) {
      setToastMessage('저장되었습니다.')
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('저장 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

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
      console.log('프로젝트 삭제 시작 - handleDeleteProject')
      const success = await deleteProject()
      console.log('프로젝트 삭제 결과:', success)
      
      if (success) {
        setToastMessage('프로젝트가 삭제되었습니다. 대시보드로 이동합니다...')
        setToastVisible(true)
        // deleteProject 내부에서 리다이렉트가 처리되므로 여기서는 추가 작업 불필요
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

    const week1Data: Week1Data = {
      problemLog,
      promptStudio,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(1, week1Data, newSubmittedState, progress)

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
        title="Phase 1: Data - 1주차: 문제 발견과 목표 설정"
        description="일상 속 불편함을 발견하고, AI 프롬프트 작성 기초를 다집니다."
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
          getWeekTitle={getWeekTitle}
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
      />

      <ProjectSummaryModal
        isOpen={showProjectSummary}
        summaryPrompt={summaryPrompt}
        onClose={() => setShowProjectSummary(false)}
        onCopy={handleCopySummary}
      />

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {!projectId && (
              <div className="glass rounded-xl p-6 mb-8 border-l-4 border-indigo-600">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      프로젝트 ID 필요
                    </h3>
                    <p className="text-sm text-gray-600">
                      URL에 projectId 파라미터가 필요합니다.
                    </p>
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
                      disabled={readonly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      disabled={readonly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      disabled={readonly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={readonly}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeMission === 1
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Mission 1: 자유 형식
            </button>
            <button
              onClick={() => setActiveMission(2)}
              disabled={readonly}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeMission === 2
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Mission 2: 맥락 + 과업
            </button>
            <button
              onClick={() => setActiveMission(3)}
              disabled={readonly}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  disabled={readonly}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={readonly}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={readonly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={readonly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={readonly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={readonly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={readonly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={readonly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={readonly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
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

