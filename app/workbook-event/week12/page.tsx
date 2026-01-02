'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Target,
  Award,
  TrendingUp,
  CheckCircle2,
  Plus,
  X,
  Image as ImageIcon,
  Info,
} from 'lucide-react'
import { Toast } from '@/components/Toast'
import { useWorkbookStorage } from '@/hooks/useWorkbookStorage'
import { useWorkbookNavigation } from '@/hooks/useWorkbookNavigation'
import { useProjectSettings } from '@/hooks/useProjectSettings'
import { useProjectSummary, SummaryType } from '@/hooks/useProjectSummary'
import { WorkbookHeader } from '@/components/workbook/WorkbookHeader'
import { WorkbookFooter } from '@/components/workbook/WorkbookFooter'
import { WorkbookNavigation } from '@/components/workbook/WorkbookNavigation'
import { ProjectSettingsModal } from '@/components/workbook/ProjectSettingsModal'
import { ProjectSummaryModal } from '@/components/workbook/ProjectSummaryModal'
import { WorkbookStatusBar } from '@/components/WorkbookStatusBar'
import { useProjectAccess } from '@/hooks/useProjectAccess'

export const dynamic = 'force-dynamic'

interface USP {
  keyword: string // 차별점 키워드
  description: string // 구체적인 근거와 설명
  imageUrl: string // 증명 이미지 URL (10회차 조감도나 9회차 키비주얼)
}

interface Benefit {
  functional: string[] // 기능적 혜택
  emotional: string[] // 정서적 혜택
}

interface SuccessMetrics {
  goalScenario: string // Goal 달성 시나리오
  rippleEffect: string // 파급 효과
  lastPitching: string // 최종 설득 문장
}

interface EventWeek12Data {
  usps: USP[] // 핵심 소구 포인트 (최대 3개)
  benefits: Benefit
  successMetrics: SuccessMetrics
  is_submitted?: boolean
}

