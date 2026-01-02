'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  Sliders,
  FileText,
  X,
  Plus,
  AlertCircle,
  Target,
  ShoppingBag,
  Camera,
  Clock,
  Users,
  Info,
  Trash2,
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
import { createClient } from '@/utils/supabase/client'

export const dynamic = 'force-dynamic'

// 방문 동기 옵션
const VISIT_MOTIVATIONS = [
  '인스타그램 인증샷',
  '한정판 굿즈 구매',
  '데이트',
  '친구와 추억 만들기',
  '새로운 경험',
  '컬처/트렌드 체감',
  '아티스트/브랜드 팬',
  '기타',
]

interface PersonaCard {
  id: number
  profile: {
    name: string
    age: string
    job: string
    lifestyleTags: string[]
    visitMotivation: string[]
    customMotivation: string
  }
  behaviorPattern: {
    goodsPurchase: number // 0-100
    photoZonePreference: number // 0-100
    stayDuration: number // 0-100
    companionType: number // 0-100
  }
  behaviorScenario: {
    before: string // 방문 전
    during: string // 방문 중
    after: string // 방문 후
  }
}

interface EventWeek2Data {
  personas: PersonaCard[]
  is_submitted?: boolean
}

function EventWeek2PageContent() {
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

  // 페르소나 배열
  const [personas, setPersonas] = useState<PersonaCard[]>([
    {
      id: 1,
      profile: {
        name: '',
        age: '',
        job: '',
        lifestyleTags: [],
        visitMotivation: [],
        customMotivation: '',
      },
      behaviorPattern: {
        goodsPurchase: 50,
        photoZonePreference: 50,
        stayDuration: 50,
        companionType: 50,
      },
      behaviorScenario: {
        before: '',
        during: '',
        after: '',
      },
    },
  ])

  // 현재 페르소나 인덱스 (편집용)
  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0)

  // 1회차 데이터 로드 (행사 목적 참고용)
  const [eventGoals, setEventGoals] = useState<string[]>([])

  // 페르소나별 라이프스타일 태그 입력 (각 페르소나마다 별도 입력 필드)
  const [personaLifestyleTagInputs, setPersonaLifestyleTagInputs] = useState<Record<number, string>>({})

  // 페르소나 추가
  const addPersona = () => {
    const newId = Math.max(...personas.map((p) => p.id), 0) + 1
    setPersonas([
      ...personas,
      {
        id: newId,
        profile: {
          name: '',
          age: '',
          job: '',
          lifestyleTags: [],
          visitMotivation: [],
          customMotivation: '',
        },
        behaviorPattern: {
          goodsPurchase: 50,
          photoZonePreference: 50,
          stayDuration: 50,
          companionType: 50,
        },
        behaviorScenario: {
          before: '',
          during: '',
          after: '',
        },
      },
    ])
    setCurrentPersonaIndex(personas.length)
  }

  // 페르소나 삭제
  const removePersona = (id: number) => {
    if (personas.length > 1) {
      const filtered = personas.filter((p) => p.id !== id)
      setPersonas(filtered)
      if (currentPersonaIndex >= filtered.length) {
        setCurrentPersonaIndex(filtered.length - 1)
      }
    }
  }

  // 페르소나 업데이트
  const updatePersona = (id: number, field: string, value: any) => {
    setPersonas(
      personas.map((p) => {
        if (p.id === id) {
          if (field.includes('.')) {
            const [parent, child] = field.split('.')
            return {
              ...p,
              [parent]: {
                ...(p as any)[parent],
                [child]: value,
              },
            }
          }
          return { ...p, [field]: value }
        }
        return p
      })
    )
  }

  // 진행률 계산
  const calculateProgress = (): number => {
    if (personas.length === 0) return 0

    let totalFilled = 0
    let totalFields = 0

    personas.forEach((persona) => {
      // 프로필 정보
      totalFields += 3
      if (persona.profile.name.trim()) totalFilled += 1
      if (persona.profile.age.trim()) totalFilled += 1
      if (persona.profile.job.trim()) totalFilled += 1

      // 라이프스타일 태그
      totalFields += 1
      if (persona.profile.lifestyleTags.length > 0) totalFilled += 1

      // 방문 동기
      totalFields += 1
      if (
        persona.profile.visitMotivation.length > 0 ||
        persona.profile.customMotivation.trim()
      )
        totalFilled += 1

      // 행동 시나리오
      totalFields += 3
      if (persona.behaviorScenario.before.trim()) totalFilled += 1
      if (persona.behaviorScenario.during.trim()) totalFilled += 1
      if (persona.behaviorScenario.after.trim()) totalFilled += 1
    })

    return totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0
  }

  // 진행률 계산 함수 등록
  useEffect(() => {
    registerProgressCalculator(2 as 1 | 2 | 3, (data: any) => {
      if (!data || !data.personas || !Array.isArray(data.personas)) return 0

      let totalFilled = 0
      let totalFields = 0

      data.personas.forEach((persona: any) => {
        if (persona.profile) {
          totalFields += 3
          if (persona.profile.name?.trim()) totalFilled += 1
          if (persona.profile.age?.trim()) totalFilled += 1
          if (persona.profile.job?.trim()) totalFilled += 1

          totalFields += 1
          if (persona.profile.lifestyleTags && persona.profile.lifestyleTags.length > 0)
            totalFilled += 1

          totalFields += 1
          if (
            (persona.profile.visitMotivation && persona.profile.visitMotivation.length > 0) ||
            persona.profile.customMotivation?.trim()
          )
            totalFilled += 1
        } else {
          totalFields += 5
        }

        if (persona.behaviorScenario) {
          totalFields += 3
          if (persona.behaviorScenario.before?.trim()) totalFilled += 1
          if (persona.behaviorScenario.during?.trim()) totalFilled += 1
          if (persona.behaviorScenario.after?.trim()) totalFilled += 1
        } else {
          totalFields += 3
        }
      })

      return totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0
    })
  }, [registerProgressCalculator])

  // 라이프스타일 태그 추가 (페르소나별)
  const addLifestyleTag = (personaId: number, tag: string) => {
    const trimmed = tag.trim()
    if (trimmed) {
      const persona = personas.find((p) => p.id === personaId)!
      if (!persona.profile.lifestyleTags.includes(trimmed)) {
        updatePersona(personaId, 'profile', {
          ...persona.profile,
          lifestyleTags: [...persona.profile.lifestyleTags, trimmed],
        })
      }
    }
  }

  // 라이프스타일 태그 삭제 (페르소나별)
  const removeLifestyleTag = (personaId: number, tag: string) => {
    const persona = personas.find((p) => p.id === personaId)!
    updatePersona(personaId, 'profile', {
      ...persona.profile,
      lifestyleTags: persona.profile.lifestyleTags.filter((t) => t !== tag),
    })
  }

  // 방문 동기 토글 (페르소나별)
  const toggleVisitMotivation = (personaId: number, motivation: string) => {
    const persona = personas.find((p) => p.id === personaId)!
    const currentMotivations = persona.profile.visitMotivation

    if (motivation === '기타') {
      if (currentMotivations.includes('기타')) {
        updatePersona(personaId, 'profile', {
          ...persona.profile,
          visitMotivation: currentMotivations.filter((m) => m !== '기타'),
          customMotivation: '',
        })
      } else {
        updatePersona(personaId, 'profile', {
          ...persona.profile,
          visitMotivation: [...currentMotivations, '기타'],
        })
      }
    } else {
      if (currentMotivations.includes(motivation)) {
        updatePersona(personaId, 'profile', {
          ...persona.profile,
          visitMotivation: currentMotivations.filter((m) => m !== motivation),
        })
      } else {
        updatePersona(personaId, 'profile', {
          ...persona.profile,
          visitMotivation: [...currentMotivations, motivation],
        })
      }
    }
  }

  // 페르소나 키워드 자동 매칭
  const getPersonaKeywords = (persona: PersonaCard) => {
    const keywords: string[] = []
    const { goodsPurchase, photoZonePreference, stayDuration, companionType } =
      persona.behaviorPattern

    if (goodsPurchase >= 70) keywords.push('헤비 컬렉터')
    if (photoZonePreference >= 70) keywords.push('인증샷 사냥꾼')
    if (stayDuration >= 70) keywords.push('깊은 체험 추구자')
    if (companionType >= 70) keywords.push('동반자 중심형')

    if (goodsPurchase <= 30) keywords.push('관람 중심형')
    if (photoZonePreference <= 30) keywords.push('직접 경험 선호')
    if (stayDuration <= 30) keywords.push('효율적 관람')
    if (companionType <= 30) keywords.push('솔로 방문자')

    return keywords.length > 0 ? keywords : ['균형잡힌 방문자']
  }

  // 슬라이더 레이블 가져오기
  const getSliderLabel = (type: 'goods' | 'photo' | 'stay' | 'companion', value: number) => {
    if (type === 'goods') {
      return value <= 30 ? '구경만 함' : value >= 70 ? '적극 구매' : '적당히 구매'
    }
    if (type === 'photo') {
      return value <= 30 ? '눈으로 감상' : value >= 70 ? '인증샷 필수' : '간헐적 촬영'
    }
    if (type === 'stay') {
      return value <= 30 ? '짧게 둘러봄' : value >= 70 ? '반나절 이상 체류' : '적당히 체류'
    }
    if (type === 'companion') {
      return value <= 30 ? '혼자' : value >= 70 ? '가족' : '친구/연인'
    }
    return ''
  }

  // 저장
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    // 각 페르소나의 기타 동기 처리
    const processedPersonas = personas.map((persona) => {
      const finalMotivations =
        persona.profile.visitMotivation.includes('기타') && persona.profile.customMotivation.trim()
          ? [
              ...persona.profile.visitMotivation.filter((m) => m !== '기타'),
              persona.profile.customMotivation.trim(),
            ]
          : persona.profile.visitMotivation

      return {
        ...persona,
        profile: {
          ...persona.profile,
          visitMotivation: finalMotivations,
          customMotivation: persona.profile.visitMotivation.includes('기타')
            ? persona.profile.customMotivation
            : '',
        },
      }
    })

    const eventData: EventWeek2Data = {
      personas: processedPersonas,
      is_submitted: isSubmitted,
    }

    const progress = calculateProgress()

    try {
      const success = await saveStepData(2, eventData, progress)

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

    // 각 페르소나의 기타 동기 처리
    const processedPersonas = personas.map((persona) => {
      const finalMotivations =
        persona.profile.visitMotivation.includes('기타') && persona.profile.customMotivation.trim()
          ? [
              ...persona.profile.visitMotivation.filter((m) => m !== '기타'),
              persona.profile.customMotivation.trim(),
            ]
          : persona.profile.visitMotivation

      return {
        ...persona,
        profile: {
          ...persona.profile,
          visitMotivation: finalMotivations,
          customMotivation: persona.profile.visitMotivation.includes('기타')
            ? persona.profile.customMotivation
            : '',
        },
      }
    })

    const eventData: EventWeek2Data = {
      personas: processedPersonas,
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(2, eventData, newSubmittedState, progress)

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

    setPersonas([
      {
        id: 1,
        profile: {
          name: '',
          age: '',
          job: '',
          lifestyleTags: [],
          visitMotivation: [],
          customMotivation: '',
        },
        behaviorPattern: {
          goodsPurchase: 50,
          photoZonePreference: 50,
          stayDuration: 50,
          companionType: 50,
        },
        behaviorScenario: {
          before: '',
          during: '',
          after: '',
        },
      },
    ])
    setCurrentPersonaIndex(0)
    setIsSubmitted(false)
  }

  // 프로젝트 설정 관련
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

    try {
      const success = await deleteProject()
      if (success) {
        setToastMessage('프로젝트가 삭제되었습니다. 대시보드로 이동합니다...')
        setToastVisible(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        setToastMessage('프로젝트 삭제 중 오류가 발생했습니다.')
        setToastVisible(true)
      }
    } catch (error: any) {
      console.error('삭제 처리 중 오류:', error)
      setToastMessage(`프로젝트 삭제 실패: ${error.message || '알 수 없는 오류'}`)
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

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      // 1회차 데이터 로드 (행사 목적 참고용)
      const week1Data = await loadStepData(1)
      if (week1Data && (week1Data as any).eventCriteria) {
        setEventGoals((week1Data as any).eventCriteria.goals || [])
      }

      // 2회차 데이터 로드
      const data = await loadStepData(2)
      if (data) {
        const eventData = data as EventWeek2Data
        // 기존 단일 페르소나 형식 지원 (마이그레이션)
        if ((eventData as any).profile && !eventData.personas) {
          const oldData = eventData as any
          const motivations = oldData.profile.visitMotivation || []
          const standardMotivations = motivations.filter((m: string) =>
            VISIT_MOTIVATIONS.includes(m)
          )
          const customMotivations = motivations.filter((m: string) => !VISIT_MOTIVATIONS.includes(m))

          setPersonas([
            {
              id: 1,
              profile: {
                name: oldData.profile.name || '',
                age: oldData.profile.age || '',
                job: oldData.profile.job || '',
                lifestyleTags: oldData.profile.lifestyleTags || [],
                visitMotivation: customMotivations.length > 0 ? [...standardMotivations, '기타'] : standardMotivations,
                customMotivation: customMotivations[0] || '',
              },
              behaviorPattern: oldData.behaviorPattern || {
                goodsPurchase: 50,
                photoZonePreference: 50,
                stayDuration: 50,
                companionType: 50,
              },
              behaviorScenario: oldData.behaviorScenario || {
                before: '',
                during: '',
                after: '',
              },
            },
          ])
        } else if (eventData.personas && Array.isArray(eventData.personas)) {
          // 각 페르소나의 방문 동기 처리
          const processedPersonas = eventData.personas.map((persona) => {
            const motivations = persona.profile.visitMotivation || []
            const standardMotivations = motivations.filter((m: string) =>
              VISIT_MOTIVATIONS.includes(m)
            )
            const customMotivations = motivations.filter((m: string) => !VISIT_MOTIVATIONS.includes(m))

            return {
              ...persona,
              profile: {
                ...persona.profile,
                visitMotivation: customMotivations.length > 0 ? [...standardMotivations, '기타'] : standardMotivations,
                customMotivation: customMotivations[0] || persona.profile.customMotivation || '',
              },
            }
          })
          setPersonas(processedPersonas)
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
          filter: `project_id=eq.${projectId}&step_number=eq.2`,
        },
        async () => {
          const data = await loadStepData(2)
          if (data) {
            const eventData = data as EventWeek2Data
            // 기존 단일 페르소나 형식 지원 (마이그레이션)
            if ((eventData as any).profile && !eventData.personas) {
              const oldData = eventData as any
              const motivations = oldData.profile.visitMotivation || []
              const standardMotivations = motivations.filter((m: string) =>
                VISIT_MOTIVATIONS.includes(m)
              )
              const customMotivations = motivations.filter((m: string) => !VISIT_MOTIVATIONS.includes(m))

              setPersonas([
                {
                  id: 1,
                  profile: {
                    name: oldData.profile.name || '',
                    age: oldData.profile.age || '',
                    job: oldData.profile.job || '',
                    lifestyleTags: oldData.profile.lifestyleTags || [],
                    visitMotivation: customMotivations.length > 0 ? [...standardMotivations, '기타'] : standardMotivations,
                    customMotivation: customMotivations[0] || '',
                  },
                  behaviorPattern: oldData.behaviorPattern || {
                    goodsPurchase: 50,
                    photoZonePreference: 50,
                    stayDuration: 50,
                    companionType: 50,
                  },
                  behaviorScenario: oldData.behaviorScenario || {
                    before: '',
                    during: '',
                    after: '',
                  },
                },
              ])
            } else if (eventData.personas && Array.isArray(eventData.personas)) {
              // 각 페르소나의 방문 동기 처리
              const processedPersonas = eventData.personas.map((persona) => {
                const motivations = persona.profile.visitMotivation || []
                const standardMotivations = motivations.filter((m: string) =>
                  VISIT_MOTIVATIONS.includes(m)
                )
                const customMotivations = motivations.filter((m: string) => !VISIT_MOTIVATIONS.includes(m))

                return {
                  ...persona,
                  profile: {
                    ...persona.profile,
                    visitMotivation: customMotivations.length > 0 ? [...standardMotivations, '기타'] : standardMotivations,
                    customMotivation: customMotivations[0] || persona.profile.customMotivation || '',
                  },
                }
              })
              setPersonas(processedPersonas)
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
        title="Phase 1: Data - 2회: 타겟 페르소나"
        description="행사에 방문할 핵심 타겟을 정의하고, 그들의 소비 성향과 행동 패턴을 시각화합니다."
        phase="Phase 1: Data"
        isScrolled={isScrolled}
        currentWeek={2}
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
          currentWeek={2}
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
            {/* 1회차 행사 목적 참고용 */}
            {eventGoals.length > 0 && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 bg-gray-600 text-white text-xs font-medium rounded">
                      참고
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-600" />
                      1회차 참고 정보
                    </h3>
                    <p className="text-sm text-gray-700 mb-1">행사 목적: {eventGoals.join(', ')}</p>
                    <p className="text-xs text-gray-600">
                      이 목적을 바탕으로 타겟팅의 일관성을 유지해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 페르소나 카드들 */}
            <div className="space-y-8 mb-8">
              {personas.map((persona, personaIndex) => (
                <div
                  key={persona.id}
                  className="glass rounded-2xl shadow-lg border-2 border-gray-200 hover:border-indigo-300 transition-colors"
                >
                  {/* 페르소나 헤더 */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                          {personaIndex + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {persona.profile.name || `페르소나 ${personaIndex + 1}`}
                          </h3>
                          {persona.profile.name && (
                            <p className="text-sm text-gray-600">
                              {persona.profile.age} · {persona.profile.job}
                            </p>
                          )}
                        </div>
                      </div>
                      {personas.length > 1 && !readonly && (
                        <button
                          onClick={() => removePersona(persona.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="페르소나 삭제"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 섹션 1, 2, 3을 3개 그리드로 배치 */}
                  <div className="p-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                      {/* 섹션 1: 방문객 프로필 빌더 */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <User className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-semibold text-gray-900">프로필 정보</h4>
                        </div>
                        
                        {/* 기본 정보 */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              이름 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={persona.profile.name}
                              onChange={(e) =>
                                updatePersona(persona.id, 'profile', {
                                  ...persona.profile,
                                  name: e.target.value,
                                })
                              }
                              disabled={readonly}
                              placeholder="예: 김민수"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              나이 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={persona.profile.age}
                              onChange={(e) =>
                                updatePersona(persona.id, 'profile', {
                                  ...persona.profile,
                                  age: e.target.value,
                                })
                              }
                              disabled={readonly}
                              placeholder="예: 28세"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              직업 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={persona.profile.job}
                              onChange={(e) =>
                                updatePersona(persona.id, 'profile', {
                                  ...persona.profile,
                                  job: e.target.value,
                                })
                              }
                              disabled={readonly}
                              placeholder="예: 마케터"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* 라이프스타일 태그 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            라이프스타일 태그
                          </label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={personaLifestyleTagInputs[persona.id] || ''}
                              onChange={(e) =>
                                setPersonaLifestyleTagInputs({
                                  ...personaLifestyleTagInputs,
                                  [persona.id]: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const input = personaLifestyleTagInputs[persona.id] || ''
                                  if (input.trim()) {
                                    addLifestyleTag(persona.id, input)
                                    setPersonaLifestyleTagInputs({
                                      ...personaLifestyleTagInputs,
                                      [persona.id]: '',
                                    })
                                  }
                                }
                              }}
                              disabled={readonly}
                              placeholder="태그 입력 후 Enter"
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> 키로 추가
                          </p>
                          {persona.profile.lifestyleTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {persona.profile.lifestyleTags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                                >
                                  {tag}
                                  {!readonly && (
                                    <button
                                      type="button"
                                      onClick={() => removeLifestyleTag(persona.id, tag)}
                                      className="text-indigo-700 hover:text-indigo-900"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 방문 동기 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            방문 동기 <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {VISIT_MOTIVATIONS.map((motivation) => (
                              <button
                                key={motivation}
                                type="button"
                                onClick={() => toggleVisitMotivation(persona.id, motivation)}
                                disabled={readonly}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  persona.profile.visitMotivation.includes(motivation)
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {motivation}
                              </button>
                            ))}
                          </div>
                          {persona.profile.visitMotivation.includes('기타') && (
                            <div className="mt-2">
                              <input
                                type="text"
                                value={persona.profile.customMotivation}
                                onChange={(e) =>
                                  updatePersona(persona.id, 'profile', {
                                    ...persona.profile,
                                    customMotivation: e.target.value,
                                  })
                                }
                                disabled={readonly}
                                placeholder="기타 방문 동기"
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 섹션 2: 소비 및 행동 패턴 */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Sliders className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-semibold text-gray-900">행동 패턴</h4>
                        </div>

                        <div className="space-y-4">
                          {/* 굿즈 구매 성향 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <ShoppingBag className="w-3 h-3" />
                                굿즈 구매
                              </label>
                              <span className="text-sm font-bold text-indigo-600">
                                {persona.behaviorPattern.goodsPurchase}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={persona.behaviorPattern.goodsPurchase}
                              onChange={(e) =>
                                updatePersona(persona.id, 'behaviorPattern', {
                                  ...persona.behaviorPattern,
                                  goodsPurchase: parseInt(e.target.value),
                                })
                              }
                              disabled={readonly}
                              className="w-full h-2 bg-gradient-to-r from-gray-200 via-indigo-200 to-indigo-400 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                              <span>구경</span>
                              <span>구매</span>
                            </div>
                          </div>

                          {/* 포토존 선호도 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                포토존
                              </label>
                              <span className="text-sm font-bold text-indigo-600">
                                {persona.behaviorPattern.photoZonePreference}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={persona.behaviorPattern.photoZonePreference}
                              onChange={(e) =>
                                updatePersona(persona.id, 'behaviorPattern', {
                                  ...persona.behaviorPattern,
                                  photoZonePreference: parseInt(e.target.value),
                                })
                              }
                              disabled={readonly}
                              className="w-full h-2 bg-gradient-to-r from-gray-200 via-indigo-200 to-indigo-400 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                              <span>감상</span>
                              <span>필수</span>
                            </div>
                          </div>

                          {/* 체류 시간 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                체류 시간
                              </label>
                              <span className="text-sm font-bold text-indigo-600">
                                {persona.behaviorPattern.stayDuration}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={persona.behaviorPattern.stayDuration}
                              onChange={(e) =>
                                updatePersona(persona.id, 'behaviorPattern', {
                                  ...persona.behaviorPattern,
                                  stayDuration: parseInt(e.target.value),
                                })
                              }
                              disabled={readonly}
                              className="w-full h-2 bg-gradient-to-r from-gray-200 via-indigo-200 to-indigo-400 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                              <span>짧게</span>
                              <span>길게</span>
                            </div>
                          </div>

                          {/* 동반인 유형 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                동반인
                              </label>
                              <span className="text-sm font-bold text-indigo-600">
                                {persona.behaviorPattern.companionType}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={persona.behaviorPattern.companionType}
                              onChange={(e) =>
                                updatePersona(persona.id, 'behaviorPattern', {
                                  ...persona.behaviorPattern,
                                  companionType: parseInt(e.target.value),
                                })
                              }
                              disabled={readonly}
                              className="w-full h-2 bg-gradient-to-r from-gray-200 via-indigo-200 to-indigo-400 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                              <span>혼자</span>
                              <span>가족</span>
                            </div>
                          </div>

                          {/* 페르소나 키워드 */}
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-3">
                            <h5 className="text-xs font-semibold text-indigo-900 mb-1.5">키워드</h5>
                            <div className="flex flex-wrap gap-1">
                              {getPersonaKeywords(persona).map((keyword, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-xs font-medium"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 섹션 3: 페르소나 행동 시나리오 */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-semibold text-gray-900">행동 시나리오</h4>
                        </div>

                        <div className="space-y-4">
                          {/* 방문 전 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                                1
                              </span>
                              방문 전 (Before)
                            </label>
                            <textarea
                              value={persona.behaviorScenario.before}
                              onChange={(e) =>
                                updatePersona(persona.id, 'behaviorScenario', {
                                  ...persona.behaviorScenario,
                                  before: e.target.value,
                                })
                              }
                              disabled={readonly}
                              rows={3}
                              placeholder="행사를 알게 되는 경로와 방문 결심 이유"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* 방문 중 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                                2
                              </span>
                              방문 중 (During)
                            </label>
                            <textarea
                              value={persona.behaviorScenario.during}
                              onChange={(e) =>
                                updatePersona(persona.id, 'behaviorScenario', {
                                  ...persona.behaviorScenario,
                                  during: e.target.value,
                                })
                              }
                              disabled={readonly}
                              rows={3}
                              placeholder="도착 후 행동과 체류 시간이 긴 콘텐츠"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* 방문 후 */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                                3
                              </span>
                              방문 후 (After)
                            </label>
                            <textarea
                              value={persona.behaviorScenario.after}
                              onChange={(e) =>
                                updatePersona(persona.id, 'behaviorScenario', {
                                  ...persona.behaviorScenario,
                                  after: e.target.value,
                                })
                              }
                              disabled={readonly}
                              rows={3}
                              placeholder="감정과 SNS 게시 내용"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 페르소나 추가 버튼 */}
              {!readonly && (
                <button
                  onClick={addPersona}
                  className="w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-indigo-600 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  페르소나 추가
                </button>
              )}
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

export default function EventWeek2Page() {
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
      <EventWeek2PageContent />
    </Suspense>
  )
}

