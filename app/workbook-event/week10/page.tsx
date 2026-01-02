'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Lightbulb,
  Layers,
  MapPin,
  FileText,
  Check,
  X,
  Image as ImageIcon,
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

// 조명 스타일 옵션
const LIGHTING_STYLES = [
  { id: 'daylight', label: '자연광 (Daylight)', imageUrl: '/images/lighting/daylight.jpg' },
  { id: 'neon_cyberpunk', label: '네온/사이버펑크', imageUrl: '/images/lighting/neon.jpg' },
  { id: 'spotlight', label: '핀조명 (Dark & Spotlight)', imageUrl: '/images/lighting/spotlight.jpg' },
  { id: 'warm_ambient', label: '따뜻한 앰비언트', imageUrl: '/images/lighting/ambient.jpg' },
  { id: 'colorful', label: '컬러풀 조명', imageUrl: '/images/lighting/colorful.jpg' },
  { id: 'minimal', label: '미니멀 조명', imageUrl: '/images/lighting/minimal.jpg' },
]

// 마감재 텍스처 옵션
const MATERIAL_TEXTURES = [
  { id: 'concrete', label: '노출 콘크리트', imageUrl: '/images/materials/concrete.jpg' },
  { id: 'wood', label: '우드/플랜테리어', imageUrl: '/images/materials/wood.jpg' },
  { id: 'metal', label: '메탈/미러', imageUrl: '/images/materials/metal.jpg' },
  { id: 'fabric', label: '패브릭/천막', imageUrl: '/images/materials/fabric.jpg' },
  { id: 'glass', label: '유리', imageUrl: '/images/materials/glass.jpg' },
  { id: 'vinyl', label: '비닐/라미네이트', imageUrl: '/images/materials/vinyl.jpg' },
]

// 공간감 키워드
const ATMOSPHERE_KEYWORDS = [
  '개방적인',
  '미로 같은',
  '아늑한',
  '압도적인',
  '신비로운',
  '활기찬',
  '차분한',
  '역동적인',
  '편안한',
  '긴장감 있는',
  '모던한',
  '빈티지한',
]

// 입구 스타일 옵션
const ENTRANCE_STYLES = [
  { id: 'gate', label: '게이트형', imageUrl: '/images/entrance/gate.jpg' },
  { id: 'tunnel', label: '터널형', imageUrl: '/images/entrance/tunnel.jpg' },
  { id: 'open', label: '오픈형', imageUrl: '/images/entrance/open.jpg' },
  { id: 'curtain', label: '커튼형', imageUrl: '/images/entrance/curtain.jpg' },
]

// 부스/집기 스타일 옵션
const BOOTH_STYLES = [
  { id: 'wooden', label: '목공 부스', imageUrl: '/images/booth/wooden.jpg' },
  { id: 'truss', label: '트러스 구조물', imageUrl: '/images/booth/truss.jpg' },
  { id: 'container', label: '팝업 컨테이너', imageUrl: '/images/booth/container.jpg' },
  { id: 'modular', label: '모듈러 구조', imageUrl: '/images/booth/modular.jpg' },
]

// 장식 요소 옵션
const DECORATION_ELEMENTS = [
  { id: 'balloon', label: '대형 풍선', imageUrl: '/images/decoration/balloon.jpg' },
  { id: 'flower', label: '플라워 월', imageUrl: '/images/decoration/flower.jpg' },
  { id: 'media', label: '미디어 아트', imageUrl: '/images/decoration/media.jpg' },
  { id: 'light', label: '조명 설치', imageUrl: '/images/decoration/light.jpg' },
  { id: 'art', label: '아트 설치물', imageUrl: '/images/decoration/art.jpg' },
  { id: 'signage', label: '사이니지', imageUrl: '/images/decoration/signage.jpg' },
]

// 시공/설치 제약사항 옵션
const CONSTRUCTION_CONSTRAINTS = [
  '전기 사용량',
  '급배수 시설 필요',
  '바닥 보양 필요',
  '반입구 사이즈 이슈',
  '층고 제한',
  '화기 사용 금지',
  '소음 제한',
  '천장 설치 불가',
  '바닥 드릴 금지',
  '벽면 설치 제한',
]

