'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Sparkles,
  Copy,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  Mic,
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



interface RequirementCheck {
  requirementId: string // RFP 요구사항 ID
  requirementName: string // RFP 요구사항 명칭
  category: string // FR, TR, UR 등
  status: 'match' | 'partial' | 'missing' | 'pivot' | ''
  actualResult: string // 실제 결과물
  changeReason: string // 변경 사유
  changeType: string // 변경 유형
}

interface Week12Data {
  requirementChecks: RequirementCheck[]
  changeReasons: string[]
  retrospective: string
  pitchPrompt: string
  pitchScript: string
  is_submitted?: boolean
}

const STATUS_OPTIONS = [
  { id: 'match', label: '일치(Match)', color: 'green' },
  { id: 'partial', label: '일부 반영(Partial)', color: 'yellow' },
  { id: 'missing', label: '미반영/삭제(Missing)', color: 'red' },
  { id: 'pivot', label: '의도적 변경(Pivot)', color: 'blue' },
]

const CHANGE_TYPE_OPTIONS = [
  '기술적 구현 한계',
  '디자인적 판단',
  '사용자 관점 피드백',
  '기획적 피벗',
  '시간 부족',
  '예산 제약',
  '법적/규제 이슈',
]

const CHANGE_REASON_OPTIONS = [
  '기술적 구현 한계',
  '디자인적 판단',
  '사용자 관점 피드백',
  '기획적 피벗',
  '시간 부족',
  '예산 제약',
  '법적/규제 이슈',
]

