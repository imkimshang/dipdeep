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
import { useWorkbookCredit } from '@/hooks/useWorkbookCredit'
import { EVENT_TRANSLATIONS } from '@/i18n/translations'
import { useLanguage } from '@/contexts/LanguageContext'

export const dynamic = 'force-dynamic'

// 조명 스타일 옵션 (다국어 지원)
const getLightingStyles = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const styles = EVENT_TRANSLATIONS[safeLang]?.session10?.lightingStyles || EVENT_TRANSLATIONS['ko'].session10.lightingStyles
  if (!styles) return []
  return [
    { id: 'daylight', label: styles.daylight, imageUrl: '/images/lighting/daylight.jpg' },
    { id: 'neon_cyberpunk', label: styles.neonCyberpunk, imageUrl: '/images/lighting/neon.jpg' },
    { id: 'spotlight', label: styles.spotlight, imageUrl: '/images/lighting/spotlight.jpg' },
    { id: 'warm_ambient', label: styles.warmAmbient, imageUrl: '/images/lighting/ambient.jpg' },
    { id: 'colorful', label: styles.colorful, imageUrl: '/images/lighting/colorful.jpg' },
    { id: 'minimal', label: styles.minimal, imageUrl: '/images/lighting/minimal.jpg' },
  ]
}

// 마감재 텍스처 옵션 (다국어 지원)
const getMaterialTextures = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const materials = EVENT_TRANSLATIONS[safeLang]?.session10?.materials || EVENT_TRANSLATIONS['ko'].session10.materials
  if (!materials) return []
  return [
    { id: 'concrete', label: materials.concrete, imageUrl: '/images/materials/concrete.jpg' },
    { id: 'wood', label: materials.wood, imageUrl: '/images/materials/wood.jpg' },
    { id: 'metal', label: materials.metal, imageUrl: '/images/materials/metal.jpg' },
    { id: 'fabric', label: materials.fabric, imageUrl: '/images/materials/fabric.jpg' },
    { id: 'glass', label: materials.glass, imageUrl: '/images/materials/glass.jpg' },
    { id: 'vinyl', label: materials.vinyl, imageUrl: '/images/materials/vinyl.jpg' },
  ]
}

// 공간감 키워드 (다국어 지원)
const getAtmosphereKeywords = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const keywords = EVENT_TRANSLATIONS[safeLang]?.session10?.atmosphereKeywords || EVENT_TRANSLATIONS['ko'].session10.atmosphereKeywords
  return Array.isArray(keywords) ? keywords : []
}

// 입구 스타일 옵션 (다국어 지원)
const getEntranceStyles = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const styles = EVENT_TRANSLATIONS[safeLang]?.session10?.entranceStyles || EVENT_TRANSLATIONS['ko'].session10.entranceStyles
  if (!styles) return []
  return [
    { id: 'gate', label: styles.gate, imageUrl: '/images/entrance/gate.jpg' },
    { id: 'tunnel', label: styles.tunnel, imageUrl: '/images/entrance/tunnel.jpg' },
    { id: 'open', label: styles.open, imageUrl: '/images/entrance/open.jpg' },
    { id: 'curtain', label: styles.curtain, imageUrl: '/images/entrance/curtain.jpg' },
  ]
}

// 부스/집기 스타일 옵션 (다국어 지원)
const getBoothStyles = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const styles = EVENT_TRANSLATIONS[safeLang]?.session10?.boothStyles || EVENT_TRANSLATIONS['ko'].session10.boothStyles
  if (!styles) return []
  return [
    { id: 'wooden', label: styles.wooden, imageUrl: '/images/booth/wooden.jpg' },
    { id: 'truss', label: styles.truss, imageUrl: '/images/booth/truss.jpg' },
    { id: 'container', label: styles.container, imageUrl: '/images/booth/container.jpg' },
    { id: 'modular', label: styles.modular, imageUrl: '/images/booth/modular.jpg' },
  ]
}

