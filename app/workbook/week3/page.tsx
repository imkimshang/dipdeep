'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  Plus,
  Trash2,
  User,
  ClipboardList,
  BarChart3,
  BarChart,
  PieChart,
  TrendingUp,
  Layers,
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

interface PersonaCard {
  id: number
  name: string
  age: string
  job: string
  lifestyle: string
  dataEvidence: string
  painPoint: string
}

interface SurveyQuestion {
  id: number
  question: string
  responseType: 'single' | 'scale' | 'yesno'
  options?: string[]
  optionsInput?: string // 옵션 입력 필드의 원시 값 (쉼표 포함)
  responses?: VirtualResponse[]
  chartType?: 'bar' | 'stacked' | 'pie' | 'line' // 질문별 그래프 타입
}

interface VirtualResponse {
  label: string
  count: number
  percentage: number
}

interface Week3Data {
  persona: PersonaCard[]
  surveyPurpose: string
  surveyQuestions: SurveyQuestion[]
  virtualAnalysis: {
    chartType: 'bar' | 'stacked' | 'pie' | 'line'
    totalResponses: number
  }
  insightSummary: string
  is_submitted?: boolean
}

export default function Week3Page() {
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

  const [persona, setPersona] = useState<PersonaCard[]>([
    {
      id: 1,
      name: '',
      age: '',
      job: '',
      lifestyle: '',
      dataEvidence: '',
      painPoint: '',
    },
  ])

  const [surveyPurpose, setSurveyPurpose] = useState('')
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([
    { id: 1, question: '', responseType: 'single', options: [], optionsInput: '', chartType: 'bar' },
  ])

  const [virtualAnalysis, setVirtualAnalysis] = useState({
    chartType: 'bar' as 'bar' | 'stacked' | 'pie' | 'line',
    totalResponses: 100,
  })

  const [insightSummary, setInsightSummary] = useState('')

  // Custom progress calculation for week 3 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 페르소나 캔버스 (가중치: 35%)
    const section1Weight = 35
    let section1Filled = 0
    let section1Total = 0

    if (persona.length > 0) {
      persona.forEach((p) => {
        section1Total += 6
        if (p.name?.trim()) section1Filled++
        if (p.age?.trim()) section1Filled++
        if (p.job?.trim()) section1Filled++
        if (p.lifestyle?.trim()) section1Filled++
        if (p.dataEvidence?.trim()) section1Filled++
        if (p.painPoint?.trim()) section1Filled++
      })
    }

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: 설문 빌더 (가중치: 35%)
    const section2Weight = 35
    let section2Filled = 0
    let section2Total = 0

    section2Total++
    if (surveyPurpose?.trim()) section2Filled++

    if (surveyQuestions.length > 0) {
      surveyQuestions.forEach((q) => {
        section2Total += 2
        if (q.question?.trim()) section2Filled++
        if (q.responseType) section2Filled++
      })
    }

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 섹션 3: 가상 분석 (가중치: 30%)
    const section3Weight = 30
    let section3Filled = 0
    let section3Total = 0

    section3Total++
    if (insightSummary?.trim()) section3Filled++

    // Virtual analysis는 기본값이 있으므로 항상 1점 부여
    section3Total++
    section3Filled++

    const section3Progress = section3Total > 0
      ? Math.min((section3Filled / section3Total) * 100, section3Weight)
      : 0

    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
    return Math.round(totalProgress)
  }

  // Week 3 진행률 계산 함수를 등록 (Supabase 데이터 기반)
  useEffect(() => {
    registerProgressCalculator(3, (data: any) => {
      const section1Weight = 35
      let section1Filled = 0
      let section1Total = 0

      if (data.persona && Array.isArray(data.persona) && data.persona.length > 0) {
        data.persona.forEach((p: any) => {
          section1Total += 6
          if (p.name?.trim()) section1Filled++
          if (p.age?.trim()) section1Filled++
          if (p.job?.trim()) section1Filled++
          if (p.lifestyle?.trim()) section1Filled++
          if (p.dataEvidence?.trim()) section1Filled++
          if (p.painPoint?.trim()) section1Filled++
        })
      }

      const section1Progress = section1Total > 0
        ? Math.min((section1Filled / section1Total) * 100, section1Weight)
        : 0

      const section2Weight = 35
      let section2Filled = 0
      let section2Total = 0

      section2Total++
      if (data.surveyPurpose?.trim()) section2Filled++

      if (data.surveyQuestions && Array.isArray(data.surveyQuestions) && data.surveyQuestions.length > 0) {
        data.surveyQuestions.forEach((q: any) => {
          section2Total += 2
          if (q.question?.trim()) section2Filled++
          if (q.responseType) section2Filled++
        })
      }

      const section2Progress = section2Total > 0
        ? Math.min((section2Filled / section2Total) * 100, section2Weight)
        : 0

      const section3Weight = 30
      let section3Filled = 0
      let section3Total = 0

      section3Total++
      if (data.insightSummary?.trim()) section3Filled++

      section3Total++
      section3Filled++

      const section3Progress = section3Total > 0
        ? Math.min((section3Filled / section3Total) * 100, section3Weight)
        : 0

      const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
      return Math.round(totalProgress)
    })
  }, [registerProgressCalculator])

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 3) {
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

      const data = await loadStepData(3)
      if (data) {
        const week3Data = data as Week3Data
        if (week3Data.persona) {
          setPersona(week3Data.persona)
        }
        if (week3Data.surveyPurpose !== undefined) {
          setSurveyPurpose(week3Data.surveyPurpose)
        }
        if (week3Data.surveyQuestions) {
          // 기존 데이터에 chartType과 optionsInput이 없으면 기본값 추가
          const questionsWithDefaults = week3Data.surveyQuestions.map((q: any) => ({
            ...q,
            chartType: q.chartType || 'bar',
            optionsInput: q.optionsInput !== undefined ? q.optionsInput : (q.options && q.options.length > 0 ? q.options.join(', ') : ''),
          }))
          setSurveyQuestions(questionsWithDefaults)
        }
        if (week3Data.virtualAnalysis) {
          setVirtualAnalysis(week3Data.virtualAnalysis)
        } else {
          if ((week3Data as any).sentimentRatio) {
            setVirtualAnalysis({ chartType: 'bar', totalResponses: 100 })
          }
        }
        if (week3Data.insightSummary !== undefined) {
          setInsightSummary(week3Data.insightSummary)
        }
        if (week3Data.is_submitted !== undefined) {
          setIsSubmitted(week3Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

  const handlePersonaChange = (
    index: number,
    field: keyof PersonaCard,
    value: string
  ) => {
    const updated = [...persona]
    updated[index] = { ...updated[index], [field]: value }
    setPersona(updated)
  }

  const addPersona = () => {
    const newId = Math.max(...persona.map((p) => p.id), 0) + 1
    setPersona([
      ...persona,
      {
        id: newId,
        name: '',
        age: '',
        job: '',
        lifestyle: '',
        dataEvidence: '',
        painPoint: '',
      },
    ])
  }

  const removePersona = (id: number) => {
    if (persona.length > 1) {
      setPersona(persona.filter((p) => p.id !== id))
    }
  }

  // 질문에 대한 가상 응답 데이터 생성
  const generateVirtualResponses = (question: SurveyQuestion, totalResponses: number = virtualAnalysis.totalResponses): VirtualResponse[] => {
    if (!question.question.trim()) return []
    const responses: VirtualResponse[] = []

    if (question.responseType === 'yesno') {
      const yesCount = Math.floor(Math.random() * (totalResponses * 0.3) + totalResponses * 0.35)
      const noCount = totalResponses - yesCount
      responses.push(
        { label: '네', count: yesCount, percentage: (yesCount / totalResponses) * 100 },
        { label: '아니오', count: noCount, percentage: (noCount / totalResponses) * 100 }
      )
    } else if (question.responseType === 'scale') {
      const scalePoints = [1, 2, 3, 4, 5]
      const weights = [0.1, 0.15, 0.3, 0.3, 0.15]
      scalePoints.forEach((point, index) => {
        const baseCount = Math.floor(totalResponses * weights[index])
        const variance = Math.floor(Math.random() * (totalResponses * 0.1))
        const count = Math.max(0, Math.min(totalResponses, baseCount + variance - totalResponses * 0.05))
        responses.push({
          label: `${point}점`,
          count,
          percentage: (count / totalResponses) * 100,
        })
      })
      const total = responses.reduce((sum, r) => sum + r.count, 0)
      const diff = totalResponses - total
      if (diff !== 0) {
        const maxIndex = responses.reduce((maxIdx, r, idx) => 
          r.count > responses[maxIdx].count ? idx : maxIdx, 0
        )
        responses[maxIndex].count += diff
        responses[maxIndex].percentage = (responses[maxIndex].count / totalResponses) * 100
      }
    } else if (question.responseType === 'single') {
      const options = question.options && question.options.length > 0 
        ? question.options 
        : ['옵션 1', '옵션 2', '옵션 3']
      
      const optionCounts: number[] = []
      let remaining = totalResponses
      
      for (let i = 0; i < options.length - 1; i++) {
        const max = Math.floor(remaining * 0.6)
        const count = Math.floor(Math.random() * max + remaining * 0.2)
        optionCounts.push(count)
        remaining -= count
      }
      optionCounts.push(remaining)
      
      for (let i = optionCounts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionCounts[i], optionCounts[j]] = [optionCounts[j], optionCounts[i]]
      }
      
      options.forEach((option, index) => {
        const count = optionCounts[index] || 0
        responses.push({
          label: option,
          count,
          percentage: (count / totalResponses) * 100,
        })
      })
    }

    return responses
  }

  const handleQuestionChange = (
    index: number,
    field: keyof SurveyQuestion,
    value: string
  ) => {
    const updated = [...surveyQuestions]
    updated[index] = { ...updated[index], [field]: value as any }
    
    if (field === 'question' && value.trim()) {
      updated[index].responses = generateVirtualResponses(updated[index], virtualAnalysis.totalResponses)
    }
    
    setSurveyQuestions(updated)
  }

  const handleQuestionOptionsChange = (questionId: number, inputValue: string) => {
    setSurveyQuestions(surveyQuestions.map((q) => {
      if (q.id === questionId) {
        // 입력값은 그대로 저장 (쉼표 포함)
        const optionsInput = inputValue
        // 실제 옵션 배열은 쉼표로 구분하여 파싱 (빈 문자열 제외)
        const options = inputValue.split(',').map(s => s.trim()).filter(s => s)
        
        const updated = { ...q, options, optionsInput }
        if (q.question.trim()) {
          updated.responses = generateVirtualResponses(updated, virtualAnalysis.totalResponses)
        }
        return updated
      }
      return q
    }))
  }

  const addQuestion = () => {
    if (surveyQuestions.length >= 6) {
      setToastMessage('최대 6개의 질문만 추가할 수 있습니다.')
      setToastVisible(true)
      return
    }
    const newId = Math.max(...surveyQuestions.map((q) => q.id), 0) + 1
    setSurveyQuestions([
      ...surveyQuestions,
      { id: newId, question: '', responseType: 'single', options: [], optionsInput: '', chartType: 'bar' },
    ])
  }

  const removeQuestion = (id: number) => {
    if (surveyQuestions.length > 1) {
      setSurveyQuestions(surveyQuestions.filter((q) => q.id !== id))
    }
  }

  // 질문 변경 시 가상 응답 자동 생성
  const questionKeys = useMemo(() => 
    surveyQuestions.map(q => `${q.id}-${q.question}-${q.responseType}`).join('|'),
    [surveyQuestions]
  )

  useEffect(() => {
    const questionsNeedingResponses = surveyQuestions.filter(q => 
      q.question.trim() && (!q.responses || q.responses.length === 0)
    )
    
    if (questionsNeedingResponses.length === 0) {
      return
    }
    
    const updatedQuestions = surveyQuestions.map((q) => {
      if (q.question.trim() && (!q.responses || q.responses.length === 0)) {
        return { ...q, responses: generateVirtualResponses(q, virtualAnalysis.totalResponses) }
      }
      return q
    })
    
    setSurveyQuestions(updatedQuestions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKeys, virtualAnalysis.totalResponses])

  const handleReset = () => {
    if (
      !confirm(
        '모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return
    }

    setPersona([
      {
        id: 1,
        name: '',
        age: '',
        job: '',
        lifestyle: '',
        dataEvidence: '',
        painPoint: '',
      },
    ])
    setSurveyPurpose('')
    setSurveyQuestions([{ id: 1, question: '', responseType: 'single', options: [], optionsInput: '', chartType: 'bar' }])
    setVirtualAnalysis({ chartType: 'bar', totalResponses: 100 })
    setInsightSummary('')
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

    const week3Data: Week3Data = {
      persona,
      surveyPurpose,
      surveyQuestions,
      virtualAnalysis,
      insightSummary,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()
    const success = await saveStepData(3, week3Data, progress)

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

    const week3Data: Week3Data = {
      persona,
      surveyPurpose,
      surveyQuestions,
      virtualAnalysis,
      insightSummary,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(3, week3Data, newSubmittedState, progress)

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

  // 그래프 컴포넌트들
  const BarChartComponent = ({ data }: { data: VirtualResponse[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          <p className="text-sm">데이터가 없습니다</p>
        </div>
      )
    }
    
    const maxCount = Math.max(...data.map((d) => d.count), 1)
    return (
      <div className="w-full">
        <div className="h-64 flex items-end justify-between gap-2 px-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="w-full flex flex-col justify-end" style={{ height: '240px' }}>
                <div
                  className="w-full bg-indigo-500 rounded-t transition-all duration-300 hover:bg-indigo-600"
                  style={{ 
                    height: `${(item.count / maxCount) * 240}px`,
                    minHeight: '4px'
                  }}
                  title={`${item.label}: ${item.count} (${item.percentage.toFixed(1)}%)`}
                />
              </div>
              <span className="text-xs text-gray-600 text-center truncate w-full">{item.label}</span>
              <span className="text-xs font-semibold text-gray-900">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const StackedBarChartComponent = ({ data }: { data: VirtualResponse[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          <p className="text-sm">데이터가 없습니다</p>
        </div>
      )
    }
    
    const colors = ['bg-indigo-500', 'bg-indigo-400', 'bg-indigo-300', 'bg-indigo-200', 'bg-indigo-100']
    const total = data.reduce((sum, d) => sum + d.count, 0)
    
    return (
      <div className="w-full">
        <div className="mb-4">
          <div className="w-full h-24 flex rounded-lg overflow-hidden border border-gray-300">
            {data.map((item, idx) => (
              <div
                key={idx}
                className={`${colors[idx % colors.length]} transition-all duration-300 flex items-center justify-center min-w-[2px]`}
                style={{ width: `${item.percentage}%` }}
                title={`${item.label}: ${item.count} (${item.percentage.toFixed(1)}%)`}
              >
                {item.percentage > 5 && (
                  <span className="text-xs font-semibold text-white px-1">{item.percentage.toFixed(0)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${colors[idx % colors.length]}`} />
              <span className="text-xs text-gray-700">{item.label}: {item.count} ({item.percentage.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const PieChartComponent = ({ data }: { data: VirtualResponse[] }) => {
    const total = data.reduce((sum, d) => sum + d.count, 0)
    let currentAngle = 0
    const colors = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE']
    
    return (
      <div className="flex items-center justify-center">
        <svg width="300" height="300" viewBox="0 0 300 300" className="transform -rotate-90">
          {data.map((item, idx) => {
            const percentage = (item.count / total) * 100
            const angle = (percentage / 100) * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle
            currentAngle = endAngle

            const x1 = 150 + 120 * Math.cos((startAngle * Math.PI) / 180)
            const y1 = 150 + 120 * Math.sin((startAngle * Math.PI) / 180)
            const x2 = 150 + 120 * Math.cos((endAngle * Math.PI) / 180)
            const y2 = 150 + 120 * Math.sin((endAngle * Math.PI) / 180)
            const largeArc = angle > 180 ? 1 : 0

            return (
              <path
                key={idx}
                d={`M 150 150 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[idx % colors.length]}
                className="transition-all duration-300 hover:opacity-80"
                title={`${item.label}: ${item.count} (${percentage.toFixed(1)}%)`}
              />
            )
          })}
        </svg>
        <div className="ml-8 space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded`} style={{ backgroundColor: colors[idx % colors.length] }} />
              <span className="text-sm text-gray-700">{item.label}: {item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const LineChartComponent = ({ data }: { data: VirtualResponse[] }) => {
    const maxCount = Math.max(...data.map((d) => d.count), 1)
    const points = data.map((item, idx) => ({
      x: (idx / (data.length - 1 || 1)) * 100,
      y: 100 - (item.count / maxCount) * 100,
      label: item.label,
      count: item.count,
    }))
    const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

    return (
      <div className="h-64 relative">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathData} L 100 100 L 0 100 Z`}
            fill="url(#lineGradient)"
            className="transition-all duration-300"
          />
          <path
            d={pathData}
            fill="none"
            stroke="#4F46E5"
            strokeWidth="0.5"
            className="transition-all duration-300"
          />
          {points.map((point, idx) => (
            <g key={idx}>
              <circle
                cx={point.x}
                cy={point.y}
                r="1.5"
                fill="#4F46E5"
                className="transition-all duration-300"
              />
              <text
                x={point.x}
                y={point.y - 3}
                textAnchor="middle"
                fontSize="2"
                fill="#6B7280"
                className="pointer-events-none"
              >
                {point.count}
              </text>
            </g>
          ))}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600">
          {data.map((item, idx) => (
            <span key={idx}>{item.label}</span>
          ))}
        </div>
      </div>
    )
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
        title="Phase 1: Data - 3주차: 가상 페르소나 설정 및 설문 설계"
        description="타겟 사용자를 정의하고 조사 방법을 설계합니다."
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
          getWeekTitle={getWeekTitle}
          getStepStatus={getStepStatus}
          onSettingsClick={() => {
            setShowSettings(true)
            setNewProjectTitle(projectInfo?.title || '')
          }}
          onProjectSummaryClick={handleProjectSummary}
          themeColor="indigo"
        />

        <main className="flex-1">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* Section 1: Persona Canvas */}
            <WorkbookSection
              icon={User}
              title="섹션 1: 페르소나 캔버스 (Persona Canvas)"
              description="타겟 사용자의 구체적인 프로필을 정의하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {persona.map((p, index) => (
                  <div
                    key={p.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors bg-white"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-gray-900">페르소나 {index + 1}</h3>
                      </div>
                      {persona.length > 1 && (
                        <button
                          onClick={() => removePersona(p.id)}
                          disabled={readonly}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          이름
                        </label>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            handlePersonaChange(index, 'name', e.target.value)
                          }
                          placeholder="페르소나 이름"
                          disabled={readonly}
                          className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          나이
                        </label>
                        <input
                          type="text"
                          value={p.age}
                          onChange={(e) =>
                            handlePersonaChange(index, 'age', e.target.value)
                          }
                          placeholder="예: 28세"
                          disabled={readonly}
                          className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          직업
                        </label>
                        <input
                          type="text"
                          value={p.job}
                          onChange={(e) =>
                            handlePersonaChange(index, 'job', e.target.value)
                          }
                          placeholder="직업을 입력하세요"
                          disabled={readonly}
                          className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          라이프스타일
                        </label>
                        <input
                          type="text"
                          value={p.lifestyle}
                          onChange={(e) =>
                            handlePersonaChange(index, 'lifestyle', e.target.value)
                          }
                          placeholder="라이프스타일을 입력하세요"
                          disabled={readonly}
                          className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          데이터 근거
                        </label>
                        <textarea
                          value={p.dataEvidence}
                          onChange={(e) =>
                            handlePersonaChange(index, 'dataEvidence', e.target.value)
                          }
                          rows={3}
                          placeholder="이 페르소나를 설정한 근거가 되는 데이터나 조사 내용을 입력하세요"
                          disabled={readonly}
                          className="input-field resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          핵심 고충 (Pain Point)
                        </label>
                        <textarea
                          value={p.painPoint}
                          onChange={(e) =>
                            handlePersonaChange(index, 'painPoint', e.target.value)
                          }
                          rows={3}
                          placeholder="이 페르소나가 겪는 주요 문제나 불편함을 입력하세요"
                          disabled={readonly}
                          className="input-field resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {!readonly && (
                  <button
                    onClick={addPersona}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    페르소나 추가
                  </button>
                )}
              </div>
            </WorkbookSection>

            {/* Section 2: Survey Builder with Virtual Analysis */}
            <WorkbookSection
              icon={ClipboardList}
              title="섹션 2: 설문 빌더 및 가상 분석"
              description="조사 목적과 질문 항목을 설정하고 가상 응답 결과를 시각화하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {/* 조사 목적 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    조사 목적
                  </label>
                  <textarea
                    value={surveyPurpose}
                    onChange={(e) => setSurveyPurpose(e.target.value)}
                    rows={3}
                    placeholder="이 설문조사의 목적과 배경을 입력하세요"
                    disabled={readonly}
                    className="input-field resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 총 응답 수 설정 */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    총 응답 수
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={virtualAnalysis.totalResponses}
                    onChange={(e) => {
                      if (readonly) return
                      const value = parseInt(e.target.value) || 100
                      const totalResponses = Math.max(10, Math.min(1000, value))
                      setVirtualAnalysis({ ...virtualAnalysis, totalResponses })
                      const updated = surveyQuestions.map((q) => {
                        if (q.question.trim()) {
                          return { ...q, responses: generateVirtualResponses({ ...q, responses: [] }, totalResponses) }
                        }
                        return q
                      })
                      setSurveyQuestions(updated)
                    }}
                    disabled={readonly}
                    className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">10 ~ 1000 사이의 값을 입력하세요</p>
                </div>

                {/* 질문 리스트 (왼쪽: 질문 입력 / 오른쪽: 그래프 시각화) */}
                <div className="space-y-6">
                  {surveyQuestions.map((q, index) => {
                    const questionResponses = q.responses || []
                    const chartType = q.chartType || 'bar'
                    
                    return (
                      <div
                        key={q.id}
                        className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white"
                      >
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                              Q{index + 1}
                            </div>
                            <h4 className="font-semibold text-gray-900">질문 {index + 1}</h4>
                          </div>
                          {surveyQuestions.length > 1 && !readonly && (
                            <button
                              onClick={() => removeQuestion(q.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 p-6">
                          {/* 왼쪽: 질문 입력 */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                질문 내용
                              </label>
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) =>
                                  handleQuestionChange(index, 'question', e.target.value)
                                }
                                placeholder="질문을 입력하세요"
                                disabled={readonly}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                응답 유형
                              </label>
                              <select
                                value={q.responseType}
                                onChange={(e) => {
                                  handleQuestionChange(index, 'responseType', e.target.value)
                                  const updated = [...surveyQuestions]
                                  updated[index] = { 
                                    ...updated[index], 
                                    responseType: e.target.value as any, 
                                    responses: [],
                                    options: [],
                                    optionsInput: '',
                                  }
                                  setSurveyQuestions(updated)
                                }}
                                disabled={readonly}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="single">단일 선택</option>
                                <option value="scale">척도 (1-5점)</option>
                                <option value="yesno">네, 아니오</option>
                              </select>
                            </div>

                            {q.responseType === 'single' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  선택 옵션 (쉼표로 구분)
                                </label>
                                <input
                                  type="text"
                                  value={q.optionsInput !== undefined ? q.optionsInput : (q.options && q.options.length > 0 ? q.options.join(', ') : '')}
                                  onChange={(e) => {
                                    handleQuestionOptionsChange(q.id, e.target.value)
                                  }}
                                  placeholder="예: 옵션 1, 옵션 2, 옵션 3"
                                  disabled={readonly}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>
                            )}

                            {/* 그래프 타입 선택을 왼쪽으로 이동 */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                그래프 타입
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { value: 'bar', label: '막대', icon: BarChart },
                                  { value: 'stacked', label: '누적', icon: Layers },
                                  { value: 'pie', label: '원형', icon: PieChart },
                                  { value: 'line', label: '곡선', icon: TrendingUp },
                                ].map((type) => {
                                  const Icon = type.icon
                                  return (
                                    <button
                                      key={type.value}
                                      onClick={() => {
                                        if (!readonly) {
                                          const updated = [...surveyQuestions]
                                          updated[index] = { ...updated[index], chartType: type.value as any }
                                          setSurveyQuestions(updated)
                                        }
                                      }}
                                      disabled={readonly}
                                      className={`flex items-center justify-center gap-1 p-2 rounded-lg border-2 transition-colors text-xs ${
                                        chartType === type.value
                                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                      <Icon className="w-3.5 h-3.5" />
                                      <span className="font-medium">{type.label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>

                          {/* 오른쪽: 그래프 시각화 */}
                          <div className="space-y-4">
                            {/* 그래프 표시 영역 */}
                            {q.question.trim() && questionResponses.length > 0 ? (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[350px] flex items-center justify-center">
                                {chartType === 'bar' && (
                                  <div className="w-full">
                                    <BarChartComponent data={questionResponses} />
                                  </div>
                                )}
                                {chartType === 'stacked' && (
                                  <div className="w-full">
                                    <StackedBarChartComponent data={questionResponses} />
                                  </div>
                                )}
                                {chartType === 'pie' && (
                                  <PieChartComponent data={questionResponses} />
                                )}
                                {chartType === 'line' && (
                                  <div className="w-full">
                                    <LineChartComponent data={questionResponses} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 min-h-[350px] flex items-center justify-center">
                                <div className="text-center text-gray-400">
                                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">질문을 입력하면 그래프가 표시됩니다</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {!readonly && (
                    <button
                      onClick={addQuestion}
                      disabled={surveyQuestions.length >= 6}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                      질문 추가 {surveyQuestions.length >= 6 && '(최대 6개)'}
                    </button>
                  )}
                </div>

                {/* 인사이트 요약 */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">인사이트 요약</h3>
                  <textarea
                    value={insightSummary}
                    onChange={(e) => setInsightSummary(e.target.value)}
                    rows={8}
                    placeholder="설문 결과에서 도출된 핵심 인사이트를 요약해주세요"
                    disabled={readonly}
                    className="input-field resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
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
    </div>
  )
}
