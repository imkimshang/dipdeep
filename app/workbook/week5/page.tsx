'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  Tag,
  Sliders,
  Clock,
  Map,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Plus,
  X,
  AlertCircle,
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



interface RoutineItem {
  id: number
  time: string
  activity: string
}

interface UJMStep {
  id: string
  stage: 'before' | 'during' | 'after'
  action: string
  thought: string
  emotionScore: number // -5 to +5
}

interface AdvancedPersonaCard {
  id: number
  personaId: number // 3회차 페르소나 ID 참조
  name: string // 이름
  gender: string // 성별
  age: string // 나이
  job: string // 직업
  familyStructure: string // 가족구성
  location: string // 지역
  character: string // 캐릭터
  personalityType: string // 개인의 성격 유형
  lifestyle: string // 라이프스타일
  goals: string // 목표
  complaints: string // 불만사항
  values: string[] // 키워드 (가치관 키워드)
  digitalProficiency: number // 0-100
  routines: RoutineItem[] // 하루 일과
}

interface Week5Data {
  advancedPersonas: AdvancedPersonaCard[] // 페르소나별 심화 정보
  ujm: UJMStep[]
  insight: {
    painPointStage: string // 고통의 지점 단계
    deficiencyAnalysis: string // 결핍 요인 분석
    coreInsight: string // 핵심 인사이트
  }
  is_submitted?: boolean
}

// 감정 점수에 따른 이모지 반환
const getEmotionEmoji = (score: number): string => {
  if (score >= 4) return '😊'
  if (score >= 2) return '🙂'
  if (score >= 0) return '😐'
  if (score >= -2) return '😟'
  if (score >= -4) return '😢'
  return '😭'
}

