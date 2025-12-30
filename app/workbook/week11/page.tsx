'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  GitBranch,
  PenTool,
  Link as LinkIcon,
  AlertCircle,
  Save,
  RotateCcw,
  Send,
  Undo2,
  Copy,
  Plus,
  Trash2,
  Sparkles,
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

export const dynamic = 'force-dynamic'; // 이 페이지는 실시간으로 생성하도록 강제합니다.

interface InteractionMapping {
  id: number
  element: string // 요소 (예: 카드목록, 갤러리이미지)
  action: string // 액션 (예: 스와이프, 롱프레스)
  transitionEffect: string // 전환효과 (예: 슬라이드, 줌인)
  landing: string // 랜딩 (예: 새창으로 이미지보기, 이미지팝업)
}

interface UXWritingItem {
  id: number
  type: 'success' | 'error' | 'info'
  scenario: string
  draft: string
  improved: string
}

interface Week11Data {
  interactionMap: InteractionMapping[]
  uxWritingData: UXWritingItem[]
  prototypeLink: string
  testComment: string
  is_submitted?: boolean
}

const SCREEN_TYPES = ['메인 화면', '핵심 기능 화면', '결과/마이페이지']
const ACTION_TYPES = ['클릭', '스와이프', '롱프레스', '더블 탭', '드래그', '핀치', '길게 누르기']
const TRANSITION_EFFECTS = ['슬라이드', '페이드', '팝업', '줌인', '줌아웃', '플립', '없음']
const LANDING_TYPES = ['새창으로 열기', '팝업 표시', '모달 표시', '화면 전환', '인라인 확장', '새 탭 열기']

