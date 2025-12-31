'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  Download,
  BarChart3,
  ClipboardCheck,
  X,
  Plus,
  Trash2,
  AlertCircle,
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
import { WorkbookStatusBar } from '@/components/WorkbookStatusBar'
import { useProjectAccess } from '@/hooks/useProjectAccess'



interface Week4Data {
  status: string // 현황 (1회차 데이터)
  evidence: string // 증거 (2회차 데이터)
  persona: string // 사용자 (3회차 데이터)
  conclusion: string // 결론 (How Might We)
  visualization: {
    items: {
      id: number
      data: string // 표현할 데이터
      chartType: string // 추천 그래프 형태
      reason: string // 선택 이유
    }[]
  }
  checklist: {
    item1: boolean
    item2: boolean
    item3: boolean
    item4: boolean
  }
  aiMentorFeedback?: string
  finalRevisionDirection?: string
  is_submitted?: boolean
}

function Week4PageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const supabase = createClient()

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

  const [formData, setFormData] = useState<Week4Data>({
    status: '',
    evidence: '',
    persona: '',
    conclusion: '',
    visualization: {
      items: [{
        id: 1,
        data: '',
        chartType: 'bar',
        reason: '',
      }],
    },
    checklist: {
      item1: false,
      item2: false,
      item3: false,
      item4: false,
    },
    aiMentorFeedback: '',
    finalRevisionDirection: '',
  })

  // Custom progress calculation for week 4 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 리포트 스토리라인 설계 (가중치: 60%)
    const section1Weight = 60
    let section1Filled = 0
    let section1Total = 4 // status, evidence, persona, conclusion

    if (formData.status.trim()) section1Filled++
    if (formData.evidence.trim()) section1Filled++
    if (formData.persona.trim()) section1Filled++
    if (formData.conclusion.trim()) section1Filled++

    const section1Progress = Math.min((section1Filled / section1Total) * 100, section1Weight)

    // 섹션 2: 데이터 시각화 보드 (가중치: 20%)
    const section2Weight = 20
    let section2Filled = 0
    let section2Total = 0

    if (formData.visualization && formData.visualization.items && formData.visualization.items.length > 0) {
      formData.visualization.items.forEach((item: any) => {
        section2Total += 3
        if (item.data?.trim()) section2Filled++
        if (item.chartType?.trim()) section2Filled++
        if (item.reason?.trim()) section2Filled++
      })
    }

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 섹션 3: 자가 체크리스트 (가중치: 20%)
    const section3Weight = 20
    let section3Filled = 0
    let section3Total = 4

    if (formData.checklist?.item1) section3Filled++
    if (formData.checklist?.item2) section3Filled++
    if (formData.checklist?.item3) section3Filled++
    if (formData.checklist?.item4) section3Filled++

    const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
    return Math.round(totalProgress)
  }

  // Week 4 진행률 계산 함수를 등록 (Supabase 데이터 기반)
  useEffect(() => {
    registerProgressCalculator(4, (data: any) => {
      // 섹션 1: 리포트 스토리라인 설계 (가중치: 60%)
      const section1Weight = 60
      let section1Filled = 0
      let section1Total = 4

      if (data.status?.trim()) section1Filled++
      if (data.evidence?.trim()) section1Filled++
      if (data.persona?.trim()) section1Filled++
      if (data.conclusion?.trim()) section1Filled++

      const section1Progress = Math.min((section1Filled / section1Total) * 100, section1Weight)

      // 섹션 2: 데이터 시각화 보드 (가중치: 20%)
      const section2Weight = 20
      let section2Filled = 0
      let section2Total = 0

      if (data.visualization?.items && Array.isArray(data.visualization.items) && data.visualization.items.length > 0) {
        data.visualization.items.forEach((item: any) => {
          section2Total += 3
          if (item.data?.trim()) section2Filled++
          if (item.chartType?.trim()) section2Filled++
          if (item.reason?.trim()) section2Filled++
        })
      }

      const section2Progress = section2Total > 0
        ? Math.min((section2Filled / section2Total) * 100, section2Weight)
        : 0

      // 섹션 3: 자가 체크리스트 (가중치: 20%)
      const section3Weight = 20
      let section3Filled = 0
      let section3Total = 4

      if (data.checklist?.item1) section3Filled++
      if (data.checklist?.item2) section3Filled++
      if (data.checklist?.item3) section3Filled++
      if (data.checklist?.item4) section3Filled++

      const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

      const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
      return Math.round(totalProgress)
    })
  }, [registerProgressCalculator])

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 4) {
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

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(4)
      if (data) {
        const week4Data = data as Week4Data
        
        // 기존 데이터 마이그레이션: metrics 배열 구조를 items 구조로 변환
        if (week4Data.visualization) {
          if ((week4Data.visualization as any).metrics && Array.isArray((week4Data.visualization as any).metrics)) {
            // 기존 구조를 새 구조로 변환
            const oldViz = week4Data.visualization as any
            const items = oldViz.metrics && oldViz.metrics.length > 0
              ? oldViz.metrics.map((metric: string, idx: number) => ({
                  id: idx + 1,
                  data: metric || '',
                  chartType: oldViz.chartType || 'bar',
                  reason: '',
                }))
              : [{
                  id: 1,
                  data: '',
                  chartType: oldViz.chartType || 'bar',
                  reason: '',
                }]
            
            week4Data.visualization = { items }
          } else if (!week4Data.visualization.items) {
            // items가 없으면 기본값 설정
            week4Data.visualization = {
              items: [{
                id: 1,
                data: '',
                chartType: 'bar',
                reason: '',
              }],
            }
          }
        }
        
        setFormData(week4Data)
        if (week4Data.is_submitted !== undefined) {
          setIsSubmitted(week4Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

  // Load previous weeks data for import
  const loadPreviousWeeksData = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    try {
      // Load week 1, 2, 3 data
      const { data: steps, error } = await supabase
        .from('project_steps')
        .select('*')
        .eq('project_id', projectId)
        .in('step_number', [1, 2, 3])
        .order('step_number', { ascending: true })

      if (error) throw error

      let statusText = ''
      let evidenceText = ''
      let personaText = ''

      steps?.forEach((step: any) => {
        const stepData = step.step_data || {}
        if (step.step_number === 1) {
          // Week 1: Problem Log
          if (stepData.problemLog) {
            statusText = stepData.problemLog
              .map(
                (p: any, idx: number) =>
                  `${idx + 1}. ${p.title || ''}\n상세: ${p.description || ''}\n목표: ${p.goal || ''}`
              )
              .join('\n\n')
          }
        } else if (step.step_number === 2) {
          // Week 2: Fact-check and data structuring
          const parts: string[] = []
          if (stepData.aiSearchLog) {
            parts.push(
              'AI 검색 기록:\n' +
                stepData.aiSearchLog
                  .map(
                    (log: any, idx: number) =>
                      `${idx + 1}. ${log.query || ''}\n도구: ${log.tool || ''}\n발견: ${log.findings || ''}`
                  )
                  .join('\n\n')
            )
          }
          if (stepData.factCheckTable) {
            parts.push(
              '팩트체크:\n' +
                stepData.factCheckTable
                  .map((row: any) => `${row.metric || ''}: AI=${row.aiValue || ''}, 실제=${row.actualValue || ''}`)
                  .join('\n')
            )
          }
          evidenceText = parts.join('\n\n')
        } else if (step.step_number === 3) {
          // Week 3: Persona and survey
          const parts: string[] = []
          if (stepData.persona) {
            parts.push(
              '페르소나:\n' +
                stepData.persona
                  .map(
                    (p: any, idx: number) =>
                      `${idx + 1}. ${p.name || ''} (${p.age || ''}), ${p.job || ''}\n고충: ${p.painPoint || ''}`
                  )
                  .join('\n\n')
            )
          }
          if (stepData.surveyPurpose) {
            parts.push(`설문 목적: ${stepData.surveyPurpose}`)
          }
          personaText = parts.join('\n\n')
        }
      })

      setFormData((prev) => ({
        ...prev,
        status: statusText,
        evidence: evidenceText,
        persona: personaText,
      }))


      setToastMessage('이전 회차 데이터를 불러왔습니다.')
      setToastVisible(true)
    } catch (error: any) {
      console.error('데이터 불러오기 오류:', error)
      setToastMessage('데이터 불러오기에 실패했습니다.')
      setToastVisible(true)
    }
  }

  // Calculate checklist progress
  const checklistProgress = (): number => {
    const checked = Object.values(formData.checklist).filter(Boolean).length
    return Math.round((checked / 4) * 100)
  }

  const handleReset = () => {
    if (!confirm('모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setFormData({
      status: '',
      evidence: '',
      persona: '',
      conclusion: '',
      visualization: {
        items: [{
          id: 1,
          data: '',
          chartType: 'bar',
          reason: '',
        }],
      },
      checklist: {
        item1: false,
        item2: false,
        item3: false,
        item4: false,
      },
      aiMentorFeedback: '',
      finalRevisionDirection: '',
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

    const week4Data: Week4Data = {
      ...formData,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()
    const success = await saveStepData(4, week4Data, progress)

    if (success) {
      setToastMessage('저장되었습니다.')
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('저장 중 오류가 발생했습니다.')
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

    const week4Data: Week4Data = {
      ...formData,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(4, week4Data, newSubmittedState, progress)

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
              <p className="text-sm text-gray-600">URL에 projectId 파라미터가 필요합니다.</p>
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
        title="Phase 1: Data - 4회차: 데이터 문제 정의 리포트"
        description="이전 회차의 데이터를 통합하여 문제를 명확히 정의하세요."
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
        <main className="flex-1 pb-16">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {!projectId && (
              <div className="glass rounded-xl p-6 mb-8 border-l-4 border-indigo-600">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">프로젝트 ID 필요</h3>
                    <p className="text-sm text-gray-600">URL에 projectId 파라미터가 필요합니다.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Report Storylining */}
            <WorkbookSection
              icon={FileText}
              title="섹션 1: 리포트 스토리라인 설계"
              description="1~3회차의 데이터를 하나의 흐름으로 연결하여 문제를 정의하세요."
              themeColor="indigo"
            >
              <div className="mb-4 flex justify-end">
                <button
                  onClick={loadPreviousWeeksData}
                  disabled={storageLoading || readonly}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {storageLoading ? '불러오는 중...' : '이전 회차 데이터 불러오기'}
                </button>
              </div>

              <div className="space-y-8">
                {/* Step 1: 현황 */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                        1
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">현황 (Status)</label>
                      <p className="text-xs text-gray-500 mb-3">1회차에서 발견한 불편함 내용을 정리하세요.</p>
                      <textarea
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        rows={4}
                        placeholder="1회차에서 기록한 일상 불편함들을 정리하여 입력하세요..."
                        disabled={readonly}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="absolute left-6 top-14 w-0.5 h-8 bg-gray-200 border-l-2 border-dashed border-gray-300" />
                </div>

                {/* Step 2: 증거 */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                        2
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">증거 (Evidence)</label>
                      <p className="text-xs text-gray-500 mb-3">2회차에서 수집한 팩트체크 데이터를 정리하세요.</p>
                      <textarea
                        value={formData.evidence}
                        onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                        rows={4}
                        placeholder="2회차에서 검증한 AI 답변과 실제 데이터를 정리하여 입력하세요..."
                        disabled={readonly}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="absolute left-6 top-14 w-0.5 h-8 bg-gray-200 border-l-2 border-dashed border-gray-300" />
                </div>

                {/* Step 3: 사용자 */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                        3
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">사용자 (Persona)</label>
                      <p className="text-xs text-gray-500 mb-3">3회차에서 정의한 페르소나와 고충을 정리하세요.</p>
                      <textarea
                        value={formData.persona}
                        onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                        rows={4}
                        placeholder="3회차에서 설정한 페르소나의 특성과 핵심 고충을 정리하여 입력하세요..."
                        disabled={readonly}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="absolute left-6 top-14 w-0.5 h-8 bg-gray-200 border-l-2 border-dashed border-gray-300" />
                </div>

                {/* Step 4: 결론 - 강조 */}
                <div className="relative bg-white rounded-xl p-6 border-2 border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                        4
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">결론 (Conclusion)</label>
                      <p className="text-xs text-gray-600 mb-3 font-medium">
                        &quot;How Might We...&quot; 형식으로 문제를 명확하게 정의하세요.
                      </p>
                      <textarea
                        value={formData.conclusion}
                        onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                        rows={5}
                        placeholder="How Might We [사용자]가 [상황]에서 [목표]를 달성할 수 있도록 도와줄 수 있을까?"
                        disabled={readonly}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y font-medium text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </WorkbookSection>

            {/* Section 2: Visualization Board */}
            <WorkbookSection
              icon={BarChart3}
              title="섹션 2: 데이터 시각화 보드"
              description="시각화하고 싶은 데이터와 그래프 형태를 선택하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {formData.visualization.items.map((item, idx) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-900">시각화 항목 {idx + 1}</h4>
                      {formData.visualization.items.length > 1 && !readonly && (
                        <button
                          onClick={() => {
                            const newItems = formData.visualization.items.filter((_, i) => i !== idx)
                            setFormData({
                              ...formData,
                              visualization: { ...formData.visualization, items: newItems },
                            })
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        표현할 데이터
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.data}
                          onChange={(e) => {
                            const newItems = [...formData.visualization.items]
                            newItems[idx] = { ...newItems[idx], data: e.target.value }
                            setFormData({
                              ...formData,
                              visualization: { ...formData.visualization, items: newItems },
                            })
                          }}
                          placeholder="예: 20대 응답자의 불안감 수치 (87%)"
                          disabled={readonly}
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {!readonly && (
                          <button
                            onClick={() => {
                              const newItems = [...formData.visualization.items]
                              newItems[idx] = { ...newItems[idx], data: '' }
                              setFormData({
                                ...formData,
                                visualization: { ...formData.visualization, items: newItems },
                              })
                            }}
                            className="px-3 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        추천 그래프 형태
                      </label>
                      <select
                        value={item.chartType}
                        onChange={(e) => {
                          const newItems = [...formData.visualization.items]
                          newItems[idx] = { ...newItems[idx], chartType: e.target.value }
                          setFormData({
                            ...formData,
                            visualization: { ...formData.visualization, items: newItems },
                          })
                        }}
                        disabled={readonly}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="bar">막대 그래프 (Bar Chart)</option>
                        <option value="line">선 그래프 (Line Chart)</option>
                        <option value="pie">원형 그래프 (Pie Chart)</option>
                        <option value="scatter">산점도 (Scatter Plot)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        선택 이유
                      </label>
                      <textarea
                        value={item.reason}
                        onChange={(e) => {
                          const newItems = [...formData.visualization.items]
                          newItems[idx] = { ...newItems[idx], reason: e.target.value }
                          setFormData({
                            ...formData,
                            visualization: { ...formData.visualization, items: newItems },
                          })
                        }}
                        rows={3}
                        placeholder="이 그래프가 효과적이라고 생각하는 이유를 AI와 상의하여 작성합니다."
                        disabled={readonly}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                ))}

                {!readonly && (
                  <button
                    onClick={() => {
                      const newId = Math.max(...formData.visualization.items.map(i => i.id), 0) + 1
                      setFormData({
                        ...formData,
                        visualization: {
                          ...formData.visualization,
                          items: [
                            ...formData.visualization.items,
                            {
                              id: newId,
                              data: '',
                              chartType: 'bar',
                              reason: '',
                            },
                          ],
                        },
                      })
                    }}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    시각화 항목 추가
                  </button>
                )}
              </div>
            </WorkbookSection>

            {/* Section 3: Self-check & AI Feedback */}
            <WorkbookSection
              icon={ClipboardCheck}
              title="섹션 3: 제출 전 자가 점검 및 피드백"
              description="리포트를 점검하고 AI 멘토의 피드백을 받아 개선하세요."
              themeColor="indigo"
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* 왼쪽: 자가 점검 리스트 */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-4">제출 전 자가 점검 리스트</h4>
                  <div className="space-y-3 mb-6">
                    {[
                      { key: 'item1', label: '1~3회차 내용을 바탕으로 리포트 초안을 작성했나요?' },
                      { key: 'item2', label: '핵심 문제(HMW)가 명확하고 설득력있게 정의되었나요?' },
                      { key: 'item3', label: '데이터 시각화 아이디어가 데이터의 특징을 잘 반영하나요?' },
                      { key: 'item4', label: 'AI 멘토의 피드백을 요청하고, 수정 방향을 기록했나요?' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={formData.checklist[item.key as keyof typeof formData.checklist]}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              checklist: { ...formData.checklist, [item.key]: e.target.checked },
                            })
                          }
                          disabled={readonly}
                          className="mt-0.5 w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="flex-1 text-sm text-gray-700 leading-relaxed group-hover:text-gray-900">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">진행률:</span>
                      <span className="text-sm font-semibold text-gray-900">{checklistProgress()}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${checklistProgress()}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 오른쪽: AI 멘토 피드백 및 최종 수정 방향 */}
                <div className="space-y-6">
                  {/* AI 멘토 피드백 */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3">AI 멘토 피드백</h4>
                    <textarea
                      value={formData.aiMentorFeedback || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          aiMentorFeedback: e.target.value,
                        })
                      }
                      rows={8}
                      placeholder="작성한 리포트 초안을 AI에게 보여주고, 논리적 비약이나 개선점에 대한 피드백을 받아 기록하세요."
                      disabled={readonly}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-50 disabled:cursor-not-allowed text-sm text-gray-700"
                    />
                  </div>

                  {/* 최종 수정 방향 */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3">최종 수정 방향</h4>
                    <textarea
                      value={formData.finalRevisionDirection || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          finalRevisionDirection: e.target.value,
                        })
                      }
                      rows={8}
                      placeholder="피드백을 바탕으로 어떤 부분을 어떻게 수정할 것인지 구체적인 계획을 작성합니다."
                      disabled={readonly}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-50 disabled:cursor-not-allowed text-sm text-gray-700"
                    />
                  </div>
                </div>
              </div>
            </WorkbookSection>

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

      {/* 하단 상태 바 */}
      {projectId && <WorkbookStatusBar projectId={projectId} />}
    </div>
  )
}


export default function Week4Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <Week4PageContent />
    </Suspense>
  )
}