function EventWeek12PageContent() {
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
  const [summaryType, setSummaryType] = useState<SummaryType>('proposal')

  // 참고 데이터
  const [week2Personas, setWeek2Personas] = useState<Array<{ name: string; profile: any }>>([])
  const [week3Data, setWeek3Data] = useState<any>(null)
  const [week5Data, setWeek5Data] = useState<any>(null)
  const [week7Data, setWeek7Data] = useState<any>(null)
  const [week9Assets, setWeek9Assets] = useState<Array<{ type: string; imageUrl: string }>>([])
  const [week10Zones, setWeek10Zones] = useState<any[]>([])
  const [week4KPI, setWeek4KPI] = useState<any>(null)

  // 핵심 소구 포인트 (최대 3개)
  const [usps, setUsps] = useState<USP[]>([
    { keyword: '', description: '', imageUrl: '' },
    { keyword: '', description: '', imageUrl: '' },
    { keyword: '', description: '', imageUrl: '' },
  ])

  // 타겟별 혜택
  const [benefits, setBenefits] = useState<Benefit>({
    functional: [],
    emotional: [],
  })

  // 성공 시뮬레이션
  const [successMetrics, setSuccessMetrics] = useState<SuccessMetrics>({
    goalScenario: '',
    rippleEffect: '',
    lastPitching: '',
  })

  // 기능적 혜택 추가
  const addFunctionalBenefit = () => {
    setBenefits({
      ...benefits,
      functional: [...benefits.functional, ''],
    })
  }

  // 기능적 혜택 삭제
  const removeFunctionalBenefit = (index: number) => {
    setBenefits({
      ...benefits,
      functional: benefits.functional.filter((_, i) => i !== index),
    })
  }

  // 기능적 혜택 업데이트
  const updateFunctionalBenefit = (index: number, value: string) => {
    const newFunctional = [...benefits.functional]
    newFunctional[index] = value
    setBenefits({ ...benefits, functional: newFunctional })
  }

  // 정서적 혜택 추가
  const addEmotionalBenefit = () => {
    setBenefits({
      ...benefits,
      emotional: [...benefits.emotional, ''],
    })
  }

  // 정서적 혜택 삭제
  const removeEmotionalBenefit = (index: number) => {
    setBenefits({
      ...benefits,
      emotional: benefits.emotional.filter((_, i) => i !== index),
    })
  }

  // 정서적 혜택 업데이트
  const updateEmotionalBenefit = (index: number, value: string) => {
    const newEmotional = [...benefits.emotional]
    newEmotional[index] = value
    setBenefits({ ...benefits, emotional: newEmotional })
  }

  // USP 업데이트
  const updateUSP = (index: number, field: keyof USP, value: string) => {
    const newUsps = [...usps]
    newUsps[index] = { ...newUsps[index], [field]: value }
    setUsps(newUsps)
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // USP (최소 1개)
    total += 1
    if (usps.some((usp) => usp.keyword.trim() && usp.description.trim())) filled += 1

    // 혜택 (최소 1개)
    total += 2
    if (benefits.functional.length > 0) filled += 1
    if (benefits.emotional.length > 0) filled += 1

    // 성공 시뮬레이션
    total += 2
    if (successMetrics.goalScenario.trim()) filled += 1
    if (successMetrics.lastPitching.trim()) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(12 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      total += 1
      if (data.usps?.some((usp: any) => usp.keyword?.trim() && usp.description?.trim())) {
        filled += 1
      }

      total += 2
      if (data.benefits?.functional?.length > 0) filled += 1
      if (data.benefits?.emotional?.length > 0) filled += 1

      total += 2
      if (data.successMetrics?.goalScenario?.trim()) filled += 1
      if (data.successMetrics?.lastPitching?.trim()) filled += 1

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

    const eventData: EventWeek12Data = {
      usps,
      benefits,
      successMetrics,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(12, eventData, progress)

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

    const eventData: EventWeek12Data = {
      usps,
      benefits,
      successMetrics,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(12, eventData, newSubmittedState, progress)

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

    setUsps([
      { keyword: '', description: '', imageUrl: '' },
      { keyword: '', description: '', imageUrl: '' },
      { keyword: '', description: '', imageUrl: '' },
    ])
    setBenefits({
      functional: [],
      emotional: [],
    })
    setSuccessMetrics({
      goalScenario: '',
      rippleEffect: '',
      lastPitching: '',
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

    // 기본값은 proposal로 설정
    const summary = await generateSummary(projectId, projectInfo?.title || null, summaryType)
    if (summary) {
      setSummaryPrompt(summary)
      setShowProjectSummary(true)
    } else {
      setToastMessage('워크북 데이터가 없습니다.')
      setToastVisible(true)
    }
  }

  // 요약 타입 변경 핸들러
  const handleSummaryTypeChange = async (type: SummaryType) => {
    setSummaryType(type)
    if (type === 'proposal-create') {
      // 추후 적용: AI API 연동
      return
    }
    
    if (projectId) {
      const summary = await generateSummary(projectId, projectInfo?.title || null, type)
      if (summary) {
        setSummaryPrompt(summary)
      }
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

  // 참고 데이터 로드
  useEffect(() => {
    const loadReferenceData = async () => {
      if (!projectId) return

      try {
        // 2회차: 페르소나
        const week2Data = await loadStepData(2)
        if (week2Data && (week2Data as any).personas) {
          setWeek2Personas((week2Data as any).personas || [])
        }

        // 3회차: 경쟁사 약점
        const week3Data = await loadStepData(3)
        if (week3Data) {
          setWeek3Data(week3Data)
        }

        // 5회차: 세계관
        const week5Data = await loadStepData(5)
        if (week5Data) {
          setWeek5Data(week5Data)
        }

        // 7회차: 킬러 콘텐츠
        const week7Data = await loadStepData(7)
        if (week7Data) {
          setWeek7Data(week7Data)
        }

        // 9회차: 키비주얼 에셋
        const week9Data = await loadStepData(9)
        if (week9Data && (week9Data as any).assets) {
          setWeek9Assets(
            ((week9Data as any).assets || []).filter((a: any) => a.imageUrl && a.imageUrl.trim())
          )
        }

        // 10회차: 공간 연출
        const week10Data = await loadStepData(10)
        if (week10Data && (week10Data as any).zones) {
          setWeek10Zones((week10Data as any).zones || [])
        }

        // 4회차: KPI
        const week4Data = await loadStepData(4)
        if (week4Data && (week4Data as any).kpi) {
          setWeek4KPI((week4Data as any).kpi)
        }
      } catch (error) {
        console.error('참고 데이터 로드 오류:', error)
      }
    }

    loadReferenceData()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(12)
      if (data) {
        const eventData = data as EventWeek12Data
        if (eventData.usps) {
          setUsps(eventData.usps)
        }
        if (eventData.benefits) {
          setBenefits(eventData.benefits)
        }
        if (eventData.successMetrics) {
          setSuccessMetrics(eventData.successMetrics)
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
          filter: `project_id=eq.${projectId}&step_number=eq.12`,
        },
        async () => {
          const data = await loadStepData(12)
          if (data) {
            const eventData = data as EventWeek12Data
            if (eventData.usps) {
              setUsps(eventData.usps)
            }
            if (eventData.benefits) {
              setBenefits(eventData.benefits)
            }
            if (eventData.successMetrics) {
              setSuccessMetrics(eventData.successMetrics)
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
      9: 'Phase 3 - 행사 브랜딩 기획',
      10: 'Phase 3 - 공간 연출 기획',
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

  // 완료 여부 확인
  const isCompleted = useMemo(() => {
    const hasUSP = usps.some((usp) => usp.keyword.trim() && usp.description.trim())
    const hasFunctionalBenefit = benefits.functional.length > 0
    const hasEmotionalBenefit = benefits.emotional.length > 0
    const hasGoalScenario = successMetrics.goalScenario.trim()
    const hasLastPitching = successMetrics.lastPitching.trim()
    return hasUSP && hasFunctionalBenefit && hasEmotionalBenefit && hasGoalScenario && hasLastPitching
  }, [usps, benefits, successMetrics])

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
        title="Phase 3: Prototype - 12회: 최종 제안 및 소구 포인트 도출"
        description="1~11회차의 기획 내용을 바탕으로, 이 행사가 고객에게 어떤 가치를 주는지와 왜 성공할 수밖에 없는지를 정리하여 최종 제안서를 완성합니다."
        phase="Phase 3: Prototype"
        isScrolled={isScrolled}
        currentWeek={12}
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
          currentWeek={12}
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
          onTypeChange={handleSummaryTypeChange}
          summaryType={summaryType}
          projectType={projectInfo?.type || null}
        />

        <main className="flex-1 pb-16">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* 참고 정보 - 2회차와 동일한 톤앤매너 */}
            {(week3Data || week5Data || (week7Data && week7Data.programs) || week10Zones.length > 0) && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 bg-gray-600 text-white text-xs font-medium rounded">
                      참고
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-600" />
                      이전 회차 참고 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 3회차: 경쟁사 약점 */}
                      {week3Data && (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">3회차: 경쟁사 약점</p>
                          {week3Data.swot?.weakness && (
                            <p className="text-xs text-gray-600 mb-1">{week3Data.swot.weakness}</p>
                          )}
                          {week3Data.swot?.opportunity && (
                            <p className="text-xs text-indigo-600">기회: {week3Data.swot.opportunity}</p>
                          )}
                        </div>
                      )}

                      {/* 5회차: 세계관 */}
                      {week5Data && (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">5회차: 세계관</p>
                          {week5Data.themeKeywords && week5Data.themeKeywords.length > 0 && (
                            <p className="text-xs text-gray-600 mb-1">
                              키워드: {week5Data.themeKeywords.join(', ')}
                            </p>
                          )}
                          {week5Data.universe?.concept && (
                            <p className="text-xs text-gray-600">{week5Data.universe.concept}</p>
                          )}
                        </div>
                      )}

                      {/* 7회차: 킬러 콘텐츠 */}
                      {week7Data && week7Data.programs && week7Data.programs.length > 0 && (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">7회차: 킬러 콘텐츠</p>
                          <p className="text-xs text-gray-600 mb-1">
                            {week7Data.programs.length}개 프로그램
                          </p>
                          {week7Data.programs.slice(0, 2).map((prog: any, idx: number) => (
                            <p key={idx} className="text-xs text-gray-600">
                              • {prog.name}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* 10회차: 공간 연출 */}
                      {week10Zones.length > 0 && (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">10회차: 공간 연출</p>
                          <p className="text-xs text-gray-600 mb-1">
                            {week10Zones.length}개 구역
                          </p>
                          {week10Zones.slice(0, 2).map((zone: any, idx: number) => (
                            <p key={idx} className="text-xs text-gray-600">
                              • {zone.zoneName} {zone.zoneLabel ? `(${zone.zoneLabel})` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 핵심 소구 포인트 추출 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">핵심 소구 포인트 추출</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    우리 행사만의 차별화된 강점(USP) 3가지를 선정하여 강력한 한 방을 만듭니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {usps.map((usp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                        USP {index + 1}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Keyword
                        </label>
                        <input
                          type="text"
                          value={usp.keyword}
                          onChange={(e) => updateUSP(index, 'keyword', e.target.value)}
                          disabled={readonly}
                          placeholder="예: 국내 최초, 압도적 몰입감"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={usp.description}
                          onChange={(e) => updateUSP(index, 'description', e.target.value)}
                          disabled={readonly}
                          rows={4}
                          placeholder="구체적인 근거와 설명을 입력하세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 타겟별 혜택 정의 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">타겟별 혜택 정의</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    방문객이 행사를 통해 얻어갈 수 있는 실질적/정서적 이득을 정의하여 설득 논리를 강화합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 기능적 혜택 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Functional Benefit (기능적 혜택)
                    </label>
                    <button
                      type="button"
                      onClick={addFunctionalBenefit}
                      disabled={readonly}
                      className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {benefits.functional.length === 0 ? (
                      <p className="text-xs text-gray-500 py-4 text-center">
                        기능적 혜택을 추가해주세요
                      </p>
                    ) : (
                      benefits.functional.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={benefit}
                            onChange={(e) => updateFunctionalBenefit(index, e.target.value)}
                            disabled={readonly}
                            placeholder="예: 한정판 굿즈 득템, 저렴한 구매 기회"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => removeFunctionalBenefit(index)}
                            disabled={readonly}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 정서적 혜택 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Emotional Benefit (정서적 혜택)
                    </label>
                    <button
                      type="button"
                      onClick={addEmotionalBenefit}
                      disabled={readonly}
                      className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {benefits.emotional.length === 0 ? (
                      <p className="text-xs text-gray-500 py-4 text-center">
                        정서적 혜택을 추가해주세요
                      </p>
                    ) : (
                      benefits.emotional.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={benefit}
                            onChange={(e) => updateEmotionalBenefit(index, e.target.value)}
                            disabled={readonly}
                            placeholder="예: 트렌드세터가 된 기분, 해방감, 유대감"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => removeEmotionalBenefit(index)}
                            disabled={readonly}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 성공 시뮬레이션 및 기대 효과 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">성공 시뮬레이션 및 기대 효과</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    이 행사가 계획대로 실행되었을 때 얻을 수 있는 정량적/정성적 성과를 최종적으로 정리합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 4회차 KPI 재확인 */}
                {week4KPI && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-xs font-semibold text-indigo-900 mb-2">4회차 KPI 목표</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {week4KPI.targetVisitors && (
                        <div>
                          <span className="text-xs text-indigo-700">목표 방문객: </span>
                          <span className="text-sm font-semibold text-indigo-900">
                            {week4KPI.targetVisitors}명
                          </span>
                        </div>
                      )}
                      {week4KPI.targetRevenue && (
                        <div>
                          <span className="text-xs text-indigo-700">목표 매출: </span>
                          <span className="text-sm font-semibold text-indigo-900">
                            {week4KPI.targetRevenue}만원
                          </span>
                        </div>
                      )}
                      {week4KPI.targetViral && (
                        <div>
                          <span className="text-xs text-indigo-700">바이럴 목표: </span>
                          <span className="text-sm font-semibold text-indigo-900">
                            {week4KPI.targetViral}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Goal 달성 시나리오 / 파급 효과 - 양쪽으로 나란히 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Goal 달성 시나리오 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goal 달성 시나리오
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      4회차 KPI 목표를 달성하기 위한 구체적인 시나리오와 마케팅 플랜의 효과를 설명하세요.
                    </p>
                    <textarea
                      value={successMetrics.goalScenario}
                      onChange={(e) =>
                        setSuccessMetrics({ ...successMetrics, goalScenario: e.target.value })
                      }
                      disabled={readonly}
                      rows={6}
                      placeholder="마케팅 플랜(11회차)이 작동했을 때 달성 가능한 수치인지 재확인 및 확정"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* 파급 효과 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      파급 효과 (Ripple Effect)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      행사가 끝난 후 브랜드나 지역 사회에 남게 될 장기적인 가치를 기술하세요.
                    </p>
                    <textarea
                      value={successMetrics.rippleEffect}
                      onChange={(e) =>
                        setSuccessMetrics({ ...successMetrics, rippleEffect: e.target.value })
                      }
                      disabled={readonly}
                      rows={6}
                      placeholder="행사가 끝난 후 브랜드나 지역 사회에 남게 될 장기적인 가치 기술"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Last Pitching - 컬러 강조 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Pitching (최종 설득)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    투자자나 의사결정권자에게 던지는 마지막 한 문장을 작성하세요.
                  </p>
                  <textarea
                    value={successMetrics.lastPitching}
                    onChange={(e) =>
                      setSuccessMetrics({ ...successMetrics, lastPitching: e.target.value })
                    }
                    disabled={readonly}
                    rows={3}
                    placeholder="투자자나 의사결정권자에게 던지는 마지막 한 문장"
                    className="w-full px-4 py-3 border-2 border-indigo-400 bg-indigo-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 완료 배지 - 제출 시에만 표시 */}
            {isSubmitted && (
              <div className="mb-8 p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                <div className="flex items-center justify-center gap-4">
                  <Award className="w-12 h-12 text-white" />
                  <div className="text-center">
                    <p className="text-xl font-bold text-white mb-1">
                      당신의 기획은 세상을 설레게 할 준비가 되었습니다
                    </p>
                    <p className="text-indigo-100 text-sm">12회차 워크북 완료</p>
                  </div>
                </div>
              </div>
            )}

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

export default function EventWeek12Page() {
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
      <EventWeek12PageContent />
    </Suspense>
  )
}