export default function Week11Page() {
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
  const [availableScreens, setAvailableScreens] = useState<string[]>(SCREEN_TYPES)

  const [formData, setFormData] = useState<Week11Data>({
    interactionMap: [],
    uxWritingData: [],
    prototypeLink: '',
    testComment: '',
  })

  // Custom progress calculation for week 11 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 인터랙션 매핑 보드 (가중치: 35%)
    const section1Weight = 35
    let section1Filled = 0
    let section1Total = 0

    if (formData.interactionMap.length > 0) {
      formData.interactionMap.forEach((interaction) => {
        section1Total += 4 // element, action, transitionEffect, landing
        if (interaction.element?.trim()) section1Filled++
        if (interaction.action) section1Filled++
        if (interaction.transitionEffect) section1Filled++
        if (interaction.landing?.trim()) section1Filled++
      })
    }

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: AI UX 라이팅 스튜디오 (가중치: 35%)
    const section2Weight = 35
    let section2Filled = 0
    let section2Total = 0

    if (formData.uxWritingData.length > 0) {
      formData.uxWritingData.forEach((writing) => {
        // 성공 메시지는 draft(내가 쓴 것)와 improved(AI가 쓴 것)만, 나머지는 scenario 포함
        if (writing.type === 'success') {
          section2Total += 3 // scenario, draft, improved
          if (writing.scenario?.trim()) section2Filled++
          if (writing.draft?.trim()) section2Filled++
          if (writing.improved?.trim()) section2Filled++
        } else {
          section2Total += 4 // type, scenario, draft, improved
          if (writing.type) section2Filled++
          if (writing.scenario?.trim()) section2Filled++
          if (writing.draft?.trim()) section2Filled++
          if (writing.improved?.trim()) section2Filled++
        }
      })
    }

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 섹션 3: 프로토타입 최종 링크 및 비고 (가중치: 30%)
    const section3Weight = 30
    let section3Filled = 0
    let section3Total = 2

    if (formData.prototypeLink?.trim()) section3Filled++
    if (formData.testComment?.trim()) section3Filled++

    const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
    return Math.round(totalProgress)
  }

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 11) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
      return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 11) {
        // 섹션 1: 인터랙션 매핑 보드 (가중치: 35%)
        const section1Weight = 35
        let section1Filled = 0
        let section1Total = 0

        if (data.interactionMap && Array.isArray(data.interactionMap) && data.interactionMap.length > 0) {
          data.interactionMap.forEach((interaction: any) => {
            section1Total += 4
            // 기존 데이터 호환성: trigger -> element, targetScreen -> landing
            const element = interaction.element || interaction.trigger || interaction.triggerElement || ''
            const landing = interaction.landing || interaction.targetScreen || ''
            if (element?.trim()) section1Filled++
            if (interaction.action) section1Filled++
            if (interaction.transitionEffect) section1Filled++
            if (landing?.trim()) section1Filled++
          })
        }

        const section1Progress = section1Total > 0
          ? Math.min((section1Filled / section1Total) * 100, section1Weight)
          : 0

        // 섹션 2: AI UX 라이팅 스튜디오 (가중치: 35%)
        const section2Weight = 35
        let section2Filled = 0
        let section2Total = 0

        if (data.uxWritingData && Array.isArray(data.uxWritingData) && data.uxWritingData.length > 0) {
          data.uxWritingData.forEach((writing: any) => {
            // 성공 메시지는 draft(내가 쓴 것)와 improved(AI가 쓴 것)만, 나머지는 scenario 포함
            if (writing.type === 'success') {
              section2Total += 3 // scenario, draft, improved
              if (writing.scenario?.trim()) section2Filled++
              if (writing.draft?.trim()) section2Filled++
              if (writing.improved?.trim()) section2Filled++
            } else {
              section2Total += 4
              if (writing.type) section2Filled++
              if (writing.scenario?.trim()) section2Filled++
              if (writing.draft?.trim()) section2Filled++
              if (writing.improved?.trim() || writing.prompt?.trim()) section2Filled++
            }
          })
        }

        const section2Progress = section2Total > 0
          ? Math.min((section2Filled / section2Total) * 100, section2Weight)
          : 0

        // 섹션 3: 프로토타입 최종 링크 및 비고 (가중치: 30%)
        const section3Weight = 30
        let section3Filled = 0
        let section3Total = 2

        if (data.prototypeLink?.trim()) section3Filled++
        if (data.testComment?.trim()) section3Filled++

        const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

        const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
        return Math.round(totalProgress)
      }
      return 50
    })
  }

  const getPhaseProgress = (phase: 1 | 2 | 3) => {
    return getBasePhaseProgress(phase, (data: any) => {
      return getStepStatus(11).progress
    })
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress((data: any) => {
      return getStepStatus(11).progress
    })
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      // Load screen data from week 10
      try {
        const { data: step } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .eq('step_number', 10)
          .maybeSingle()

        if (step && step.step_data) {
          const week10Data = step.step_data as any
          const layouts = week10Data.screenLayouts || []
          
          // Extract screen names from week 10 data
          const screens = layouts
            .map((layout: any, index: number) => {
              if (layout.purpose?.trim()) {
                return SCREEN_TYPES[index] || `화면 ${index + 1}`
              }
              return null
            })
            .filter((screen: string | null) => screen !== null) as string[]

          setAvailableScreens(screens.length > 0 ? screens : SCREEN_TYPES)
        }
      } catch (error) {
        console.error('Screen data load error:', error)
      }

      // Load week11 data
      const data = await loadStepData(11)
      if (data) {
        const week11Data = data as any
        // Migrate old UX writing format to new format
        const migratedUXWriting = (week11Data.uxWritingData || []).map((item: any) => {
          // If it's already in new format, return as is
          if (item.type && item.scenario !== undefined) {
            return item
          }
          // Migrate from old format (draft, concept, prompt) to new format (type, scenario, draft, improved)
          return {
            id: item.id || 1,
            type: 'success' as const, // Default to success
            scenario: '',
            draft: item.draft || '',
            improved: item.prompt || '', // Use prompt as improved text if available
          }
        })
        
        setFormData({
          interactionMap: (week11Data.interactionMap || []).map((item: any) => ({
            // 기존 데이터 호환성 처리
            id: item.id || Date.now(),
            element: item.element || item.trigger || item.triggerElement || '',
            action: item.action || '',
            transitionEffect: item.transitionEffect || '',
            landing: item.landing || item.targetScreen || '',
          })),
          uxWritingData: migratedUXWriting,
          prototypeLink: week11Data.prototypeLink || '',
          testComment: week11Data.testComment || '',
        })
        if (week11Data.is_submitted !== undefined) {
          setIsSubmitted(week11Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Add interaction mapping row
  const handleAddInteractionMapping = () => {
    const newId =
      formData.interactionMap.length > 0
        ? Math.max(...formData.interactionMap.map((m) => m.id)) + 1
        : 1

    const newMapping: InteractionMapping = {
      id: newId,
      element: '',
      action: '',
      transitionEffect: '',
      landing: '',
    }
    setFormData({
      ...formData,
      interactionMap: [...formData.interactionMap, newMapping],
    })
  }

  // Delete interaction mapping row
  const handleDeleteInteractionMapping = (id: number) => {
    setFormData({
      ...formData,
      interactionMap: formData.interactionMap.filter((m) => m.id !== id),
    })
  }

  // Update interaction mapping
  const handleUpdateInteractionMapping = (id: number, field: keyof InteractionMapping, value: string) => {
    setFormData({
      ...formData,
      interactionMap: formData.interactionMap.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    })
  }

  // Add UX writing item
  const handleAddUXWriting = (type: 'success' | 'error' | 'info') => {
    const newId =
      formData.uxWritingData.length > 0
        ? Math.max(...formData.uxWritingData.map((w) => w.id)) + 1
        : 1

    const newItem: UXWritingItem = {
      id: newId,
      type,
      scenario: '',
      draft: '',
      improved: '',
    }
    setFormData({
      ...formData,
      uxWritingData: [...formData.uxWritingData, newItem],
    })
  }

  // Delete UX writing item
  const handleDeleteUXWriting = (id: number) => {
    setFormData({
      ...formData,
      uxWritingData: formData.uxWritingData.filter((w) => w.id !== id),
    })
  }

  // Update UX writing
  const handleUpdateUXWriting = (id: number, field: keyof UXWritingItem, value: string | 'success' | 'error' | 'info') => {
    setFormData({
      ...formData,
      uxWritingData: formData.uxWritingData.map((w) =>
        w.id === id ? { ...w, [field]: value } : w
      ),
    })
  }

  // Save handler
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const progress = calculateProgress()
    const success = await saveStepData(11, formData, progress)

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
    const success = await submitStep(11, formData, newSubmittedState, progress)

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
      interactionMap: [],
      uxWritingData: [],
      prototypeLink: '',
      testComment: '',
    })
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
        title="Phase 3: Prototype - 11회차: 인터랙션 설계 및 UX 라이팅"
        description="화면 간 연결을 정의하고 사용자 친화적인 문구를 작성하세요."
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
            {/* Section 1: Interaction Mapping */}
            <WorkbookSection
              icon={GitBranch}
              title="섹션 1: 인터랙션 매핑 보드 (Interaction Mapping)"
              description="사용자와의 상호작용을 중심으로 요소, 액션, 전환효과, 랜딩을 정의하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {formData.interactionMap.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            요소
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            액션
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            전환효과
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            랜딩
                          </th>
                          {!readonly && (
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-20">
                              삭제
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {formData.interactionMap.map((mapping) => (
                          <tr
                            key={mapping.id}
                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={mapping.element || ''}
                                onChange={(e) =>
                                  handleUpdateInteractionMapping(
                                    mapping.id,
                                    'element',
                                    e.target.value
                                  )
                                }
                                placeholder="예: 카드목록, 갤러리이미지"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={mapping.action || ''}
                                onChange={(e) =>
                                  handleUpdateInteractionMapping(
                                    mapping.id,
                                    'action',
                                    e.target.value
                                  )
                                }
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">선택...</option>
                                {ACTION_TYPES.map((action) => (
                                  <option key={action} value={action}>
                                    {action}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={mapping.transitionEffect || ''}
                                onChange={(e) =>
                                  handleUpdateInteractionMapping(
                                    mapping.id,
                                    'transitionEffect',
                                    e.target.value
                                  )
                                }
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">선택...</option>
                                {TRANSITION_EFFECTS.map((effect) => (
                                  <option key={effect} value={effect}>
                                    {effect}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={mapping.landing || ''}
                                onChange={(e) =>
                                  handleUpdateInteractionMapping(
                                    mapping.id,
                                    'landing',
                                    e.target.value
                                  )
                                }
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">선택...</option>
                                {LANDING_TYPES.map((landing) => (
                                  <option key={landing} value={landing}>
                                    {landing}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {!readonly && (
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteInteractionMapping(mapping.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                    <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm mb-4">
                      인터랙션 매핑을 추가해주세요.
                    </p>
                  </div>
                )}

                {!readonly && (
                  <button
                    onClick={handleAddInteractionMapping}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    인터랙션 매핑 추가
                  </button>
                )}
              </div>
            </WorkbookSection>

            {/* Section 2: UX Writing */}
            <WorkbookSection
              icon={PenTool}
              title="섹션 2: UX 라이팅 스튜디오 (UX Writing)"
              description="서비스 내의 메시지를 작성하고 설정하세요."
              themeColor="indigo"
            >
              <div className="space-y-8">
                {/* 성공 메시지 */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    성공 메시지
                  </h3>
                  <div className="space-y-4">
                    {formData.uxWritingData
                      .filter((item) => item.type === 'success')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-green-600" />
                              <h4 className="text-sm font-semibold text-gray-900">
                                성공 메시지
                              </h4>
                            </div>
                            {!readonly && (
                              <button
                                onClick={() => handleDeleteUXWriting(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            {/* 상황 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                상황 (Scenario)
                              </label>
                              <input
                                type="text"
                                value={item.scenario}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'scenario', e.target.value)
                                }
                                placeholder="예: 회원가입 완료 시"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                            </div>

                            {/* 내가 쓴 것 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                내가 쓴 것
                              </label>
                              <textarea
                                value={item.draft || ''}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'draft', e.target.value)
                                }
                                rows={3}
                                placeholder="내가 작성한 메시지를 입력하세요"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* AI가 쓴 것 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI가 쓴 것
                              </label>
                              <textarea
                                value={item.improved || ''}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'improved', e.target.value)
                                }
                                rows={3}
                                placeholder="AI가 작성한 메시지를 입력하세요"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                    {!readonly && (
                      <button
                        onClick={() => handleAddUXWriting('success')}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        성공 메시지 추가
                      </button>
                    )}
                  </div>
                </div>

                {/* 오류 메시지 */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    오류 메시지
                  </h3>
                  <div className="space-y-4">
                    {formData.uxWritingData
                      .filter((item) => item.type === 'error')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <h4 className="text-sm font-semibold text-gray-900">
                                오류 메시지
                              </h4>
                            </div>
                            {!readonly && (
                              <button
                                onClick={() => handleDeleteUXWriting(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            {/* 상황 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                상황 (Scenario)
                              </label>
                              <input
                                type="text"
                                value={item.scenario}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'scenario', e.target.value)
                                }
                                placeholder="예: 로그인 실패 시"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                            </div>

                            {/* 기존 문구 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                기존 문구 (Draft)
                              </label>
                              <textarea
                                value={item.draft}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'draft', e.target.value)
                                }
                                rows={3}
                                placeholder="예: 오류 발생"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
                              />
                            </div>

                            {/* AI 교정안 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI 교정안 (Improved)
                              </label>
                              <textarea
                                value={item.improved}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'improved', e.target.value)
                                }
                                rows={3}
                                placeholder="예: 비밀번호를 다시 확인해주세요."
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                    {!readonly && (
                      <button
                        onClick={() => handleAddUXWriting('error')}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        오류 메시지 추가
                      </button>
                    )}
                  </div>
                </div>

                {/* 안내 메시지 */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    안내 메시지
                  </h3>
                  <div className="space-y-4">
                    {formData.uxWritingData
                      .filter((item) => item.type === 'info')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-blue-600" />
                              <h4 className="text-sm font-semibold text-gray-900">
                                안내 메시지
                              </h4>
                            </div>
                            {!readonly && (
                              <button
                                onClick={() => handleDeleteUXWriting(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            {/* 상황 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                상황 (Scenario)
                              </label>
                              <input
                                type="text"
                                value={item.scenario}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'scenario', e.target.value)
                                }
                                placeholder="예: 데이터 저장 중"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                              />
                            </div>

                            {/* 기존 문구 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                기존 문구 (Draft)
                              </label>
                              <textarea
                                value={item.draft}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'draft', e.target.value)
                                }
                                rows={3}
                                placeholder="예: 처리 중"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
                              />
                            </div>

                            {/* AI 교정안 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI 교정안 (Improved)
                              </label>
                              <textarea
                                value={item.improved}
                                onChange={(e) =>
                                  handleUpdateUXWriting(item.id, 'improved', e.target.value)
                                }
                                rows={3}
                                placeholder="예: 잠시만 기다려주세요. 저장 중입니다."
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                    {!readonly && (
                      <button
                        onClick={() => handleAddUXWriting('info')}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        안내 메시지 추가
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </WorkbookSection>

            {/* Section 3: Final Prototype Link */}
            <WorkbookSection
              icon={LinkIcon}
              title="섹션 3: 프로토타입 최종 링크 및 비고 (Final Prototype Link)"
              description="외부 도구로 만든 프로토타입 링크와 테스트 코멘트를 기록하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {/* 프로토타입 링크 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    프로토타입 링크
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    피그마(Figma), 프레이머(Framer) 등 외부 도구로 만든 프로토타입 주소를
                    입력하세요.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={formData.prototypeLink}
                      onChange={(e) =>
                        setFormData({ ...formData, prototypeLink: e.target.value })
                      }
                      placeholder="https://figma.com/..."
                      disabled={readonly}
                      className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                    {formData.prototypeLink && (
                      <a
                        href={formData.prototypeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        열기
                      </a>
                    )}
                  </div>
                </div>

                {/* 테스트 코멘트 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    테스트 코멘트
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    자체 테스트 후 발견된 인터랙션 상의 이슈나 개선 사항을 기록하세요.
                  </p>
                  <textarea
                    value={formData.testComment}
                    onChange={(e) =>
                      setFormData({ ...formData, testComment: e.target.value })
                    }
                    rows={8}
                    placeholder="테스트 중 발견한 문제점, 개선이 필요한 부분, 추가로 고려할 사항 등을 자세히 기록하세요..."
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
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
    </div>
  )
}

