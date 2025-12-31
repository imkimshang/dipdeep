'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Folder,
  FolderOpen,
  File,
  Plus,
  X,
  Trash2,
  ArrowRight,
  Layers,
  Workflow,
  Monitor,
  Download,
  Edit,
  MoveRight,
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

export const dynamic = 'force-dynamic'; // 이 페이지는 실시간으로 생성하도록 강제합니다.

interface IATreeItem {
  id: number
  name: string
  description: string
  depth: number
  parentId: number | null
  children?: IATreeItem[]
}

interface FlowStep {
  id: number
  stepType: 'entry' | 'action' | 'result'
  userAction: string
  systemResponse: string
  order: number
}

interface KeyScreen {
  id: number
  name: string
  components: string
  previousScreen: string
  nextScreen: string
  priority: 'High' | 'Medium' | 'Low'
}

interface Week7Data {
  iaTree: IATreeItem[]
  userFlow: FlowStep[]
  keyScreens: KeyScreen[]
  is_submitted?: boolean
}

// IA 템플릿 데이터
const defaultIATemplate: IATreeItem[] = [
  { id: 1, name: '홈', description: '메인 화면', depth: 0, parentId: null },
  { id: 2, name: '알림', description: '알림 목록 및 관리', depth: 0, parentId: null },
  { id: 3, name: '프로필', description: '사용자 프로필 정보', depth: 0, parentId: null },
  { id: 4, name: '설정', description: '앱 설정 및 옵션', depth: 0, parentId: null },
]

