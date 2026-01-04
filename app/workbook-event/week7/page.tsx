'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Sparkles,
  Share2,
  Lightbulb,
  Camera,
  Gift,
  Plus,
  X,
  Info,
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { useWorkbookStorage } from '@/hooks/useWorkbookStorage'
import { useWorkbookNavigation } from '@/hooks/useWorkbookNavigation'
import { useProjectSettings } from '@/hooks/useProjectSettings'
import { useProjectSummary } from '@/hooks/useProjectSummary'
import { WorkbookHeader } from '@/components/workbook/WorkbookHeader'
import { WorkbookFooter } from '@/components/workbook/WorkbookFooter'
import { WorkbookNavigation } from '@/components/workbook/WorkbookNavigation'
import { ProjectSettingsModal } from '@/components/workbook/ProjectSettingsModal'
import { ProjectSummaryModal } from '@/components/workbook/ProjectSummaryModal'
import { WorkbookStatusBar } from '@/components/WorkbookStatusBar'
import { useProjectAccess } from '@/hooks/useProjectAccess'
import { useWorkbookCredit } from '@/hooks/useWorkbookCredit'
import { EVENT_TRANSLATIONS } from '@/i18n/translations'
import { useLanguage } from '@/contexts/LanguageContext'

export const dynamic = 'force-dynamic'

// 프로그램 카테고리 (다국어 지원)
const getProgramCategories = (language: 'en' | 'ko') => {
  const categories = EVENT_TRANSLATIONS[language]?.session7?.categories || EVENT_TRANSLATIONS['ko'].session7.categories
  return [
    categories.experienceZone,
    categories.fnb,
    categories.stagePerformance,
    categories.goodsShop,
    categories.restZone,
    categories.photoZone,
    categories.other,
  ]
}

interface ProgramCard {
  id: number
  category: string
  customCategory: string
  name: string
  description: string
  operation: string // 운영 방식
  targetEmotion: string // 방문객이 느끼길 원하는 감정
}

interface PhotoZone {
  visualConcept: string // 비주얼 컨셉
  why: string // 촬영 동기
}

interface ViralEvent {
  mission: string // 미션
  reward: string // 리워드
}

interface EventWeek7Data {
  programs: ProgramCard[]
  viralTrigger: {
    photoZone: PhotoZone
    viralEvent: ViralEvent
  }
  aiIdeation: {
    selectedPersona: boolean // 2회차 페르소나 선택 여부
    selectedTheme: boolean // 5회차 테마 키워드 선택 여부
    prompt: string // 생성된 프롬프트
    result: string // AI 결과/수정된 아이디어
  }
  is_submitted?: boolean
}

