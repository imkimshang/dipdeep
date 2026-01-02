'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Sparkles,
  BookOpen,
  Share2,
  X,
  Plus,
  Info,
  Target,
  Heart,
  Zap,
  Lightbulb,
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

// 테마 키워드 풀
const THEME_KEYWORDS = [
  '힙한',
  '미래지향적',
  '레트로',
  '몽환적',
  '친환경적인',
  '럭셔리한',
  '아늑한',
  '활기찬',
  '신비로운',
  '모던한',
  '빈티지',
  '미니멀',
  '컬러풀',
  '우아한',
  '과감한',
  '감성적인',
  '기타',
]

// 타겟 감정 옵션
const TARGET_EMOTIONS = [
  '호기심',
  '긴박함',
  '소속감',
  '기대감',
  '관심',
  'FOMO (놓칠 수 없다는 불안)',
  '열광',
  '기타',
]

interface EventWeek5Data {
  themeKeywords: string[] // 테마 키워드
  customKeyword: string // 직접 입력한 키워드
  universe: {
    concept: string // 컨셉 정의
    portal: string // 입구 연출
    journey: string // 여정/경험 흐름
    character: string // 캐릭터/오브제
  }
  viralTeasing: {
    targetEmotion: string[] // 타겟 감정
    customEmotion: string // 기타 감정
    phase1: string // Phase 1: 의문/호기심
    phase2: string // Phase 2: 단서/공개
    phase3: string // Phase 3: 확신/행동
  }
  is_submitted?: boolean
}

