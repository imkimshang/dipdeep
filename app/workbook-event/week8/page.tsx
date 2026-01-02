'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  Map,
  DollarSign,
  Lightbulb,
  Plus,
  X,
  AlertTriangle,
  TrendingUp,
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

// 예산 대분류
const BUDGET_CATEGORIES = [
  '대관료',
  '제작/설치비',
  '인건비',
  '홍보/마케팅비',
  '운영비',
  '예비비',
]

interface ZoneContent {
  zoneName: string // Zone A, B, C 등
  zoneLabel: string // 입구, 메인홀 등
  assignedPrograms: string[] // 배치된 프로그램 ID 목록
  notes: string // 구역별 메모
}

interface BudgetItem {
  id: number
  category: string
  itemName: string
  unitPrice: string // 단가
  quantity: string // 수량
  amount: string // 금액 (단가 × 수량)
  notes: string // 비고
}

interface EventWeek8Data {
  zoning: {
    zones: ZoneContent[]
  }
  budget: {
    totalCap: string // 총 예산 상한선 (4회차에서 불러옴)
    items: BudgetItem[]
  }
  aiAdvisor: {
    prompt: string
    feedback: string
  }
  is_submitted?: boolean
}

function EventWeek8PageContent() {
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

  // 4회차 참고 정보
  const [week4Info, setWeek4Info] = useState<{
    spaceArea: string
    budgetCap: string
    spaceType: string
  }>({
    spaceArea: '',
    budgetCap: '',
    spaceType: '',
  })

  // 7회차 콘텐츠 리스트
  const [week7Programs, setWeek7Programs] = useState<Array<{ id: number; name: string }>>([])

  // 공간 조닝
  const [zones, setZones] = useState<ZoneContent[]>([
    { zoneName: 'Zone A', zoneLabel: '', assignedPrograms: [], notes: '' },
  ])

  // 예산
  const [budgetCap, setBudgetCap] = useState('')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])

  // AI 어드바이저
  const [aiAdvisor, setAiAdvisor] = useState({
    prompt: '',
    feedback: '',
  })

  // Zone 추가
  const addZone = () => {
    const zoneLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const usedLetters = zones.map((z) => z.zoneName.replace('Zone ', ''))
    const nextLetter = zoneLetters.find((l) => !usedLetters.includes(l)) || 'X'
    setZones([
      ...zones,
      { zoneName: `Zone ${nextLetter}`, zoneLabel: '', assignedPrograms: [], notes: '' },
    ])
  }

  // Zone 삭제
  const removeZone = (zoneName: string) => {
    if (zones.length <= 1) {
      setToastMessage('최소 1개의 구역은 유지해야 합니다.')
      setToastVisible(true)
      return
    }
    setZones(zones.filter((z) => z.zoneName !== zoneName))
  }

  // Zone 업데이트
  const updateZone = (zoneName: string, field: keyof ZoneContent, value: any) => {
    setZones(zones.map((z) => (z.zoneName === zoneName ? { ...z, [field]: value } : z)))
  }

  // 예산 항목 추가
  const addBudgetItem = (category: string) => {
    setBudgetItems([
      ...budgetItems,
      {
        id: Date.now(),
        category,
        itemName: '',
        unitPrice: '',
        quantity: '',
        amount: '',
        notes: '',
      },
    ])
  }

  // 예산 항목 삭제
  const removeBudgetItem = (id: number) => {
    setBudgetItems(budgetItems.filter((item) => item.id !== id))
  }

  // 예산 항목 업데이트
  const updateBudgetItem = (id: number, field: keyof BudgetItem, value: any) => {
    const updatedItems = budgetItems.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        // 단가와 수량이 모두 있으면 금액 자동 계산
        if (field === 'unitPrice' || field === 'quantity') {
          const unitPrice = field === 'unitPrice' ? parseFloat(value) : parseFloat(item.unitPrice)
          const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(item.quantity)
          if (!isNaN(unitPrice) && !isNaN(quantity) && unitPrice > 0 && quantity > 0) {
            updated.amount = (unitPrice * quantity).toLocaleString()
          } else {
            updated.amount = ''
          }
        }
        return updated
      }
      return item
    })
    setBudgetItems(updatedItems)
  }

  // 총 예산 계산
  const totalBudget = useMemo(() => {
    return budgetItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount.replace(/,/g, '')) || 0
      return sum + amount
    }, 0)
  }, [budgetItems])

  // 예산 잔액
  const budgetBalance = useMemo(() => {
    const cap = parseFloat(budgetCap.replace(/,/g, '')) || 0
    return cap - totalBudget
  }, [budgetCap, totalBudget])

  // 예산 초과 여부
  const isBudgetExceeded = budgetBalance < 0

  // 예산 파이 차트 데이터
  const budgetChartData = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {}
    budgetItems.forEach((item) => {
      const amount = parseFloat(item.amount.replace(/,/g, '')) || 0
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
    })

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalBudget > 0 ? (amount / totalBudget) * 100 : 0,
      }))
      .filter((item) => item.amount > 0)
  }, [budgetItems, totalBudget])

  // AI 프롬프트 생성
  const generateAIPrompt = () => {
    const programsList = week7Programs.map((p) => p.name).join(', ')
    let prompt = `# 역할 부여
당신은 20년 경력의 행사 운영 총괄 디렉터(General Manager)입니다.

# 행사 개요
- 행사 유형: ${week4Info.spaceType || '[1회차 유형]'}
- 총 예산: ${budgetCap || '[4회차 예산]'}만원
- 공간 규모: ${week4Info.spaceArea || '[4회차 평수]'}평
- 주요 프로그램: ${programsList || '[7회차 콘텐츠 목록]'}

# 요청 사항
위 정보를 바탕으로 가장 효율적인 '예산 비중(%)'과 '공간 조닝 전략'을 제안해주세요.
1. 예산: 대관료, 제작비, 인건비, 홍보비, 예비비의 이상적인 비율은?
2. 공간: 한정된 공간에 위 프로그램들을 어떻게 배치해야 동선이 꼬이지 않을까요? (Zone A/B/C 구분 제안)

**답변은 1000자 이내로, 초보 기획자도 이해하기 쉽게 작성해주세요.**`

    setAiAdvisor({ ...aiAdvisor, prompt })
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

    // 공간 조닝
    total += zones.length * 2 // zoneLabel, assignedPrograms 또는 notes
    zones.forEach((zone) => {
      if (zone.zoneLabel.trim()) filled += 1
      if (zone.assignedPrograms.length > 0 || zone.notes.trim()) filled += 1
    })

    // 예산
    total += 1 // budgetCap
    if (budgetCap.trim()) filled += 1

    total += budgetItems.length * 3 // category, itemName, amount
    budgetItems.forEach((item) => {
      if (item.category) filled += 1
      if (item.itemName.trim()) filled += 1
      if (item.amount && parseFloat(item.amount.replace(/,/g, '')) > 0) filled += 1
    })

    return total > 0 ? Math.round((filled / total) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(8 as 1 | 2 | 3, (data: any) => {
      if (!data) return 0

      let filled = 0
      let total = 0

      if (data.zoning && data.zoning.zones && Array.isArray(data.zoning.zones)) {
        total += data.zoning.zones.length * 2
        data.zoning.zones.forEach((zone: any) => {
          if (zone.zoneLabel?.trim()) filled += 1
          if (
            (zone.assignedPrograms && zone.assignedPrograms.length > 0) ||
            zone.notes?.trim()
          )
            filled += 1
        })
      } else {
        total += 2
      }

      if (data.budget) {
        total += 1
        if (data.budget.totalCap?.trim()) filled += 1

        if (data.budget.items && Array.isArray(data.budget.items)) {
          total += data.budget.items.length * 3
          data.budget.items.forEach((item: any) => {
            if (item.category) filled += 1
            if (item.itemName?.trim()) filled += 1
            if (item.amount && parseFloat(item.amount.replace(/,/g, '')) > 0) filled += 1
          })
        }
      } else {
        total += 1
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

    const eventData: EventWeek8Data = {
      zoning: {
        zones,
      },
      budget: {
        totalCap: budgetCap,
        items: budgetItems,
      },
      aiAdvisor,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(8, eventData, progress)

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

    const eventData: EventWeek8Data = {
      zoning: {
        zones,
      },
      budget: {
        totalCap: budgetCap,
        items: budgetItems,
      },
      aiAdvisor,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(8, eventData, newSubmittedState, progress)

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

    setZones([{ zoneName: 'Zone A', zoneLabel: '', assignedPrograms: [], notes: '' }])
    setBudgetCap('')
    setBudgetItems([])
    setAiAdvisor({ prompt: '', feedback: '' })
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

  // 4회차 데이터 로드
  useEffect(() => {
    const loadWeek4Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(4)
        if (data && (data as any).venue) {
          const venue = (data as any).venue
          setWeek4Info({
            spaceArea: venue.area || '',
            budgetCap: venue.budgetCap || '',
            spaceType: venue.type || '',
          })
          // 예산 상한선 설정
          if (venue.budgetCap && !budgetCap) {
            setBudgetCap(venue.budgetCap)
          }
        }
      } catch (error) {
        console.error('4회차 데이터 로드 오류:', error)
      }
    }

    loadWeek4Data()
  }, [projectId, loadStepData])

  // 7회차 데이터 로드
  useEffect(() => {
    const loadWeek7Data = async () => {
      if (!projectId) return

      try {
        const data = await loadStepData(7)
        if (data && (data as any).programs && Array.isArray((data as any).programs)) {
          const programs = (data as any).programs
            .filter((p: any) => p.name && p.name.trim())
            .map((p: any) => ({ id: p.id, name: p.name }))
          setWeek7Programs(programs)
        }
      } catch (error) {
        console.error('7회차 데이터 로드 오류:', error)
      }
    }

    loadWeek7Data()
  }, [projectId, loadStepData])

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      const data = await loadStepData(8)
      if (data) {
        const eventData = data as EventWeek8Data
        if (eventData.zoning && eventData.zoning.zones) {
          setZones(eventData.zoning.zones)
        }
        if (eventData.budget) {
          setBudgetCap(eventData.budget.totalCap || week4Info.budgetCap)
          setBudgetItems(eventData.budget.items || [])
        }
        if (eventData.aiAdvisor) {
          setAiAdvisor(eventData.aiAdvisor)
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
          filter: `project_id=eq.${projectId}&step_number=eq.8`,
        },
        async () => {
          const data = await loadStepData(8)
          if (data) {
            const eventData = data as EventWeek8Data
            if (eventData.zoning && eventData.zoning.zones) {
              setZones(eventData.zoning.zones)
            }
            if (eventData.budget) {
              setBudgetCap(eventData.budget.totalCap || '')
              setBudgetItems(eventData.budget.items || [])
            }
            if (eventData.aiAdvisor) {
              setAiAdvisor(eventData.aiAdvisor)
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
        title="Phase 2: Insight - 8회: 마스터 플랜"
        description="4회차의 환경 분석과 7회차의 콘텐츠 기획을 통합하여, 구체적인 공간 조닝 계획과 상세 예산안을 수립합니다."
        phase="Phase 2: Insight"
        isScrolled={isScrolled}
        currentWeek={8}
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
          currentWeek={8}
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
            {/* 공간 조닝 맵 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Map className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">공간 조닝 맵</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      행사장 전체 공간을 구역별로 나누고, 7회차에서 기획한 세부 프로그램을 배치하여 공간 구성을 시각화합니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addZone}
                  disabled={readonly}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  구역 추가
                </button>
              </div>

              <div className="space-y-4">
                {zones.map((zone, index) => (
                  <div key={zone.zoneName} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                          {zone.zoneName}
                        </span>
                        <input
                          type="text"
                          value={zone.zoneLabel}
                          onChange={(e) => updateZone(zone.zoneName, 'zoneLabel', e.target.value)}
                          disabled={readonly}
                          placeholder="구역 이름 (예: 입구, 메인홀, 휴식존)"
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      {zones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeZone(zone.zoneName)}
                          disabled={readonly}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 배치된 프로그램 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          배치된 프로그램
                        </label>
                        {week7Programs.length === 0 ? (
                          <p className="text-xs text-gray-500 mb-2">
                            7회차에서 프로그램을 먼저 등록해주세요.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {week7Programs.map((program) => (
                              <label
                                key={program.id}
                                className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={zone.assignedPrograms.includes(program.id.toString())}
                                  onChange={(e) => {
                                    const currentPrograms = zone.assignedPrograms || []
                                    if (e.target.checked) {
                                      updateZone(zone.zoneName, 'assignedPrograms', [
                                        ...currentPrograms,
                                        program.id.toString(),
                                      ])
                                    } else {
                                      updateZone(zone.zoneName, 'assignedPrograms', [
                                        ...currentPrograms.filter((p) => p !== program.id.toString()),
                                      ])
                                    }
                                  }}
                                  disabled={readonly}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-700">{program.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 구역 메모 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          구역 메모
                        </label>
                        <textarea
                          value={zone.notes}
                          onChange={(e) => updateZone(zone.zoneName, 'notes', e.target.value)}
                          disabled={readonly}
                          rows={4}
                          placeholder="구역별 연출 의도, 동선 고려사항 등을 메모하세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {week4Info.spaceArea && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <Info className="w-4 h-4 inline mr-1" />
                    참고: 전체 공간 규모는 {week4Info.spaceArea}평입니다.
                  </p>
                </div>
              )}
            </div>

            {/* 상세 예산 계산기 */}
            <div className="glass rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">상세 예산 계산기</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    총 예산 범위 내에서 항목별 비중을 설정하고 견적을 산출합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 좌측: 예산 대시보드 및 차트 */}
                <div className="space-y-6">
                  {/* 예산 대시보드 */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">예산 현황</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          총 예산 상한선
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={budgetCap}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '')
                              setBudgetCap(value ? parseInt(value).toLocaleString() : '')
                            }}
                            disabled={readonly}
                            placeholder="예: 10000 (만원)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <span className="text-sm text-gray-600 whitespace-nowrap">만원</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            현재 합계
                          </label>
                          <p className="text-lg font-semibold text-gray-900">
                            {totalBudget.toLocaleString()}만원
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">잔액</label>
                          <p
                            className={`text-lg font-semibold ${
                              isBudgetExceeded ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {budgetBalance.toLocaleString()}만원
                            {isBudgetExceeded && (
                              <span className="ml-2 text-xs">(초과)</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {isBudgetExceeded && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <p className="text-sm text-red-800">
                              예산을 {Math.abs(budgetBalance).toLocaleString()}만원 초과했습니다. 예산을 조정해주세요.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 예산 파이 차트 */}
                  {budgetChartData.length > 0 ? (
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">예산 비중</h3>
                      <PieChartComponent data={budgetChartData} />
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500 text-center">
                        항목을 입력하면 예산 비중 그래프가 표시됩니다.
                      </p>
                    </div>
                  )}
                </div>

                {/* 우측: 항목별 입력 시트 */}
                <div className="space-y-6 overflow-y-auto max-h-[800px] pr-2">
                {BUDGET_CATEGORIES.map((category) => {
                  const categoryItems = budgetItems.filter((item) => item.category === category)
                  const categoryTotal = categoryItems.reduce((sum, item) => {
                    return sum + (parseFloat(item.amount.replace(/,/g, '')) || 0)
                  }, 0)

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">{category}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-600">
                            소계: {categoryTotal.toLocaleString()}만원
                          </span>
                          <button
                            type="button"
                            onClick={() => addBudgetItem(category)}
                            disabled={readonly}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            항목 추가
                          </button>
                        </div>
                      </div>

                      {categoryItems.length === 0 ? (
                        <p className="text-xs text-gray-500 py-4 text-center">
                          항목을 추가하여 예산을 입력하세요.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {categoryItems.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded"
                            >
                              <div className="col-span-12 md:col-span-3">
                                <input
                                  type="text"
                                  value={item.itemName}
                                  onChange={(e) =>
                                    updateBudgetItem(item.id, 'itemName', e.target.value)
                                  }
                                  disabled={readonly}
                                  placeholder="품목명"
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-white disabled:cursor-not-allowed"
                                />
                              </div>
                              <div className="col-span-4 md:col-span-2">
                                <input
                                  type="text"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '')
                                    updateBudgetItem(
                                      item.id,
                                      'unitPrice',
                                      value ? parseInt(value).toLocaleString() : ''
                                    )
                                  }}
                                  disabled={readonly}
                                  placeholder="단가 (만원)"
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-white disabled:cursor-not-allowed"
                                />
                              </div>
                              <div className="col-span-4 md:col-span-2">
                                <input
                                  type="text"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '')
                                    updateBudgetItem(item.id, 'quantity', value)
                                  }}
                                  disabled={readonly}
                                  placeholder="수량"
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-white disabled:cursor-not-allowed"
                                />
                              </div>
                              <div className="col-span-4 md:col-span-2">
                                <input
                                  type="text"
                                  value={item.amount}
                                  disabled
                                  placeholder="금액 (만원)"
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-2">
                                <input
                                  type="text"
                                  value={item.notes}
                                  onChange={(e) => updateBudgetItem(item.id, 'notes', e.target.value)}
                                  disabled={readonly}
                                  placeholder="비고"
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-white disabled:cursor-not-allowed"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeBudgetItem(item.id)}
                                  disabled={readonly}
                                  className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
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

// 파이 차트 컴포넌트
function PieChartComponent({ data }: { data: Array<{ category: string; amount: number; percentage: number }> }) {
  const colors = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF']
  let currentAngle = 0

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
      <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
        {data.map((item, idx) => {
          const angle = (item.percentage / 100) * 360
          const startAngle = currentAngle
          const endAngle = currentAngle + angle
          currentAngle = endAngle

          const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180)
          const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180)
          const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180)
          const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180)
          const largeArc = angle > 180 ? 1 : 0

          return (
            <g key={idx}>
              <title>{`${item.category}: ${item.amount.toLocaleString()}만원 (${item.percentage.toFixed(1)}%)`}</title>
              <path
                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[idx % colors.length]}
                className="transition-all duration-300 hover:opacity-80"
              />
            </g>
          )
        })}
      </svg>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="text-sm text-gray-700">
              {item.category}: {item.percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">
              ({item.amount.toLocaleString()}만원)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EventWeek8Page() {
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
      <EventWeek8PageContent />
    </Suspense>
  )
}