interface AtmosphereSetting {
  lighting: string[] // 조명 스타일 ID
  materials: string[] // 마감재 텍스처 ID
  keywords: string[] // 공간감 키워드
}

interface ZoneDirecting {
  zoneName: string // Zone A, B, C 등
  zoneLabel: string // 입구, 메인 스테이지 등
  entranceStyle: string[] // 입구 스타일 (해당 구역에만)
  boothStyle: string[] // 부스/집기 스타일
  decorationElements: string[] // 장식 요소
  experienceIntent: string // 방문객 경험 의도
  requiredItems: string // 필요 집기 리스트
}

interface SpaceBrief {
  constraints: string[] // 시공/설치 제약사항
  trafficFlow: string // 동선 계획 요약
}

interface EventWeek10Data {
  atmosphere: AtmosphereSetting
  zones: ZoneDirecting[]
  brief: SpaceBrief
  is_submitted?: boolean
}

function EventWeek10PageContent() {
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

  // 8회차 참고 정보 (조닝)
  const [week8Zones, setWeek8Zones] = useState<Array<{ zoneName: string; zoneLabel: string }>>([])
  // 6회차 참고 정보 (여정 지도)
  const [week6Journey, setWeek6Journey] = useState<string>('')

  // 전체 공간 무드 설정
  const [atmosphere, setAtmosphere] = useState<AtmosphereSetting>({
    lighting: [],
    materials: [],
    keywords: [],
  })

  // 구역별 연출
  const [zones, setZones] = useState<ZoneDirecting[]>([])

  // 공간 연출 정의서
  const [brief, setBrief] = useState<SpaceBrief>({
    constraints: [],
    trafficFlow: '',
  })

  // 8회차 구역 데이터로 zones 초기화
  useEffect(() => {
    if (week8Zones.length > 0 && zones.length === 0) {
      const initialZones = week8Zones.map((zone) => ({
        zoneName: zone.zoneName,
        zoneLabel: zone.zoneLabel || '',
        entranceStyle: [],
        boothStyle: [],
        decorationElements: [],
        experienceIntent: '',
        requiredItems: '',
      }))
      setZones(initialZones)
    }
  }, [week8Zones, zones.length])

  // 구역별 연출 업데이트
  const updateZone = (zoneName: string, field: keyof ZoneDirecting, value: any) => {
    setZones(zones.map((z) => (z.zoneName === zoneName ? { ...z, [field]: value } : z)))
  }

  // 구역별 스타일 토글
  const toggleZoneStyle = (
    zoneName: string,
    field: 'entranceStyle' | 'boothStyle' | 'decorationElements',
    styleId: string
  ) => {
    setZones(
      zones.map((zone) => {
        if (zone.zoneName === zoneName) {
          const currentStyles = zone[field] || []
          const newStyles = currentStyles.includes(styleId)
            ? currentStyles.filter((s) => s !== styleId)
            : [...currentStyles, styleId]
          return { ...zone, [field]: newStyles }
        }
        return zone
      })
    )
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 전체 공간 무드
    total += 2 // lighting, materials
    if (atmosphere.lighting.length > 0) filled += 1
    if (atmosphere.materials.length > 0) filled += 1

    // 구역별 연출 (최소 1개 구역)
    total += zones.length
    if (zones.length > 0) filled += zones.filter((z) => z.experienceIntent.trim()).length

    // 공간 연출 정의서
    total += 1 // trafficFlow
    if (brief.trafficFlow.trim()) filled += 1

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(10 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.atmosphere) {
        total += 2
        if (data.atmosphere.lighting?.length > 0) filled += 1
        if (data.atmosphere.materials?.length > 0) filled += 1
      } else {
        total += 2
      }

      if (data.zones && Array.isArray(data.zones)) {
        total += data.zones.length
        filled += data.zones.filter((z: any) => z.experienceIntent?.trim()).length
      }

      total += 1
      if (data.brief?.trafficFlow?.trim()) filled += 1

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

    const eventData: EventWeek10Data = {
      atmosphere,
      zones,
      brief,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(10, eventData, progress)

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

    const eventData: EventWeek10Data = {
      atmosphere,
      zones,
      brief,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(10, eventData, newSubmittedState, progress)

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

    setAtmosphere({
      lighting: [],
      materials: [],
      keywords: [],
    })
    setZones([])
    setBrief({
      constraints: [],
      trafficFlow: '',
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

  // 8회차 데이터 로드 (조닝)
  useEffect(() => {
    const loadWeek8Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(8)
        if (data && (data as any).zoning && (data as any).zoning.zones) {
          const zones = (data as any).zoning.zones.map((z: any) => ({
            zoneName: z.zoneName,
            zoneLabel: z.zoneLabel || '',
          }))
          setWeek8Zones(zones)
        }
      } catch (error) {
        console.error('8회차 데이터 로드 오류:', error)
      }
    }

    loadWeek8Data()
  }, [projectId, loadStepData])

  // 6회차 데이터 로드 (여정 지도)
  useEffect(() => {
    const loadWeek6Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(6)
        if (data && (data as any).journey && (data as any).journey.steps) {
          const steps = (data as any).journey.steps
          const journeySummary = steps
            .map((s: any, idx: number) => `${idx + 1}. ${s.label || ''}: ${s.action || ''}`)
            .join('\n')
          setWeek6Journey(journeySummary)
          if (!brief.trafficFlow && journeySummary) {
            setBrief({ ...brief, trafficFlow: journeySummary })
          }
        }
      } catch (error) {
        console.error('6회차 데이터 로드 오류:', error)
      }
    }

    loadWeek6Data()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(10)
      if (data) {
        const eventData = data as EventWeek10Data
        if (eventData.atmosphere) {
          setAtmosphere(eventData.atmosphere)
        }
        if (eventData.zones && eventData.zones.length > 0) {
          setZones(eventData.zones)
        }
        if (eventData.brief) {
          setBrief(eventData.brief)
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
          filter: `project_id=eq.${projectId}&step_number=eq.10`,
        },
        async () => {
          const data = await loadStepData(10)
          if (data) {
            const eventData = data as EventWeek10Data
            if (eventData.atmosphere) {
              setAtmosphere(eventData.atmosphere)
            }
            if (eventData.zones) {
              setZones(eventData.zones)
            }
            if (eventData.brief) {
              setBrief(eventData.brief)
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

  // 현재 선택된 구역 (탭)
  const [selectedZoneTab, setSelectedZoneTab] = useState<string>(
    zones.length > 0 ? zones[0].zoneName : ''
  )
  const currentZone = zones.find((z) => z.zoneName === selectedZoneTab)

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastMessage.includes('오류') ? 'error' : 'success'}
      />
      <WorkbookHeader
        title="Phase 3: Prototype - 10회: 공간 연출 기획"
        description="8회차에서 계획한 구역별 조닝을 바탕으로, 주요 공간의 연출 컨셉과 분위기를 시각적 레퍼런스로 정의합니다."
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
            {/* 8회차 조닝 참고 정보 */}
            {week8Zones.length === 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>8회차에서 공간 조닝을 먼저 설정해주세요.</span>
                </p>
              </div>
            )}

            {/* 전체 공간 무드 설정 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Lightbulb className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">전체 공간 무드 설정</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    행사장 전체를 관통하는 조명, 마감재, 분위기를 정의하여 통일된 공간감을 기획합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 조명 스타일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    조명 (Lighting) 스타일
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {LIGHTING_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          if (readonly) return
                          if (atmosphere.lighting.includes(style.id)) {
                            setAtmosphere({
                              ...atmosphere,
                              lighting: atmosphere.lighting.filter((s) => s !== style.id),
                            })
                          } else {
                            setAtmosphere({
                              ...atmosphere,
                              lighting: [...atmosphere.lighting, style.id],
                            })
                          }
                        }}
                        disabled={readonly}
                        className={`relative p-4 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          atmosphere.lighting.includes(style.id)
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-xs text-center text-gray-700">{style.label}</p>
                        {atmosphere.lighting.includes(style.id) && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 마감재 텍스처 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    마감재 (Material) 텍스처
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {MATERIAL_TEXTURES.map((material) => (
                      <button
                        key={material.id}
                        type="button"
                        onClick={() => {
                          if (readonly) return
                          if (atmosphere.materials.includes(material.id)) {
                            setAtmosphere({
                              ...atmosphere,
                              materials: atmosphere.materials.filter((m) => m !== material.id),
                            })
                          } else {
                            setAtmosphere({
                              ...atmosphere,
                              materials: [...atmosphere.materials, material.id],
                            })
                          }
                        }}
                        disabled={readonly}
                        className={`relative p-4 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          atmosphere.materials.includes(material.id)
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-xs text-center text-gray-700">{material.label}</p>
                        {atmosphere.materials.includes(material.id) && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 공간감 키워드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    공간감 키워드
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ATMOSPHERE_KEYWORDS.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => {
                          if (readonly) return
                          if (atmosphere.keywords.includes(keyword)) {
                            setAtmosphere({
                              ...atmosphere,
                              keywords: atmosphere.keywords.filter((k) => k !== keyword),
                            })
                          } else {
                            setAtmosphere({
                              ...atmosphere,
                              keywords: [...atmosphere.keywords, keyword],
                            })
                          }
                        }}
                        disabled={readonly}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          atmosphere.keywords.includes(keyword)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 구역별 연출 및 무드보드 */}
            {zones.length > 0 && (
              <div className="glass rounded-2xl shadow-lg p-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">구역별 연출 및 무드보드</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      8회차 조닝 맵의 주요 구역별로 구체적인 연출 의도와 레퍼런스를 매핑합니다.
                    </p>
                  </div>
                </div>

                {/* 구역 탭 */}
                <div className="flex gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
                  {zones.map((zone) => (
                    <button
                      key={zone.zoneName}
                      type="button"
                      onClick={() => setSelectedZoneTab(zone.zoneName)}
                      disabled={readonly}
                      className={`px-4 py-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                        selectedZoneTab === zone.zoneName
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {zone.zoneName} {zone.zoneLabel && `(${zone.zoneLabel})`}
                    </button>
                  ))}
                </div>

                {/* 선택된 구역의 연출 설정 */}
                {currentZone && (
                  <div className="space-y-6">
                    {/* 입구 스타일 (첫 번째 구역인 경우만 표시) */}
                    {zones.indexOf(currentZone) === 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          입구 스타일
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {ENTRANCE_STYLES.map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => toggleZoneStyle(currentZone.zoneName, 'entranceStyle', style.id)}
                              disabled={readonly}
                              className={`relative p-3 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                currentZone.entranceStyle.includes(style.id)
                                  ? 'border-indigo-600 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                              <p className="text-xs text-center text-gray-700">{style.label}</p>
                              {currentZone.entranceStyle.includes(style.id) && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 부스/집기 스타일 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        부스/집기 스타일
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {BOOTH_STYLES.map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => toggleZoneStyle(currentZone.zoneName, 'boothStyle', style.id)}
                            disabled={readonly}
                            className={`relative p-3 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentZone.boothStyle.includes(style.id)
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-xs text-center text-gray-700">{style.label}</p>
                            {currentZone.boothStyle.includes(style.id) && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 장식 요소 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        장식 요소
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {DECORATION_ELEMENTS.map((element) => (
                          <button
                            key={element.id}
                            type="button"
                            onClick={() => toggleZoneStyle(currentZone.zoneName, 'decorationElements', element.id)}
                            disabled={readonly}
                            className={`relative p-3 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentZone.decorationElements.includes(element.id)
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-xs text-center text-gray-700">{element.label}</p>
                            {currentZone.decorationElements.includes(element.id) && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 연출 의도 메모 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          방문객 경험 (연출 의도)
                        </label>
                        <textarea
                          value={currentZone.experienceIntent}
                          onChange={(e) => updateZone(currentZone.zoneName, 'experienceIntent', e.target.value)}
                          disabled={readonly}
                          rows={4}
                          placeholder="예: 입구에서는 궁금증을 유발하기 위해 내부가 보이지 않는 터널 형태를 사용함"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          필요 집기
                        </label>
                        <textarea
                          value={currentZone.requiredItems}
                          onChange={(e) => updateZone(currentZone.zoneName, 'requiredItems', e.target.value)}
                          disabled={readonly}
                          rows={4}
                          placeholder="예: 테이블 5개, 의자 20개, 전시대 3개"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 공간 연출 정의서 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">공간 연출 정의서</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    공간 디자이너나 시공 업체에게 전달할 수 있는 수준의 요구사항 정의서입니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 시공/설치 제약사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    시공/설치 제약사항
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CONSTRUCTION_CONSTRAINTS.map((constraint) => (
                      <label
                        key={constraint}
                        className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={brief.constraints.includes(constraint)}
                          onChange={(e) => {
                            if (readonly) return
                            if (e.target.checked) {
                              setBrief({
                                ...brief,
                                constraints: [...brief.constraints, constraint],
                              })
                            } else {
                              setBrief({
                                ...brief,
                                constraints: brief.constraints.filter((c) => c !== constraint),
                              })
                            }
                          }}
                          disabled={readonly}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-700">{constraint}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 동선 계획 요약 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    동선 계획 요약
                  </label>
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 flex items-start gap-2">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>6회차 여정 지도에서 자동으로 불러옵니다. 필요시 수정할 수 있습니다.</span>
                    </p>
                  </div>
                  <textarea
                    value={brief.trafficFlow}
                    onChange={(e) => setBrief({ ...brief, trafficFlow: e.target.value })}
                    disabled={readonly}
                    rows={6}
                    placeholder="방문객의 관람 방향과 동선을 설명하세요 (예: 일방통행/자유관람)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 최종 무드보드 뷰 */}
                {(atmosphere.lighting.length > 0 ||
                  atmosphere.materials.length > 0 ||
                  zones.some((z) => z.entranceStyle.length > 0 || z.boothStyle.length > 0 || z.decorationElements.length > 0)) && (
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      공간 컨셉 보드 (최종 무드보드)
                    </h3>
                    <div className="space-y-4">
                      {/* 전체 공간 무드 */}
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">전체 공간 무드</p>
                        <div className="flex flex-wrap gap-2">
                          {atmosphere.lighting.map((lid) => {
                            const style = LIGHTING_STYLES.find((s) => s.id === lid)
                            return style ? (
                              <span key={lid} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                                조명: {style.label}
                              </span>
                            ) : null
                          })}
                          {atmosphere.materials.map((mid) => {
                            const material = MATERIAL_TEXTURES.find((m) => m.id === mid)
                            return material ? (
                              <span key={mid} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                마감재: {material.label}
                              </span>
                            ) : null
                          })}
                          {atmosphere.keywords.map((keyword) => (
                            <span key={keyword} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 구역별 연출 */}
                      {zones.map((zone) => (
                        <div key={zone.zoneName}>
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            {zone.zoneName} {zone.zoneLabel && `(${zone.zoneLabel})`}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {zone.entranceStyle.map((sid) => {
                              const style = ENTRANCE_STYLES.find((s) => s.id === sid)
                              return style ? (
                                <span key={sid} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                  입구: {style.label}
                                </span>
                              ) : null
                            })}
                            {zone.boothStyle.map((sid) => {
                              const style = BOOTH_STYLES.find((s) => s.id === sid)
                              return style ? (
                                <span key={sid} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                                  부스: {style.label}
                                </span>
                              ) : null
                            })}
                            {zone.decorationElements.map((eid) => {
                              const element = DECORATION_ELEMENTS.find((e) => e.id === eid)
                              return element ? (
                                <span key={eid} className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">
                                  장식: {element.label}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

export default function EventWeek10Page() {
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
      <EventWeek10PageContent />
    </Suspense>
  )
}

