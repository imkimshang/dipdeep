'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  X,
  Trash2,
  Download,
  Layers,
  Monitor,
  ClipboardList,
  Target,
  Settings,
  Copy,
  Brain,
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
import { useWorkbookCredit } from '@/hooks/useWorkbookCredit'

interface Requirement {
  id: number
  category: 'FR' | 'TR' | 'UR' // Functional, Technical, UI/Design
  name: string
  description: string
  priority: 'P1' | 'P2' | 'P3' // P1: 필수, P2: 권장, P3: 추가
}

interface ScopeData {
  inScope: string
  outOfScope: string
  technicalConstraints: string
}

interface AIAnalysisData {
  developmentDifficulty: string // 개발난이도
  expectedDuration: string // 개발예상기간
  keyRisks: string[] // 핵심리스크 및 문제점 (최대 3개)
  suggestions: string // 제안점
}

interface QuantitativeKPI {
  id: number
  goal: string // 목표
  value: string // 수치
  unit: string // 단위
}

interface QualitativeKPI {
  id: number
  goal: string // 목표
}

interface RevenueStream {
  id: number
  revenueModel: string // 수익모델
  amount: string // 금액
  expectedRevenue: string // 예상매출
  note: string // 비고
}

interface ProjectSchedule {
  id: number
  phase: string // 단계
  period: string // 기간
  activity: string // 활동
  budget: string // 예산
}

interface InvestmentBudget {
  id: number
  item: string // 항목
  amount: string // 금액
  note: string // 비고
}

interface RevenueModel {
  needsRevenueModel: boolean
  kpi?: {
    quantitative: QuantitativeKPI[]
    qualitative: QualitativeKPI[]
  }
  revenueStream?: RevenueStream
  projectSchedule?: ProjectSchedule[]
  investmentBudget?: InvestmentBudget[]
}

interface Week8Data {
  requirements: Requirement[]
  scopeData: ScopeData
  aiAnalysis?: AIAnalysisData
  revenueModel?: RevenueModel
  is_submitted?: boolean
}

// 우선순위 라벨
const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'P1':
      return 'P1 (필수)'
    case 'P2':
      return 'P2 (권장)'
    case 'P3':
      return 'P3 (추가)'
    default:
      return priority
  }
}

// 우선순위 색상
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'P1':
      return 'bg-red-100 text-red-700 border-red-300'
    case 'P2':
      return 'bg-amber-100 text-amber-700 border-amber-300'
    case 'P3':
      return 'bg-gray-100 text-gray-700 border-gray-300'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

// 카테고리 라벨
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'FR':
      return '기능 (FR)'
    case 'TR':
      return '기술 (TR)'
    case 'UR':
      return '디자인/UI (UR)'
    default:
      return category
  }
}

