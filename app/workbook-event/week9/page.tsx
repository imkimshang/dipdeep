'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Palette,
  Type,
  Image as ImageIcon,
  Check,
  X,
  Plus,
  Sparkles,
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

// 타이포그래피 무드 옵션
const TYPOGRAPHY_STYLES = [
  { id: 'gothic_modern', label: '고딕 (모던)' },
  { id: 'serif_serious', label: '명조 (진지함)' },
  { id: 'handwritten', label: '손글씨 (친근함)' },
  { id: 'pixel_retro', label: '픽셀아트 (레트로)' },
  { id: 'sans_clean', label: '산세리프 (깔끔)' },
  { id: 'script_elegant', label: '스크립트 (우아함)' },
]

// 그래픽 모티브 옵션 (레퍼런스 이미지 URL - 나중에 실제 이미지로 교체)
const GRAPHIC_MOTIFS = [
  { id: 'wave', label: '물결', imageUrl: '/images/motifs/wave.jpg' },
  { id: 'neon_line', label: '네온 라인', imageUrl: '/images/motifs/neon-line.jpg' },
  { id: 'dotted', label: '점선', imageUrl: '/images/motifs/dotted.jpg' },
  { id: 'geometric', label: '기하학적', imageUrl: '/images/motifs/geometric.jpg' },
  { id: 'organic', label: '유기적 형태', imageUrl: '/images/motifs/organic.jpg' },
  { id: 'gradient', label: '그라데이션', imageUrl: '/images/motifs/gradient.jpg' },
]

// 굿즈 카테고리
const GOODS_CATEGORIES = {
  의류: ['티셔츠', '후드', '모자', '에이프런'],
  문구: ['스티커', '마스킹테이프', '노트', '펜'],
  리빙: ['머그컵', '텀블러', '포스터', '캔버스'],
  잡화: ['에코백', '키링', '뱃지', '토트백'],
}

// 굿즈 스타일 레퍼런스 라이브러리 (실제로는 서버에서 제공되는 이미지)
const GOODS_STYLE_LIBRARY: { [key: string]: Array<{ id: string; label: string; imageUrl: string }> } = {
  티셔츠: [
    { id: 'tshirt_minimal', label: '미니멀', imageUrl: '/images/goods/tshirt-minimal.jpg' },
    { id: 'tshirt_street', label: '스트릿', imageUrl: '/images/goods/tshirt-street.jpg' },
    { id: 'tshirt_cute', label: '귀여운', imageUrl: '/images/goods/tshirt-cute.jpg' },
    { id: 'tshirt_typography', label: '타이포그래피', imageUrl: '/images/goods/tshirt-typography.jpg' },
    { id: 'tshirt_graphic', label: '그래픽', imageUrl: '/images/goods/tshirt-graphic.jpg' },
    { id: 'tshirt_retro', label: '레트로', imageUrl: '/images/goods/tshirt-retro.jpg' },
  ],
  모자: [
    { id: 'cap_minimal', label: '미니멀', imageUrl: '/images/goods/cap-minimal.jpg' },
    { id: 'cap_logo', label: '로고', imageUrl: '/images/goods/cap-logo.jpg' },
    { id: 'cap_embroidered', label: '자수', imageUrl: '/images/goods/cap-embroidered.jpg' },
  ],
  스티커: [
    { id: 'sticker_cute', label: '귀여운', imageUrl: '/images/goods/sticker-cute.jpg' },
    { id: 'sticker_minimal', label: '미니멀', imageUrl: '/images/goods/sticker-minimal.jpg' },
    { id: 'sticker_vintage', label: '빈티지', imageUrl: '/images/goods/sticker-vintage.jpg' },
  ],
  머그컵: [
    { id: 'mug_minimal', label: '미니멀', imageUrl: '/images/goods/mug-minimal.jpg' },
    { id: 'mug_illustration', label: '일러스트', imageUrl: '/images/goods/mug-illustration.jpg' },
    { id: 'mug_typography', label: '타이포그래피', imageUrl: '/images/goods/mug-typography.jpg' },
  ],
  에코백: [
    { id: 'tote_minimal', label: '미니멀', imageUrl: '/images/goods/tote-minimal.jpg' },
    { id: 'tote_graphic', label: '그래픽', imageUrl: '/images/goods/tote-graphic.jpg' },
    { id: 'tote_illustration', label: '일러스트', imageUrl: '/images/goods/tote-illustration.jpg' },
  ],
}