export default function Week7Page() {
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
  const [mvpIdeas, setMvpIdeas] = useState<string[]>([])
  const [editingIAItem, setEditingIAItem] = useState<number | null>(null)

  const [formData, setFormData] = useState<Week7Data>({
    iaTree: [],
    userFlow: [],
    keyScreens: [],
  })

  // IA Tree 관리 상태
  const [iaTreeFlat, setIaTreeFlat] = useState<IATreeItem[]>([])

  // Custom progress calculation for week 7 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: IA 트리 빌더 (가중치: 35%)
    const section1Weight = 35
    let section1Filled = 0
    let section1Total = 0

    if (iaTreeFlat.length > 0) {
      iaTreeFlat.forEach((item) => {
        section1Total += 2 // name, description
        if (item.name?.trim()) section1Filled++
        if (item.description?.trim()) section1Filled++
      })
    }

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: 해피 패스 플로우 (가중치: 35%)
    const section2Weight = 35
    let section2Filled = 0
    let section2Total = 0

    if (formData.userFlow.length > 0) {
      formData.userFlow.forEach((flow) => {
        section2Total += 2 // action, systemResponse
        if (flow.action?.trim()) section2Filled++
        if (flow.systemResponse?.trim()) section2Filled++
      })
    }

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 섹션 3: 핵심 화면 정의 (가중치: 30%)
    const section3Weight = 30
    let section3Filled = 0
    let section3Total = 0

    if (formData.keyScreens.length > 0) {
      formData.keyScreens.forEach((screen) => {
        section3Total += 4 // name, keyComponents, prevScreen, nextScreen
        if (screen.name?.trim()) section3Filled++
        if (screen.keyComponents?.trim()) section3Filled++
        if (screen.prevScreen) section3Filled++
        if (screen.nextScreen) section3Filled++
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
    if (stepNumber === 7) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 7) {
        // 섹션 1: IA 트리 빌더 (가중치: 35%)
        const section1Weight = 35
        let section1Filled = 0
        let section1Total = 0

        if (data.iaTree && Array.isArray(data.iaTree) && data.iaTree.length > 0) {
          data.iaTree.forEach((item: any) => {
            section1Total += 2
            if (item.name?.trim()) section1Filled++
            if (item.description?.trim()) section1Filled++
          })
        }

        const section1Progress = section1Total > 0
          ? Math.min((section1Filled / section1Total) * 100, section1Weight)
          : 0

        // 섹션 2: 해피 패스 플로우 (가중치: 35%)
        const section2Weight = 35
        let section2Filled = 0
        let section2Total = 0

        if (data.userFlow && Array.isArray(data.userFlow) && data.userFlow.length > 0) {
          data.userFlow.forEach((flow: any) => {
            section2Total += 2
            if (flow.action?.trim()) section2Filled++
            if (flow.systemResponse?.trim()) section2Filled++
          })
        }

        const section2Progress = section2Total > 0
          ? Math.min((section2Filled / section2Total) * 100, section2Weight)
          : 0

        // 섹션 3: 핵심 화면 정의 (가중치: 30%)
        const section3Weight = 30
        let section3Filled = 0
        let section3Total = 0

        if (data.keyScreens && Array.isArray(data.keyScreens) && data.keyScreens.length > 0) {
          data.keyScreens.forEach((screen: any) => {
            section3Total += 4
            if (screen.name?.trim()) section3Filled++
            if (screen.keyComponents?.trim()) section3Filled++
            if (screen.prevScreen) section3Filled++
            if (screen.nextScreen) section3Filled++
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
      return getStepStatus(7).progress
    })
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress((data: any) => {
      return getStepStatus(7).progress
    })
  }

  // IA Tree를 계층 구조로 변환
  const buildIATree = (flatList: IATreeItem[]): IATreeItem[] => {
    const map = new Map<number, IATreeItem>()
    const roots: IATreeItem[] = []

    flatList.forEach((item) => {
      map.set(item.id, { ...item, children: [] })
    })

    flatList.forEach((item) => {
      const node = map.get(item.id)!
      if (item.parentId === null) {
        roots.push(node)
      } else {
        const parent = map.get(item.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
        }
      }
    })

    return roots
  }

  // IA Tree를 평면 리스트로 변환
  const flattenIATree = (tree: IATreeItem[], parentId: number | null = null): IATreeItem[] => {
    const result: IATreeItem[] = []
    tree.forEach((item, index) => {
      result.push({
        ...item,
        parentId,
        depth: parentId === null ? 0 : (result.find((r) => r.id === parentId)?.depth || 0) + 1,
      })
      if (item.children && item.children.length > 0) {
        result.push(...flattenIATree(item.children, item.id))
      }
    })
    return result
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      // Load MVP ideas from week 6
      try {
        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .eq('step_number', 6)

        const stepsData = steps as any[]
        const week6Data = stepsData?.[0]?.step_data
        if (week6Data?.ideas) {
          const mvp = week6Data.ideas.filter(
            (idea: any) => idea.impact >= 7 && idea.effort <= 4
          )
          setMvpIdeas(mvp.map((idea: any) => idea.title))
        }
      } catch (error) {
        console.error('MVP ideas load error:', error)
      }

      // Load week7 data
      const data = await loadStepData(7)
      if (data) {
        const week7Data = data as Week7Data
        setFormData(week7Data)
        if (week7Data.iaTree && week7Data.iaTree.length > 0) {
          setIaTreeFlat(flattenIATree(week7Data.iaTree))
        }
        if (week7Data.is_submitted !== undefined) {
          setIsSubmitted(week7Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

  // IA Tree 항목 추가
  const handleAddIAItem = (parentId: number | null = null) => {
    const newId = iaTreeFlat.length > 0 ? Math.max(...iaTreeFlat.map((i) => i.id)) + 1 : 1
    const parentDepth = parentId ? iaTreeFlat.find((i) => i.id === parentId)?.depth || 0 : -1
    const newItem: IATreeItem = {
      id: newId,
      name: '',
      description: '',
      depth: parentDepth + 1,
      parentId,
    }
    setIaTreeFlat([...iaTreeFlat, newItem])
    setEditingIAItem(newId)
  }

  // IA Tree 항목 삭제
  const handleDeleteIAItem = (id: number) => {
    const item = iaTreeFlat.find((i) => i.id === id)
    if (!item) return

    // 자식 항목도 모두 삭제
    const deleteWithChildren = (itemId: number) => {
      const children = iaTreeFlat.filter((i) => i.parentId === itemId)
      children.forEach((child) => deleteWithChildren(child.id))
    }
    deleteWithChildren(id)

    setIaTreeFlat(iaTreeFlat.filter((i) => i.id !== id && i.parentId !== id))
  }

  // IA Tree 항목 업데이트
  const handleUpdateIAItem = (id: number, updates: Partial<IATreeItem>) => {
    setIaTreeFlat(
      iaTreeFlat.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  // IA 템플릿 불러오기
  const handleLoadIATemplate = () => {
    setIaTreeFlat(defaultIATemplate)
  }

  // 플로우 스텝 추가
  const handleAddFlowStep = () => {
    if (formData.userFlow.length >= 5) {
      setToastMessage('플로우 스텝은 최대 5개까지 추가할 수 있습니다.')
      setToastVisible(true)
      return
    }

    const newId =
      formData.userFlow.length > 0
        ? Math.max(...formData.userFlow.map((f) => f.id)) + 1
        : 1
    const order = formData.userFlow.length
    const stepType: 'entry' | 'action' | 'result' =
      order === 0 ? 'entry' : order === formData.userFlow.length ? 'result' : 'action'

    const newStep: FlowStep = {
      id: newId,
      stepType,
      userAction: '',
      systemResponse: '',
      order,
    }
    setFormData({
      ...formData,
      userFlow: [...formData.userFlow, newStep].map((step, idx) => ({
        ...step,
        order: idx,
        stepType:
          idx === 0 ? 'entry' : idx === formData.userFlow.length ? 'result' : 'action',
      })),
    })
  }

  // 플로우 스텝 삭제
  const handleDeleteFlowStep = (id: number) => {
    const filtered = formData.userFlow.filter((f) => f.id !== id)
    setFormData({
      ...formData,
      userFlow: filtered.map((step, idx) => ({
        ...step,
        order: idx,
        stepType: idx === 0 ? 'entry' : idx === filtered.length - 1 ? 'result' : 'action',
      })),
    })
  }

  // 플로우 스텝 업데이트
  const handleUpdateFlowStep = (id: number, updates: Partial<FlowStep>) => {
    setFormData({
      ...formData,
      userFlow: formData.userFlow.map((step) =>
        step.id === id ? { ...step, ...updates } : step
      ),
    })
  }

  // 핵심 화면 추가
  const handleAddKeyScreen = () => {
    const newId =
      formData.keyScreens.length > 0
        ? Math.max(...formData.keyScreens.map((s) => s.id)) + 1
        : 1

    const newScreen: KeyScreen = {
      id: newId,
      name: '',
      components: '',
      previousScreen: '',
      nextScreen: '',
      priority: 'Medium',
    }
    setFormData({
      ...formData,
      keyScreens: [...formData.keyScreens, newScreen],
    })
  }

  // 핵심 화면 삭제
  const handleDeleteKeyScreen = (id: number) => {
    setFormData({
      ...formData,
      keyScreens: formData.keyScreens.filter((s) => s.id !== id),
    })
  }

  // 핵심 화면 업데이트
  const handleUpdateKeyScreen = (id: number, updates: Partial<KeyScreen>) => {
    setFormData({
      ...formData,
      keyScreens: formData.keyScreens.map((screen) =>
        screen.id === id ? { ...screen, ...updates } : screen
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
    const iaTree = buildIATree(iaTreeFlat)
    const saveData = {
      ...formData,
      iaTree,
    }
    const success = await saveStepData(7, saveData, progress)

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
    const iaTree = buildIATree(iaTreeFlat)
    const saveData = {
      ...formData,
      iaTree,
    }
    const newSubmittedState = !isSubmitted
    const success = await submitStep(7, saveData, newSubmittedState, progress)

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
      iaTree: [],
      userFlow: [],
      keyScreens: [],
    })
    setIaTreeFlat([])
    setToastMessage('데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  const progress = calculateProgress()
  const readonly = isSubmitted
  const iaTree = buildIATree(iaTreeFlat)

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
        title="Phase 2: Ideation - 7회차: 정보 구조 및 사용자 플로우 설계"
        description="서비스의 정보 구조와 사용자 플로우를 설계하고 핵심 화면을 정의하세요."
        phase="Phase 2: Ideation"
        isScrolled={isScrolled}
        currentWeek={7}
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
          currentWeek={7}
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
            {/* MVP 아이디어 참조 패널 */}
            {mvpIdeas.length > 0 && (
              <div className="mb-6 glass rounded-xl p-4 border-2 border-gray-300 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Workflow className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-semibold text-gray-900">6회차: MVP 아이디어</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mvpIdeas.map((idea, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-medium"
                    >
                      {idea}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Section 1: IA Tree Builder */}
            <WorkbookSection
              icon={Layers}
              title="섹션 1: IA(Information Architecture) 트리 빌더"
              description="서비스의 메뉴 구조와 기능 위계를 설계하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {/* 템플릿 불러오기 버튼 */}
                {!readonly && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleLoadIATemplate}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      일반적인 앱 구조 불러오기
                    </button>
                  </div>
                )}

                {/* IA Tree 항목 리스트 */}
                <div className="space-y-2">
                  {iaTreeFlat.length > 0 ? (
                    <div className="space-y-1">
                      {iaTreeFlat.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 group"
                          style={{ marginLeft: `${item.depth * 24}px` }}
                        >
                          <div className="mt-1.5">
                            {item.depth === 0 ? (
                              <Folder className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <File className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          {editingIAItem === item.id ? (
                            <div className="flex-1 space-y-2 bg-white border-2 border-gray-300 rounded-lg p-3">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  handleUpdateIAItem(item.id, { name: e.target.value })
                                }
                                placeholder="메뉴명"
                                className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  handleUpdateIAItem(item.id, { description: e.target.value })
                                }
                                placeholder="주요 기능/설명"
                                className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingIAItem(null)}
                                  className="px-3 py-1 bg-indigo-600 text-white rounded text-xs"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteIAItem(item.id)
                                    setEditingIAItem(null)
                                  }}
                                  className="px-3 py-1 bg-gray-200 rounded text-xs"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-2 hover:border-indigo-300 transition-colors">
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-900">
                                  {item.name || '(메뉴명 미입력)'}
                                </div>
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                              {!readonly && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleAddIAItem(item.id)}
                                    className="p-1 hover:bg-indigo-100 rounded transition-colors"
                                    title="하위 항목 추가"
                                  >
                                    <Plus className="w-3 h-3 text-indigo-600" />
                                  </button>
                                  <button
                                    onClick={() => setEditingIAItem(item.id)}
                                    className="p-1 hover:bg-indigo-100 rounded transition-colors"
                                    title="수정"
                                  >
                                    <Edit className="w-3 h-3 text-indigo-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteIAItem(item.id)}
                                    className="p-1 hover:bg-red-100 rounded transition-colors"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm">IA 구조를 추가해주세요.</p>
                    </div>
                  )}

                  {/* 루트 항목 추가 버튼 */}
                  {!readonly && (
                    <button
                      onClick={() => handleAddIAItem(null)}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      최상위 항목 추가
                    </button>
                  )}
                </div>
              </div>
            </WorkbookSection>

            {/* Section 2: Happy Path Flow */}
            <WorkbookSection
              icon={Workflow}
              title="섹션 2: 해피 패스 플로우 (Happy Path User Flow)"
              description="사용자가 목적을 달성하기 위한 가장 핵심적인 이동 경로를 설계하세요. (최대 5개)"
              themeColor="indigo"
            >
              <div className="space-y-6">
                {formData.userFlow.length > 0 ? (
                  <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                      {formData.userFlow.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-4">
                          {/* 스텝 카드 */}
                          <div className="flex-shrink-0 w-64 bg-white border-2 border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  step.stepType === 'entry'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : step.stepType === 'result'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {step.stepType === 'entry'
                                  ? '진입'
                                  : step.stepType === 'result'
                                  ? '결과'
                                  : `행동 ${index}`}
                              </div>
                              {!readonly && (
                                <button
                                  onClick={() => handleDeleteFlowStep(step.id)}
                                  className="ml-auto p-1 hover:bg-red-100 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  사용자 행동
                                </label>
                                <input
                                  type="text"
                                  value={step.userAction}
                                  onChange={(e) =>
                                    handleUpdateFlowStep(step.id, { userAction: e.target.value })
                                  }
                                  placeholder="사용자가 화면에서 수행하는 액션"
                                  disabled={readonly}
                                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  시스템 반응
                                </label>
                                <textarea
                                  value={step.systemResponse}
                                  onChange={(e) =>
                                    handleUpdateFlowStep(step.id, {
                                      systemResponse: e.target.value,
                                    })
                                  }
                                  rows={3}
                                  placeholder="액션에 따른 서비스의 응답이나 화면 전환"
                                  disabled={readonly}
                                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-y"
                                />
                              </div>
                            </div>
                          </div>
                          {/* 화살표 커넥터 */}
                          {index < formData.userFlow.length - 1 && (
                            <div className="flex-shrink-0 flex items-center justify-center">
                              <ArrowRight className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">플로우 스텝을 추가해주세요.</p>
                  </div>
                )}

                {!readonly && (
                  <button
                    onClick={handleAddFlowStep}
                    disabled={formData.userFlow.length >= 5}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    플로우 스텝 추가 {formData.userFlow.length >= 5 && '(최대 5개)'}
                  </button>
                )}
              </div>
            </WorkbookSection>

            {/* Section 3: Key Screens */}
            <WorkbookSection
              icon={Monitor}
              title="섹션 3: 핵심 화면 정의 (Key Screens)"
              description="IA와 Flow를 바탕으로 반드시 설계해야 할 핵심 화면을 정의하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {formData.keyScreens.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.keyScreens.map((screen) => (
                      <div
                        key={screen.id}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-sm text-gray-900">
                            {screen.name || '(화면명 미입력)'}
                          </h4>
                          {!readonly && (
                            <button
                              onClick={() => handleDeleteKeyScreen(screen.id)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              화면 명칭
                            </label>
                            <input
                              type="text"
                              value={screen.name}
                              onChange={(e) =>
                                handleUpdateKeyScreen(screen.id, { name: e.target.value })
                              }
                              placeholder="화면 이름"
                              disabled={readonly}
                              className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded disabled:bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              포함될 핵심 컴포넌트
                            </label>
                            <textarea
                              value={screen.components}
                              onChange={(e) =>
                                handleUpdateKeyScreen(screen.id, { components: e.target.value })
                              }
                              rows={2}
                              placeholder="컴포넌트 목록"
                              disabled={readonly}
                              className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded resize-y disabled:bg-gray-100"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                이전 화면
                              </label>
                              <input
                                type="text"
                                value={screen.previousScreen}
                                onChange={(e) =>
                                  handleUpdateKeyScreen(screen.id, {
                                    previousScreen: e.target.value,
                                  })
                                }
                                placeholder="이전"
                                disabled={readonly}
                                className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded disabled:bg-gray-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                다음 화면
                              </label>
                              <input
                                type="text"
                                value={screen.nextScreen}
                                onChange={(e) =>
                                  handleUpdateKeyScreen(screen.id, {
                                    nextScreen: e.target.value,
                                  })
                                }
                                placeholder="다음"
                                disabled={readonly}
                                className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded disabled:bg-gray-100"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              우선순위
                            </label>
                            <select
                              value={screen.priority}
                              onChange={(e) =>
                                handleUpdateKeyScreen(screen.id, {
                                  priority: e.target.value as 'High' | 'Medium' | 'Low',
                                })
                              }
                              disabled={readonly}
                              className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded disabled:bg-gray-100"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">핵심 화면을 추가해주세요.</p>
                  </div>
                )}

                {!readonly && (
                  <button
                    onClick={handleAddKeyScreen}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    핵심 화면 추가
                  </button>
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