function Week8PageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''

  // 권한 검증
  useProjectAccess(projectId)
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
  const { checkAndDeductCredit } = useWorkbookCredit(projectId, 8)

  // State
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [referenceData, setReferenceData] = useState<{
    iaTree: any[]
    keyScreens: any[]
  } | null>(null)

  const [formData, setFormData] = useState<Week8Data>({
    requirements: [],
    scopeData: {
      inScope: '',
      outOfScope: '',
      technicalConstraints: '',
    },
    aiAnalysis: {
      developmentDifficulty: '',
      expectedDuration: '',
      keyRisks: ['', '', ''],
      suggestions: '',
    },
    revenueModel: {
      needsRevenueModel: false,
      kpi: {
        quantitative: [],
        qualitative: [],
      },
      revenueStream: [],
      projectSchedule: [],
      investmentBudget: [],
    },
  })

  // Custom progress calculation for week 8 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 요구사항 정의서 (가중치: 50%)
    const section1Weight = 50
    let section1Filled = 0
    let section1Total = 0

    if (formData.requirements.length > 0) {
      formData.requirements.forEach((req) => {
        section1Total += 3 // name, description, priority
        if (req.name.trim()) section1Filled++
        if (req.description.trim()) section1Filled++
        if (req.priority) section1Filled++
      })
    }

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: 개발 범위 및 제약사항 (가중치: 30%)
    const section2Weight = 30
    let section2Filled = 0
    let section2Total = 3

    if (formData.scopeData.inScope.trim()) section2Filled++
    if (formData.scopeData.outOfScope.trim()) section2Filled++
    if (formData.scopeData.technicalConstraints.trim()) section2Filled++

    const section2Progress = Math.min((section2Filled / section2Total) * 100, section2Weight)

    // 섹션 3: AI 분석 프롬프트 생성기 (가중치: 15%)
    // 프롬프트 생성 기능은 선택사항이므로 15% 가중치만 부여
    const section3Weight = 15
    const section3Progress = 0 // 프롬프트 생성은 필수 아님

    // 섹션 4: AI 분석 결과 입력 (가중치: 15%)
    const section4Weight = 15
    let section4Filled = 0
    let section4Total = 5 // developmentDifficulty, expectedDuration, keyRisks(3개), suggestions
    
    if (formData.aiAnalysis) {
      if (formData.aiAnalysis.developmentDifficulty?.trim()) section4Filled++
      if (formData.aiAnalysis.expectedDuration?.trim()) section4Filled++
      if (formData.aiAnalysis.keyRisks && formData.aiAnalysis.keyRisks.some((r) => r?.trim())) section4Filled++
      if (formData.aiAnalysis.keyRisks && formData.aiAnalysis.keyRisks.filter((r) => r?.trim()).length >= 2) section4Filled++
      if (formData.aiAnalysis.keyRisks && formData.aiAnalysis.keyRisks.filter((r) => r?.trim()).length >= 3) section4Filled++
      if (formData.aiAnalysis.suggestions?.trim()) section4Filled++
    }
    
    const section4Progress = section4Total > 0
      ? Math.min((section4Filled / section4Total) * 100, section4Weight)
      : 0

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress + section4Progress, 100)
    return Math.round(totalProgress)
  }

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 8) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 8) {
        // 섹션 1: 요구사항 정의서 (가중치: 50%)
        const section1Weight = 50
        let section1Filled = 0
        let section1Total = 0

        if (data.requirements && Array.isArray(data.requirements) && data.requirements.length > 0) {
          data.requirements.forEach((req: any) => {
            section1Total += 3
            if (req.name?.trim()) section1Filled++
            if (req.description?.trim()) section1Filled++
            if (req.priority) section1Filled++
          })
        }

        const section1Progress = section1Total > 0
          ? Math.min((section1Filled / section1Total) * 100, section1Weight)
          : 0

        // 섹션 2: 개발 범위 및 제약사항 (가중치: 30%)
        const section2Weight = 30
        let section2Filled = 0
        let section2Total = 3

        if (data.scopeData?.inScope?.trim()) section2Filled++
        if (data.scopeData?.outOfScope?.trim()) section2Filled++
        if (data.scopeData?.technicalConstraints?.trim()) section2Filled++

        const section2Progress = Math.min((section2Filled / section2Total) * 100, section2Weight)

        // 섹션 3: AI 분석 프롬프트 생성기 (가중치: 15%)
        const section3Weight = 15
        const section3Progress = 0

        // 섹션 4: AI 분석 결과 입력 (가중치: 15%)
        const section4Weight = 15
        let section4Filled = 0
        let section4Total = 5
        
        if (data.aiAnalysis) {
          if (data.aiAnalysis.developmentDifficulty?.trim()) section4Filled++
          if (data.aiAnalysis.expectedDuration?.trim()) section4Filled++
          if (data.aiAnalysis.keyRisks && Array.isArray(data.aiAnalysis.keyRisks)) {
            const filledRisks = data.aiAnalysis.keyRisks.filter((r: any) => r?.trim()).length
            if (filledRisks >= 1) section4Filled++
            if (filledRisks >= 2) section4Filled++
            if (filledRisks >= 3) section4Filled++
          }
          if (data.aiAnalysis.suggestions?.trim()) section4Filled++
        }
        
        const section4Progress = section4Total > 0
          ? Math.min((section4Filled / section4Total) * 100, section4Weight)
          : 0

        const totalProgress = Math.min(section1Progress + section2Progress + section3Progress + section4Progress, 100)
        return Math.round(totalProgress)
      }
      return 50
    })
  }

  const getPhaseProgress = (phase: 1 | 2 | 3) => {
    return getBasePhaseProgress(phase, (data: any) => {
      return getStepStatus(8).progress
    })
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress((data: any) => {
      return getStepStatus(8).progress
    })
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      // Load reference data from week 7 (IA Tree and Key Screens)
      try {
        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .eq('step_number', 7)

        const stepsData = steps as any[]
        const week7Data = stepsData?.[0]?.step_data
        if (week7Data) {
          setReferenceData({
            iaTree: week7Data.iaTree || [],
            keyScreens: week7Data.keyScreens || [],
          })
        }
      } catch (error) {
        console.error('Reference data load error:', error)
      }

      // Load week8 data
      const data = await loadStepData(8)
      if (data) {
        const week8Data = data as Week8Data
        setFormData({
          ...week8Data,
          revenueModel: week8Data.revenueModel || {
            needsRevenueModel: false,
            kpi: {
              quantitative: [],
              qualitative: [],
            },
          revenueStream: [],
            projectSchedule: [],
            investmentBudget: [],
          },
        })
        if (week8Data.is_submitted !== undefined) {
          setIsSubmitted(week8Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

  // 요구사항 추가
  const handleAddRequirement = (category: 'FR' | 'TR' | 'UR') => {
    const newId =
      formData.requirements.length > 0
        ? Math.max(...formData.requirements.map((r) => r.id)) + 1
        : 1

    const newRequirement: Requirement = {
      id: newId,
      category,
      name: '',
      description: '',
      priority: 'P2',
    }
    setFormData({
      ...formData,
      requirements: [...formData.requirements, newRequirement],
    })
  }

  // 요구사항 삭제
  const handleDeleteRequirement = (id: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((r) => r.id !== id),
    })
  }

  // 요구사항 업데이트
  const handleUpdateRequirement = (id: number, updates: Partial<Requirement>) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.map((req) =>
        req.id === id ? { ...req, ...updates } : req
      ),
    })
  }

  // IA 데이터에서 기능 추출
  const handleExtractFromIA = () => {
    if (!referenceData?.iaTree || referenceData.iaTree.length === 0) {
      setToastMessage('7회차 IA 트리 데이터가 없습니다.')
      setToastVisible(true)
      return
    }

    // IA 트리를 평면화하여 기능 추출
    const flattenIA = (tree: any[]): any[] => {
      const result: any[] = []
      tree.forEach((item) => {
        if (item.name) {
          result.push(item)
        }
        if (item.children && item.children.length > 0) {
          result.push(...flattenIA(item.children))
        }
      })
      return result
    }

    const flattenedIA = flattenIA(referenceData.iaTree)
    const existingIds = formData.requirements.map((r) => r.id)
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0

    const newRequirements: Requirement[] = flattenedIA.map((item, index) => ({
      id: maxId + index + 1,
      category: 'FR' as const,
      name: item.name || `기능 ${index + 1}`,
      description: item.description || '',
      priority: 'P2' as const,
    }))

    setFormData({
      ...formData,
      requirements: [...formData.requirements, ...newRequirements],
    })
    setToastMessage(`${newRequirements.length}개의 기능 요구사항을 추가했습니다.`)
    setToastVisible(true)
  }

  // Save handler
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

    const progress = calculateProgress()
    const success = await saveStepData(8, formData, progress)

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

      // 제출 시에도 크레딧 차감 (저장 시 차감 안 했을 경우)
      try {
        await checkAndDeductCredit()
      } catch (error: any) {
        setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
        setToastVisible(true)
        return
      }
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(8, formData, newSubmittedState, progress)

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
      requirements: [],
      scopeData: {
        inScope: '',
        outOfScope: '',
        technicalConstraints: '',
      },
      aiAnalysis: {
        developmentDifficulty: '',
        expectedDuration: '',
        keyRisks: ['', '', ''],
        suggestions: '',
      },
    })
    setToastMessage('데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  // AI 분석 프롬프트 생성
  const handleGenerateAIPrompt = () => {
    if (formData.requirements.length === 0 && 
        !formData.scopeData.inScope.trim() && 
        !formData.scopeData.outOfScope.trim() && 
        !formData.scopeData.technicalConstraints.trim()) {
      setToastMessage('요구사항 또는 개발 범위를 먼저 입력해주세요.')
      setToastVisible(true)
      return
    }

    // 요구사항 리스트 포맷팅
    const formatRequirements = () => {
      if (formData.requirements.length === 0) return '없음'

      const byCategory = {
        FR: formData.requirements.filter((r) => r.category === 'FR'),
        TR: formData.requirements.filter((r) => r.category === 'TR'),
        UR: formData.requirements.filter((r) => r.category === 'UR'),
      }

      let result = ''
      
      if (byCategory.FR.length > 0) {
        result += '\n\n[기능 요구사항 (FR)]\n'
        byCategory.FR.forEach((req, idx) => {
          result += `${idx + 1}. [${req.priority}] ${req.name || '(명칭 없음)'}\n`
          if (req.description) {
            result += `   상세: ${req.description}\n`
          }
        })
      }

      if (byCategory.TR.length > 0) {
        result += '\n\n[기술 요구사항 (TR)]\n'
        byCategory.TR.forEach((req, idx) => {
          result += `${idx + 1}. [${req.priority}] ${req.name || '(명칭 없음)'}\n`
          if (req.description) {
            result += `   상세: ${req.description}\n`
          }
        })
      }

      if (byCategory.UR.length > 0) {
        result += '\n\n[디자인/UI 요구사항 (UR)]\n'
        byCategory.UR.forEach((req, idx) => {
          result += `${idx + 1}. [${req.priority}] ${req.name || '(명칭 없음)'}\n`
          if (req.description) {
            result += `   상세: ${req.description}\n`
          }
        })
      }

      return result
    }

    // 프롬프트 생성
    const prompt = `당신은 시니어 풀스택 개발자이자 기술 컨설턴트입니다. 다음 RFP를 분석하여 개발 난이도, 예상 리스크, 기술적 조언을 제공해주세요.

${formatRequirements()}

[개발 범위]

In-Scope (이번 프로젝트에서 반드시 구현할 범위):
${formData.scopeData.inScope.trim() || '(입력 없음)'}

Out-of-Scope (제외하거나 다음 버전으로 미룰 사항):
${formData.scopeData.outOfScope.trim() || '(입력 없음)'}

[기술 제약사항]
${formData.scopeData.technicalConstraints.trim() || '(입력 없음)'}

---

위 RFP를 바탕으로 다음 항목에 대해 분석해주세요:
1. 전체적인 개발 난이도 평가 (총 개발 기간 예상)
2. 기술적 리스크 요소 식별
3. 우선순위별 구현 단계 제안
4. 필요한 기술 스택 및 인프라 권장사항
5. 잠재적인 문제점 및 해결 방안`

    setAiPrompt(prompt)
    setToastMessage('AI 분석 프롬프트가 생성되었습니다.')
    setToastVisible(true)
  }

  // 프롬프트 복사
  const handleCopyPrompt = async () => {
    if (!aiPrompt) {
      setToastMessage('생성된 프롬프트가 없습니다.')
      setToastVisible(true)
      return
    }

    try {
      await navigator.clipboard.writeText(aiPrompt)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = aiPrompt
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
        setToastVisible(true)
      } catch (err) {
        setToastMessage('복사 실패')
        setToastVisible(true)
      }
      document.body.removeChild(textArea)
    }
  }

  const progress = calculateProgress()
  const readonly = isSubmitted

  // 카테고리별 요구사항 분류
  const requirementsByCategory = useMemo(() => {
    return {
      FR: formData.requirements.filter((r) => r.category === 'FR'),
      TR: formData.requirements.filter((r) => r.category === 'TR'),
      UR: formData.requirements.filter((r) => r.category === 'UR'),
    }
  }, [formData.requirements])

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
        title="Phase 2: Ideation - 8회차: 요구사항 정의 및 개발 범위 설정"
        description="서비스 구현을 위한 요구사항을 정의하고 개발 범위를 명확히 설정하세요."
        phase="Phase 2: Ideation"
        isScrolled={isScrolled}
        currentWeek={8}
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
          currentWeek={8}
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
            {/* Reference Data Panel */}
            {referenceData && (referenceData.iaTree.length > 0 || referenceData.keyScreens.length > 0) && (
              <div className="mb-6 glass rounded-xl p-4 border-2 border-gray-300 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-sm font-semibold text-gray-900">7회차 참고 데이터</h4>
                  </div>
                  {!readonly && (
                    <button
                      onClick={handleExtractFromIA}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      IA 데이터에서 기능 추출하기
                    </button>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-xs text-gray-600">
                  {referenceData.iaTree.length > 0 && (
                    <div>
                      <span className="font-medium">IA 트리:</span> {referenceData.iaTree.length}개 항목
                    </div>
                  )}
                  {referenceData.keyScreens.length > 0 && (
                    <div>
                      <span className="font-medium">핵심 화면:</span> {referenceData.keyScreens.length}개
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 1: Requirements Matrix */}
            <WorkbookSection
              icon={ClipboardList}
              title="섹션 1: 요구사항 정의서 (Requirements Matrix)"
              description="서비스 구현을 위해 필요한 기능, 기술, 디자인 요구사항을 정리하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {/* 카테고리별 섹션 */}
                {(['FR', 'TR', 'UR'] as const).map((category) => (
                  <div key={category} className="border-2 border-gray-200 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getCategoryLabel(category)}
                      </h3>
                      {!readonly && (
                        <button
                          onClick={() => handleAddRequirement(category)}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          추가
                        </button>
                      )}
                    </div>

                    {requirementsByCategory[category].length > 0 ? (
                      <div className="space-y-3">
                        {requirementsByCategory[category].map((req) => (
                          <div
                            key={req.id}
                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <select
                                  value={req.priority}
                                  onChange={(e) =>
                                    handleUpdateRequirement(req.id, {
                                      priority: e.target.value as 'P1' | 'P2' | 'P3',
                                    })
                                  }
                                  disabled={readonly}
                                  className={`px-2 py-1 text-xs font-medium rounded border-2 ${getPriorityColor(
                                    req.priority
                                  )} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  <option value="P1">P1 (필수)</option>
                                  <option value="P2">P2 (권장)</option>
                                  <option value="P3">P3 (추가)</option>
                                </select>
                              </div>
                              {!readonly && (
                                <button
                                  onClick={() => handleDeleteRequirement(req.id)}
                                  className="p-1 hover:bg-red-100 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={req.name}
                                onChange={(e) =>
                                  handleUpdateRequirement(req.id, { name: e.target.value })
                                }
                                placeholder="요구사항 명칭"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <textarea
                                value={req.description}
                                onChange={(e) =>
                                  handleUpdateRequirement(req.id, { description: e.target.value })
                                }
                                rows={2}
                                placeholder="상세 설명"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        {getCategoryLabel(category)} 요구사항이 없습니다.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </WorkbookSection>

            {/* Section 2: Scope & Constraints */}
            <WorkbookSection
              icon={Target}
              title="섹션 2: 개발 범위 및 제약사항 (Scope & Constraints)"
              description="프로젝트의 경계를 명확히 설정하고 기술적 제약사항을 기록하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    In-Scope (이번 프로젝트에서 반드시 구현할 범위)
                  </label>
                  <textarea
                    value={formData.scopeData.inScope}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scopeData: { ...formData.scopeData, inScope: e.target.value },
                      })
                    }
                    rows={4}
                    placeholder="이번 프로젝트에서 반드시 구현해야 할 기능과 범위를 정리하세요..."
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <X className="w-4 h-4 text-gray-500" />
                    Out-of-Scope (제외하거나 다음 버전으로 미룰 사항)
                  </label>
                  <textarea
                    value={formData.scopeData.outOfScope}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scopeData: { ...formData.scopeData, outOfScope: e.target.value },
                      })
                    }
                    rows={4}
                    placeholder="이번 프로젝트에서 제외하거나 다음 버전으로 미룰 기능을 기록하세요..."
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    기술 제약사항
                  </label>
                  <textarea
                    value={formData.scopeData.technicalConstraints}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scopeData: { ...formData.scopeData, technicalConstraints: e.target.value },
                      })
                    }
                    rows={4}
                    placeholder="사용할 프레임워크, 지원 브라우저, 보안 요구사항 등 기술적 제약 조건을 입력하세요..."
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </WorkbookSection>

            {/* Section 3: AI Prompt Generator */}
            <WorkbookSection
              icon={Sparkles}
              title="섹션 3: AI 분석 프롬프트 생성기 (AI Prompt Generator)"
              description="작성한 요구사항과 범위를 조합하여 전문적인 AI 분석 프롬프트를 생성하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {!readonly && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerateAIPrompt}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      AI 분석 프롬프트 생성
                    </button>
                  </div>
                )}

                {aiPrompt ? (
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-900">생성된 프롬프트</h4>
                      <button
                        onClick={handleCopyPrompt}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        프롬프트 복사
                      </button>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {aiPrompt}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium mb-2">
                        AI 분석 프롬프트를 생성해주세요.
                      </p>
                      <p className="text-sm text-gray-500">
                        작성한 요구사항과 개발 범위를 바탕으로 개발자 관점에서 분석할 수 있는 전문적인 프롬프트를 생성합니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </WorkbookSection>

            {/* Section 4: AI 분석 결과 입력 */}
            <WorkbookSection
              icon={Brain}
              title="섹션 4: AI 분석 결과 입력"
              description="AI 분석 프롬프트를 통해 얻은 분석 결과를 간략하게 정리하여 입력하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {/* 개발난이도 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    개발난이도
                  </label>
                  <input
                    type="text"
                    value={formData.aiAnalysis?.developmentDifficulty || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        aiAnalysis: {
                          ...(formData.aiAnalysis || {
                            developmentDifficulty: '',
                            expectedDuration: '',
                            keyRisks: ['', '', ''],
                            suggestions: '',
                          }),
                          developmentDifficulty: e.target.value,
                        },
                      })
                    }}
                    placeholder="예: 중간 (Medium)"
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 개발예상기간 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    개발예상기간
                  </label>
                  <input
                    type="text"
                    value={formData.aiAnalysis?.expectedDuration || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        aiAnalysis: {
                          ...(formData.aiAnalysis || {
                            developmentDifficulty: '',
                            expectedDuration: '',
                            keyRisks: ['', '', ''],
                            suggestions: '',
                          }),
                          expectedDuration: e.target.value,
                        },
                      })
                    }}
                    placeholder="예: 3-4개월"
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 핵심리스크 및 문제점 3가지 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    핵심리스크 및 문제점 (3가지)
                  </label>
                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 mt-1">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={formData.aiAnalysis?.keyRisks?.[index] || ''}
                          onChange={(e) => {
                            const currentRisks = formData.aiAnalysis?.keyRisks || ['', '', '']
                            const newRisks = [...currentRisks]
                            newRisks[index] = e.target.value
                            setFormData({
                              ...formData,
                              aiAnalysis: {
                                ...(formData.aiAnalysis || {
                                  developmentDifficulty: '',
                                  expectedDuration: '',
                                  keyRisks: ['', '', ''],
                                  suggestions: '',
                                }),
                                keyRisks: newRisks,
                              },
                            })
                          }}
                          placeholder={`리스크/문제점 ${index + 1}을 입력하세요`}
                          disabled={readonly}
                          className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 제안점 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    제안점
                  </label>
                  <textarea
                    value={formData.aiAnalysis?.suggestions || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        aiAnalysis: {
                          ...(formData.aiAnalysis || {
                            developmentDifficulty: '',
                            expectedDuration: '',
                            keyRisks: ['', '', ''],
                            suggestions: '',
                          }),
                          suggestions: e.target.value,
                        },
                      })
                    }}
                    rows={4}
                    placeholder="AI 분석을 통해 제안된 개선점이나 대안을 입력하세요..."
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </WorkbookSection>

            {/* Section 5: 수익모델 검토 */}
            <WorkbookSection
              icon={Target}
              title="섹션 5: 수익모델 검토 (Revenue Model Review)"
              description="수익모델이 필요한 제안서인 경우 수익모델을 검토하고 설정하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {/* 수익모델 검토 대상 토글 */}
                <div className="flex items-center justify-between p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      수익모델 검토 대상
                    </h3>
                    <p className="text-sm text-gray-600">
                      이 제안서에 수익모델이 필요한 경우 활성화하세요.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.revenueModel?.needsRevenueModel || false}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          revenueModel: {
                            needsRevenueModel: e.target.checked,
                            kpi: formData.revenueModel?.kpi || {
                              quantitative: [],
                              qualitative: [],
                            },
                            revenueStream: formData.revenueModel?.revenueStream || [],
                            projectSchedule: formData.revenueModel?.projectSchedule || [],
                            investmentBudget: formData.revenueModel?.investmentBudget || [],
                          },
                        })
                      }}
                      disabled={readonly}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </label>
                </div>

                {/* 수익모델 입력 영역 (on일 때만 표시) */}
                {formData.revenueModel?.needsRevenueModel && (
                  <div className="space-y-6 border-2 border-indigo-200 rounded-xl p-6 bg-white">
                    {/* 정량/정성적 KPI */}
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        정량/정성적 KPI
                      </h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* 정량적 KPI */}
                        <div className="min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                              정량적 KPI
                            </label>
                            {!readonly && (
                              <button
                                onClick={() => {
                                  const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                  const newId = currentKpi.quantitative.length > 0
                                    ? Math.max(...currentKpi.quantitative.map((k: QuantitativeKPI) => k.id)) + 1
                                    : 1
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      kpi: {
                                        ...currentKpi,
                                        quantitative: [...currentKpi.quantitative, { id: newId, goal: '', value: '', unit: '' }],
                                      },
                                    },
                                  })
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium flex items-center gap-1 flex-shrink-0"
                              >
                                <Plus className="w-3 h-3" />
                                추가
                              </button>
                            )}
                          </div>
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {formData.revenueModel?.kpi?.quantitative?.map((kpi) => (
                              <div key={kpi.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <div className="grid grid-cols-[1fr_0.8fr_0.8fr_auto] gap-2 items-center">
                                  <input
                                    type="text"
                                    value={kpi.goal}
                                    onChange={(e) => {
                                      const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                      setFormData({
                                        ...formData,
                                        revenueModel: {
                                          ...formData.revenueModel!,
                                          kpi: {
                                            ...currentKpi,
                                            quantitative: currentKpi.quantitative.map((k: QuantitativeKPI) =>
                                              k.id === kpi.id ? { ...k, goal: e.target.value } : k
                                            ),
                                          },
                                        },
                                      })
                                    }}
                                    placeholder="목표"
                                    disabled={readonly}
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                  />
                                  <input
                                    type="text"
                                    value={kpi.value}
                                    onChange={(e) => {
                                      const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                      setFormData({
                                        ...formData,
                                        revenueModel: {
                                          ...formData.revenueModel!,
                                          kpi: {
                                            ...currentKpi,
                                            quantitative: currentKpi.quantitative.map((k: QuantitativeKPI) =>
                                              k.id === kpi.id ? { ...k, value: e.target.value } : k
                                            ),
                                          },
                                        },
                                      })
                                    }}
                                    placeholder="수치"
                                    disabled={readonly}
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                  />
                                  <input
                                    type="text"
                                    value={kpi.unit}
                                    onChange={(e) => {
                                      const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                      setFormData({
                                        ...formData,
                                        revenueModel: {
                                          ...formData.revenueModel!,
                                          kpi: {
                                            ...currentKpi,
                                            quantitative: currentKpi.quantitative.map((k: QuantitativeKPI) =>
                                              k.id === kpi.id ? { ...k, unit: e.target.value } : k
                                            ),
                                          },
                                        },
                                      })
                                    }}
                                    placeholder="단위"
                                    disabled={readonly}
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                  />
                                  {!readonly && (
                                    <button
                                      onClick={() => {
                                        const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                        setFormData({
                                          ...formData,
                                          revenueModel: {
                                            ...formData.revenueModel!,
                                            kpi: {
                                              ...currentKpi,
                                              quantitative: currentKpi.quantitative.filter((k: QuantitativeKPI) => k.id !== kpi.id),
                                            },
                                          },
                                        })
                                      }}
                                      className="p-2 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!formData.revenueModel?.kpi?.quantitative || formData.revenueModel.kpi.quantitative.length === 0) && (
                              <div className="text-center py-4 text-gray-400 text-sm">
                                정량적 KPI가 없습니다.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 정성적 KPI */}
                        <div className="min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                              정성적 KPI
                            </label>
                            {!readonly && (
                              <button
                                onClick={() => {
                                  const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                  const newId = currentKpi.qualitative.length > 0
                                    ? Math.max(...currentKpi.qualitative.map((k: QualitativeKPI) => k.id)) + 1
                                    : 1
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      kpi: {
                                        ...currentKpi,
                                        qualitative: [...currentKpi.qualitative, { id: newId, goal: '' }],
                                      },
                                    },
                                  })
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium flex items-center gap-1 flex-shrink-0"
                              >
                                <Plus className="w-3 h-3" />
                                추가
                              </button>
                            )}
                          </div>
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {formData.revenueModel?.kpi?.qualitative?.map((kpi) => (
                              <div key={kpi.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex gap-2">
                                <input
                                  type="text"
                                  value={kpi.goal}
                                  onChange={(e) => {
                                    const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                    setFormData({
                                      ...formData,
                                      revenueModel: {
                                        ...formData.revenueModel!,
                                        kpi: {
                                          ...currentKpi,
                                          qualitative: currentKpi.qualitative.map((k: QualitativeKPI) =>
                                            k.id === kpi.id ? { ...k, goal: e.target.value } : k
                                          ),
                                        },
                                      },
                                    })
                                  }}
                                  placeholder="목표를 입력하세요"
                                  disabled={readonly}
                                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                />
                                {!readonly && (
                                  <button
                                    onClick={() => {
                                      const currentKpi = formData.revenueModel?.kpi || { quantitative: [], qualitative: [] }
                                      setFormData({
                                        ...formData,
                                        revenueModel: {
                                          ...formData.revenueModel!,
                                          kpi: {
                                            ...currentKpi,
                                            qualitative: currentKpi.qualitative.filter((k: QualitativeKPI) => k.id !== kpi.id),
                                          },
                                        },
                                      })
                                    }}
                                    className="p-2 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {(!formData.revenueModel?.kpi?.qualitative || formData.revenueModel.kpi.qualitative.length === 0) && (
                              <div className="text-center py-4 text-gray-400 text-sm">
                                정성적 KPI가 없습니다.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 수익화 모델 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          수익화 모델
                        </h4>
                        {!readonly && (
                          <button
                            onClick={() => {
                              const currentStreams = formData.revenueModel?.revenueStream || []
                              const newId = currentStreams.length > 0
                                ? Math.max(...currentStreams.map((s: RevenueStream) => s.id)) + 1
                                : 1
                              setFormData({
                                ...formData,
                                revenueModel: {
                                  ...formData.revenueModel!,
                                  revenueStream: [...currentStreams, { id: newId, revenueModel: '', amount: '', expectedRevenue: '', note: '' }],
                                },
                              })
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            추가
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.revenueModel?.revenueStream?.map((stream) => (
                          <div key={stream.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="grid grid-cols-4 gap-3">
                              <input
                                type="text"
                                value={stream.revenueModel}
                                onChange={(e) => {
                                  const currentStreams = formData.revenueModel?.revenueStream || []
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      revenueStream: currentStreams.map((s: RevenueStream) =>
                                        s.id === stream.id ? { ...s, revenueModel: e.target.value } : s
                                      ),
                                    },
                                  })
                                }}
                                placeholder="수익모델"
                                disabled={readonly}
                                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <input
                                type="text"
                                value={stream.amount}
                                onChange={(e) => {
                                  const currentStreams = formData.revenueModel?.revenueStream || []
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      revenueStream: currentStreams.map((s: RevenueStream) =>
                                        s.id === stream.id ? { ...s, amount: e.target.value } : s
                                      ),
                                    },
                                  })
                                }}
                                placeholder="금액"
                                disabled={readonly}
                                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <input
                                type="text"
                                value={stream.expectedRevenue}
                                onChange={(e) => {
                                  const currentStreams = formData.revenueModel?.revenueStream || []
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      revenueStream: currentStreams.map((s: RevenueStream) =>
                                        s.id === stream.id ? { ...s, expectedRevenue: e.target.value } : s
                                      ),
                                    },
                                  })
                                }}
                                placeholder="예상매출"
                                disabled={readonly}
                                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={stream.note}
                                  onChange={(e) => {
                                    const currentStreams = formData.revenueModel?.revenueStream || []
                                    setFormData({
                                      ...formData,
                                      revenueModel: {
                                        ...formData.revenueModel!,
                                        revenueStream: currentStreams.map((s: RevenueStream) =>
                                          s.id === stream.id ? { ...s, note: e.target.value } : s
                                        ),
                                      },
                                    })
                                  }}
                                  placeholder="비고"
                                  disabled={readonly}
                                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                />
                                {!readonly && (
                                  <button
                                    onClick={() => {
                                      const currentStreams = formData.revenueModel?.revenueStream || []
                                      setFormData({
                                        ...formData,
                                        revenueModel: {
                                          ...formData.revenueModel!,
                                          revenueStream: currentStreams.filter((s: RevenueStream) => s.id !== stream.id),
                                        },
                                      })
                                    }}
                                    className="p-2 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!formData.revenueModel?.revenueStream || formData.revenueModel.revenueStream.length === 0) && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            수익화 모델이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 추진일정 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          추진일정
                        </h4>
                        {!readonly && (
                          <button
                            onClick={() => {
                              const currentSchedule = formData.revenueModel?.projectSchedule || []
                              const newId = currentSchedule.length > 0
                                ? Math.max(...currentSchedule.map((s: ProjectSchedule) => s.id)) + 1
                                : 1
                              setFormData({
                                ...formData,
                                revenueModel: {
                                  ...formData.revenueModel!,
                                  projectSchedule: [...currentSchedule, { id: newId, phase: '', period: '', activity: '', budget: '' }],
                                },
                              })
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            추가
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.revenueModel?.projectSchedule?.map((schedule) => (
                          <div key={schedule.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="grid grid-cols-4 gap-3">
                              <input
                                type="text"
                                value={schedule.phase}
                                onChange={(e) => {
                                  const currentSchedule = formData.revenueModel?.projectSchedule || []
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      projectSchedule: currentSchedule.map((s: ProjectSchedule) =>
                                        s.id === schedule.id ? { ...s, phase: e.target.value } : s
                                      ),
                                    },
                                  })
                                }}
                                placeholder="단계"
                                disabled={readonly}
                                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <input
                                type="text"
                                value={schedule.period}
                                onChange={(e) => {
                                  const currentSchedule = formData.revenueModel?.projectSchedule || []
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      projectSchedule: currentSchedule.map((s: ProjectSchedule) =>
                                        s.id === schedule.id ? { ...s, period: e.target.value } : s
                                      ),
                                    },
                                  })
                                }}
                                placeholder="기간"
                                disabled={readonly}
                                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <input
                                type="text"
                                value={schedule.activity}
                                onChange={(e) => {
                                  const currentSchedule = formData.revenueModel?.projectSchedule || []
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      projectSchedule: currentSchedule.map((s: ProjectSchedule) =>
                                        s.id === schedule.id ? { ...s, activity: e.target.value } : s
                                      ),
                                    },
                                  })
                                }}
                                placeholder="활동"
                                disabled={readonly}
                                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={schedule.budget}
                                  onChange={(e) => {
                                    const currentSchedule = formData.revenueModel?.projectSchedule || []
                                    setFormData({
                                      ...formData,
                                      revenueModel: {
                                        ...formData.revenueModel!,
                                        projectSchedule: currentSchedule.map((s: ProjectSchedule) =>
                                          s.id === schedule.id ? { ...s, budget: e.target.value } : s
                                        ),
                                      },
                                    })
                                  }}
                                  placeholder="예산"
                                  disabled={readonly}
                                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                />
                                {!readonly && (
                                  <button
                                    onClick={() => {
                                      const currentSchedule = formData.revenueModel?.projectSchedule || []
                                      setFormData({
                                        ...formData,
                                        revenueModel: {
                                          ...formData.revenueModel!,
                                          projectSchedule: currentSchedule.filter((s: ProjectSchedule) => s.id !== schedule.id),
                                        },
                                      })
                                    }}
                                    className="p-2 hover:bg-red-100 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!formData.revenueModel?.projectSchedule || formData.revenueModel.projectSchedule.length === 0) && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            추진일정이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 초기 투자 예산 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          초기 투자 예산
                        </h4>
                        {!readonly && (
                          <button
                            onClick={() => {
                              const currentBudget = formData.revenueModel?.investmentBudget || []
                              const newId = currentBudget.length > 0
                                ? Math.max(...currentBudget.map((b: InvestmentBudget) => b.id)) + 1
                                : 1
                              setFormData({
                                ...formData,
                                revenueModel: {
                                  ...formData.revenueModel!,
                                  investmentBudget: [...currentBudget, { id: newId, item: '', amount: '', note: '' }],
                                },
                              })
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            추가
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {formData.revenueModel?.investmentBudget?.map((budget) => (
                          <div key={budget.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="grid grid-cols-3 gap-3">
                              <input
                                type="text"
                                value={budget.item}
                                onChange={(e) => {
                                  const currentBudget = formData.revenueModel?.investmentBudget || []
                                  setFormData({
                                    ...formData,
                                    revenueModel: {
                                      ...formData.revenueModel!,
                                      investmentBudget: currentBudget.map((b: InvestmentBudget) =>
                                        b.id === budget.id ? { ...b, item: e.target.value } : b
                                      ),
                                    },
                                  })
                                }}
                                placeholder="항목"
                                disabled={readonly}
                                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={budget.amount}
                                  onChange={(e) => {
                                    // 숫자만 허용
                                    const value = e.target.value.replace(/[^0-9]/g, '')
                                    const currentBudget = formData.revenueModel?.investmentBudget || []
                                    setFormData({
                                      ...formData,
                                      revenueModel: {
                                        ...formData.revenueModel!,
                                        investmentBudget: currentBudget.map((b: InvestmentBudget) =>
                                          b.id === budget.id ? { ...b, amount: value } : b
                                        ),
                                      },
                                    })
                                  }}
                                  placeholder="금액"
                                  disabled={readonly}
                                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                />
                                <span className="text-sm text-gray-600 whitespace-nowrap">만원</span>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={budget.note}
                                  onChange={(e) => {
                                    const currentBudget = formData.revenueModel?.investmentBudget || []
                                    setFormData({
                                      ...formData,
                                      revenueModel: {
                                        ...formData.revenueModel!,
                                        investmentBudget: currentBudget.map((b: InvestmentBudget) =>
                                          b.id === budget.id ? { ...b, note: e.target.value } : b
                                        ),
                                      },
                                    })
                                  }}
                                  placeholder="비고"
                                  disabled={readonly}
                                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                />
                                {!readonly && (
                                  <button
                                    onClick={() => {
                                      const currentBudget = formData.revenueModel?.investmentBudget || []
                                      setFormData({
                                        ...formData,
                                        revenueModel: {
                                          ...formData.revenueModel!,
                                          investmentBudget: currentBudget.filter((b: InvestmentBudget) => b.id !== budget.id),
                                        },
                                      })
                                    }}
                                    className="p-2 hover:bg-red-100 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!formData.revenueModel?.investmentBudget || formData.revenueModel.investmentBudget.length === 0) && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            초기 투자 예산이 없습니다.
                          </div>
                        )}
                      </div>
                      {/* 총 예산 합계 */}
                      {formData.revenueModel?.investmentBudget && formData.revenueModel.investmentBudget.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-sm font-medium text-gray-700">총 예산 합계:</span>
                            <span className="text-lg font-bold text-indigo-600">
                              {(() => {
                                const total = formData.revenueModel?.investmentBudget?.reduce((sum: number, budget: InvestmentBudget) => {
                                  const amount = parseInt(budget.amount) || 0
                                  return sum + amount
                                }, 0) || 0
                                return total.toLocaleString('ko-KR')
                              })()} 만원
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

      {/* 하단 상태 바 */}
      {projectId && <WorkbookStatusBar projectId={projectId} />}
    </div>
  )
}



export default function Week8Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <Week8PageContent />
    </Suspense>
  )
}