function EventWeek7PageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const { language } = useLanguage()
  const safeLanguage = language || 'ko'
  const T = EVENT_TRANSLATIONS[safeLanguage]?.session7 || EVENT_TRANSLATIONS['ko'].session7
  const PROGRAM_CATEGORIES = getProgramCategories(safeLanguage)

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
    updateTeamMembers,
    hideProject,
    unhideProject,
  } = useProjectSettings(projectId)
  const { generateSummary } = useProjectSummary()
  const { checkAndDeductCredit } = useWorkbookCredit(projectId, 7)

  // State
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')

  // 5회차 바이럴 스토리 정보
  const [week5ViralStory, setWeek5ViralStory] = useState<string>('')
  const [week5ThemeKeywords, setWeek5ThemeKeywords] = useState<string[]>([])
  const [week2Persona, setWeek2Persona] = useState<string>('')

  // 킬러 콘텐츠
  const [programs, setPrograms] = useState<ProgramCard[]>([
    {
      id: Date.now(),
      category: '',
      customCategory: '',
      name: '',
      description: '',
      operation: '',
      targetEmotion: '',
    },
  ])

  // 바이럴 트리거
  const [photoZone, setPhotoZone] = useState<PhotoZone>({
    visualConcept: '',
    why: '',
  })
  const [viralEvent, setViralEvent] = useState<ViralEvent>({
    mission: '',
    reward: '',
  })

  // AI 아이데이션
  const [aiIdeation, setAiIdeation] = useState({
    selectedPersona: false,
    selectedTheme: false,
    prompt: '',
    result: '',
  })

  // 프로그램 추가
  const addProgram = () => {
    setPrograms([
      ...programs,
      {
        id: Date.now(),
        category: '',
        customCategory: '',
        name: '',
        description: '',
        operation: '',
        targetEmotion: '',
      },
    ])
  }

  // 프로그램 삭제
  const removeProgram = (id: number) => {
    if (programs.length <= 1) {
      setToastMessage(T.minOneProgram)
      setToastVisible(true)
      return
    }
    setPrograms(programs.filter((p) => p.id !== id))
  }

  // 프로그램 업데이트
  const updateProgram = (id: number, field: keyof ProgramCard, value: any) => {
    setPrograms(programs.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  // AI 프롬프트 생성 (언어별 프롬프트 생성)
  const generateAIPrompt = () => {
    const isKorean = safeLanguage === 'ko'
    let prompt = isKorean 
      ? `# 역할 부여
당신은 트렌디한 팝업스토어 및 페스티벌 기획 전문가입니다.

# 행사 정보
`
      : `# Role Assignment
You are an expert in trendy pop-up stores and festival planning.

# Event Information
`

    // 행사 컨셉 (4회차)
    // 타겟 페르소나 (2회차)
    if (aiIdeation.selectedPersona && week2Persona) {
      prompt += isKorean 
        ? `- 타겟 페르소나: ${week2Persona}\n`
        : `- Target Persona: ${week2Persona}\n`
    }

    // 테마 무드 (5회차)
    if (aiIdeation.selectedTheme && week5ThemeKeywords.length > 0) {
      prompt += isKorean
        ? `- 테마 무드: ${week5ThemeKeywords.join(', ')}\n`
        : `- Theme Mood: ${week5ThemeKeywords.join(', ')}\n`
    }

    prompt += isKorean
      ? `
# 요청 사항
위 정보를 바탕으로 방문객을 열광시킬 '킬러 콘텐츠' 아이디어 5가지를 제안해주세요.
단순한 관람보다는 직접 참여하고 경험할 수 있는 인터랙티브한 아이디어 위주로 부탁드립니다.
각 아이디어별로 '사람들이 휴대폰을 꺼내게 만들 바이럴 포인트'도 한 줄씩 덧붙여주세요.

**답변은 1000자 이내로 작성해주세요.**`
      : `
# Request
Based on the information above, please suggest 5 'killer content' ideas that will excite visitors.
Please focus on interactive ideas that allow direct participation and experience rather than simple viewing.
Also add one line per idea about 'viral points that make people take out their phones'.

**Please write your response within 1000 characters.**`

    setAiIdeation({ ...aiIdeation, prompt })
    return prompt
  }

  // AI 프롬프트 복사
  const copyAIPrompt = async () => {
    const prompt = generateAIPrompt()
    try {
      await navigator.clipboard.writeText(prompt)
      setToastMessage(T.promptCopySuccess)
      setToastVisible(true)
    } catch (error) {
      setToastMessage(T.copyFailed)
      setToastVisible(true)
    }
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 킬러 콘텐츠
    total += programs.length * 5 // category, name, description, operation, targetEmotion
    programs.forEach((program) => {
      if (program.category || program.customCategory) filled += 1
      if (program.name.trim()) filled += 1
      if (program.description.trim()) filled += 1
      if (program.operation.trim()) filled += 1
      if (program.targetEmotion.trim()) filled += 1
    })

    // 바이럴 트리거
    total += 4 // photoZone (2) + viralEvent (2)
    if (photoZone.visualConcept.trim()) filled += 1
    if (photoZone.why.trim()) filled += 1
    if (viralEvent.mission.trim()) filled += 1
    if (viralEvent.reward.trim()) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(7 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.programs && Array.isArray(data.programs)) {
        total += data.programs.length * 5
        data.programs.forEach((program: any) => {
          if (program.category || program.customCategory) filled += 1
          if (program.name?.trim()) filled += 1
          if (program.description?.trim()) filled += 1
          if (program.operation?.trim()) filled += 1
          if (program.targetEmotion?.trim()) filled += 1
        })
      } else {
        total += 5
      }

      if (data.viralTrigger) {
        total += 4
        if (data.viralTrigger.photoZone?.visualConcept?.trim()) filled += 1
        if (data.viralTrigger.photoZone?.why?.trim()) filled += 1
        if (data.viralTrigger.viralEvent?.mission?.trim()) filled += 1
        if (data.viralTrigger.viralEvent?.reward?.trim()) filled += 1
      } else {
        total += 4
      }

      return total > 0 ? Math.round((filled / total) * 100) : 0
    })
  }, [registerProgressCalculator])

  // 저장
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

    const eventData: EventWeek7Data = {
      programs,
      viralTrigger: {
        photoZone,
        viralEvent,
      },
      aiIdeation,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(7, eventData, progress)

      if (success) {
        setToastMessage('임시 저장되었습니다.')
        setToastVisible(true)
        loadSteps()
      } else {
        setToastMessage('저장 중 오류가 발생했습니다.')
        setToastVisible(true)
      }
    } catch (error: any) {
      console.error('저장 오류:', error)
      setToastMessage('저장 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  // 제출
  const handleSubmit = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    if (
      !confirm(
        isSubmitted
          ? '워크북 제출을 회수하시겠습니까?'
          : '워크북을 제출하시겠습니까?\n제출 후에는 수정이 제한됩니다.'
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

    const eventData: EventWeek7Data = {
      programs,
      viralTrigger: {
        photoZone,
        viralEvent,
      },
      aiIdeation,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(7, eventData, newSubmittedState, progress)

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

  // 초기화
  const handleReset = () => {
    if (!confirm('모든 입력 내용을 초기화하시겠습니까?')) return

    setPrograms([
      {
        id: Date.now(),
        category: '',
        customCategory: '',
        name: '',
        description: '',
        operation: '',
        targetEmotion: '',
      },
    ])
    setPhotoZone({
      visualConcept: '',
      why: '',
    })
    setViralEvent({
      mission: '',
      reward: '',
    })
    setAiIdeation({
      selectedPersona: false,
      selectedTheme: false,
      prompt: '',
      result: '',
    })
    setIsSubmitted(false)
  }

  // 프로젝트 설정
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
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    const success = await deleteProject()
    if (success) {
      router.push('/dashboard')
    } else {
      setToastMessage('프로젝트 삭제 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  // 프로젝트 요약
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
      const errorMsg = safeLanguage === 'ko' ? '워크북 데이터가 없습니다.' : 'No workbook data available.'
      setToastMessage(errorMsg)
      setToastVisible(true)
    }
  }

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryPrompt)
      setToastMessage(T.promptCopySuccess)
      setToastVisible(true)
    } catch (error) {
      setToastMessage(T.copyFailed)
      setToastVisible(true)
    }
  }

  // 5회차 바이럴 스토리 및 테마 키워드 로드
  useEffect(() => {
    const loadWeek5Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(5)
        if (data && (data as any).viralTeasing) {
          const viralTeasing = (data as any).viralTeasing
          const storyText = [
            viralTeasing.phase1,
            viralTeasing.phase2,
            viralTeasing.phase3,
          ]
            .filter(Boolean)
            .join('\n')
          setWeek5ViralStory(storyText)
        }
        if (data && (data as any).themeKeywords) {
          setWeek5ThemeKeywords((data as any).themeKeywords || [])
        }
      } catch (error) {
        console.error('5회차 데이터 로드 오류:', error)
      }
    }

    loadWeek5Data()
  }, [projectId, loadStepData])

  // 2회차 페르소나 로드
  useEffect(() => {
    const loadWeek2Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(2)
        if (data && (data as any).personas && Array.isArray((data as any).personas)) {
          const personas = (data as any).personas
          if (personas.length > 0) {
            const firstPersona = personas[0]
            const personaText = [
              firstPersona.profile?.name && `이름: ${firstPersona.profile.name}`,
              firstPersona.profile?.age && `나이: ${firstPersona.profile.age}`,
              firstPersona.profile?.job && `직업: ${firstPersona.profile.job}`,
              firstPersona.profile?.lifestyleTags?.length > 0 &&
                `라이프스타일: ${firstPersona.profile.lifestyleTags.join(', ')}`,
              firstPersona.profile?.visitMotivation?.length > 0 &&
                `방문 동기: ${firstPersona.profile.visitMotivation.join(', ')}`,
            ]
              .filter(Boolean)
              .join('\n')
            setWeek2Persona(personaText)
          }
        }
      } catch (error) {
        console.error('2회차 데이터 로드 오류:', error)
      }
    }

    loadWeek2Data()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(7)
      if (data) {
        const eventData = data as EventWeek7Data
        if (eventData.programs && eventData.programs.length > 0) {
          setPrograms(eventData.programs)
        }
        if (eventData.viralTrigger) {
          setPhotoZone(eventData.viralTrigger.photoZone || { visualConcept: '', why: '' })
          setViralEvent(eventData.viralTrigger.viralEvent || { mission: '', reward: '' })
        }
        if (eventData.aiIdeation) {
          setAiIdeation(eventData.aiIdeation)
        }
        if (eventData.is_submitted !== undefined) {
          setIsSubmitted(eventData.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

  // 실시간 업데이트 구독
  useEffect(() => {
    if (!projectId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`project-steps-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_steps',
          filter: `project_id=eq.${projectId}&step_number=eq.7`,
        },
        async () => {
          const data = await loadStepData(7)
          if (data) {
            const eventData = data as EventWeek7Data
            if (eventData.programs && eventData.programs.length > 0) {
              setPrograms(eventData.programs)
            }
            if (eventData.viralTrigger) {
              setPhotoZone(eventData.viralTrigger.photoZone || { visualConcept: '', why: '' })
              setViralEvent(eventData.viralTrigger.viralEvent || { mission: '', reward: '' })
            }
            if (eventData.aiIdeation) {
              setAiIdeation(eventData.aiIdeation)
            }
            if (eventData.is_submitted !== undefined) {
              setIsSubmitted(eventData.is_submitted)
            }
          }
          loadSteps()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, loadStepData, loadProjectInfo, loadSteps])

  const progress = calculateProgress()
  const readonly = isSubmitted

  // 이벤트 워크북용 회차 제목
  const getEventWeekTitle = useCallback((week: number): string => {
    // 사이드바는 항상 영어 (Global Shell)
    const titles = EVENT_TRANSLATIONS.en.titles
    const title = titles[week - 1] || `Week ${week}`
    return title
  }, [])

  const getStepStatus = (weekNumber: number) => {
    return getBaseStepStatus(weekNumber)
  }

  const getPhaseProgress = (phase: number) => {
    return getBasePhaseProgress(phase as 1 | 2 | 3)
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress()
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">프로젝트 ID 필요</h3>
              <p className="text-gray-600 text-sm mb-4">
                프로젝트 ID가 제공되지 않았습니다. 대시보드에서 프로젝트를 선택해주세요.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                대시보드로 이동
              </button>
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
        title={getWeekTitle(7)}
        description={EVENT_TRANSLATIONS[safeLanguage]?.descriptions?.[6] || EVENT_TRANSLATIONS['ko'].descriptions[6]}
        phase="Phase 2: Insight"
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
          getWeekTitle={getEventWeekTitle}
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
          isTeam={projectInfo?.is_team || false}
          teamCode={projectInfo?.team_code || null}
          memberEmails={projectInfo?.member_emails || []}
          onUpdateTeamMembers={async (emails: string[]) => {
            const success = await updateTeamMembers(emails)
            if (success) {
              await loadProjectInfo()
            }
            return success
          }}
          onHideProject={async () => {
            const success = await hideProject()
            if (success) {
              await loadProjectInfo()
            }
            return success
          }}
          onUnhideProject={async () => {
            const success = await unhideProject()
            if (success) {
              await loadProjectInfo()
            }
            return success
          }}
          isOwner={projectInfo?.is_owner || false}
          isHidden={projectInfo?.is_hidden || false}
        />

        <ProjectSummaryModal
          isOpen={showProjectSummary}
          summaryPrompt={summaryPrompt}
          onClose={() => setShowProjectSummary(false)}
          onCopy={handleCopySummary}
        />

        <main className="flex-1 pb-16">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* 킬러 콘텐츠 빌더 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{T.programBuilder}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {T.programBuilderDesc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addProgram}
                  disabled={readonly}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {T.addProgram}
                </button>
              </div>

              <div className="space-y-6">
                {programs.map((program, index) => (
                  <div key={program.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {T.program} {index + 1}
                      </h3>
                      {programs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProgram(program.id)}
                          disabled={readonly}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* 카테고리 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {T.programCategory}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {PROGRAM_CATEGORIES.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                const otherLabel = EVENT_TRANSLATIONS[safeLanguage]?.session7?.categories?.other || EVENT_TRANSLATIONS['ko'].session7.categories.other
                                if (category === otherLabel) {
                                  if (program.category === otherLabel) {
                                    updateProgram(program.id, 'category', '')
                                    updateProgram(program.id, 'customCategory', '')
                                  } else {
                                    updateProgram(program.id, 'category', otherLabel)
                                  }
                                } else {
                                  updateProgram(program.id, 'category', category)
                                  if (program.category === otherLabel) {
                                    updateProgram(program.id, 'customCategory', '')
                                  }
                                }
                              }}
                              disabled={readonly}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                program.category === category
                                  ? 'bg-indigo-600 text-white shadow-md'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                        {program.category === (EVENT_TRANSLATIONS[safeLanguage]?.session7?.categories?.other || EVENT_TRANSLATIONS['ko'].session7.categories.other) && (
                          <div className="mt-3">
                            <input
                              type="text"
                              value={program.customCategory}
                              onChange={(e) =>
                                updateProgram(program.id, 'customCategory', e.target.value)
                              }
                              disabled={readonly}
                              placeholder={T.customCategoryPlaceholder}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        )}
                      </div>

                      {/* 좌우 배치: 프로그램명과 목표 감정 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 프로그램명 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {T.programName} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={program.name}
                            onChange={(e) => updateProgram(program.id, 'name', e.target.value)}
                            disabled={readonly}
                            placeholder={T.programNamePlaceholder}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* 목표 감정 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {T.targetEmotion}
                          </label>
                          <input
                            type="text"
                            value={program.targetEmotion}
                            onChange={(e) => updateProgram(program.id, 'targetEmotion', e.target.value)}
                            disabled={readonly}
                            placeholder={T.targetEmotionPlaceholder}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* 좌우 배치: 상세 내용과 운영 방식 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 상세 내용 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {T.programDetail} <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={program.description}
                            onChange={(e) => updateProgram(program.id, 'description', e.target.value)}
                            disabled={readonly}
                            rows={4}
                            placeholder={T.programDetailPlaceholder}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* 운영 방식 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {T.operationMethod}
                          </label>
                          <textarea
                            value={program.operation}
                            onChange={(e) => updateProgram(program.id, 'operation', e.target.value)}
                            disabled={readonly}
                            rows={4}
                            placeholder={T.operationMethodPlaceholder}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 바이럴 트리거 기획 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Share2 className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{T.viralTrigger}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {T.viralTriggerDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 인증샷 스팟 */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{T.photoZone}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {T.visualConcept}
                      </label>
                      <textarea
                        value={photoZone.visualConcept}
                        onChange={(e) => setPhotoZone({ ...photoZone, visualConcept: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder={T.visualConceptPlaceholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {T.photoReason}
                      </label>
                      <textarea
                        value={photoZone.why}
                        onChange={(e) => setPhotoZone({ ...photoZone, why: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder={T.photoReasonPlaceholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 이벤트 메커니즘 */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{T.eventMechanism}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {T.mission}
                      </label>
                      <textarea
                        value={viralEvent.mission}
                        onChange={(e) => setViralEvent({ ...viralEvent, mission: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder={T.missionPlaceholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {T.reward}
                      </label>
                      <textarea
                        value={viralEvent.reward}
                        onChange={(e) => setViralEvent({ ...viralEvent, reward: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder={T.rewardPlaceholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI 아이데이션 스튜디오 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Lightbulb className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{T.aiIdeation}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {T.aiIdeationDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 프롬프트 생성 및 결과 에디터 좌우 배치 */}
                <div>
                  {/* 입력 정보 선택 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {T.aiPrompt}
                    </label>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        {T.selectElements}
                      </label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={aiIdeation.selectedPersona}
                            onChange={(e) =>
                              setAiIdeation({ ...aiIdeation, selectedPersona: e.target.checked })
                            }
                            disabled={readonly}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <span className="text-sm text-gray-700">{T.personaWeek2}</span>
                          {week2Persona && (
                            <span className="text-xs text-gray-500">{T.dataExists}</span>
                          )}
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={aiIdeation.selectedTheme}
                            onChange={(e) =>
                              setAiIdeation({ ...aiIdeation, selectedTheme: e.target.checked })
                            }
                            disabled={readonly}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <span className="text-sm text-gray-700">{T.themeKeywordWeek5}</span>
                          {week5ThemeKeywords.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({week5ThemeKeywords.join(', ')})
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* 프롬프트 생성 및 복사 */}
                    <div className="flex flex-col h-full">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {T.aiPrompt}
                        </label>
                      </div>
                      <textarea
                        value={aiIdeation.prompt}
                        onChange={(e) => setAiIdeation({ ...aiIdeation, prompt: e.target.value })}
                        disabled={readonly}
                        rows={10}
                        placeholder={T.promptPlaceholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed font-mono flex-1"
                      />
                    </div>

                    {/* 결과 에디터 */}
                    <div className="flex flex-col h-full">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {T.resultEditor}
                        </label>
                      </div>
                      <textarea
                        value={aiIdeation.result}
                        onChange={(e) => setAiIdeation({ ...aiIdeation, result: e.target.value })}
                        disabled={readonly}
                        rows={10}
                        placeholder={T.resultPlaceholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed flex-1"
                      />
                    </div>
                  </div>

                  {/* 프롬프트 생성 및 복사 버튼 하단 배치 */}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        generateAIPrompt()
                      }}
                      disabled={readonly}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {T.generatePrompt}
                    </button>
                    <button
                      type="button"
                      onClick={copyAIPrompt}
                      disabled={readonly || !aiIdeation.prompt}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {T.copyPrompt}
                    </button>
                    <p className="text-xs text-gray-500 ml-2">
                      {T.promptCopyGuide}
                    </p>
                  </div>
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

      {/* 하단 상태 바 */}
      {projectId && <WorkbookStatusBar projectId={projectId} />}
    </div>
  )
}

export default function EventWeek7Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <EventWeek7PageContent />
    </Suspense>
  )
}

