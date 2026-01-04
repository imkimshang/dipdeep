'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  FileText,
  Table,
  AlertTriangle,
  CheckSquare,
  Settings,
  FileDown,
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
import { WorkbookStatusBar } from '@/components/WorkbookStatusBar'
import { useProjectAccess } from '@/hooks/useProjectAccess'
import { useWorkbookCredit } from '@/hooks/useWorkbookCredit'

interface AISearchLog {
  id: number
  query: string
  tool: string
  toolOther?: string
  findings: string
  sourceUrl: string
}

interface FactCheckRow {
  id: number
  metric: string
  aiValue: string
  actualValue: string
  status: 'pending' | 'match' | 'mismatch'
}

interface DataStructureRow {
  id: number
  item: string
  value: string
  unit: string
  note: string
}

interface Week2Data {
  aiSearchLog: AISearchLog[]
  factCheckTable: FactCheckRow[]
  rawInput: string
  structuredData: DataStructureRow[]
  is_submitted?: boolean
}

function Week2PageContent() {
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
  } = useProjectSettings(projectId)
  const { generateSummary } = useProjectSummary()
  const { checkAndDeductCredit } = useWorkbookCredit(projectId, 2)

  // State
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')

  const [aiSearchLog, setAiSearchLog] = useState<AISearchLog[]>([
    { id: 1, query: '', tool: 'Perplexity', toolOther: '', findings: '', sourceUrl: '' },
  ])

  const [factCheckTable, setFactCheckTable] = useState<FactCheckRow[]>([
    { id: 1, metric: '', aiValue: '', actualValue: '', status: 'pending' },
  ])

  const [rawInput, setRawInput] = useState('')
  const [structuredData, setStructuredData] = useState<DataStructureRow[]>([
    { id: 1, item: '', value: '', unit: '', note: '' },
  ])


  // Week 2 진행률 계산 함수를 등록 (Supabase 데이터 기반)
  useEffect(() => {
    registerProgressCalculator(2, (data: any) => {
      // 섹션 1: AI 검색 결과 기록지 (가중치: 35%)
      const section1Weight = 35
      let section1Filled = 0
      let section1Total = 0

      if (data.aiSearchLog && Array.isArray(data.aiSearchLog) && data.aiSearchLog.length > 0) {
        data.aiSearchLog.forEach((log: any) => {
          section1Total += 4
          if (log.query?.trim()) section1Filled++
          if (log.tool) section1Filled++
          if (log.findings?.trim()) section1Filled++
          if (log.sourceUrl?.trim()) section1Filled++
          if (log.tool === '기타' && log.toolOther?.trim()) {
            section1Filled++
            section1Total++
          }
        })
      }

      const section1Progress = section1Total > 0
        ? Math.min((section1Filled / section1Total) * 100, section1Weight)
        : 0

      // 섹션 2: 팩트체크 대조표 (가중치: 30%)
      const section2Weight = 30
      let section2Filled = 0
      let section2Total = 0

      if (data.factCheckTable && Array.isArray(data.factCheckTable) && data.factCheckTable.length > 0) {
        data.factCheckTable.forEach((row: any) => {
          section2Total += 3
          if (row.metric?.trim()) section2Filled++
          if (row.aiValue?.trim()) section2Filled++
          if (row.actualValue?.trim()) section2Filled++
        })
      }

      const section2Progress = section2Total > 0
        ? Math.min((section2Filled / section2Total) * 100, section2Weight)
        : 0

      // 섹션 3: 비정형 데이터 구조화 (가중치: 35%)
      const section3Weight = 35
      let section3Filled = 0
      let section3Total = 0

      section3Total++
      if (data.rawInput?.trim()) section3Filled++

      if (data.structuredData && Array.isArray(data.structuredData) && data.structuredData.length > 0) {
        data.structuredData.forEach((row: any) => {
          section3Total += 4
          if (row.item?.trim()) section3Filled++
          if (row.value?.trim()) section3Filled++
          if (row.unit?.trim()) section3Filled++
          if (row.note?.trim()) section3Filled++
        })
      }

      const section3Progress = section3Total > 0
        ? Math.min((section3Filled / section3Total) * 100, section3Weight)
        : 0

      const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
      return Math.round(totalProgress)
    })
  }, [registerProgressCalculator])

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 2) {
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

      const data = await loadStepData(2)
      if (data) {
        const week2Data = data as Week2Data
        if (week2Data.aiSearchLog) {
          setAiSearchLog(week2Data.aiSearchLog)
        }
        if (week2Data.factCheckTable) {
          setFactCheckTable(week2Data.factCheckTable)
        }
        if (week2Data.rawInput !== undefined) {
          setRawInput(week2Data.rawInput)
        }
        if (week2Data.structuredData) {
          setStructuredData(week2Data.structuredData)
        }
        if (week2Data.is_submitted !== undefined) {
          setIsSubmitted(week2Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])


  // Update fact check status
  const updateFactCheckStatus = (id: number, aiValue: string, actualValue: string) => {
    setFactCheckTable((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          let status: 'pending' | 'match' | 'mismatch' = 'pending'
          if (aiValue.trim() && actualValue.trim()) {
            status = aiValue.trim() === actualValue.trim() ? 'match' : 'mismatch'
          }
          return { ...row, aiValue, actualValue, status }
        }
        return row
      })
    )
  }

  const handleAiSearchLogChange = (
    index: number,
    field: keyof AISearchLog,
    value: string
  ) => {
    const updated = [...aiSearchLog]
    updated[index] = { ...updated[index], [field]: value }
    // 기타 도구가 아닌 경우 toolOther 초기화
    if (field === 'tool' && value !== '기타') {
      updated[index].toolOther = ''
    }
    setAiSearchLog(updated)
  }

  const addAiSearchLog = () => {
    const newId = Math.max(...aiSearchLog.map((log) => log.id), 0) + 1
    setAiSearchLog([
      ...aiSearchLog,
      { id: newId, query: '', tool: 'Perplexity', toolOther: '', findings: '', sourceUrl: '' },
    ])
  }

  const removeAiSearchLog = (id: number) => {
    if (aiSearchLog.length > 1) {
      setAiSearchLog(aiSearchLog.filter((log) => log.id !== id))
    }
  }

  const handleFactCheckChange = (
    index: number,
    field: keyof FactCheckRow,
    value: string
  ) => {
    const updated = [...factCheckTable]
    const row = updated[index]
    updated[index] = { ...row, [field]: value }

    if (field === 'aiValue' || field === 'actualValue') {
      const aiVal = field === 'aiValue' ? value : row.aiValue
      const actualVal = field === 'actualValue' ? value : row.actualValue
      updateFactCheckStatus(row.id, aiVal, actualVal)
    } else {
      setFactCheckTable(updated)
    }
  }

  const addFactCheckRow = () => {
    const newId = Math.max(...factCheckTable.map((row) => row.id), 0) + 1
    setFactCheckTable([
      ...factCheckTable,
      { id: newId, metric: '', aiValue: '', actualValue: '', status: 'pending' },
    ])
  }

  const removeFactCheckRow = (id: number) => {
    if (factCheckTable.length > 1) {
      setFactCheckTable(factCheckTable.filter((row) => row.id !== id))
    }
  }

  const handleStructuredDataChange = (
    index: number,
    field: keyof DataStructureRow,
    value: string
  ) => {
    const updated = [...structuredData]
    updated[index] = { ...updated[index], [field]: value }
    setStructuredData(updated)
  }

  const addStructuredDataRow = () => {
    const newId = Math.max(...structuredData.map((row) => row.id), 0) + 1
    setStructuredData([
      ...structuredData,
      { id: newId, item: '', value: '', unit: '', note: '' },
    ])
  }

  const removeStructuredDataRow = (id: number) => {
    if (structuredData.length > 1) {
      setStructuredData(structuredData.filter((row) => row.id !== id))
    }
  }

  const calculateProgress = (): number => {
    // 섹션 1: AI 검색 결과 기록지 (가중치: 35%)
    const section1Weight = 35
    let section1Filled = 0
    let section1Total = 0

    if (aiSearchLog.length > 0) {
      aiSearchLog.forEach((log) => {
        section1Total += 4
        if (log.query.trim()) section1Filled++
        if (log.tool.trim()) {
          section1Filled++
          // 기타 도구인 경우 toolOther도 확인
          if (log.tool === '기타') {
            section1Total++
            if (log.toolOther?.trim()) section1Filled++
          }
        }
        if (log.findings.trim()) section1Filled++
        if (log.sourceUrl.trim()) section1Filled++
      })
    }

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: 팩트체크 대조표 (가중치: 30%)
    const section2Weight = 30
    let section2Filled = 0
    let section2Total = 0

    if (factCheckTable.length > 0) {
      factCheckTable.forEach((row) => {
        section2Total += 3
        if (row.metric.trim()) section2Filled++
        if (row.aiValue.trim()) section2Filled++
        if (row.actualValue.trim()) section2Filled++
      })
    }

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 섹션 3: 비정형 데이터 구조화 (가중치: 35%)
    const section3Weight = 35
    let section3Filled = 0
    let section3Total = 0

    // Raw Input
    section3Total++
    if (rawInput.trim()) section3Filled++

    // Structured Data
    if (structuredData.length > 0) {
      structuredData.forEach((row) => {
        section3Total += 4
        if (row.item.trim()) section3Filled++
        if (row.value.trim()) section3Filled++
        if (row.unit.trim()) section3Filled++
        if (row.note.trim()) section3Filled++
      })
    }

    const section3Progress = section3Total > 0
      ? Math.min((section3Filled / section3Total) * 100, section3Weight)
      : 0

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
    return Math.round(totalProgress)
  }

  const handleReset = () => {
    if (
      !confirm(
        '모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return
    }

    setAiSearchLog([
      { id: 1, query: '', tool: 'Perplexity', toolOther: '', findings: '', sourceUrl: '' },
    ])
    setFactCheckTable([
      { id: 1, metric: '', aiValue: '', actualValue: '', status: 'pending' },
    ])
    setRawInput('')
    setStructuredData([{ id: 1, item: '', value: '', unit: '', note: '' }])
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

    // 최초 1회 저장 시 크레딧 차감
    try {
      await checkAndDeductCredit()
    } catch (error: any) {
      setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
      setToastVisible(true)
      return
    }

    const week2Data: Week2Data = {
      aiSearchLog,
      factCheckTable,
      rawInput,
      structuredData,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()
    const success = await saveStepData(2, week2Data, progress)

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
      const success = await deleteProject()
      if (success) {
        setToastMessage('프로젝트가 삭제되었습니다.')
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

    const week2Data: Week2Data = {
      aiSearchLog,
      factCheckTable,
      rawInput,
      structuredData,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(2, week2Data, newSubmittedState, progress)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastMessage.includes('오류') ? 'error' : 'success'}
      />
      <WorkbookHeader
        title="Phase 1: Data - 2회: 데이터 탐색 및 실제 데이터 교차 검증"
        description="AI 검색 결과를 기록하고 실제 데이터와 교차 검증합니다."
        phase="Phase 1: Data"
        isScrolled={isScrolled}
        currentWeek={2}
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
          currentWeek={2}
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
                    <p className="text-sm text-gray-600">
                      URL에 projectId 파라미터가 필요합니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: AI Search Log */}
            <WorkbookSection
              icon={Search}
              title="섹션 1: AI 검색 결과 기록지 (AI Search Log)"
              description="AI 도구를 통해 수집한 초기 정보를 기록하고 관리하세요."
              themeColor="indigo"
            >

              <div className="space-y-6">
                {aiSearchLog.map((log, index) => (
                  <div
                    key={log.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-gray-900">검색 기록 {index + 1}</h3>
                      </div>
                      {aiSearchLog.length > 1 && (
                        <button
                          onClick={() => removeAiSearchLog(log.id)}
                          disabled={readonly}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            주요 검색어
                          </label>
                          <input
                            type="text"
                            value={log.query}
                            onChange={(e) =>
                              handleAiSearchLogChange(index, 'query', e.target.value)
                            }
                            placeholder="검색어를 입력하세요"
                            disabled={readonly}
                            className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            사용 도구
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['Perplexity', 'Gemini', 'ChatGPT', 'Claude', '기타'].map((tool) => (
                              <button
                                key={tool}
                                type="button"
                                onClick={() => {
                                  if (!readonly) {
                                    handleAiSearchLogChange(index, 'tool', tool)
                                  }
                                }}
                                disabled={readonly}
                                className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  log.tool === tool
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                              >
                                {tool}
                              </button>
                            ))}
                          </div>
                          {log.tool === '기타' && (
                            <div className="mt-2">
                              <input
                                type="text"
                                value={log.toolOther || ''}
                                onChange={(e) =>
                                  handleAiSearchLogChange(index, 'toolOther', e.target.value)
                                }
                                placeholder="도구명을 입력하세요"
                                disabled={readonly}
                                className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          발견 사항
                        </label>
                        <textarea
                          value={log.findings}
                          onChange={(e) =>
                            handleAiSearchLogChange(index, 'findings', e.target.value)
                          }
                          rows={4}
                          placeholder="핵심 통계 및 요약 내용을 입력하세요"
                          disabled={readonly}
                          className="input-field resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          출처 URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={log.sourceUrl}
                            onChange={(e) =>
                              handleAiSearchLogChange(index, 'sourceUrl', e.target.value)
                            }
                            placeholder="https://example.com"
                            disabled={readonly}
                            className="input-field flex-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          {log.sourceUrl.trim() && (
                            <a
                              href={log.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary"
                            >
                              <ExternalLink className="w-4 h-4" />
                              새창 열기
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!readonly && (
                  <button
                    onClick={addAiSearchLog}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    검색 기록 추가
                  </button>
                )}
              </div>
            </WorkbookSection>

            {/* Section 2: Fact-Check Table */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <CheckSquare className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  섹션 2: 팩트체크 대조표 (Fact-Check Table)
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                AI 답변과 실제 데이터(KOSIS 등)를 직접 비교하여 검증하세요.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        측정 지표 항목명
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        AI 답변 수치
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        실제 데이터 수치
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 w-24">
                        상태
                      </th>
                      {!readonly && (
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 w-16">
                          삭제
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {factCheckTable.map((row, index) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.metric}
                            onChange={(e) =>
                              handleFactCheckChange(index, 'metric', e.target.value)
                            }
                            placeholder="측정 지표"
                            disabled={readonly}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.aiValue}
                            onChange={(e) =>
                              handleFactCheckChange(index, 'aiValue', e.target.value)
                            }
                            placeholder="AI 답변"
                            disabled={readonly}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.actualValue}
                            onChange={(e) =>
                              handleFactCheckChange(index, 'actualValue', e.target.value)
                            }
                            placeholder="실제 데이터"
                            disabled={readonly}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.status === 'match' && (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          )}
                          {row.status === 'mismatch' && (
                            <AlertTriangle className="w-5 h-5 text-orange-600 mx-auto" />
                          )}
                          {row.status === 'pending' && (
                            <div className="w-5 h-5 rounded-full bg-gray-300 mx-auto" />
                          )}
                        </td>
                        {!readonly && (
                          <td className="py-3 px-4 text-center">
                            {factCheckTable.length > 1 && (
                              <button
                                onClick={() => removeFactCheckRow(row.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!readonly && (
                  <button
                    onClick={addFactCheckRow}
                    className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    행 추가
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Data Structuring */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Table className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  섹션 3: 비정형 데이터 구조화 (Data Structuring)
                </h2>
              </div>

              {/* Step 1: Raw Input */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Step 1: Raw Input</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  리포트 원문이나 기사를 붙여넣어주세요. (최대 2,000자)
                </p>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value.slice(0, 2000))}
                  rows={8}
                  placeholder="비정형 데이터 원문을 입력하세요..."
                  disabled={readonly}
                  maxLength={2000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {rawInput.length}/2,000자
                </div>
              </div>

              {/* Step 2: Structured Table */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Table className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Step 2: Structured Table</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  텍스트에서 추출한 데이터를 표 형식으로 입력하세요.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">항목</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">수치</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">단위</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">비고</th>
                        {!readonly && (
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 w-16">
                            삭제
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {structuredData.map((row, index) => (
                        <tr key={row.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={row.item}
                              onChange={(e) =>
                                handleStructuredDataChange(index, 'item', e.target.value)
                              }
                              placeholder="항목명"
                              disabled={readonly}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={row.value}
                              onChange={(e) =>
                                handleStructuredDataChange(index, 'value', e.target.value)
                              }
                              placeholder="수치"
                              disabled={readonly}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) =>
                                handleStructuredDataChange(index, 'unit', e.target.value)
                              }
                              placeholder="단위"
                              disabled={readonly}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={row.note}
                              onChange={(e) =>
                                handleStructuredDataChange(index, 'note', e.target.value)
                              }
                              placeholder="비고"
                              disabled={readonly}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          {!readonly && (
                            <td className="py-3 px-4 text-center">
                              {structuredData.length > 1 && (
                                <button
                                  onClick={() => removeStructuredDataRow(row.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!readonly && (
                    <button
                      onClick={addStructuredDataRow}
                      className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      행 추가
                    </button>
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



export default function Week2Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <Week2PageContent />
    </Suspense>
  )
}