function EventWeek5PageContent() {
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


  // 테마 키워드
  const [themeKeywords, setThemeKeywords] = useState<string[]>([])
  const [customKeyword, setCustomKeyword] = useState('')

  // 세계관 빌더
  const [universe, setUniverse] = useState({
    concept: '',
    portal: '',
    journey: '',
    character: '',
  })

  // 바이럴 티징
  const [viralTeasing, setViralTeasing] = useState({
    targetEmotion: [] as string[],
    customEmotion: '',
    phase1: '',
    phase2: '',
    phase3: '',
  })

  // 테마 키워드 토글
  const toggleThemeKeyword = (keyword: string) => {
    if (keyword === '기타') {
      if (themeKeywords.includes('기타')) {
        setThemeKeywords(themeKeywords.filter((k) => k !== '기타'))
        setCustomKeyword('')
      } else {
        setThemeKeywords([...themeKeywords, '기타'])
      }
    } else {
      if (themeKeywords.includes(keyword)) {
        setThemeKeywords(themeKeywords.filter((k) => k !== keyword))
      } else {
        // 최대 5개까지 선택
        if (themeKeywords.length < 5) {
          setThemeKeywords([...themeKeywords, keyword])
        }
      }
    }
  }

  // 커스텀 키워드 추가
  const addCustomKeyword = () => {
    const trimmed = customKeyword.trim()
    if (trimmed && !themeKeywords.includes(trimmed)) {
      setThemeKeywords([...themeKeywords.filter((k) => k !== '기타'), trimmed])
      setCustomKeyword('')
    }
  }

  // 타겟 감정 토글
  const toggleTargetEmotion = (emotion: string) => {
    if (emotion === '기타') {
      if (viralTeasing.targetEmotion.includes('기타')) {
        setViralTeasing({
          ...viralTeasing,
          targetEmotion: viralTeasing.targetEmotion.filter((e) => e !== '기타'),
          customEmotion: '',
        })
      } else {
        setViralTeasing({
          ...viralTeasing,
          targetEmotion: [...viralTeasing.targetEmotion, '기타'],
        })
      }
    } else {
      if (viralTeasing.targetEmotion.includes(emotion)) {
        setViralTeasing({
          ...viralTeasing,
          targetEmotion: viralTeasing.targetEmotion.filter((e) => e !== emotion),
        })
      } else {
        setViralTeasing({
          ...viralTeasing,
          targetEmotion: [...viralTeasing.targetEmotion, emotion],
        })
      }
    }
  }


  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 테마 키워드
    total += 1
    if (themeKeywords.length >= 3) filled += 1

    // 세계관 빌더
    total += 4
    if (universe.concept.trim()) filled += 1
    if (universe.portal.trim()) filled += 1
    if (universe.journey.trim()) filled += 1
    if (universe.character.trim()) filled += 1

    // 바이럴 티징
    total += 4
    if (viralTeasing.targetEmotion.length > 0 || viralTeasing.customEmotion.trim()) filled += 1
    if (viralTeasing.phase1.trim()) filled += 1
    if (viralTeasing.phase2.trim()) filled += 1
    if (viralTeasing.phase3.trim()) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(5 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.themeKeywords && Array.isArray(data.themeKeywords)) {
        total += 1
        if (data.themeKeywords.length >= 3) filled += 1
      } else {
        total += 1
      }

      if (data.universe) {
        total += 4
        if (data.universe.concept?.trim()) filled += 1
        if (data.universe.portal?.trim()) filled += 1
        if (data.universe.journey?.trim()) filled += 1
        if (data.universe.character?.trim()) filled += 1
      } else {
        total += 4
      }

      if (data.viralTeasing) {
        total += 4
        if (
          (data.viralTeasing.targetEmotion &&
            Array.isArray(data.viralTeasing.targetEmotion) &&
            data.viralTeasing.targetEmotion.length > 0) ||
          data.viralTeasing.customEmotion?.trim()
        )
          filled += 1
        if (data.viralTeasing.phase1?.trim()) filled += 1
        if (data.viralTeasing.phase2?.trim()) filled += 1
        if (data.viralTeasing.phase3?.trim()) filled += 1
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

    const eventData: EventWeek5Data = {
      themeKeywords,
      customKeyword: themeKeywords.filter((k) => !THEME_KEYWORDS.includes(k)).join(', '),
      universe,
      viralTeasing,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(5, eventData, progress)

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

    const eventData: EventWeek5Data = {
      themeKeywords,
      customKeyword: themeKeywords.filter((k) => !THEME_KEYWORDS.includes(k)).join(', '),
      universe,
      viralTeasing,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(5, eventData, newSubmittedState, progress)

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

    setThemeKeywords([])
    setCustomKeyword('')
    setUniverse({
      concept: '',
      portal: '',
      journey: '',
      character: '',
    })
    setViralTeasing({
      targetEmotion: [],
      customEmotion: '',
      phase1: '',
      phase2: '',
      phase3: '',
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


  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(5)
      if (data) {
        const eventData = data as EventWeek5Data
        if (eventData.themeKeywords && Array.isArray(eventData.themeKeywords)) {
          setThemeKeywords(eventData.themeKeywords)
        }
        if (eventData.customKeyword) {
          setCustomKeyword(eventData.customKeyword)
        }
        if (eventData.universe) {
          setUniverse(eventData.universe)
        }
        if (eventData.viralTeasing) {
          setViralTeasing(eventData.viralTeasing)
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
          filter: `project_id=eq.${projectId}&step_number=eq.5`,
        },
        async () => {
          const data = await loadStepData(5)
          if (data) {
            const eventData = data as EventWeek5Data
            if (eventData.themeKeywords && Array.isArray(eventData.themeKeywords)) {
              setThemeKeywords(eventData.themeKeywords)
            }
            if (eventData.customKeyword) {
              setCustomKeyword(eventData.customKeyword)
            }
            if (eventData.universe) {
              setUniverse(eventData.universe)
            }
            if (eventData.viralTeasing) {
              setViralTeasing(eventData.viralTeasing)
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
        title="Phase 2: Insight - 5회: 세계관 및 스토리텔링"
        description="행사를 관통하는 독창적인 테마와 세계관을 구축하고, 방문 전부터 고객의 호기심을 자극할 바이럴 스토리라인을 설계합니다."
        phase="Phase 2: Insight"
        isScrolled={isScrolled}
        currentWeek={5}
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
          currentWeek={5}
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
            {/* 테마 키워드 셀렉터 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">테마 키워드 셀렉터</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    행사의 전반적인 분위기와 감성을 결정하는 핵심 형용사를 선정합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    테마 키워드 <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(3~5개 권장)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {THEME_KEYWORDS.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => toggleThemeKeyword(keyword)}
                        disabled={readonly || (keyword !== '기타' && themeKeywords.length >= 5 && !themeKeywords.includes(keyword))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          themeKeywords.includes(keyword)
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>

                  {themeKeywords.includes('기타') && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customKeyword}
                        onChange={(e) => setCustomKeyword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addCustomKeyword()
                          }
                        }}
                        disabled={readonly}
                        placeholder="직접 키워드를 입력하세요"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={addCustomKeyword}
                        disabled={readonly || !customKeyword.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        추가
                      </button>
                    </div>
                  )}

                  {/* 선택된 키워드 표시 */}
                  {themeKeywords.length > 0 && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {themeKeywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                          >
                            {keyword}
                            {!readonly && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (keyword === '기타') {
                                    setThemeKeywords(themeKeywords.filter((k) => k !== '기타'))
                                    setCustomKeyword('')
                                  } else {
                                    setThemeKeywords(themeKeywords.filter((k) => k !== keyword))
                                  }
                                }}
                                className="text-indigo-700 hover:text-indigo-900"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 세계관 빌더 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">세계관 빌더</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    방문객이 행사장에 들어서는 순간 경험하게 될 가상의 설정이나 컨셉을 구체적인 서사로 작성합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 컨셉 정의 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    컨셉 정의 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={universe.concept}
                    onChange={(e) => setUniverse({ ...universe, concept: e.target.value })}
                    disabled={readonly}
                    placeholder="예: 이곳은 단순한 팝업스토어가 아니라, 2030년 서울의 라이프스타일을 선보이는 미래 전시관입니다."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 공간 스토리텔링 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">공간 스토리텔링</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 입구 (Portal) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        입구 (Portal)
                      </label>
                      <textarea
                        value={universe.portal}
                        onChange={(e) => setUniverse({ ...universe, portal: e.target.value })}
                        disabled={readonly}
                        rows={6}
                        placeholder="예: 어두운 터널을 통과하면 갑자기 밝은 네온사인이 반짝이는 미래 도시의 거리로 들어서게 됩니다..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* 여정 (Journey) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        여정 (Journey)
                      </label>
                      <textarea
                        value={universe.journey}
                        onChange={(e) => setUniverse({ ...universe, journey: e.target.value })}
                        disabled={readonly}
                        rows={6}
                        placeholder="예: 입장 후 첫 구역에서는 몽환적인 영상을 감상하며, 두 번째 구역에서는 인터랙티브 체험을 통해 직접 참여하게 됩니다..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* 캐릭터/오브제 설정 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        캐릭터/오브제 설정
                      </label>
                      <textarea
                        value={universe.character}
                        onChange={(e) => setUniverse({ ...universe, character: e.target.value })}
                        disabled={readonly}
                        rows={6}
                        placeholder="예: 반투명한 네온 큐브 오브제가 공간 곳곳에 배치되어 있으며, 이를 통해 방문객과 상호작용합니다..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 바이럴 티징 플래너 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Share2 className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">바이럴 티징 플래너</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    행사 개최 전, 잠재 방문객의 기대감을 증폭시키기 위해 SNS 등에 순차적으로 공개할 스토리텔링을 설계합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 타겟 감정 설정 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    타겟 감정 설정
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    티징 단계에서 고객이 느끼길 바라는 감정을 선택하세요.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_EMOTIONS.map((emotion) => (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => toggleTargetEmotion(emotion)}
                        disabled={readonly}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          viralTeasing.targetEmotion.includes(emotion)
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {emotion}
                      </button>
                    ))}
                  </div>
                  {viralTeasing.targetEmotion.includes('기타') && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={viralTeasing.customEmotion}
                        onChange={(e) =>
                          setViralTeasing({ ...viralTeasing, customEmotion: e.target.value })
                        }
                        disabled={readonly}
                        placeholder="기타 감정을 입력하세요"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>

                {/* 3단계 티징 시나리오 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">3단계 티징 시나리오</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Phase 1: 의문/호기심 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        Phase 1: 의문/호기심
                      </label>
                      <textarea
                        value={viralTeasing.phase1}
                        onChange={(e) => setViralTeasing({ ...viralTeasing, phase1: e.target.value })}
                        disabled={readonly}
                        rows={6}
                        placeholder="예: 검은 배경에 은은하게 빛나는 질문만 던지는 이미지 - '당신은 무엇을 찾고 있나요?'"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Phase 2: 단서/공개 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        Phase 2: 단서/공개
                      </label>
                      <textarea
                        value={viralTeasing.phase2}
                        onChange={(e) => setViralTeasing({ ...viralTeasing, phase2: e.target.value })}
                        disabled={readonly}
                        rows={6}
                        placeholder="예: 일부 비하인드 영상과 함께 '곧 만날 수 있습니다'라는 메시지, 주요 콘텐츠 라인업 일부 공개"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Phase 3: 확신/행동 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          3
                        </span>
                        Phase 3: 확신/행동
                      </label>
                      <textarea
                        value={viralTeasing.phase3}
                        onChange={(e) => setViralTeasing({ ...viralTeasing, phase3: e.target.value })}
                        disabled={readonly}
                        rows={6}
                        placeholder="예: 한정 수량 예매 오픈, 얼리버드 혜택, 인플루언서 체험 후기 공개 등으로 마지막 푸시"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
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

export default function EventWeek5Page() {
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
      <EventWeek5PageContent />
    </Suspense>
  )
}