// 감정 점수에 따른 색상 반환
const getEmotionColor = (score: number): string => {
  if (score >= 3) return 'text-indigo-600 bg-indigo-50 border-indigo-200'
  if (score >= 1) return 'text-indigo-500 bg-indigo-50 border-indigo-200'
  if (score >= -1) return 'text-gray-600 bg-gray-50 border-gray-200'
  if (score >= -3) return 'text-gray-500 bg-gray-50 border-gray-200'
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

function Week5PageContent() {
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
  const [referenceData, setReferenceData] = useState<{
    week3Persona: any
    week4HMW: string
  } | null>(null)

  const [formData, setFormData] = useState<Week5Data>({
    advancedPersonas: [],
    ujm: [
      { id: '1', stage: 'before', action: '', thought: '', emotionScore: 0 },
      { id: '2', stage: 'during', action: '', thought: '', emotionScore: 0 },
      { id: '3', stage: 'after', action: '', thought: '', emotionScore: 0 },
    ],
    insight: {
      painPointStage: '',
      deficiencyAnalysis: '',
      coreInsight: '',
    },
  })

  const [valueInputs, setValueInputs] = useState<{ [key: number]: string }>({})

  // 고통의 지점 자동 계산
  const painPoint = useMemo(() => {
    const scores = formData.ujm.map((step) => step.emotionScore)
    const minScore = Math.min(...scores)
    const minIndex = scores.indexOf(minScore)
    if (minScore < 0 && formData.ujm[minIndex]) {
      return formData.ujm[minIndex].stage
    }
    return null
  }, [formData.ujm])

  // 감정 그래프 데이터 - formData.ujm이 변경될 때마다 자동 업데이트
  const emotionChartData = useMemo(() => {
    if (!formData.ujm || formData.ujm.length === 0) {
      return []
    }
    
    // 모든 UJM 단계를 순서대로 포함
    const chartData = formData.ujm
      .filter((step) => step && step.stage)
      .map((step, index) => {
        const score = typeof step.emotionScore === 'number' ? step.emotionScore : 0
        return {
          x: index,
          y: score,
          stage: step.stage,
          score: score,
        }
      })
    
    return chartData
  }, [formData.ujm])

  // Custom progress calculation for week 5 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 페르소나 심화 프로필 (가중치: 35%)
    const section1Weight = 35
    let section1Filled = 0
    let section1Total = 0

    if (formData.advancedPersonas.length > 0) {
      formData.advancedPersonas.forEach((persona) => {
        section1Total += 13 // name, gender, age, job, familyStructure, location, character, personalityType, lifestyle, goals, complaints, values, digitalProficiency, routines
        if (persona.name.trim()) section1Filled++
        if (persona.gender.trim()) section1Filled++
        if (persona.age.trim()) section1Filled++
        if (persona.job.trim()) section1Filled++
        if (persona.familyStructure.trim()) section1Filled++
        if (persona.location.trim()) section1Filled++
        if (persona.character.trim()) section1Filled++
        if (persona.personalityType.trim()) section1Filled++
        if (persona.lifestyle.trim()) section1Filled++
        if (persona.goals.trim()) section1Filled++
        if (persona.complaints.trim()) section1Filled++
        if (persona.values.length > 0) section1Filled++
        if (persona.digitalProficiency > 0) section1Filled++
        if (persona.routines.some((r) => r.time && r.activity)) section1Filled++
      })
    }

    const section1Progress = section1Total > 0
      ? Math.min((section1Filled / section1Total) * 100, section1Weight)
      : 0

    // 섹션 2: 사용자 여정 지도 캔버스 (가중치: 35%)
    const section2Weight = 35
    let section2Filled = 0
    let section2Total = 0

    if (formData.ujm.length > 0) {
      formData.ujm.forEach((ujm) => {
        section2Total += 3 // action, thought, emotionScore
        if (ujm.action.trim()) section2Filled++
        if (ujm.thought.trim()) section2Filled++
        if (typeof ujm.emotionScore === 'number') section2Filled++
      })
    }

    const section2Progress = section2Total > 0
      ? Math.min((section2Filled / section2Total) * 100, section2Weight)
      : 0

    // 섹션 3: 인사이트 도출 시트 (가중치: 30%)
    const section3Weight = 30
    let section3Filled = 0
    let section3Total = 2

    if (formData.insight.deficiencyAnalysis.trim()) section3Filled++
    if (formData.insight.coreInsight.trim()) section3Filled++

    const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
    return Math.round(totalProgress)
  }

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 5) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 5) {
        // 섹션 1: 페르소나 심화 프로필 (가중치: 35%)
        const section1Weight = 35
        let section1Filled = 0
        let section1Total = 0

        if (data.advancedPersonas && Array.isArray(data.advancedPersonas) && data.advancedPersonas.length > 0) {
          data.advancedPersonas.forEach((persona: any) => {
            section1Total += 13
            if (persona.name?.trim()) section1Filled++
            if (persona.gender?.trim()) section1Filled++
            if (persona.age?.trim()) section1Filled++
            if (persona.job?.trim()) section1Filled++
            if (persona.familyStructure?.trim()) section1Filled++
            if (persona.location?.trim()) section1Filled++
            if (persona.character?.trim()) section1Filled++
            if (persona.personalityType?.trim()) section1Filled++
            if (persona.lifestyle?.trim()) section1Filled++
            if (persona.goals?.trim()) section1Filled++
            if (persona.complaints?.trim()) section1Filled++
            if (persona.values?.length > 0) section1Filled++
            if (persona.digitalProficiency > 0) section1Filled++
            if (persona.routines?.some((r: any) => r.time && r.activity)) section1Filled++
          })
        }

        const section1Progress = section1Total > 0
          ? Math.min((section1Filled / section1Total) * 100, section1Weight)
          : 0

        // 섹션 2: 사용자 여정 지도 캔버스 (가중치: 35%)
        const section2Weight = 35
        let section2Filled = 0
        let section2Total = 0

        if (data.ujm && Array.isArray(data.ujm) && data.ujm.length > 0) {
          data.ujm.forEach((ujm: any) => {
            section2Total += 3
            if (ujm.action?.trim()) section2Filled++
            if (ujm.thought?.trim()) section2Filled++
            if (typeof ujm.emotionScore === 'number') section2Filled++
          })
        }

        const section2Progress = section2Total > 0
          ? Math.min((section2Filled / section2Total) * 100, section2Weight)
          : 0

        // 섹션 3: 인사이트 도출 시트 (가중치: 30%)
        const section3Weight = 30
        let section3Filled = 0
        let section3Total = 2

        if (data.insight?.deficiencyAnalysis?.trim()) section3Filled++
        if (data.insight?.coreInsight?.trim()) section3Filled++

        const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

        const totalProgress = Math.min(section1Progress + section2Progress + section3Progress, 100)
        return Math.round(totalProgress)
      }
      return 50
    })
  }

  // getPhaseProgress와 getOverallProgress는 useWorkbookNavigation에서 제공하는 것을 사용

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      // Load reference data (week 3, 4) first
      try {
        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .in('step_number', [3, 4])

        const stepsData = steps as any[]
        const week3Data = stepsData?.find((s: any) => s.step_number === 3)?.step_data
        const week4Data = stepsData?.find((s: any) => s.step_number === 4)?.step_data

        setReferenceData({
          week3Persona: week3Data?.persona || null,
          week4HMW: week4Data?.conclusion || '',
        })

        // Load week5 data
        const data = await loadStepData(5)
        if (data) {
          const week5Data = data as Week5Data
          
          // If no advancedPersonas but week3 has personas, initialize them
          if (!week5Data.advancedPersonas || week5Data.advancedPersonas.length === 0) {
            if (week3Data?.persona && Array.isArray(week3Data.persona)) {
              week5Data.advancedPersonas = week3Data.persona.map((p: any, idx: number) => ({
                id: idx + 1,
                personaId: p.id || idx + 1,
                name: p.name || '',
                gender: '',
                age: p.age || '',
                job: p.job || '',
                familyStructure: '',
                location: '',
                character: '',
                personalityType: '',
                lifestyle: p.lifestyle || '',
                goals: '',
                complaints: p.painPoint || '',
                values: [],
                digitalProficiency: 50,
                routines: [{ id: 1, time: '', activity: '' }],
              }))
            }
          }
          
          setFormData(week5Data)
          if (week5Data.is_submitted !== undefined) {
            setIsSubmitted(week5Data.is_submitted)
          }
        } else if (week3Data?.persona && Array.isArray(week3Data.persona)) {
          // Initialize from week3 personas if no week5 data exists
          setFormData({
            advancedPersonas: week3Data.persona.map((p: any, idx: number) => ({
              id: idx + 1,
              personaId: p.id || idx + 1,
              name: p.name || '',
              gender: '',
              age: p.age || '',
              job: p.job || '',
              familyStructure: '',
              location: '',
              character: '',
              personalityType: '',
              lifestyle: p.lifestyle || '',
              goals: '',
              complaints: p.painPoint || '',
              values: [],
              digitalProficiency: 50,
              routines: [{ id: 1, time: '', activity: '' }],
            })),
            ujm: [
              { id: '1', stage: 'before', action: '', thought: '', emotionScore: 0 },
              { id: '2', stage: 'during', action: '', thought: '', emotionScore: 0 },
              { id: '3', stage: 'after', action: '', thought: '', emotionScore: 0 },
            ],
            insight: {
              painPointStage: '',
              deficiencyAnalysis: '',
              coreInsight: '',
            },
          })
        }
      } catch (error) {
        console.error('참조 데이터 로드 오류:', error)
      }

      loadSteps()
    }

    loadData()
  }, [projectId, loadStepData, loadProjectInfo, loadSteps, supabase])

  // Pain point 자동 업데이트
  useEffect(() => {
    if (painPoint) {
      setFormData((prev) => ({
        ...prev,
        insight: {
          ...prev.insight,
          painPointStage: painPoint === 'before' ? '진입 전' : painPoint === 'during' ? '이용 중' : '이용 후',
        },
      }))
    }
  }, [painPoint])

  const handleReset = () => {
    if (!confirm('모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setFormData({
      advancedPersonas: [],
      ujm: [
        { id: '1', stage: 'before', action: '', thought: '', emotionScore: 0 },
        { id: '2', stage: 'during', action: '', thought: '', emotionScore: 0 },
        { id: '3', stage: 'after', action: '', thought: '', emotionScore: 0 },
      ],
      insight: {
        painPointStage: '',
        deficiencyAnalysis: '',
        coreInsight: '',
      },
    })
    setValueInputs({})
    setIsSubmitted(false)
    setToastMessage('모든 데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const week5Data: Week5Data = {
      ...formData,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()
    const success = await saveStepData(5, week5Data, progress)

    if (success) {
      setToastMessage('저장되었습니다.')
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('저장 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  const handleSubmit = async () => {
    if (
      !confirm(
        isSubmitted
          ? '제출을 회수하시겠습니까?\n제출 후 다시 편집할 수 있습니다.'
          : '워크북을 제출하시겠습니까?\n제출 후에도 회수하여 수정할 수 있습니다.'
      )
    ) {
      return
    }

    const week5Data: Week5Data = {
      ...formData,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(5, week5Data, newSubmittedState, progress)

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

  const progress = calculateProgress()
  const readonly = isSubmitted

  // 감정 그래프 SVG 렌더링
  const renderEmotionChart = () => {
    const width = 600
    const height = 200
    const padding = 50
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const minY = -5
    const maxY = 5
    const yRange = maxY - minY

    // 데이터가 없으면 안내 메시지
    if (!emotionChartData || emotionChartData.length === 0) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">감정 점수를 입력하면 그래프가 표시됩니다</p>
          </div>
        </div>
      )
    }

    // 모든 점의 좌표를 계산
    const points = emotionChartData.map((point, index) => {
      // X 좌표: 첫 번째 점은 padding, 마지막 점은 width-padding, 중간은 균등 분배
      const x = emotionChartData.length === 1 
        ? padding + chartWidth / 2  // 점이 하나일 때는 중앙
        : padding + (index / (emotionChartData.length - 1)) * chartWidth
      
      // Y 좌표: 점수를 -5~5 범위에서 Y 위치로 변환
      const score = Number(point.y) || 0
      const clampedScore = Math.max(minY, Math.min(maxY, score))
      const y = padding + chartHeight - ((clampedScore - minY) / yRange) * chartHeight
      
      return { 
        x, 
        y, 
        score: clampedScore,
        stage: point.stage 
      }
    })

    // SVG 경로 문자열 생성 (점들을 연결하는 선)
    let pathD = ''
    if (points.length === 1) {
      // 점이 하나일 때는 작은 원으로 표시
      pathD = `M ${points[0].x} ${points[0].y}`
    } else if (points.length > 1) {
      // 여러 점을 연결하는 경로
      pathD = points
        .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
        .join(' ')
    }

    return (
      <div className="w-full overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 배경 */}
          <rect width={width} height={height} fill="#ffffff" />

          {/* Grid lines */}
          {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((value) => {
            const y = padding + chartHeight - ((value - minY) / yRange) * chartHeight
            return (
              <line
                key={value}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={value === 0 ? '#e5e7eb' : '#f3f4f6'}
                strokeWidth={value === 0 ? 2 : 1}
                strokeDasharray={value === 0 ? '0' : '4'}
              />
            )
          })}

          {/* Y축 라벨 */}
          {[-5, -3, 0, 3, 5].map((value) => {
            const y = padding + chartHeight - ((value - minY) / yRange) * chartHeight
            return (
              <text
                key={value}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
                style={{ fontSize: '12px' }}
              >
                {value}
              </text>
            )
          })}

          {/* X축 기준선 (y=0) */}
          <line
            x1={padding}
            y1={padding + chartHeight / 2}
            x2={width - padding}
            y2={padding + chartHeight / 2}
            stroke="#e5e7eb"
            strokeWidth="2"
          />

          {/* Emotion line - 점들을 연결하는 선 */}
          {pathD && points.length >= 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points - 각 단계의 점 표시 */}
          {points.map((point, index) => (
            <g key={`point-${index}`}>
              {/* 외곽 원 (흰색 배경) */}
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="#ffffff"
                stroke="#8b5cf6"
                strokeWidth="2"
              />
              {/* 내부 원 (보라색) */}
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#8b5cf6"
              />
              {/* 점수 텍스트 */}
              <text
                x={point.x}
                y={point.y - 18}
                textAnchor="middle"
                className="text-xs font-bold fill-violet-600"
                style={{ fontSize: '12px' }}
              >
                {point.score}
              </text>
            </g>
          ))}

          {/* X-axis labels - 각 단계명 표시 */}
          {points.map((point, index) => {
            const stageLabel = point.stage === 'before' ? '진입 전' : point.stage === 'during' ? '이용 중' : '이용 후'
            return (
              <text
                key={`label-${index}`}
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="text-xs font-medium fill-gray-700"
                style={{ fontSize: '11px' }}
              >
                {stageLabel}
              </text>
            )
          })}

          {/* Y축 제목 */}
          <text
            x={20}
            y={padding + chartHeight / 2}
            textAnchor="middle"
            className="text-xs fill-gray-600"
            transform={`rotate(-90 20 ${padding + chartHeight / 2})`}
            style={{ fontSize: '11px' }}
          >
            감정 점수
          </text>
        </svg>
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-violet-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">프로젝트 ID 필요</h3>
              <p className="text-sm text-gray-600">URL에 projectId 파라미터가 필요합니다.</p>
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
        title="Phase 2: Insight - 5회차: 사용자 여정 및 인사이트 도출"
        description="페르소나를 심화하고 사용자 여정을 분석하여 핵심 인사이트를 도출하세요."
        phase="Phase 2: Insight"
        isScrolled={isScrolled}
        currentWeek={5}
        overallProgress={getBaseOverallProgress()}
        phase1Progress={getBasePhaseProgress(1)}
        phase2Progress={getBasePhaseProgress(2)}
        phase3Progress={getBasePhaseProgress(3)}
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
            {/* Reference Data Panel */}

            {/* Section 1: Advanced Persona */}
            <WorkbookSection
              icon={User}
              title="섹션 1: 페르소나 심화 프로필"
              description="3회차 페르소나를 심리학적/행동적 관점에서 구체화하세요."
              themeColor="indigo"
            >
              {formData.advancedPersonas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>3회차에서 페르소나를 먼저 정의해주세요.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.advancedPersonas.map((persona, personaIndex) => (
                    <div
                      key={persona.id}
                      className="border-2 border-violet-200 rounded-2xl overflow-hidden hover:border-violet-400 transition-all shadow-lg bg-white"
                    >
                      {/* 헤더 */}
                      <div className="bg-indigo-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-bold text-xl shadow-lg">
                              {personaIndex + 1}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {persona.name || `페르소나 ${personaIndex + 1}`}
                              </h3>
                              <p className="text-sm text-white/80 mt-0.5">
                                {persona.job || '직업 미정'} {persona.age && `· ${persona.age}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 본문 */}
                      <div className="p-6 space-y-6">
                        {/* 기본 정보 섹션 */}
                        <div className="pl-4">
                          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-violet-600" />
                            기본 정보
                          </h4>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">이름</label>
                              <input
                                type="text"
                                value={persona.name}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].name = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                placeholder="페르소나 이름"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">성별</label>
                              <select
                                value={persona.gender}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].gender = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">선택하세요</option>
                                <option value="male">남성</option>
                                <option value="female">여성</option>
                                <option value="other">기타</option>
                                <option value="prefer-not-to-say">선택 안 함</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">나이</label>
                              <input
                                type="text"
                                value={persona.age}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].age = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                placeholder="예: 28세"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">직업</label>
                              <input
                                type="text"
                                value={persona.job}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].job = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                placeholder="직업을 입력하세요"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">가족구성</label>
                              <input
                                type="text"
                                value={persona.familyStructure}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].familyStructure = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                placeholder="예: 1인 가구"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">지역</label>
                              <input
                                type="text"
                                value={persona.location}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].location = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                placeholder="예: 서울 강남구"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 성격/심리 섹션 */}
                        <div className="pl-4">
                          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-purple-600">🧠</span>
                            성격 및 심리 특성
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">캐릭터</label>
                              <input
                                type="text"
                                value={persona.character}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].character = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                placeholder="예: 밝고 활발한, 차분하고 신중한"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">개인의 성격 유형</label>
                              <input
                                type="text"
                                value={persona.personalityType}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].personalityType = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                placeholder="예: MBTI 유형, 성격 특성"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">라이프스타일</label>
                              <textarea
                                value={persona.lifestyle}
                                onChange={(e) => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  newPersonas[personaIndex].lifestyle = e.target.value
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                rows={3}
                                placeholder="일상 생활 방식, 생활 패턴 등을 입력하세요"
                                disabled={readonly}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white resize-y transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 목표/문제 섹션 */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="pl-4">
                            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <span className="text-emerald-600">🎯</span>
                              목표
                            </h4>
                            <textarea
                              value={persona.goals}
                              onChange={(e) => {
                                const newPersonas = [...formData.advancedPersonas]
                                newPersonas[personaIndex].goals = e.target.value
                                setFormData({ ...formData, advancedPersonas: newPersonas })
                              }}
                              rows={4}
                              placeholder="이 페르소나의 인생 목표나 바람을 입력하세요"
                              disabled={readonly}
                              className="w-full px-3 py-2 text-sm bg-emerald-50/50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white resize-y transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>

                          <div className="border-l-4 border-red-400 pl-4">
                            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <span className="text-red-600">⚠️</span>
                              불만사항
                            </h4>
                            <textarea
                              value={persona.complaints}
                              onChange={(e) => {
                                const newPersonas = [...formData.advancedPersonas]
                                newPersonas[personaIndex].complaints = e.target.value
                                setFormData({ ...formData, advancedPersonas: newPersonas })
                              }}
                              rows={4}
                              placeholder="현재 겪고 있는 문제나 불만사항을 입력하세요"
                              disabled={readonly}
                              className="w-full px-3 py-2 text-sm bg-red-50/50 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white resize-y transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* 키워드 및 특성 섹션 */}
                        <div className="pl-4">
                          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-indigo-600" />
                            키워드
                          </h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {persona.values.length > 0 ? (
                              persona.values.map((value, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors"
                                >
                                  {value}
                                  {!readonly && (
                                    <button
                                      onClick={() => {
                                        const newPersonas = [...formData.advancedPersonas]
                                        newPersonas[personaIndex].values = newPersonas[personaIndex].values.filter(
                                          (_, i) => i !== idx
                                        )
                                        setFormData({ ...formData, advancedPersonas: newPersonas })
                                      }}
                                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">키워드를 추가하세요</span>
                            )}
                          </div>
                          {!readonly && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={valueInputs[persona.id] || ''}
                                onChange={(e) =>
                                  setValueInputs({ ...valueInputs, [persona.id]: e.target.value })
                                }
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && valueInputs[persona.id]?.trim()) {
                                    const newPersonas = [...formData.advancedPersonas]
                                    newPersonas[personaIndex].values.push(valueInputs[persona.id].trim())
                                    setFormData({ ...formData, advancedPersonas: newPersonas })
                                    setValueInputs({ ...valueInputs, [persona.id]: '' })
                                  }
                                }}
                                placeholder="키워드 입력 후 Enter"
                                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                              />
                              <button
                                onClick={() => {
                                  if (valueInputs[persona.id]?.trim()) {
                                    const newPersonas = [...formData.advancedPersonas]
                                    newPersonas[personaIndex].values.push(valueInputs[persona.id].trim())
                                    setFormData({ ...formData, advancedPersonas: newPersonas })
                                    setValueInputs({ ...valueInputs, [persona.id]: '' })
                                  }
                                }}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 디지털 숙련도 */}
                        <div className="pl-4">
                          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-blue-600" />
                            디지털 숙련도
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 font-medium">초보</span>
                              <span className="text-lg font-bold text-blue-600">{persona.digitalProficiency}%</span>
                              <span className="text-xs text-gray-600 font-medium">전문가</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={persona.digitalProficiency}
                              onChange={(e) => {
                                const newPersonas = [...formData.advancedPersonas]
                                newPersonas[personaIndex].digitalProficiency = parseInt(e.target.value)
                                setFormData({ ...formData, advancedPersonas: newPersonas })
                              }}
                              disabled={readonly}
                              className="w-full h-3 bg-gradient-to-r from-gray-200 via-blue-200 to-blue-400 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: `linear-gradient(to right, #e5e7eb 0%, #bfdbfe ${persona.digitalProficiency}%, #93c5fd ${persona.digitalProficiency}%, #e5e7eb ${persona.digitalProficiency}%)`,
                              }}
                            />
                          </div>
                        </div>

                      {/* 하루 일과 */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-violet-600" />
                          하루 일과 (Routine)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">시간대별 주요 활동을 입력하세요.</p>
                          <div className="space-y-1.5">
                            {persona.routines.map((routine, idx) => (
                              <div
                                key={routine.id}
                                className="px-3 py-2 bg-amber-50/30 border border-amber-200/60 rounded-md hover:bg-amber-50/50 transition-colors flex items-center gap-2"
                              >
                                <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-3">
                                    <input
                                      type="text"
                                      value={routine.time}
                                      onChange={(e) => {
                                        const newPersonas = [...formData.advancedPersonas]
                                        const newRoutines = [...newPersonas[personaIndex].routines]
                                        newRoutines[idx].time = e.target.value
                                        newPersonas[personaIndex].routines = newRoutines
                                        setFormData({ ...formData, advancedPersonas: newPersonas })
                                      }}
                                      placeholder="09:00"
                                      disabled={readonly}
                                      className="w-full px-2 py-1.5 text-xs bg-white border border-amber-300/60 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                                    />
                                  </div>
                                  <div className="col-span-8">
                                    <input
                                      type="text"
                                      value={routine.activity}
                                      onChange={(e) => {
                                        const newPersonas = [...formData.advancedPersonas]
                                        const newRoutines = [...newPersonas[personaIndex].routines]
                                        newRoutines[idx].activity = e.target.value
                                        newPersonas[personaIndex].routines = newRoutines
                                        setFormData({ ...formData, advancedPersonas: newPersonas })
                                      }}
                                      placeholder="활동 내용"
                                      disabled={readonly}
                                      className="w-full px-2 py-1.5 text-xs bg-white border border-amber-300/60 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                  </div>
                                  <div className="col-span-1 flex justify-end">
                                    {persona.routines.length > 1 && !readonly && (
                                      <button
                                        onClick={() => {
                                          const newPersonas = [...formData.advancedPersonas]
                                          newPersonas[personaIndex].routines = newPersonas[personaIndex].routines.filter(
                                            (_, i) => i !== idx
                                          )
                                          setFormData({ ...formData, advancedPersonas: newPersonas })
                                        }}
                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                        title="삭제"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {!readonly && (
                              <button
                                onClick={() => {
                                  const newPersonas = [...formData.advancedPersonas]
                                  const newId =
                                    Math.max(...newPersonas[personaIndex].routines.map((r) => r.id), 0) + 1
                                  newPersonas[personaIndex].routines.push({ id: newId, time: '', activity: '' })
                                  setFormData({ ...formData, advancedPersonas: newPersonas })
                                }}
                                className="w-full py-1.5 border border-dashed border-amber-300/60 rounded-md text-amber-600 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-xs font-medium flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                일과 추가
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </WorkbookSection>

            {/* Section 2: UJM Canvas */}
            <WorkbookSection
              icon={Map}
              title="섹션 2: 사용자 여정 지도 캔버스 (UJM)"
              description="사용자의 경험 흐름을 시각화하고 감정의 변화를 추적하세요."
              themeColor="indigo"
            >
              {/* UJM Steps */}
              <div className="mb-6 overflow-x-auto">
                <div className="flex gap-4 min-w-max pb-4">
                  {formData.ujm.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex-shrink-0 w-80 glass rounded-xl p-6 border-2 border-violet-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">
                          {step.stage === 'before' ? '진입 전 (Before)' : step.stage === 'during' ? '이용 중 (During)' : '이용 후 (After)'}
                        </h3>
                        <div
                          className={`px-3 py-1 rounded-full border ${getEmotionColor(step.emotionScore)} transition-all`}
                        >
                          <span className="text-lg mr-1">{getEmotionEmoji(step.emotionScore)}</span>
                          <span className="font-medium">{step.emotionScore}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">사용자 행동 (Action)</label>
                          <textarea
                            value={step.action}
                            onChange={(e) => {
                              const newUJM = [...formData.ujm]
                              newUJM[idx].action = e.target.value
                              setFormData({ ...formData, ujm: newUJM })
                            }}
                            rows={2}
                            placeholder="사용자가 무엇을 하는가?"
                            disabled={readonly}
                            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${getEmotionColor(step.emotionScore).replace('text-', 'border-').split(' ')[0]}`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">속마음 (Thought)</label>
                          <textarea
                            value={step.thought}
                            onChange={(e) => {
                              const newUJM = [...formData.ujm]
                              newUJM[idx].thought = e.target.value
                              setFormData({ ...formData, ujm: newUJM })
                            }}
                            rows={2}
                            placeholder="사용자가 무엇을 생각하는가?"
                            disabled={readonly}
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            감정 점수: {step.emotionScore} (-5 ~ +5)
                          </label>
                          <input
                            type="range"
                            min="-5"
                            max="5"
                            value={step.emotionScore}
                            onChange={(e) => {
                              const newUJM = [...formData.ujm]
                              newUJM[idx].emotionScore = parseInt(e.target.value)
                              setFormData({ ...formData, ujm: newUJM })
                            }}
                            disabled={readonly}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>매우 부정</span>
                            <span>중립</span>
                            <span>매우 긍정</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emotion Graph */}
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">감정 곡선</h3>
                </div>
                <div className="bg-white rounded-lg p-4 min-h-[250px]">
                  {renderEmotionChart()}
                </div>
              </div>
            </WorkbookSection>

            {/* Section 3: Insight Analyzer */}
            <WorkbookSection
              icon={Lightbulb}
              title="섹션 3: 인사이트 도출 시트"
              description="UJM 결과를 분석하여 기획의 핵심 실마리를 찾으세요."
              themeColor="indigo"
            >
              {/* Pain Point */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  고통의 지점 (Pain Point)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  UJM에서 감정 점수가 가장 낮은 단계가 자동으로 식별됩니다.
                </p>
                <input
                  type="text"
                  value={formData.insight.painPointStage}
                  readOnly
                  className="w-full px-4 py-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 font-medium cursor-not-allowed"
                  placeholder={painPoint ? `${painPoint === 'before' ? '진입 전' : painPoint === 'during' ? '이용 중' : '이용 후'} 단계에서 가장 불편함` : '감정 점수를 입력하면 자동으로 식별됩니다'}
                />
              </div>

              {/* Deficiency Analysis */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">결핍 요인 분석</label>
                <p className="text-xs text-gray-500 mb-3">
                  해당 지점에서 사용자가 왜 그런 감정을 느끼는지 심층 원인을 분석하세요.
                </p>
                <textarea
                  value={formData.insight.deficiencyAnalysis}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      insight: { ...formData.insight, deficiencyAnalysis: e.target.value },
                    })
                  }
                  rows={4}
                  placeholder="사용자가 이 단계에서 불편함을 느끼는 근본적인 이유는 무엇인가요?"
                  disabled={readonly}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Core Insight */}
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-6 border-2 border-violet-200">
                <label className="block text-sm font-semibold text-violet-700 mb-2">핵심 인사이트 문장</label>
                <p className="text-xs text-violet-600 mb-3 font-medium">
                  "사용자는 [어떤 상황]에서 [이런 이유]로 고통을 겪고 있으며, [어떤 결과]를 얻고 싶어 한다"
                </p>
                <textarea
                  value={formData.insight.coreInsight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      insight: { ...formData.insight, coreInsight: e.target.value },
                    })
                  }
                  rows={5}
                  placeholder="위 구조에 맞춰 핵심 인사이트를 작성하세요..."
                  disabled={readonly}
                  className="w-full px-4 py-3 bg-white border-2 border-violet-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-y font-medium text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </WorkbookSection>

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



export default function Week5Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <Week5PageContent />
    </Suspense>
  )
}