function Week12PageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''

  // 권한 검증
  useProjectAccess(projectId)
  const supabase = createClient()

  const [formData, setFormData] = useState<Week12Data>({
    requirementChecks: [],
    changeReasons: [],
    retrospective: '',
    pitchPrompt: '',
    pitchScript: '',
  })

  const [availableRequirements, setAvailableRequirements] = useState<
    Array<{ id: string; name: string; description: string; category: string; priority: string }>
  >([])

  const [openedAccordions, setOpenedAccordions] = useState<Set<string>>(new Set())

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [referenceData, setReferenceData] = useState<{
    week7IA: string
    week8RFP: string
    week11Prototype: string
  } | null>(null)

  const { saveStepData, submitStep, loadStepData, storageLoading } = useWorkbookStorage(projectId || '')
  const {
    projectInfo,
    steps,
    progress: overallProgress,
    getOverallProgress: getBaseOverallProgress,
    getPhaseProgress: getBasePhaseProgress,
    getStepStatus: getBaseStepStatus,
    loadSteps,
    allSteps,
    getWeekTitle,
    isScrolled,
  } = useWorkbookNavigation(projectId || '')

  // Override getStepStatus to use custom progress calculation
  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 12) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 12) {
        // 섹션 1: 기획-결과 정합성 체크리스트 (가중치: 60%)
        const section1Weight = 60
        let section1Filled = 0
        let section1Total = 0

        if (data.requirementChecks && Array.isArray(data.requirementChecks) && data.requirementChecks.length > 0) {
          data.requirementChecks.forEach((check: any) => {
            section1Total += 4
            if (check.status) section1Filled++
            if (check.actualResult?.trim()) section1Filled++
            if (check.changeReason?.trim()) section1Filled++
            if (check.changeType && Array.isArray(check.changeType) && check.changeType.length > 0) section1Filled++
          })
        }

        const section1Progress = section1Total > 0
          ? Math.min((section1Filled / section1Total) * 100, section1Weight)
          : 0

        // 섹션 2: 최종 프로젝트 회고 및 사유서 (가중치: 30%)
        const section2Weight = 30
        let section2Filled = 0
        let section2Total = 2

        if (data.changeReasons && Array.isArray(data.changeReasons) && data.changeReasons.length > 0) section2Filled++
        if (data.retrospective?.trim()) section2Filled++

        const section2Progress = Math.min((section2Filled / section2Total) * 100, section2Weight)

        // 섹션 3: 데모데이 피칭 프롬프트 입력 (가중치: 5%)
        const section3Weight = 5
        const section3Progress = data.pitchPrompt?.trim() ? section3Weight : 0

        // 섹션 4: 데모데이 피칭 대본 입력 (가중치: 5%)
        const section4Weight = 5
        const section4Progress = data.pitchScript?.trim() ? section4Weight : 0

        const totalProgress = Math.min(section1Progress + section2Progress + section3Progress + section4Progress, 100)
        return Math.round(totalProgress)
      }
      return 50
    })
  }

  const getPhaseProgress = (phase: 1 | 2 | 3) => {
    return getBasePhaseProgress(phase, (data: any) => {
      return getStepStatus(12).progress
    })
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress((data: any) => {
      return getStepStatus(12).progress
    })
  }
  const { updateProjectTitle, deleteProject } = useProjectSettings(projectId || '')
  const { generateSummary } = useProjectSummary()

  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')

  // Load existing data
  useEffect(() => {
    if (!projectId) return

    const loadData = async () => {
      // Load week 12 data and reference data from weeks 7, 8, 11
      const [week12Data, week7Data, week8Data, week11Data] = await Promise.all([
        loadStepData(12),
        loadStepData(7),
        loadStepData(8),
        loadStepData(11),
      ])

      const iaTree = (week7Data as any)?.iaTree || []
      const requirements = (week8Data as any)?.requirements || []
      const prototypeLink = (week11Data as any)?.prototypeLink || ''

      // 8회차 요구사항을 매핑 가능한 형태로 변환
      const mappedRequirements = (requirements || []).map((req: any, index: number) => ({
        id: `req_${index}_${req.name || index}`,
        name: req.name || `요구사항 ${index + 1}`,
        description: req.description || '',
        category: req.category || 'FR',
        priority: req.priority || 'P3',
      }))

      setAvailableRequirements(mappedRequirements)

      // 모든 요구사항에 대해 requirementChecks 초기화 (아직 기록되지 않은 것은 빈 상태로)
      const existingChecks = (week12Data as any)?.requirementChecks || []
      const allChecks: RequirementCheck[] = mappedRequirements.map((req) => {
        const existing = existingChecks.find((c: any) => c.requirementId === req.id)
        if (existing) {
          return existing
        }
        return {
          requirementId: req.id,
          requirementName: req.name,
          category: req.category,
          status: '',
          actualResult: '',
          changeReason: '',
          changeType: '',
        }
      })

      // formData에 모든 체크 데이터 및 기타 데이터 설정
      setFormData({
        requirementChecks: allChecks,
        changeReasons: (week12Data as any)?.changeReasons || [],
        retrospective: (week12Data as any)?.retrospective || '',
        pitchPrompt: (week12Data as any)?.pitchPrompt || '',
        pitchScript: (week12Data as any)?.pitchScript || '',
      })
      
      if ((week12Data as any)?.is_submitted !== undefined) {
        setIsSubmitted((week12Data as any).is_submitted)
      }

      setReferenceData({
        week7IA: iaTree.length > 0 ? 'IA 구조 데이터 있음' : 'IA 구조 데이터 없음',
        week8RFP:
          requirements.length > 0
            ? `${requirements.length}개 요구사항`
            : '요구사항 데이터 없음',
        week11Prototype: prototypeLink || '프로토타입 링크 없음',
      })

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadSteps])

  // Progress calculation (섹션 가중치 방식)
  const calculateProgress = (): number => {
    if (availableRequirements.length === 0) return 0

    // 섹션 1: 기획-결과 정합성 체크리스트 (가중치: 60%)
    const section1Weight = 60
    let section1Filled = 0
    let section1Total = 0

    // availableRequirements와 일치하는 requirementChecks만 계산
    availableRequirements.forEach((req) => {
      const check = formData.requirementChecks.find((c) => c.requirementId === req.id) || {
        requirementId: req.id,
        requirementName: req.name,
        category: req.category,
        status: '',
        actualResult: '',
        changeReason: '',
        changeType: '',
      }
      section1Total += 4 // status, actualResult, changeReason, changeType
      if (check.status) section1Filled++
      if (check.actualResult?.trim()) section1Filled++
      if (check.changeReason?.trim()) section1Filled++
      if (check.changeType && check.changeType.length > 0) section1Filled++
    })

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: 최종 프로젝트 회고 및 사유서 (가중치: 30%)
    const section2Weight = 30
    let section2Filled = 0
    let section2Total = 2

    if (formData.changeReasons && formData.changeReasons.length > 0) section2Filled++
    if (formData.retrospective?.trim()) section2Filled++

    const section2Progress = Math.min((section2Filled / section2Total) * 100, section2Weight)

    // 섹션 3: 데모데이 피칭 프롬프트 입력 (가중치: 5%)
    const section3Weight = 5
    const section3Progress = formData.pitchPrompt?.trim() ? section3Weight : 0

    // 섹션 4: 데모데이 피칭 대본 입력 (가중치: 5%)
    const section4Weight = 5
    const section4Progress = formData.pitchScript?.trim() ? section4Weight : 0

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress + section4Progress, 100)
    return Math.round(totalProgress)
  }

  const progress = calculateProgress()
  const readonly = isSubmitted

  // Handlers
  const handleAddRequirementCheck = (requirementId: string) => {
    const requirement = availableRequirements.find((r) => r.id === requirementId)
    if (!requirement) return

    // 이미 추가된 요구사항인지 확인
    if (formData.requirementChecks.some((c) => c.requirementId === requirementId)) {
      setToastMessage('이미 추가된 요구사항입니다.')
      setToastVisible(true)
      return
    }

    const newCheck: RequirementCheck = {
      requirementId: requirement.id,
      requirementName: requirement.name,
      category: requirement.category,
      status: '',
      actualResult: '',
      changeReason: '',
      changeType: '',
    }

    setFormData({
      ...formData,
      requirementChecks: [...formData.requirementChecks, newCheck],
    })
  }

  const handleRemoveRequirementCheck = (requirementId: string) => {
    setFormData({
      ...formData,
      requirementChecks: formData.requirementChecks.filter(
        (c) => c.requirementId !== requirementId
      ),
    })
  }

  const handleRequirementCheckUpdate = (
    requirementId: string,
    field: keyof RequirementCheck,
    value: string
  ) => {
    setFormData({
      ...formData,
      requirementChecks: (() => {
        const existingIndex = formData.requirementChecks.findIndex(
          (c) => c.requirementId === requirementId
        )
        if (existingIndex >= 0) {
          // 기존 항목 업데이트
          const updated = [...formData.requirementChecks]
          updated[existingIndex] = { ...updated[existingIndex], [field]: value }
          return updated
        } else {
          // 새 항목 생성
          const requirement = availableRequirements.find((r) => r.id === requirementId)
          if (!requirement) return formData.requirementChecks
          return [
            ...formData.requirementChecks,
            {
              requirementId: requirement.id,
              requirementName: requirement.name,
              category: requirement.category,
              status: '',
              actualResult: '',
              changeReason: '',
              changeType: '',
              [field]: value,
            },
          ]
        }
      })(),
    })
  }

  const handleChangeReasonToggle = (reason: string) => {
    setFormData({
      ...formData,
      changeReasons: formData.changeReasons.includes(reason)
        ? formData.changeReasons.filter((r) => r !== reason)
        : [...formData.changeReasons, reason],
    })
  }

  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const progress = calculateProgress()
    const success = await saveStepData(12, formData, progress)

    if (success) {
      setToastMessage('임시 저장되었습니다.')
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('저장 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  const handleSubmit = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    if (!isSubmitted) {
      if (
        !confirm(
          '워크북을 제출하시겠습니까?\n제출 후에는 수정이 불가능합니다.\n(제출 취소는 가능합니다)'
        )
      ) {
        return
      }
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(12, formData, newSubmittedState, progress)

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

  const handleReset = () => {
    if (!confirm('모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }
    setFormData({
      requirementChecks: [],
      changeReasons: [],
      retrospective: '',
      pitchPrompt: '',
      pitchScript: '',
    })
    setToastMessage('데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  const handleGeneratePitchPrompt = async () => {
    if (!projectId) return

    try {
      // Load data from weeks 1, 4, 9
      const [week1Data, week4Data, week9Data] = await Promise.all([
        loadStepData(1),
        loadStepData(4),
        loadStepData(9),
      ])

      const problems = (week1Data as any)?.problems || []
      const hmw = (week4Data as any)?.conclusion || (week4Data as any)?.hmw || ''
      const serviceName =
        (week9Data as any)?.naming?.candidates?.find((c: any) => c.isFavorite)?.name ||
        (week9Data as any)?.naming?.candidates?.[0]?.name ||
        '서비스'

      let prompt = `당신은 투자자에게 서비스를 설득력 있게 소개하는 피칭 전문가입니다.\n\n`
      prompt += `다음 정보를 바탕으로 1분 내로 설득력 있는 발표 대본을 작성해주세요:\n\n`

      if (problems.length > 0) {
        prompt += `[발견된 불편함]\n`
        problems.forEach((p: any, idx: number) => {
          if (p.title) {
            prompt += `${idx + 1}. ${p.title}: ${p.description || ''}\n`
          }
        })
        prompt += `\n`
      }

      if (hmw) {
        prompt += `[해결하려는 문제]\n${hmw}\n\n`
      }

      prompt += `[서비스명]\n${serviceName}\n\n`

      prompt += `[최종 결과]\n${formData.retrospective || '12주간의 기획 및 프로토타입 완성'}\n\n`

      prompt += `위 정보를 바탕으로 다음과 같은 구조로 발표 대본을 작성해주세요:\n`
      prompt += `1. 훅 (Hook): 문제 상황을 강렬하게 제시\n`
      prompt += `2. 솔루션: 우리 서비스의 핵심 가치 제안\n`
      prompt += `3. 차별점: 경쟁 우위 및 혁신성\n`
      prompt += `4. 마무리: 호출 행동(Call to Action)`

      setFormData({
        ...formData,
        pitchPrompt: prompt,
      })
      setToastMessage('피칭 프롬프트가 생성되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('프롬프트 생성 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(formData.pitchPrompt)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('복사 실패')
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

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">프로젝트 ID가 필요합니다.</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'match':
        return 'bg-green-50 border-green-500 text-green-700'
      case 'partial':
        return 'bg-yellow-50 border-yellow-500 text-yellow-700'
      case 'missing':
        return 'bg-red-50 border-red-500 text-red-700'
      case 'pivot':
        return 'bg-blue-50 border-blue-500 text-blue-700'
      default:
        return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={toastVisible} onClose={() => setToastVisible(false)} />

      <WorkbookHeader
        title="Phase 3: Prototype - 12회차: 최종 검증 및 프로젝트 회고"
        isSubmitted={isSubmitted}
        themeColor="indigo"
        phase="Phase 3: Prototype"
        isScrolled={isScrolled}
        currentWeek={12}
        overallProgress={getOverallProgress()}
        phase1Progress={getPhaseProgress(1)}
        phase2Progress={getPhaseProgress(2)}
        phase3Progress={getPhaseProgress(3)}
        projectTitle={projectInfo?.title || ''}
        onSettingsClick={() => setShowSettings(true)}
        onSummaryClick={handleProjectSummary}
      />

      <div className="flex">
        <WorkbookNavigation
          projectId={projectId}
          currentWeek={12}
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

        <main className="flex-1 p-6 md:p-8 lg:p-12 max-w-5xl mx-auto pb-16">
          <div className="space-y-8">
            {/* Reference Data Panel */}
            {referenceData && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-indigo-900 mb-3">참고 데이터</h3>
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-indigo-700">7회차 (IA):</span>{' '}
                    <span className="text-indigo-600">{referenceData.week7IA}</span>
                  </div>
                  <div>
                    <span className="font-medium text-indigo-700">8회차 (RFP):</span>{' '}
                    <span className="text-indigo-600">{referenceData.week8RFP}</span>
                  </div>
                  <div>
                    <span className="font-medium text-indigo-700">11회차 (프로토타입):</span>{' '}
                    <span className="text-indigo-600">{referenceData.week11Prototype}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Requirement Consistency Check */}
            <WorkbookSection
              icon={CheckCircle}
              title="섹션 1: 기획-결과 정합성 체크리스트 (Requirement Consistency Check)"
              description="8회차에서 작성한 RFP 요구사항이 최종 프로토타입에 어떻게 반영되었는지 확인하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {availableRequirements.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      8회차에서 작성한 요구사항이 없습니다. 먼저 8회차에서 RFP를 작성해주세요.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        전체 요구사항: {availableRequirements.length}개
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {availableRequirements.map((requirement) => {
                        const check = formData.requirementChecks.find(
                          (c) => c.requirementId === requirement.id
                        ) || {
                          requirementId: requirement.id,
                          requirementName: requirement.name,
                          category: requirement.category,
                          status: '',
                          actualResult: '',
                          changeReason: '',
                          changeType: '',
                        }

                        const isOpen = openedAccordions.has(requirement.id)

                        const toggleAccordion = () => {
                          setOpenedAccordions((prev) => {
                            const newSet = new Set(prev)
                            if (newSet.has(requirement.id)) {
                              newSet.delete(requirement.id)
                            } else {
                              newSet.add(requirement.id)
                            }
                            return newSet
                          })
                        }

                        const getCategoryLabel = (cat: string) => {
                          if (cat === 'FR') return '기능'
                          if (cat === 'TR') return '기술'
                          if (cat === 'UR') return '디자인/UI'
                          return cat
                        }

                        const getStatusLabel = (status: string) => {
                          const statusOption = STATUS_OPTIONS.find((opt) => opt.id === status)
                          return statusOption ? statusOption.label : '미선택'
                        }

                        return (
                          <div
                            key={requirement.id}
                            className="bg-white border border-gray-300 rounded-xl overflow-hidden"
                          >
                            {/* 아코디언 헤더 */}
                            <button
                              onClick={toggleAccordion}
                              disabled={readonly}
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors disabled:bg-white disabled:cursor-default"
                            >
                              <div className="flex items-center gap-3 flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  {isOpen ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  )}
                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                    {getCategoryLabel(requirement.category)}
                                  </span>
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                    {requirement.priority}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-base font-semibold text-gray-900">
                                    {requirement.name}
                                  </h3>
                                  {requirement.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {requirement.description}
                                    </p>
                                  )}
                                </div>
                                {check.status && (
                                  <span className="text-xs text-gray-500">
                                    상태: {getStatusLabel(check.status)}
                                  </span>
                                )}
                              </div>
                            </button>

                            {/* 아코디언 컨텐츠 */}
                            {isOpen && (
                              <div className="px-6 py-4 border-t border-gray-200 space-y-4">
                                <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-3">
                                  반영 상태
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {STATUS_OPTIONS.map((option) => {
                                    const isSelected = check.status === option.id
                                    return (
                                      <button
                                        key={option.id}
                                        onClick={() =>
                                          handleRequirementCheckUpdate(
                                            check.requirementId,
                                            'status',
                                            option.id
                                          )
                                        }
                                        disabled={readonly}
                                        className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                                          isSelected
                                            ? getStatusColor(option.id)
                                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                        } ${readonly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                      >
                                        {option.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                  실제 결과물
                                </label>
                                <textarea
                                  value={check.actualResult}
                                  onChange={(e) =>
                                    handleRequirementCheckUpdate(
                                      check.requirementId,
                                      'actualResult',
                                      e.target.value
                                    )
                                  }
                                  placeholder="최종 프로토타입에서 이 요구사항이 어떻게 구현되었는지 설명하세요."
                                  disabled={readonly}
                                  rows={3}
                                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                  변경 사유
                                </label>
                                <textarea
                                  value={check.changeReason}
                                  onChange={(e) =>
                                    handleRequirementCheckUpdate(
                                      check.requirementId,
                                      'changeReason',
                                      e.target.value
                                    )
                                  }
                                  placeholder="원래 요구사항과 다르게 구현되었다면 그 이유를 설명하세요."
                                  disabled={readonly}
                                  rows={2}
                                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-3">
                                  변경 유형
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {CHANGE_TYPE_OPTIONS.map((type) => {
                                    const isSelected = check.changeType === type
                                    return (
                                      <button
                                        key={type}
                                        onClick={() =>
                                          handleRequirementCheckUpdate(
                                            check.requirementId,
                                            'changeType',
                                            type
                                          )
                                        }
                                        disabled={readonly}
                                        className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                                          isSelected
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                        } ${readonly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                      >
                                        {type}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </WorkbookSection>

            {/* Section 2: Change Reason & Retrospective */}
            <WorkbookSection
              icon={TrendingUp}
              title="섹션 2: 최종 프로젝트 회고 및 사유서 (Change Reason & Retrospective)"
              description="기획과 결과물이 달라진 이유를 분석하고 12주간의 과정을 정리하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    변경 사유 유형 (복수 선택 가능)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CHANGE_REASON_OPTIONS.map((reason) => {
                      const isSelected = formData.changeReasons.includes(reason)
                      return (
                        <button
                          key={reason}
                          onClick={() => handleChangeReasonToggle(reason)}
                          disabled={readonly}
                          className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                          } ${readonly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          {reason}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    최종 소감 및 성장 포인트
                  </label>
                  <textarea
                    value={formData.retrospective}
                    onChange={(e) =>
                      setFormData({ ...formData, retrospective: e.target.value })
                    }
                    placeholder="AI와 협업하며 기획자로서 성장한 지점은 무엇인가요?"
                    disabled={readonly}
                    rows={6}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </WorkbookSection>

            {/* Section 3: Pitch Prompt Generator */}
            <WorkbookSection
              icon={Sparkles}
              title="섹션 3: 데모데이 피칭 프롬프트 (Demo Day Pitch Prompt)"
              description="데모데이 발표를 위한 피칭 프롬프트를 직접 입력하거나 자동 생성할 수 있습니다."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {/* 자동 생성 버튼 */}
                {!readonly && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleGeneratePitchPrompt}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      자동 생성하기
                    </button>
                  </div>
                )}

                {/* 입력란 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    데모데이 피칭 프롬프트
                  </label>
                  <textarea
                    value={formData.pitchPrompt || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, pitchPrompt: e.target.value })
                    }
                    placeholder="데모데이 발표를 위한 피칭 프롬프트를 입력하세요. 예: 투자자에게 서비스를 설득력 있게 소개하는 1분 발표 대본을 작성해주세요..."
                    disabled={readonly}
                    rows={12}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    외부 AI 도구에 입력할 피칭 프롬프트를 작성하거나, 위의 &apos;자동 생성하기&apos; 버튼을 클릭하여 기존 워크북 데이터를 바탕으로 자동 생성할 수 있습니다.
                  </p>
                </div>

                {/* 복사 버튼 */}
                {formData.pitchPrompt && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleCopyPrompt}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      프롬프트 복사
                    </button>
                  </div>
                )}
              </div>
            </WorkbookSection>

            {/* Section 4: Pitch Script */}
            <WorkbookSection
              icon={Mic}
              title="섹션 4: 데모데이 피칭 대본 (Demo Day Pitch Script)"
              description="데모데이 발표에 사용할 실제 피칭 대본을 작성하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    피칭 대본
                  </label>
                  <textarea
                    value={formData.pitchScript || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, pitchScript: e.target.value })
                    }
                    placeholder="데모데이 발표에 사용할 실제 피칭 대본을 입력하세요. 예: 안녕하세요. 오늘은 여러분에게 혁신적인 서비스를 소개하게 되어 기쁩니다..."
                    disabled={readonly}
                    rows={16}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    실제 발표에서 사용할 피칭 대본을 작성하세요. 위의 피칭 프롬프트를 외부 AI 도구에 입력하여 생성된 대본을 여기에 붙여넣을 수 있습니다.
                  </p>
                </div>

                {/* 복사 버튼 */}
                {formData.pitchScript && (
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(formData.pitchScript)
                          setToastMessage('대본이 클립보드에 복사되었습니다.')
                          setToastVisible(true)
                        } catch (error) {
                          setToastMessage('복사 실패')
                          setToastVisible(true)
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      대본 복사
                    </button>
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



export default function Week12Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <Week12PageContent />
    </Suspense>
  )
}