// 기본 스타일 이미지 (이미지가 없을 때 대체용)
const DEFAULT_GOODS_IMAGE = 'https://via.placeholder.com/200x200?text=Goods+Image'

interface VisualIdentity {
  colors: {
    primary: string // 주조색
    secondary: string[] // 보조색 2-3종
  }
  typography: string[] // 타이포그래피 스타일
  graphicMotifs: string[] // 그래픽 모티브 ID
}

interface GoodsItem {
  id: string
  category: string // 카테고리
  itemName: string // 품목명
  selectedStyles: string[] // 선택한 스타일 ID (최대 3개)
  productionSpec: string // 제작 사양
  planningIntent: string // 기획 의도
}

interface EventWeek9Data {
  visualIdentity: VisualIdentity
  goodsLineup: GoodsItem[]
  is_submitted?: boolean
}

function EventWeek9PageContent() {
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

  // 5회차 참고 정보
  const [week5Theme, setWeek5Theme] = useState<{
    keywords: string[]
    universe: {
      concept: string
    }
  }>({
    keywords: [],
    universe: {
      concept: '',
    },
  })

  // 비주얼 아이덴티티
  const [visualIdentity, setVisualIdentity] = useState<VisualIdentity>({
    colors: {
      primary: '#4F46E5',
      secondary: [],
    },
    typography: [],
    graphicMotifs: [],
  })

  // 굿즈 라인업
  const [goodsLineup, setGoodsLineup] = useState<GoodsItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedItemName, setSelectedItemName] = useState<string>('')
  const [viewingItem, setViewingItem] = useState<string | null>(null) // 스타일 선택 중인 굿즈 ID

  // 보조색 추가
  const addSecondaryColor = () => {
    if (visualIdentity.colors.secondary.length >= 3) {
      setToastMessage('보조색은 최대 3개까지 선택할 수 있습니다.')
      setToastVisible(true)
      return
    }
    setVisualIdentity({
      ...visualIdentity,
      colors: {
        ...visualIdentity.colors,
        secondary: [...visualIdentity.colors.secondary, '#818CF8'],
      },
    })
  }

  // 보조색 제거
  const removeSecondaryColor = (index: number) => {
    setVisualIdentity({
      ...visualIdentity,
      colors: {
        ...visualIdentity.colors,
        secondary: visualIdentity.colors.secondary.filter((_, i) => i !== index),
      },
    })
  }

  // 굿즈 항목 추가
  const addGoodsItem = () => {
    if (!selectedCategory || !selectedItemName) {
      setToastMessage('카테고리와 품목을 선택해주세요.')
      setToastVisible(true)
      return
    }

    const newItem: GoodsItem = {
      id: Date.now().toString(),
      category: selectedCategory,
      itemName: selectedItemName,
      selectedStyles: [],
      productionSpec: '',
      planningIntent: '',
    }

    setGoodsLineup([...goodsLineup, newItem])
    setSelectedCategory('')
    setSelectedItemName('')
    setViewingItem(newItem.id) // 바로 스타일 선택 화면 표시
  }

  // 굿즈 항목 삭제
  const removeGoodsItem = (id: string) => {
    setGoodsLineup(goodsLineup.filter((item) => item.id !== id))
  }

  // 굿즈 스타일 선택/해제
  const toggleGoodsStyle = (goodsId: string, styleId: string) => {
    setGoodsLineup(
      goodsLineup.map((item) => {
        if (item.id === goodsId) {
          const currentStyles = item.selectedStyles || []
          if (currentStyles.includes(styleId)) {
            // 해제
            return { ...item, selectedStyles: currentStyles.filter((s) => s !== styleId) }
          } else {
            // 선택 (최대 3개)
            if (currentStyles.length >= 3) {
              setToastMessage('스타일은 최대 3개까지 선택할 수 있습니다.')
              setToastVisible(true)
              return item
            }
            return { ...item, selectedStyles: [...currentStyles, styleId] }
          }
        }
        return item
      })
    )
  }

  // 굿즈 항목 업데이트
  const updateGoodsItem = (id: string, field: keyof GoodsItem, value: any) => {
    setGoodsLineup(
      goodsLineup.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // 선택 가능한 품목 목록
  const availableItems = useMemo(() => {
    if (!selectedCategory) return []
    return GOODS_CATEGORIES[selectedCategory as keyof typeof GOODS_CATEGORIES] || []
  }, [selectedCategory])

  // 선택한 품목의 스타일 라이브러리
  const itemStyleLibrary = useMemo(() => {
    if (!viewingItem) return []
    const item = goodsLineup.find((g) => g.id === viewingItem)
    if (!item) return []
    return GOODS_STYLE_LIBRARY[item.itemName] || []
  }, [viewingItem, goodsLineup])

  // 진행률 계산
  const calculateProgress = (): number => {
    let filled = 0
    let total = 0

    // 비주얼 아이덴티티
    total += 1 // primary color
    if (visualIdentity.colors.primary) filled += 1

    total += 1 // typography
    if (visualIdentity.typography.length > 0) filled += 1

    // 굿즈 라인업 (최소 1개)
    total += 1
    if (goodsLineup.length > 0) filled += 1

    // 굿즈 항목별 상세 (스타일 선택, 제작 사양, 기획 의도)
    goodsLineup.forEach((item) => {
      total += 3
      if (item.selectedStyles.length > 0) filled += 1
      if (item.productionSpec.trim()) filled += 1
      if (item.planningIntent.trim()) filled += 1
    })

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(9 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.visualIdentity) {
        total += 2
        if (data.visualIdentity.colors?.primary) filled += 1
        if (data.visualIdentity.typography?.length > 0) filled += 1
      } else {
        total += 2
      }

      total += 1
      if (data.goodsLineup?.length > 0) filled += 1

      if (data.goodsLineup && Array.isArray(data.goodsLineup)) {
        data.goodsLineup.forEach((item: any) => {
          total += 3
          if (item.selectedStyles?.length > 0) filled += 1
          if (item.productionSpec?.trim()) filled += 1
          if (item.planningIntent?.trim()) filled += 1
        })
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

    const eventData: EventWeek9Data = {
      visualIdentity,
      goodsLineup,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(9, eventData, progress)

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

    const eventData: EventWeek9Data = {
      visualIdentity,
      goodsLineup,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(9, eventData, newSubmittedState, progress)

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

    setVisualIdentity({
      colors: {
        primary: '#4F46E5',
        secondary: [],
      },
      typography: [],
      graphicMotifs: [],
    })
    setGoodsLineup([])
    setSelectedCategory('')
    setSelectedItemName('')
    setViewingItem(null)
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

  // 5회차 데이터 로드
  useEffect(() => {
    const loadWeek5Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(5)
        if (data) {
          const week5Data = data as any
          setWeek5Theme({
            keywords: week5Data.themeKeywords || [],
            universe: {
              concept: week5Data.universe?.concept || '',
            },
          })
        }
      } catch (error) {
        console.error('5회차 데이터 로드 오류:', error)
      }
    }

    loadWeek5Data()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(9)
      if (data) {
        const eventData = data as EventWeek9Data
        if (eventData.visualIdentity) {
          setVisualIdentity(eventData.visualIdentity)
        }
        if (eventData.goodsLineup) {
          setGoodsLineup(eventData.goodsLineup)
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
          filter: `project_id=eq.${projectId}&step_number=eq.9`,
        },
        async () => {
          const data = await loadStepData(9)
          if (data) {
            const eventData = data as EventWeek9Data
            if (eventData.visualIdentity) {
              setVisualIdentity(eventData.visualIdentity)
            }
            if (eventData.goodsLineup) {
              setGoodsLineup(eventData.goodsLineup)
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
        title="Phase 3: Prototype - 9회: 행사 브랜딩 기획"
        description="5회차에서 설정한 테마와 세계관을 시각적으로 어떻게 표현할지 비주얼 전략을 수립하고, 제작할 굿즈의 라인업과 디자인 레퍼런스를 무드보드 형태로 기획합니다."
        phase="Phase 3: Prototype"
        isScrolled={isScrolled}
        currentWeek={9}
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
          currentWeek={9}
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
            {/* 5회차 테마 키워드 참고 정보 */}
            {week5Theme.keywords.length > 0 && (
              <div className="mb-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">
                  <strong>5회차 테마 키워드:</strong> {week5Theme.keywords.join(', ')}
                </p>
                {week5Theme.universe.concept && (
                  <p className="text-xs text-gray-600">
                    <strong>세계관 컨셉:</strong> {week5Theme.universe.concept}
                  </p>
                )}
              </div>
            )}

            {/* 비주얼 아이덴티티 정의 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Palette className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">비주얼 아이덴티티 정의</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    행사의 인상을 결정짓는 컬러, 폰트, 그래픽 스타일 등 시각적 규정을 정의합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 컬러 시스템 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    컬러 시스템
                  </label>
                  
                  {/* 주조색 */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      주조색 (Primary)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={visualIdentity.colors.primary}
                        onChange={(e) =>
                          setVisualIdentity({
                            ...visualIdentity,
                            colors: { ...visualIdentity.colors, primary: e.target.value },
                          })
                        }
                        disabled={readonly}
                        className="w-16 h-16 border border-gray-300 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={visualIdentity.colors.primary}
                          onChange={(e) =>
                            setVisualIdentity({
                              ...visualIdentity,
                              colors: { ...visualIdentity.colors, primary: e.target.value },
                            })
                          }
                          disabled={readonly}
                          placeholder="#4F46E5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 보조색 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-600">
                        보조색 (Secondary) - 최대 3개
                      </label>
                      <button
                        type="button"
                        onClick={addSecondaryColor}
                        disabled={readonly || visualIdentity.colors.secondary.length >= 3}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        추가
                      </button>
                    </div>
                    <div className="space-y-2">
                      {visualIdentity.colors.secondary.map((color, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newSecondary = [...visualIdentity.colors.secondary]
                              newSecondary[index] = e.target.value
                              setVisualIdentity({
                                ...visualIdentity,
                                colors: { ...visualIdentity.colors, secondary: newSecondary },
                              })
                            }}
                            disabled={readonly}
                            className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(e) => {
                              const newSecondary = [...visualIdentity.colors.secondary]
                              newSecondary[index] = e.target.value
                              setVisualIdentity({
                                ...visualIdentity,
                                colors: { ...visualIdentity.colors, secondary: newSecondary },
                              })
                            }}
                            disabled={readonly}
                            placeholder="#818CF8"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => removeSecondaryColor(index)}
                            disabled={readonly}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 배색 예시 프리뷰 */}
                  {(visualIdentity.colors.primary || visualIdentity.colors.secondary.length > 0) && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 mb-2">배색 예시</p>
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 rounded" style={{ backgroundColor: visualIdentity.colors.primary, color: '#fff' }}>
                          티켓 예시
                        </div>
                        {visualIdentity.colors.secondary.map((color, idx) => (
                          <div key={idx} className="px-4 py-2 rounded" style={{ backgroundColor: color, color: '#fff' }}>
                            배너 {idx + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 타이포그래피 무드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    타이포그래피 무드
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TYPOGRAPHY_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          if (readonly) return
                          if (visualIdentity.typography.includes(style.id)) {
                            setVisualIdentity({
                              ...visualIdentity,
                              typography: visualIdentity.typography.filter((s) => s !== style.id),
                            })
                          } else {
                            setVisualIdentity({
                              ...visualIdentity,
                              typography: [...visualIdentity.typography, style.id],
                            })
                          }
                        }}
                        disabled={readonly}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          visualIdentity.typography.includes(style.id)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 그래픽 모티브 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    그래픽 모티브
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {GRAPHIC_MOTIFS.map((motif) => (
                      <button
                        key={motif.id}
                        type="button"
                        onClick={() => {
                          if (readonly) return
                          if (visualIdentity.graphicMotifs.includes(motif.id)) {
                            setVisualIdentity({
                              ...visualIdentity,
                              graphicMotifs: visualIdentity.graphicMotifs.filter(
                                (m) => m !== motif.id
                              ),
                            })
                          } else {
                            setVisualIdentity({
                              ...visualIdentity,
                              graphicMotifs: [...visualIdentity.graphicMotifs, motif.id],
                            })
                          }
                        }}
                        disabled={readonly}
                        className={`relative p-4 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          visualIdentity.graphicMotifs.includes(motif.id)
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-xs text-center text-gray-700">{motif.label}</p>
                        {visualIdentity.graphicMotifs.includes(motif.id) && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 굿즈 라인업 & 무드보드 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">굿즈 라인업 & 무드보드</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    실제 제작할 굿즈 품목을 확정하고, 스타일 레퍼런스를 선택하여 무드보드를 완성합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 굿즈 항목 추가 */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        카테고리
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value)
                          setSelectedItemName('')
                        }}
                        disabled={readonly}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">선택</option>
                        {Object.keys(GOODS_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">품목</label>
                      <select
                        value={selectedItemName}
                        onChange={(e) => setSelectedItemName(e.target.value)}
                        disabled={readonly || !selectedCategory}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">선택</option>
                        {availableItems.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addGoodsItem}
                        disabled={readonly || !selectedCategory || !selectedItemName}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        굿즈 추가
                      </button>
                    </div>
                  </div>
                </div>

                {/* 스타일 선택 모달 (viewingItem이 있을 때 표시) */}
                {viewingItem && itemStyleLibrary.length > 0 && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">
                          {goodsLineup.find((g) => g.id === viewingItem)?.itemName} 스타일 선택
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            (최대 3개 선택)
                          </span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setViewingItem(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {itemStyleLibrary.map((style) => {
                          const item = goodsLineup.find((g) => g.id === viewingItem)
                          const isSelected = item?.selectedStyles?.includes(style.id) || false
                          return (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => toggleGoodsStyle(viewingItem, style.id)}
                              disabled={readonly}
                              className={`relative aspect-square border-2 rounded-lg overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                isSelected
                                  ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <ImageIcon className="w-12 h-12 text-gray-400" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 text-center">
                                {style.label}
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setViewingItem(null)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          완료
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 굿즈 라인업 목록 */}
                <div className="space-y-4">
                  {goodsLineup.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium mr-2">
                            {item.category}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {item.itemName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGoodsItem(item.id)}
                          disabled={readonly}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* 스타일 선택 버튼 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            스타일 레퍼런스 (최대 3개)
                          </label>
                          {GOODS_STYLE_LIBRARY[item.itemName] ? (
                            <button
                              type="button"
                              onClick={() => setViewingItem(item.id)}
                              disabled={readonly}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-left"
                            >
                              {item.selectedStyles.length > 0
                                ? `${item.selectedStyles.length}개 선택됨`
                                : '스타일 선택하기'}
                            </button>
                          ) : (
                            <p className="text-xs text-gray-500">
                              해당 품목의 스타일 라이브러리가 준비 중입니다.
                            </p>
                          )}
                          {item.selectedStyles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.selectedStyles.map((styleId) => {
                                const style = GOODS_STYLE_LIBRARY[item.itemName]?.find(
                                  (s) => s.id === styleId
                                )
                                return style ? (
                                  <span
                                    key={styleId}
                                    className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs"
                                  >
                                    {style.label}
                                  </span>
                                ) : null
                              })}
                            </div>
                          )}
                        </div>

                        {/* 제작 사양 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            제작 사양
                          </label>
                          <textarea
                            value={item.productionSpec}
                            onChange={(e) => updateGoodsItem(item.id, 'productionSpec', e.target.value)}
                            disabled={readonly}
                            rows={3}
                            placeholder="예: 면 100%, 자수/나염, 예상 판매가 25,000원"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* 기획 의도 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          기획 의도
                        </label>
                        <textarea
                          value={item.planningIntent}
                          onChange={(e) => updateGoodsItem(item.id, 'planningIntent', e.target.value)}
                          disabled={readonly}
                          rows={2}
                          placeholder="예: 스태프 유니폼으로도 활용하며, 일상에서도 입을 수 있는 심플한 로고 플레이"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 전체 굿즈 무드보드 */}
                {goodsLineup.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      전체 굿즈 무드보드
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {goodsLineup.map((item) => (
                        <div key={item.id} className="text-center">
                          <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center border border-gray-200">
                            {item.selectedStyles.length > 0 ? (
                              <div className="text-xs text-gray-500">
                                {item.selectedStyles.length}개 스타일 선택
                              </div>
                            ) : (
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-700 font-medium">{item.itemName}</p>
                          <p className="text-xs text-gray-500">{item.category}</p>
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

export default function EventWeek9Page() {
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
      <EventWeek9PageContent />
    </Suspense>
  )
}
