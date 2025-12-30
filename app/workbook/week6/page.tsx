'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Lightbulb,
  Plus,
  X,
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Edit,
  Trash2,
  Zap,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
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

interface IdeaCard {
  id: number
  title: string
  description: string
  type: 'realistic' | 'wild' | 'innovative'
  impact: number // 1-10
  effort: number // 1-10
}

interface Week6Data {
  hmwQuestion: string
  ideas: IdeaCard[]
  is_submitted?: boolean
}

// 아이디어 유형별 스타일
const getIdeaTypeStyle = (type: string) => {
  switch (type) {
    case 'realistic':
      return 'bg-gray-50 border-gray-200 text-gray-700'
    case 'wild':
      return 'bg-gray-50 border-gray-200 text-gray-700'
    case 'innovative':
      return 'bg-gray-50 border-gray-200 text-gray-700'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700'
  }
}

const getIdeaTypeLabel = (type: string) => {
  switch (type) {
    case 'realistic':
      return '현실적인'
    case 'wild':
      return '황당한'
    case 'innovative':
      return '혁신적인'
    default:
      return ''
  }
}

export default function Week6Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const supabase = createClient()

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
  const [referenceData, setReferenceData] = useState<{
    week4HMW: string
    week5Insight: string
  } | null>(null)
  const [editingIdea, setEditingIdea] = useState<number | null>(null)

  const [formData, setFormData] = useState<Week6Data>({
    hmwQuestion: '',
    ideas: [],
  })

  // 새 아이디어 입력 상태
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    type: 'realistic' as 'realistic' | 'wild' | 'innovative',
    impact: 5,
    effort: 5,
  })

  // Custom progress calculation for week 6 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: HMW 질문 도출 (가중치: 25%)
    const section1Weight = 25
    let section1Filled = 0
    let section1Total = 1

    if (formData.hmwQuestion.trim()) section1Filled++

    const section1Progress = Math.min((section1Filled / section1Total) * 100, section1Weight)

    // 섹션 2: 아이디어 브레인스토밍 (가중치: 45%)
    const section2Weight = 45
    let section2Filled = 0
    let section2Total = 0

    if (formData.ideas.length > 0) {
      formData.ideas.forEach((idea) => {
        section2Total += 3 // title, description, type
        if (idea.title.trim()) section2Filled++
        if (idea.description.trim()) section2Filled++
        if (idea.type) section2Filled++
      })
    }

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 섹션 3: 2x2 우선순위 매트릭스 (가중치: 30%)
    const section3Weight = 30
    let section3Filled = 0
    let section3Total = 0

    if (formData.ideas.length > 0) {
      formData.ideas.forEach((idea) => {
        section3Total += 2 // impact, effort
        if (typeof idea.impact === 'number' && idea.impact > 0) section3Filled++
        if (typeof idea.effort === 'number' && idea.effort > 0) section3Filled++
      })
    }

    const section3Progress = section3Total > 0
      ? Math.min((section3Filled / section3Total) * 100, section3Weight)
      : 0

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
    return Math.round(totalProgress)
  }

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 6) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 6) {
        // 섹션 1: HMW 질문 도출 (가중치: 25%)
        const section1Weight = 25
        let section1Filled = 0
        let section1Total = 1

        if (data.hmwQuestion?.trim()) section1Filled++

        const section1Progress = Math.min((section1Filled / section1Total) * 100, section1Weight)

        // 섹션 2: 아이디어 브레인스토밍 (가중치: 45%)
        const section2Weight = 45
        let section2Filled = 0
        let section2Total = 0

        if (data.ideas && Array.isArray(data.ideas) && data.ideas.length > 0) {
          data.ideas.forEach((idea: any) => {
            section2Total += 3
            if (idea.title?.trim()) section2Filled++
            if (idea.description?.trim()) section2Filled++
            if (idea.type) section2Filled++
          })
        }

        const section2Progress = section2Total > 0
          ? Math.min((section2Filled / section2Total) * 100, section2Weight)
          : 0

        // 섹션 3: 2x2 우선순위 매트릭스 (가중치: 30%)
        const section3Weight = 30
        let section3Filled = 0
        let section3Total = 0

        if (data.ideas && Array.isArray(data.ideas) && data.ideas.length > 0) {
          data.ideas.forEach((idea: any) => {
            section3Total += 2
            if (typeof idea.impact === 'number' && idea.impact > 0) section3Filled++
            if (typeof idea.effort === 'number' && idea.effort > 0) section3Filled++
          })
        }

        const section3Progress = section3Total > 0
          ? Math.min((section3Filled / section3Total) * 100, section3Weight)
          : 0

        const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
        return Math.round(totalProgress)
      }
      return 50
    })
  }

  const getPhaseProgress = (phase: 1 | 2 | 3) => {
    return getBasePhaseProgress(phase, (data: any) => {
      return getStepStatus(6).progress
    })
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress((data: any) => {
      return getStepStatus(6).progress
    })
  }


  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      // Load reference data (week 4, 5)
      try {
        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .in('step_number', [4, 5])

        const stepsData = steps as any[]
        const week4Data = stepsData?.find((s: any) => s.step_number === 4)?.step_data
        const week5Data = stepsData?.find((s: any) => s.step_number === 5)?.step_data

        setReferenceData({
          week4HMW: week4Data?.conclusion || '',
          week5Insight: week5Data?.insight?.coreInsight || '',
        })
      } catch (error) {
        console.error('Reference data load error:', error)
      }

      // Load week6 data
      const data = await loadStepData(6)
      if (data) {
        const week6Data = data as Week6Data
        setFormData(week6Data)
        if (week6Data.is_submitted !== undefined) {
          setIsSubmitted(week6Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

  // 아이디어 추가
  const handleAddIdea = () => {
    if (!newIdea.title.trim()) {
      setToastMessage('아이디어 제목을 입력해주세요.')
      setToastVisible(true)
      return
    }

    const newId = formData.ideas.length > 0 
      ? Math.max(...formData.ideas.map(i => i.id)) + 1 
      : 1

    setFormData({
      ...formData,
      ideas: [
        ...formData.ideas,
        {
          id: newId,
          title: newIdea.title,
          description: newIdea.description,
          type: newIdea.type,
          impact: newIdea.impact,
          effort: newIdea.effort,
        },
      ],
    })

    setNewIdea({
      title: '',
      description: '',
      type: 'realistic',
      impact: 5,
      effort: 5,
    })
  }

  // 아이디어 삭제
  const handleDeleteIdea = (id: number) => {
    setFormData({
      ...formData,
      ideas: formData.ideas.filter(idea => idea.id !== id),
    })
  }

  // 아이디어 수정
  const handleUpdateIdea = (id: number, updates: Partial<IdeaCard>) => {
    setFormData({
      ...formData,
      ideas: formData.ideas.map(idea =>
        idea.id === id ? { ...idea, ...updates } : idea
      ),
    })
    setEditingIdea(null)
  }

  // MVP 아이디어 추출 (High Impact, Low Effort)
  const mvpIdeas = useMemo(() => {
    return formData.ideas.filter(idea => idea.impact >= 7 && idea.effort <= 4)
  }, [formData.ideas])

  // Save handler
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const progress = calculateProgress()
    const success = await saveStepData(6, formData, progress)

    if (success) {
      setToastMessage('임시 저장되었습니다.')
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('저장 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  // Submit handler
  const handleSubmit = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    if (!isSubmitted) {
      if (!confirm('워크북을 제출하시겠습니까?\n제출 후에는 수정이 제한됩니다.')) {
        return
      }
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(6, formData, newSubmittedState, progress)

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

    const success = await deleteProject()
    if (success) {
      setToastMessage('프로젝트가 삭제되었습니다.')
      setToastVisible(true)
    } else {
      setToastMessage('프로젝트 삭제 중 오류가 발생했습니다.')
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

  const handleReset = () => {
    if (!confirm('모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }
    setFormData({
      hmwQuestion: '',
      ideas: [],
    })
    setNewIdea({
      title: '',
      description: '',
      type: 'realistic',
      impact: 5,
      effort: 5,
    })
    setEditingIdea(null)
    setToastMessage('데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  const progress = calculateProgress()
  const readonly = isSubmitted

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">프로젝트 ID가 필요합니다.</p>
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
        title="Phase 2: Ideation - 6회차: 아이디어 도출 및 우선순위 선정"
        description="인사이트를 바탕으로 해결 가능한 아이디어를 도출하고 우선순위를 설정하세요."
        phase="Phase 2: Ideation"
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
          getWeekTitle={getWeekTitle}
          getStepStatus={getStepStatus}
          onSettingsClick={() => {
            setShowSettings(true)
            setNewProjectTitle(projectInfo?.title || '')
          }}
          onProjectSummaryClick={handleProjectSummary}
          themeColor="indigo"
        />

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* Reference Data Panel */}
          {(referenceData?.week4HMW || referenceData?.week5Insight) && (
            <div className="mb-6 grid md:grid-cols-2 gap-4">
              {referenceData.week4HMW && (
                <div className="glass rounded-xl p-4 border border-gray-200 bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">4회차: 문제 정의</h4>
                  <p className="text-xs text-gray-700 line-clamp-3">{referenceData.week4HMW}</p>
                </div>
              )}
              {referenceData.week5Insight && (
                <div className="glass rounded-xl p-4 border border-gray-200 bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">5회차: 핵심 인사이트</h4>
                  <p className="text-xs text-gray-700 line-clamp-3">{referenceData.week5Insight}</p>
                </div>
              )}
            </div>
          )}

          {/* Section 1: HMW Question */}
          <WorkbookSection
            icon={Target}
            title="섹션 1: HMW(How Might We) 질문 도출"
            description="5회차 인사이트를 해결 가능한 질문으로 전환하세요."
            themeColor="indigo"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  HMW 질문 작성
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  &quot;우리가 어떻게 하면 [페르소나]가 [상황]에서 겪는 [불편함]을 [방향]으로 해결할 수 있을까?&quot;
                </p>
                <textarea
                  value={formData.hmwQuestion}
                  onChange={(e) =>
                    setFormData({ ...formData, hmwQuestion: e.target.value })
                  }
                  rows={4}
                  placeholder="예: 우리가 어떻게 하면 바쁜 직장인이 출퇴근 시간에 건강한 식사를 간편하게 할 수 있을까?"
                  disabled={readonly}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </WorkbookSection>

          {/* Section 2: Idea Brainstorming */}
          <WorkbookSection
            icon={Sparkles}
            title="섹션 2: 아이디어 브레인스토밍"
            description="HMW 질문에 대한 다양한 해결책을 카드 형태로 생성하세요."
            themeColor="indigo"
          >
            <div className="space-y-6">
              {/* 새 아이디어 입력 폼 */}
              {!readonly && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">새 아이디어 추가</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        아이디어 제목 *
                      </label>
                      <input
                        type="text"
                        value={newIdea.title}
                        onChange={(e) =>
                          setNewIdea({ ...newIdea, title: e.target.value })
                        }
                        placeholder="아이디어 제목을 입력하세요"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        상세 설명
                      </label>
                      <textarea
                        value={newIdea.description}
                        onChange={(e) =>
                          setNewIdea({ ...newIdea, description: e.target.value })
                        }
                        rows={3}
                        placeholder="아이디어에 대한 상세한 설명을 입력하세요"
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        유형 선택
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['realistic', 'wild', 'innovative'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewIdea({ ...newIdea, type })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              newIdea.type === type
                                ? getIdeaTypeStyle(type) + ' border-current font-semibold'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300'
                            }`}
                          >
                            {getIdeaTypeLabel(type)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleAddIdea}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      아이디어 추가
                    </button>
                  </div>
                </div>
              )}

              {/* 아이디어 카드 그리드 */}
              {formData.ideas.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.ideas.map((idea) => {
                    return (
                      <div
                        key={idea.id}
                        className={`border-2 rounded-xl p-4 ${getIdeaTypeStyle(idea.type)} transition-all hover:shadow-lg`}
                      >
                      {editingIdea === idea.id ? (
                        <EditIdeaForm
                          idea={idea}
                          onSave={(updates) => handleUpdateIdea(idea.id, updates)}
                          onCancel={() => setEditingIdea(null)}
                          readonly={readonly}
                        />
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm">{idea.title}</h4>
                            {!readonly && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setEditingIdea(idea.id)}
                                  className="p-1 hover:bg-white/50 rounded transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteIdea(idea.id)}
                                  className="p-1 hover:bg-white/50 rounded transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                            {idea.description || '설명 없음'}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="px-2 py-1 bg-white/50 rounded-full">
                              {getIdeaTypeLabel(idea.type)}
                            </span>
                            <div className="flex gap-2 text-xs">
                              <span>Impact: {idea.impact}</span>
                              <span>Effort: {idea.effort}</span>
                            </div>
                          </div>
                        </>
                      )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">아이디어를 추가해주세요.</p>
                </div>
              )}
            </div>
          </WorkbookSection>

          {/* Section 3: Priority Matrix */}
          <WorkbookSection
            icon={Zap}
            title="섹션 3: 2x2 우선순위 매트릭스"
            description="생성된 아이디어들을 Impact와 Effort 기준으로 배치하여 MVP를 선정하세요."
            themeColor="indigo"
          >
            <div className="space-y-6">
              {/* MVP 아이디어 강조 */}
              {mvpIdeas.length > 0 && (
                <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-semibold text-gray-900">MVP 후보 아이디어 (High Impact, Low Effort)</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mvpIdeas.map((idea) => (
                      <span
                        key={idea.id}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm font-medium"
                      >
                        {idea.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 매트릭스 보드 */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <PriorityMatrix
                  ideas={formData.ideas}
                  onUpdateIdea={handleUpdateIdea}
                  readonly={readonly}
                />
              </div>
            </div>
          </WorkbookSection>

            {/* Footer */}
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

      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastMessage.includes('오류') ? 'error' : 'success'}
      />
    </div>
  )
}

// 아이디어 수정 폼 컴포넌트
function EditIdeaForm({
  idea,
  onSave,
  onCancel,
  readonly,
}: {
  idea: IdeaCard
  onSave: (updates: Partial<IdeaCard>) => void
  onCancel: () => void
  readonly: boolean
}) {
  const [editData, setEditData] = useState({
    title: idea.title,
    description: idea.description,
    type: idea.type,
    impact: idea.impact,
    effort: idea.effort,
  })

  // idea가 변경될 때 editData 업데이트
  useEffect(() => {
    setEditData({
      title: idea.title,
      description: idea.description,
      type: idea.type,
      impact: idea.impact,
      effort: idea.effort,
    })
  }, [idea])

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={editData.title}
        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
        disabled={readonly}
        className="w-full px-2 py-1 text-sm bg-white border rounded"
      />
      <textarea
        value={editData.description}
        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
        rows={2}
        disabled={readonly}
        className="w-full px-2 py-1 text-sm bg-white border rounded resize-y"
      />
      <div className="grid grid-cols-3 gap-1">
        {(['realistic', 'wild', 'innovative'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setEditData({ ...editData, type })}
            disabled={readonly}
            className={`px-2 py-1 text-xs rounded ${
              editData.type === type
                ? getIdeaTypeStyle(type) + ' font-semibold'
                : 'bg-white border'
            }`}
          >
            {getIdeaTypeLabel(type)}
          </button>
        ))}
      </div>
      <div className="flex gap-2 text-xs">
        <label className="flex items-center gap-1">
          Impact:
          <input
            type="range"
            min="1"
            max="10"
            value={editData.impact}
            onChange={(e) =>
              setEditData({ ...editData, impact: parseInt(e.target.value) })
            }
            disabled={readonly}
            className="w-20"
          />
          {editData.impact}
        </label>
        <label className="flex items-center gap-1">
          Effort:
          <input
            type="range"
            min="1"
            max="10"
            value={editData.effort}
            onChange={(e) =>
              setEditData({ ...editData, effort: parseInt(e.target.value) })
            }
            disabled={readonly}
            className="w-20"
          />
          {editData.effort}
        </label>
      </div>
      {!readonly && (
        <div className="flex gap-2">
          <button
            onClick={() => onSave(editData)}
            className="flex-1 px-2 py-1 bg-indigo-600 text-white rounded text-xs"
          >
            저장
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-2 py-1 bg-gray-200 rounded text-xs"
          >
            취소
          </button>
        </div>
      )}
    </div>
  )
}

// 우선순위 매트릭스 컴포넌트
function PriorityMatrix({
  ideas,
  onUpdateIdea,
  readonly,
}: {
  ideas: IdeaCard[]
  onUpdateIdea: (id: number, updates: Partial<IdeaCard>) => void
  readonly: boolean
}) {
  const width = 600
  const height = 400
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // 각 아이디어의 좌표 계산
  const ideaPositions = ideas.map((idea) => {
    // X: Effort (1=좌측, 10=우측)
    const x = padding + ((idea.effort - 1) / 9) * chartWidth
    // Y: Impact (1=하단, 10=상단, SVG는 위에서 아래이므로 역변환)
    const y = padding + chartHeight - ((idea.impact - 1) / 9) * chartHeight
    return { ...idea, x, y }
  })

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
      >
        {/* 배경 */}
        <rect width={width} height={height} fill="#ffffff" />

        {/* 그리드 라인 */}
        {/* 중앙 수직선 (Effort 5.5 기준) */}
        <line
          x1={padding + chartWidth / 2}
          y1={padding}
          x2={padding + chartWidth / 2}
          y2={padding + chartHeight}
          stroke="#e5e7eb"
          strokeWidth="2"
          strokeDasharray="4"
        />
        {/* 중앙 수평선 (Impact 5.5 기준) */}
        <line
          x1={padding}
          y1={padding + chartHeight / 2}
          x2={padding + chartWidth}
          y2={padding + chartHeight / 2}
          stroke="#e5e7eb"
          strokeWidth="2"
          strokeDasharray="4"
        />

        {/* 4사분면 배경 */}
        {/* 1사분면: High Impact, Low Effort (MVP) */}
        <rect
          x={padding}
          y={padding}
          width={chartWidth / 2}
          height={chartHeight / 2}
          fill="#d1fae5"
          opacity="0.3"
        />
        {/* 2사분면: High Impact, High Effort */}
        <rect
          x={padding + chartWidth / 2}
          y={padding}
          width={chartWidth / 2}
          height={chartHeight / 2}
          fill="#a7f3d0"
          opacity="0.2"
        />
        {/* 3사분면: Low Impact, High Effort */}
        <rect
          x={padding + chartWidth / 2}
          y={padding + chartHeight / 2}
          width={chartWidth / 2}
          height={chartHeight / 2}
          fill="#f3f4f6"
          opacity="0.3"
        />
        {/* 4사분면: Low Impact, Low Effort */}
        <rect
          x={padding}
          y={padding + chartHeight / 2}
          width={chartWidth / 2}
          height={chartHeight / 2}
          fill="#fef3c7"
          opacity="0.3"
        />

        {/* 4사분면 라벨 */}
        <text
          x={padding + chartWidth / 4}
          y={padding + chartHeight / 4}
          textAnchor="middle"
          className="text-xs font-bold fill-emerald-700"
          style={{ fontSize: '11px' }}
        >
          Do It Now
        </text>
        <text
          x={padding + (chartWidth * 3) / 4}
          y={padding + chartHeight / 4}
          textAnchor="middle"
          className="text-xs font-bold fill-emerald-600"
          style={{ fontSize: '11px' }}
        >
          Big Projects
        </text>
        <text
          x={padding + (chartWidth * 3) / 4}
          y={padding + (chartHeight * 3) / 4}
          textAnchor="middle"
          className="text-xs font-bold fill-gray-600"
          style={{ fontSize: '11px' }}
        >
          Thankless Tasks
        </text>
        <text
          x={padding + chartWidth / 4}
          y={padding + (chartHeight * 3) / 4}
          textAnchor="middle"
          className="text-xs font-bold fill-amber-600"
          style={{ fontSize: '11px' }}
        >
          Quick Wins
        </text>

        {/* 축 라벨 */}
        <text
          x={width / 2}
          y={height - 15}
          textAnchor="middle"
          className="text-xs font-semibold fill-gray-700"
        >
          Effort (쉬움 ← → 어려움)
        </text>
        <text
          x={20}
          y={height / 2}
          textAnchor="middle"
          className="text-xs font-semibold fill-gray-700"
          transform={`rotate(-90 20 ${height / 2})`}
        >
          Impact (낮음 ← → 높음)
        </text>

        {/* 아이디어 점 표시 */}
        {ideaPositions.map((idea) => (
          <g key={idea.id}>
            {/* MVP 강조 (1사분면) */}
            {idea.impact >= 7 && idea.effort <= 4 && (
              <circle
                cx={idea.x}
                cy={idea.y}
                r="12"
                fill="#10b981"
                opacity="0.2"
              />
            )}
            <circle
              cx={idea.x}
              cy={idea.y}
              r="8"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
              className="cursor-pointer"
            />
            <text
              x={idea.x}
              y={idea.y + 25}
              textAnchor="middle"
              className="text-xs fill-gray-700"
              style={{ fontSize: '10px' }}
            >
              {idea.title.length > 15 ? idea.title.substring(0, 15) + '...' : idea.title}
            </text>
          </g>
        ))}
      </svg>

      {/* 아이디어별 Impact/Effort 조정 */}
      {!readonly && ideas.length > 0 && (
        <div className="mt-6 space-y-4 border-t pt-4">
          {ideas.map((idea) => (
            <div key={idea.id} className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-3">{idea.title}</h5>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Impact: {idea.impact} (1=낮음, 10=높음)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={idea.impact}
                    onChange={(e) =>
                      onUpdateIdea(idea.id, { impact: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Effort: {idea.effort} (1=쉬움, 10=어려움)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={idea.effort}
                    onChange={(e) =>
                      onUpdateIdea(idea.id, { effort: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

