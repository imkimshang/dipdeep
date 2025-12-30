'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Layout,
  Sparkles,
  AlertCircle,
  Copy,
  RotateCcw,
  Download,
  Brain,
  CheckCircle2,
  AlertTriangle,
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

interface ScreenLayout {
  screenType: 'main' | 'feature' | 'result'
  purpose: string
  header: string[] // 다중 선택 (로고, 검색바, 알림 아이콘, 프로필, 뒤로가기 버튼)
  body: string[] // 다중 선택 (배너, 리스트, 카드 피드, 입력 폼, 지도, 차트/그래프)
  footer: string[] // 다중 선택 (하단 탭바, 회사 정보, 서비스 이용약관, 상단 이동 버튼)
  coreFunction: string // 핵심 기능 상세 기술
}

interface AIAnalysisData {
  improvements: string[] // AI로부터 회신받은 개선사항 3가지
  suggestions: string // 제안점
}

interface Week10Data {
  screenLayouts: ScreenLayout[]
  aiAnalysis?: AIAnalysisData
  is_submitted?: boolean
}


export default function Week10Page() {
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
  const [brandColors, setBrandColors] = useState<{
    mainColor: string
    subColor: string
    serviceName: string
  } | null>(null)
  const [diagnosticPrompt, setDiagnosticPrompt] = useState('')
  const [week7KeyScreens, setWeek7KeyScreens] = useState<any[]>([])

    const [formData, setFormData] = useState<Week10Data>({
      screenLayouts: [
        { screenType: 'main', purpose: '', header: [], body: [], footer: [], coreFunction: '' },
        { screenType: 'feature', purpose: '', header: [], body: [], footer: [], coreFunction: '' },
        { screenType: 'result', purpose: '', header: [], body: [], footer: [], coreFunction: '' },
      ],
      aiAnalysis: {
        improvements: ['', '', ''],
        suggestions: '',
      },
    })

  const HEADER_OPTIONS = ['로고', '검색바', '알림 아이콘', '프로필', '뒤로가기 버튼']
  const BODY_OPTIONS = ['배너', '리스트', '카드 피드', '입력 폼', '지도', '차트/그래프']
  const FOOTER_OPTIONS = ['하단 탭바', '회사 정보(Footer)', '서비스 이용약관', '상단 이동 버튼']

  // Custom progress calculation for week 10 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 핵심 화면 레이아웃 설계 (가중치: 80%)
    const section1Weight = 80
    let section1Filled = 0
    let section1Total = 0

    if (formData.screenLayouts.length > 0) {
      formData.screenLayouts.forEach((screen) => {
        section1Total += 5 // purpose, header, body, footer, coreFunction
        if (screen.purpose?.trim()) section1Filled++
        if (screen.header && screen.header.length > 0) section1Filled++
        if (screen.body && screen.body.length > 0) section1Filled++
        if (screen.footer && screen.footer.length > 0) section1Filled++
        if (screen.coreFunction?.trim()) section1Filled++
      })
    }

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: AI 레이아웃 진단 프롬프트 (가중치: 15%)
    // 프롬프트 생성은 선택사항이므로 15% 가중치만 부여
    const section2Weight = 15
    const section2Progress = 0

    // 섹션 3: AI 분석 결과 입력 (가중치: 15%)
    const section3Weight = 15
    let section3Filled = 0
    let section3Total = 4 // improvements(3개), suggestions
    
    if (formData.aiAnalysis) {
      if (formData.aiAnalysis.improvements && formData.aiAnalysis.improvements.some((i) => i?.trim())) section3Filled++
      if (formData.aiAnalysis.improvements && formData.aiAnalysis.improvements.filter((i) => i?.trim()).length >= 2) section3Filled++
      if (formData.aiAnalysis.improvements && formData.aiAnalysis.improvements.filter((i) => i?.trim()).length >= 3) section3Filled++
      if (formData.aiAnalysis.suggestions?.trim()) section3Filled++
    }
    
    const section3Progress = section3Total > 0
      ? Math.min((section3Filled / section3Total) * 100, section3Weight)
      : 0

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
    return Math.round(totalProgress)
  }

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 10) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 10) {
        // 섹션 1: 핵심 화면 레이아웃 설계 (가중치: 80%)
        const section1Weight = 80
        let section1Filled = 0
        let section1Total = 0

        if (data.screenLayouts && Array.isArray(data.screenLayouts) && data.screenLayouts.length > 0) {
          data.screenLayouts.forEach((screen: any) => {
            section1Total += 5
            if (screen.purpose?.trim()) section1Filled++
            if ((screen.header?.length || 0) > 0) section1Filled++
            if ((screen.body?.length || 0) > 0) section1Filled++
            if ((screen.footer?.length || 0) > 0) section1Filled++
            if (screen.coreFunction?.trim()) section1Filled++
          })
        }

        const section1Progress = section1Total > 0
          ? Math.min((section1Filled / section1Total) * 100, section1Weight)
          : 0

        // 섹션 2: AI 레이아웃 진단 프롬프트 (가중치: 20%)
        const section2Weight = 20
        const section2Progress = 0

        const totalProgress = Math.min(section1Progress + section2Progress, 100)
        return Math.round(totalProgress)
      }
      return 50
    })
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

      // Load brand colors from week 9
      try {
        const { data: step } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .eq('step_number', 9)
          .maybeSingle()

        if (step && (step as any).step_data) {
          const week9Data = (step as any).step_data as any
          const visual = week9Data.visual
          const naming = week9Data.naming
          
          // Get favorite naming candidate or first one
          const favoriteName = naming?.candidates?.find((c: any) => c.isFavorite)?.name ||
                              naming?.candidates?.[0]?.name ||
                              ''

          setBrandColors({
            mainColor: visual?.mainColor || '#6366F1', // Violet default
            subColor: visual?.subColor || '#818CF8',
            serviceName: favoriteName,
          })
        } else {
          // Default colors if week 9 data not found
          setBrandColors({
            mainColor: '#6366F1',
            subColor: '#818CF8',
            serviceName: '',
          })
        }
      } catch (error) {
        console.error('Brand colors load error:', error)
        setBrandColors({
          mainColor: '#6366F1',
          subColor: '#818CF8',
          serviceName: '',
        })
      }

      // Load week7 keyScreens data
      try {
        const week7Data = await loadStepData(7)
        if (week7Data && (week7Data as any).keyScreens) {
          setWeek7KeyScreens((week7Data as any).keyScreens || [])
        }
      } catch (error) {
        console.error('Week7 data load error:', error)
      }

      // Load week10 data
      const data = await loadStepData(10)
      if (data) {
        const week10Data = data as any
        // 기존 데이터 호환성 처리 (문자열을 배열로 변환)
        const layouts = (week10Data.screenLayouts || formData.screenLayouts).map((screen: any) => ({
          ...screen,
          header: Array.isArray(screen.header) ? screen.header : screen.header?.trim() ? [screen.header] : [],
          body: Array.isArray(screen.body) ? screen.body : screen.body?.trim() ? [screen.body] : [],
          footer: Array.isArray(screen.footer) ? screen.footer : screen.footer?.trim() ? [screen.footer] : [],
          coreFunction: screen.coreFunction || '',
        }))
        setFormData({
          screenLayouts: layouts,
          aiAnalysis: week10Data.aiAnalysis || {
            improvements: ['', '', ''],
            suggestions: '',
          },
        })
        if (week10Data.is_submitted !== undefined) {
          setIsSubmitted(week10Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // 화면 레이아웃 업데이트
  const handleScreenLayoutUpdate = (
    index: number,
    field: keyof ScreenLayout,
    value: string | string[]
  ) => {
    const newLayouts = [...formData.screenLayouts]
    newLayouts[index] = { ...newLayouts[index], [field]: value }
    setFormData({ ...formData, screenLayouts: newLayouts })
  }

  // 영역별 요소 토글 (체크박스)
  const handleToggleAreaElement = (
    index: number,
    area: 'header' | 'body' | 'footer',
    element: string
  ) => {
    const newLayouts = [...formData.screenLayouts]
    const currentElements = newLayouts[index][area] || []
    const newElements = currentElements.includes(element)
      ? currentElements.filter((e) => e !== element)
      : [...currentElements, element]
    newLayouts[index] = { ...newLayouts[index], [area]: newElements }
    setFormData({ ...formData, screenLayouts: newLayouts })
  }

  // 7회차 핵심화면 불러오기
  const handleLoadWeek7Screens = () => {
    if (week7KeyScreens.length === 0) {
      setToastMessage('7회차에서 정의한 핵심화면이 없습니다.')
      setToastVisible(true)
      return
    }

    // 7회차 keyScreens를 10회차 screenLayouts로 변환
    const newLayouts = week7KeyScreens.slice(0, 3).map((screen, index) => {
      // screenType 결정: 첫 번째는 main, 두 번째는 feature, 세 번째는 result
      const screenTypes: ('main' | 'feature' | 'result')[] = ['main', 'feature', 'result']
      
      return {
        screenType: screenTypes[index] || 'main',
        purpose: screen.name || '', // 화면 명칭을 목적으로 사용
        header: [], // 기본값, 사용자가 직접 선택
        body: [], // 기본값, 사용자가 직접 선택
        footer: [], // 기본값, 사용자가 직접 선택
        coreFunction: screen.components || '', // 핵심 컴포넌트를 핵심 기능으로 사용
      }
    })

    // 3개 미만이면 나머지는 기본값으로 채우기
    while (newLayouts.length < 3) {
      const screenTypes: ('main' | 'feature' | 'result')[] = ['main', 'feature', 'result']
      newLayouts.push({
        screenType: screenTypes[newLayouts.length] || 'main',
        purpose: '',
        header: [],
        body: [],
        footer: [],
        coreFunction: '',
      })
    }

    setFormData({
      ...formData,
      screenLayouts: newLayouts,
    })
    setToastMessage('7회차 핵심화면을 불러왔습니다.')
    setToastVisible(true)
  }

  // AI 진단 프롬프트 생성
  const handleGenerateDiagnosticPrompt = () => {
    let prompt = `당신은 UX 전문가입니다. 다음 화면 구조가 사용자에게 직관적일지 분석해주세요.\n\n`

    // 화면 구조
    prompt += `[화면 구조]\n\n`
    formData.screenLayouts.forEach((screen, index) => {
      const screenNames = ['화면 1: 메인', '화면 2: 핵심 기능', '화면 3: 결과/프로필']
      prompt += `${screenNames[index]}\n`
      prompt += `- 목적: ${screen.purpose || '(미입력)'}\n`
      prompt += `- 상단(Header): ${screen.header?.length > 0 ? screen.header.join(', ') : '(미입력)'}\n`
      prompt += `- 중단(Body): ${screen.body?.length > 0 ? screen.body.join(', ') : '(미입력)'}\n`
      prompt += `- 하단(Footer): ${screen.footer?.length > 0 ? screen.footer.join(', ') : '(미입력)'}\n`
      prompt += `- 핵심 기능: ${screen.coreFunction || '(미입력)'}\n\n`
    })

    prompt += `\n위 구조를 UX 전문가 관점에서 분석하여 다음을 제공해주세요:\n`
    prompt += `1. 사용자 흐름의 직관성 평가\n`
    prompt += `2. 각 화면의 정보 계층 구조 평가\n`
    prompt += `3. 개선 제안사항`

    setDiagnosticPrompt(prompt)
    setToastMessage('진단 프롬프트가 생성되었습니다.')
    setToastVisible(true)
  }

  // 프롬프트 복사
  const handleCopyPrompt = async () => {
    if (!diagnosticPrompt) {
      setToastMessage('생성된 프롬프트가 없습니다.')
      setToastVisible(true)
      return
    }

    try {
      await navigator.clipboard.writeText(diagnosticPrompt)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('복사 실패')
      setToastVisible(true)
    }
  }

  // Save handler
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const progress = calculateProgress()
    const success = await saveStepData(10, formData, progress)

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
    const success = await submitStep(10, formData, newSubmittedState, progress)

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
      screenLayouts: [
        { screenType: 'main', purpose: '', header: [], body: [], footer: [], coreFunction: '' },
        { screenType: 'feature', purpose: '', header: [], body: [], footer: [], coreFunction: '' },
        { screenType: 'result', purpose: '', header: [], body: [], footer: [], coreFunction: '' },
      ],
      aiAnalysis: {
        improvements: ['', '', ''],
        suggestions: '',
      },
    })
    setDiagnosticPrompt('')
    setToastMessage('데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  const progress = calculateProgress()
  const readonly = isSubmitted
  const screenNames = ['화면 1: 메인', '화면 2: 핵심 기능', '화면 3: 결과/프로필']
  const brandColor = brandColors?.mainColor || '#6366F1'

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
        title="Phase 3: Prototype - 10회차: UI/UX 와이어프레임 설계"
        description="핵심 화면의 레이아웃을 설계하고 인터랙션을 정의하세요."
        phase="Phase 3: Prototype"
        isScrolled={isScrolled}
        currentWeek={10}
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
          currentWeek={10}
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
            {/* Brand Colors Reference Panel */}
            {brandColors && (
              <div
                className="mb-6 rounded-xl p-4 border-2 border-gray-300 bg-gray-50"
                style={{
                  borderLeftColor: brandColor,
                  borderLeftWidth: '4px',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: brandColor }}
                  />
                  <div className="flex-1 text-sm text-gray-700">
                    {brandColors.serviceName && (
                      <span className="font-medium">서비스명: {brandColors.serviceName}</span>
                    )}
                    {brandColors.serviceName && <span className="mx-2">•</span>}
                    <span>
                      메인 컬러: <span className="font-mono">{brandColors.mainColor}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Key Screen Layouts */}
            <WorkbookSection
              icon={Layout}
              title="섹션 1: 핵심 화면 레이아웃 설계 (Key Screen Layouts)"
              description="가장 중요한 3가지 화면의 상/중/하단 구성을 정의하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {/* 7회차 핵심화면 불러오기 버튼 */}
                {!readonly && week7KeyScreens.length > 0 && (
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={handleLoadWeek7Screens}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      7회차 핵심화면 불러오기 ({week7KeyScreens.length}개)
                    </button>
                  </div>
                )}
                {formData.screenLayouts.map((screen, index) => (
                  <div
                    key={index}
                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {screenNames[index]}
                    </h3>
                    
                    {/* 목적 */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        화면의 주요 목적 (한 줄 요약)
                      </label>
                      <input
                        type="text"
                        value={screen.purpose}
                        onChange={(e) =>
                          handleScreenLayoutUpdate(index, 'purpose', e.target.value)
                        }
                        placeholder="이 화면의 주요 목적을 한 줄로 요약하세요"
                        disabled={readonly}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                      />
                    </div>

                    {/* 상단 영역 */}
                    <div className="mb-6">
                      <label className="block text-xs font-medium text-gray-700 mb-3">
                        상단 (Header) - 다중 선택
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {HEADER_OPTIONS.map((option) => {
                          const isSelected = screen.header?.includes(option) || false
                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                              } ${readonly ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleAreaElement(index, 'header', option)}
                                disabled={readonly}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* 중단 영역 */}
                    <div className="mb-6">
                      <label className="block text-xs font-medium text-gray-700 mb-3">
                        중단 (Body) - 다중 선택
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {BODY_OPTIONS.map((option) => {
                          const isSelected = screen.body?.includes(option) || false
                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                              } ${readonly ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleAreaElement(index, 'body', option)}
                                disabled={readonly}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* 하단 영역 */}
                    <div className="mb-6">
                      <label className="block text-xs font-medium text-gray-700 mb-3">
                        하단 (Footer) - 다중 선택
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {FOOTER_OPTIONS.map((option) => {
                          const isSelected = screen.footer?.includes(option) || false
                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                              } ${readonly ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleAreaElement(index, 'footer', option)}
                                disabled={readonly}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* 핵심 기능 상세 기술 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        핵심 기능 상세 기술
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        이 화면에서 사용자가 수행하는 가장 중요한 핵심 기능 한 가지를 설명해주세요.
                      </p>
                      <textarea
                        value={screen.coreFunction}
                        onChange={(e) =>
                          handleScreenLayoutUpdate(index, 'coreFunction', e.target.value)
                        }
                        rows={3}
                        placeholder="핵심 기능을 상세하게 설명하세요..."
                        disabled={readonly}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </WorkbookSection>

            {/* Section 2: AI Diagnostic Prompt */}
            <WorkbookSection
              icon={Sparkles}
              title="섹션 2: AI 레이아웃 진단 프롬프트 (AI Prompt)"
              description="작성한 구조를 외부 AI에게 검토받기 위한 프롬프트를 생성하세요."
              themeColor="indigo"
            >
              <div className="space-y-4">
                {!diagnosticPrompt ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      진단 프롬프트를 생성하려면 버튼을 클릭하세요.
                    </p>
                    <button
                      onClick={handleGenerateDiagnosticPrompt}
                      disabled={readonly}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      진단 프롬프트 생성
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-300 rounded-xl p-4">
                      <textarea
                        value={diagnosticPrompt}
                        readOnly
                        rows={15}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm resize-y focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCopyPrompt}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        프롬프트 복사
                      </button>
                      {!readonly && (
                        <button
                          onClick={() => setDiagnosticPrompt('')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          다시 생성
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </WorkbookSection>

            {/* Section 3: AI 분석 결과 입력 */}
            <WorkbookSection
              icon={Brain}
              title="섹션 3: AI 분석 결과 입력"
              description="AI로부터 회신받은 개선사항과 제안점을 정리하여 입력하세요."
              themeColor="indigo"
            >
              <div className="space-y-6">
                {/* AI로부터 회신받은 개선사항 3가지 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    AI로부터 회신받은 개선사항 (3가지)
                  </label>
                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 mt-1">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={formData.aiAnalysis?.improvements?.[index] || ''}
                          onChange={(e) => {
                            const currentImprovements = formData.aiAnalysis?.improvements || ['', '', '']
                            const newImprovements = [...currentImprovements]
                            newImprovements[index] = e.target.value
                            setFormData({
                              ...formData,
                              aiAnalysis: {
                                ...(formData.aiAnalysis || {
                                  improvements: ['', '', ''],
                                  suggestions: '',
                                }),
                                improvements: newImprovements,
                              },
                            })
                          }}
                          placeholder={`개선사항 ${index + 1}을 입력하세요`}
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
                            improvements: ['', '', ''],
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

