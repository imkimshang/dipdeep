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

export const dynamic = 'force-dynamic'

// 프로그램 카테고리
const PROGRAM_CATEGORIES = [
  '체험존',
  'F&B (식음료)',
  '무대/공연',
  '굿즈샵',
  '휴식존',
  '포토존',
  '기타',
]

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
      setToastMessage('최소 1개의 프로그램은 유지해야 합니다.')
      setToastVisible(true)
      return
    }
    setPrograms(programs.filter((p) => p.id !== id))
  }

  // 프로그램 업데이트
  const updateProgram = (id: number, field: keyof ProgramCard, value: any) => {
    setPrograms(programs.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  // AI 프롬프트 생성
  const generateAIPrompt = () => {
    let prompt = `# 역할 부여
당신은 트렌디한 팝업스토어 및 페스티벌 기획 전문가입니다.

# 행사 정보
`

    // 행사 컨셉 (4회차)
    // 타겟 페르소나 (2회차)
    if (aiIdeation.selectedPersona && week2Persona) {
      prompt += `- 타겟 페르소나: ${week2Persona}\n`
    }

    // 테마 무드 (5회차)
    if (aiIdeation.selectedTheme && week5ThemeKeywords.length > 0) {
      prompt += `- 테마 무드: ${week5ThemeKeywords.join(', ')}\n`
    }

    prompt += `
# 요청 사항
위 정보를 바탕으로 방문객을 열광시킬 '킬러 콘텐츠' 아이디어 5가지를 제안해주세요.
단순한 관람보다는 직접 참여하고 경험할 수 있는 인터랙티브한 아이디어 위주로 부탁드립니다.
각 아이디어별로 '사람들이 휴대폰을 꺼내게 만들 바이럴 포인트'도 한 줄씩 덧붙여주세요.

**답변은 1000자 이내로 작성해주세요.**`

    setAiIdeation({ ...aiIdeation, prompt })
    return prompt
  }

  // AI 프롬프트 복사
  const copyAIPrompt = async () => {
    const prompt = generateAIPrompt()
    try {
      await navigator.clipboard.writeText(prompt)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('복사 실패')
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
    const eventTitles: { [key: number]: string } = {
      1: 'Phase 1 - 행사 방향성 설정 및 트렌드 헌팅',
      2: 'Phase 1 - 타겟 페르소나',
      3: 'Phase 1 - 레퍼런스 벤치마킹 및 정량 분석',
      4: 'Phase 1 - 행사 개요 및 환경 분석',
      5: 'Phase 2 - 세계관 및 스토리텔링',
      6: 'Phase 2 - 방문객 여정 지도',
      7: 'Phase 2 - 킬러 콘텐츠 및 바이럴 기획',
      8: 'Phase 2 - 마스터 플랜',
      9: 'Phase 3 - 행사 브랜딩',
      10: 'Phase 3 - 공간 조감도',
      11: 'Phase 3 - D-Day 통합 실행 계획',
      12: 'Phase 3 - 최종 피칭 및 검증',
    }
    return eventTitles[week] || `${week}회차`
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
        title="Phase 2: Insight - 7회: 킬러 콘텐츠 및 바이럴 기획"
        description="방문객을 즐겁게 할 세부 프로그램을 구체화하고, 현장에서의 경험이 자발적인 SNS 확산으로 이어지도록 바이럴 트리거를 설계합니다."
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
                    <h2 className="text-xl font-bold text-gray-900">킬러 콘텐츠 빌더</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      행사장 내에서 운영될 세부 프로그램들을 카테고리별로 정리하고 구체적인 운영 방식을 기획합니다.
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
                  프로그램 추가
                </button>
              </div>

              <div className="space-y-6">
                {programs.map((program, index) => (
                  <div key={program.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        프로그램 {index + 1}
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
                          카테고리
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {PROGRAM_CATEGORIES.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                if (category === '기타') {
                                  if (program.category === '기타') {
                                    updateProgram(program.id, 'category', '')
                                    updateProgram(program.id, 'customCategory', '')
                                  } else {
                                    updateProgram(program.id, 'category', '기타')
                                  }
                                } else {
                                  updateProgram(program.id, 'category', category)
                                  if (program.category === '기타') {
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
                        {program.category === '기타' && (
                          <div className="mt-3">
                            <input
                              type="text"
                              value={program.customCategory}
                              onChange={(e) =>
                                updateProgram(program.id, 'customCategory', e.target.value)
                              }
                              disabled={readonly}
                              placeholder="기타 카테고리를 입력하세요"
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
                            프로그램명 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={program.name}
                            onChange={(e) => updateProgram(program.id, 'name', e.target.value)}
                            disabled={readonly}
                            placeholder="방문객의 흥미를 끌 수 있는 매력적인 이름"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* 목표 감정 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            목표 감정
                          </label>
                          <input
                            type="text"
                            value={program.targetEmotion}
                            onChange={(e) => updateProgram(program.id, 'targetEmotion', e.target.value)}
                            disabled={readonly}
                            placeholder="예: 신나고, 흥미롭고, 만족스럽게"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* 좌우 배치: 상세 내용과 운영 방식 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 상세 내용 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            상세 내용 <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={program.description}
                            onChange={(e) => updateProgram(program.id, 'description', e.target.value)}
                            disabled={readonly}
                            rows={4}
                            placeholder="무엇을 하는 곳인지 구체적인 설명을 작성하세요"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* 운영 방식 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            운영 방식
                          </label>
                          <textarea
                            value={program.operation}
                            onChange={(e) => updateProgram(program.id, 'operation', e.target.value)}
                            disabled={readonly}
                            rows={4}
                            placeholder="소요 시간, 동시 수용 인원, 필요 스태프 수 등"
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
                  <h2 className="text-xl font-bold text-gray-900">바이럴 트리거 기획</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    방문객이 휴대폰을 꺼내 사진을 찍고 공유하게 만드는 '확산 장치'를 설계합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 인증샷 스팟 */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">인증샷 스팟 (Photo Zone)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        비주얼 컨셉
                      </label>
                      <textarea
                        value={photoZone.visualConcept}
                        onChange={(e) => setPhotoZone({ ...photoZone, visualConcept: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder="포토존의 형태나 연출 의도 묘사"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        촬영 동기
                      </label>
                      <textarea
                        value={photoZone.why}
                        onChange={(e) => setPhotoZone({ ...photoZone, why: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder="예: 예뻐서, 웃겨서, 자랑하고 싶어서"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 이벤트 메커니즘 */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">이벤트 메커니즘 (Viral Event)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        미션
                      </label>
                      <textarea
                        value={viralEvent.mission}
                        onChange={(e) => setViralEvent({ ...viralEvent, mission: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder="인스타그램 스토리 업로드, 해시태그 달기 등 방문객이 수행할 미션"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        리워드
                      </label>
                      <textarea
                        value={viralEvent.reward}
                        onChange={(e) => setViralEvent({ ...viralEvent, reward: e.target.value })}
                        disabled={readonly}
                        rows={4}
                        placeholder="미션 수행 시 제공할 혜택 (굿즈, 할인쿠폰, 히든 스테이지 입장권 등)"
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
                  <h2 className="text-xl font-bold text-gray-900">AI 아이데이션 스튜디오</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    기획 아이디어가 막힐 때 AI의 창의성을 빌려 이색 프로그램을 추천받고 다듬는 공간입니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 프롬프트 생성 및 결과 에디터 좌우 배치 */}
                <div>
                  {/* 입력 정보 선택 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      AI 프롬프트
                    </label>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        선택 요소
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
                          <span className="text-sm text-gray-700">2회차 타겟 페르소나</span>
                          {week2Persona && (
                            <span className="text-xs text-gray-500">(데이터 있음)</span>
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
                          <span className="text-sm text-gray-700">5회차 테마 키워드</span>
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
                          AI 프롬프트
                        </label>
                      </div>
                      <textarea
                        value={aiIdeation.prompt}
                        onChange={(e) => setAiIdeation({ ...aiIdeation, prompt: e.target.value })}
                        disabled={readonly}
                        rows={10}
                        placeholder="프롬프트 생성 버튼을 클릭하면 자동으로 생성됩니다. 필요시 수정할 수 있습니다."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed font-mono flex-1"
                      />
                    </div>

                    {/* 결과 에디터 */}
                    <div className="flex flex-col h-full">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          결과 에디터
                        </label>
                      </div>
                      <textarea
                        value={aiIdeation.result}
                        onChange={(e) => setAiIdeation({ ...aiIdeation, result: e.target.value })}
                        disabled={readonly}
                        rows={10}
                        placeholder="AI 제안 아이디어를 붙여넣거나 직접 작성하세요..."
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
                      프롬프트 생성
                    </button>
                    <button
                      type="button"
                      onClick={copyAIPrompt}
                      disabled={readonly || !aiIdeation.prompt}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      프롬프트 복사
                    </button>
                    <p className="text-xs text-gray-500 ml-2">
                      생성된 프롬프트를 복사하여 ChatGPT 등 AI 도구에 입력하세요.
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