// 장식 요소 옵션 (다국어 지원)
const getDecorationElements = (language: 'en' | 'ko') => {
  const safeLang = language || 'ko'
  const elements = EVENT_TRANSLATIONS[safeLang]?.session10?.decorationElements || EVENT_TRANSLATIONS['ko'].session10.decorationElements
  if (!elements) return []
  return [
    { id: 'balloon', label: elements.balloon, imageUrl: '/images/decoration/balloon.jpg' },
    { id: 'flower', label: elements.flower, imageUrl: '/images/decoration/flower.jpg' },
    { id: 'media', label: elements.media, imageUrl: '/images/decoration/media.jpg' },
    { id: 'light', label: elements.light, imageUrl: '/images/decoration/light.jpg' },
    { id: 'art', label: elements.art, imageUrl: '/images/decoration/art.jpg' },
    { id: 'signage', label: elements.signage, imageUrl: '/images/decoration/signage.jpg' },
  ]
}

// 시공/설치 제약사항 옵션 (다국어 지원)
const getConstructionConstraints = (language: 'en' | 'ko'): string[] => {
  try {
    const safeLang = language || 'ko'
    const translations = EVENT_TRANSLATIONS[safeLang] || EVENT_TRANSLATIONS['ko']
    if (!translations?.session10?.constraints) {
      return []
    }
    
    const constraints = translations.session10.constraints
    
    // constraints가 배열인 경우
    if (Array.isArray(constraints)) {
      return constraints
        .map(c => typeof c === 'string' ? c : (typeof c === 'object' && c !== null ? String(c) : ''))
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    }
    
    // constraints가 객체인 경우 객체의 값들을 배열로 변환
    if (typeof constraints === 'object' && constraints !== null && !Array.isArray(constraints)) {
      const values = Object.values(constraints)
      return values
        .map(v => {
          if (typeof v === 'string') return v
          if (typeof v === 'object' && v !== null) {
            // 중첩 객체인 경우 다시 처리
            const nestedValues = Object.values(v).filter((sv): sv is string => typeof sv === 'string')
            return nestedValues.length > 0 ? nestedValues[0] : ''
          }
          return String(v)
        })
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    }
    
    return []
  } catch (error) {
    console.error('Error in getConstructionConstraints:', error)
    return []
  }
}

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
  const { language } = useLanguage()
  const safeLanguage = language || 'ko'
  const T = EVENT_TRANSLATIONS[safeLanguage]?.session10 || EVENT_TRANSLATIONS['ko'].session10
  const LIGHTING_STYLES = getLightingStyles(safeLanguage)
  const MATERIAL_TEXTURES = getMaterialTextures(safeLanguage)
  const ATMOSPHERE_KEYWORDS = getAtmosphereKeywords(safeLanguage)
  const ENTRANCE_STYLES = getEntranceStyles(safeLanguage)
  const BOOTH_STYLES = getBoothStyles(safeLanguage)
  const DECORATION_ELEMENTS = getDecorationElements(safeLanguage)
  // CONSTRUCTION_CONSTRAINTS를 직접 변환 (useMemo 제거)
  const getConstructionConstraintsArray = useCallback((): string[] => {
    try {
      const translations = EVENT_TRANSLATIONS[safeLanguage] || EVENT_TRANSLATIONS['ko']
      const constraints = translations?.session10?.constraints
      
      if (!constraints) {
        return []
      }
      
      // constraints가 객체인 경우 Object.values로 변환
      if (typeof constraints === 'object' && constraints !== null && !Array.isArray(constraints)) {
        const values = Object.values(constraints)
        return values
          .map(v => typeof v === 'string' ? v : String(v))
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
      }
      
      // 이미 배열인 경우
      if (Array.isArray(constraints)) {
        return constraints
          .map(c => typeof c === 'string' ? c : String(c))
          .filter((c): c is string => typeof c === 'string' && c.length > 0)
      }
      
      return []
    } catch (error) {
      console.error('Error in getConstructionConstraintsArray:', error)
      return []
    }
  }, [safeLanguage])

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
  const { checkAndDeductCredit } = useWorkbookCredit(projectId, 10)

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

    // 최초 1회 저장 시 크레딧 차감
    try {
      await checkAndDeductCredit()
    } catch (error: any) {
      setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
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
        title={getWeekTitle(10)}
        description={EVENT_TRANSLATIONS[safeLanguage]?.descriptions?.[9] || EVENT_TRANSLATIONS['ko'].descriptions[9]}
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
                  <span>{T.pleaseSetZoning}</span>
                </p>
              </div>
            )}

            {/* 전체 공간 무드 설정 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Lightbulb className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{T.atmosphereSetting}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {T.atmosphereSettingDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 조명 스타일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {T.lighting}
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
                    {T.material}
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
                    {T.spaceKeywords}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(ATMOSPHERE_KEYWORDS) && ATMOSPHERE_KEYWORDS.map((keyword) => (
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
                    <h2 className="text-xl font-bold text-gray-900">{T.zoneDirecting}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {T.zoneDirectingDesc}
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
                          {T.entrance}
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
                        {T.boothFurniture}
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
                        {T.decorationElement}
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
                          {T.visitorExperience} ({T.directingIntent})
                        </label>
                        <textarea
                          value={currentZone.experienceIntent}
                          onChange={(e) => updateZone(currentZone.zoneName, 'experienceIntent', e.target.value)}
                          disabled={readonly}
                          rows={4}
                          placeholder={safeLanguage === 'ko' ? '예: 입구에서는 궁금증을 유발하기 위해 내부가 보이지 않는 터널 형태를 사용함' : 'e.g., Use tunnel form that hides interior at entrance to create curiosity'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {T.requiredItems}
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
                  <h2 className="text-xl font-bold text-gray-900">{T.spaceBrief}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {safeLanguage === 'ko' ? '공간 디자이너나 시공 업체에게 전달할 수 있는 수준의 요구사항 정의서입니다.' : 'A requirements specification that can be delivered to space designers or construction companies.'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 시공/설치 제약사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {(() => {
                      // T.constraints가 문자열인지 확인 (객체일 수 있음)
                      const constraintsLabel = typeof T.constraints === 'string' 
                        ? T.constraints 
                        : (safeLanguage === 'ko' ? '시공/설치 제약사항' : 'Installation Constraints')
                      return constraintsLabel
                    })()}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(() => {
                      // 함수를 직접 호출하여 배열 얻기
                      const constraints = getConstructionConstraintsArray()
                      
                      if (constraints.length === 0) {
                        return <p className="text-sm text-gray-500 col-span-full">No constraints available</p>
                      }
                      
                      return constraints.map((constraint) => {
                        // constraint가 반드시 문자열인지 확인
                        if (typeof constraint !== 'string' || constraint.length === 0) {
                          return null
                        }
                        
                        return (
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
                        )
                      }).filter(Boolean)
                    })()}
                  </div>
                </div>

                {/* 동선 계획 요약 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {T.flowPlan}
                  </label>
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 flex items-start gap-2">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{safeLanguage === 'ko' ? '6회차 여정 지도에서 자동으로 불러옵니다. 필요시 수정할 수 있습니다.' : 'Automatically loaded from Week 6 journey map. You can modify it if needed.'}</span>
                    </p>
                  </div>
                  <textarea
                    value={brief.trafficFlow}
                    onChange={(e) => setBrief({ ...brief, trafficFlow: e.target.value })}
                    disabled={readonly}
                    rows={6}
                    placeholder={safeLanguage === 'ko' ? '방문객의 관람 방향과 동선을 설명하세요 (예: 일방통행/자유관람)' : 'Describe visitor viewing direction and flow (e.g., one-way/free viewing)'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 최종 무드보드 뷰 */}
                {(atmosphere.lighting.length > 0 ||
                  atmosphere.materials.length > 0 ||
                  zones.some((z) => z.entranceStyle.length > 0 || z.boothStyle.length > 0 || z.decorationElements.length > 0)) && (
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      {T.finalMoodboard}
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

