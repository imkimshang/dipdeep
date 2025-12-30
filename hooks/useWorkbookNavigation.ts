import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface StepStatus {
  hasData: boolean
  isSubmitted: boolean
  progress: number
}

const WEEK_TITLES: { [key: number]: string } = {
  1: 'Phase 1 - 문제 발견과 목표 설정',
  2: 'Phase 1 - 데이터 탐색 및 교차 검증',
  3: 'Phase 1 - 가상 페르소나 설정 및 설문 설계',
  4: 'Phase 1 - 문제 정의',
  5: 'Phase 2 - 인사이트 도출',
  6: 'Phase 2 - 의미 탐구',
  7: 'Phase 2 - 패턴 분석',
  8: 'Phase 2 - 핵심 가치 발견',
  9: 'Phase 3 - 프로토타입 기획',
  10: 'Phase 3 - 프로토타입 설계',
  11: 'Phase 3 - 프로토타입 구현',
  12: 'Phase 3 - 검증과 개선',
}

// 전역 진행률 계산 함수 저장소 (모든 회차 공유)
const globalProgressCalculators: { [key: number]: (data: any) => number } = {}

export function useWorkbookNavigation(projectId: string) {
  const supabase = createClient()
  const [allSteps, setAllSteps] = useState<any[]>([])
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const loadSteps = useCallback(async () => {
    if (!projectId) return

    try {
      const { data: steps } = await supabase
        .from('project_steps')
        .select('*')
        .eq('project_id', projectId)
        .order('step_number', { ascending: true })

      if (steps) {
        setAllSteps(steps as any[])
      }
    } catch (error) {
      console.error('Steps 로드 오류:', error)
    }
  }, [projectId, supabase])

  useEffect(() => {
    loadSteps()
  }, [loadSteps])

  const getWeekTitle = useCallback((week: number): string => {
    return WEEK_TITLES[week] || `Week ${week}`
  }, [])

  // 진행률 계산 함수 등록 (전역 저장소에 저장)
  const registerProgressCalculator = useCallback((stepNumber: number, calculator: (data: any) => number) => {
    globalProgressCalculators[stepNumber] = calculator
  }, [])

  const getStepStatus = useCallback(
    (stepNumber: number, customProgressCalc?: (data: any) => number): StepStatus => {
      const step = allSteps.find((s) => (s as any).step_number === stepNumber)
      if (!step || !(step as any).step_data) {
        return { hasData: false, isSubmitted: false, progress: 0 }
      }

      const data = (step as any).step_data as any
      
      // 제출 상태 확인
      const isSubmitted = data.is_submitted || false
      
      // 데이터 존재 여부 확인: is_submitted를 제외한 실제 입력 데이터가 있는지 확인
      let hasData = false
      if (data && typeof data === 'object') {
        const keys = Object.keys(data).filter(key => key !== 'is_submitted')
        hasData = keys.some(key => {
          const value = data[key]
          if (value === null || value === undefined) return false
          if (typeof value === 'string' && value.trim() === '') return false
          if (Array.isArray(value) && value.length === 0) return false
          if (typeof value === 'object' && Object.keys(value).length === 0) return false
          return true
        })
      }

      let progress = 0
      // 우선순위: customProgressCalc > 등록된 계산 함수 > 기본 계산
      if (customProgressCalc) {
        progress = customProgressCalc(data)
      } else if (globalProgressCalculators[stepNumber]) {
        progress = globalProgressCalculators[stepNumber](data)
      } else {
        // Default progress calculation
        progress = hasData ? 50 : 0
      }

      return { hasData, isSubmitted, progress }
    },
    [allSteps]
  )

  const getPhaseProgress = useCallback(
    (phase: 1 | 2 | 3): number => {
      const phaseWeeks = {
        1: [1, 2, 3, 4],
        2: [5, 6, 7, 8],
        3: [9, 10, 11, 12],
      }

      const weeks = phaseWeeks[phase]
      let totalProgress = 0
      // 모든 회차를 포함하되, 데이터가 없으면 0%로 계산
      const totalWeeks = weeks.length

      weeks.forEach((week) => {
        // 각 회차별로 등록된 계산 함수를 사용 (customProgressCalc 사용 안 함)
        const status = getStepStatus(week)
        totalProgress += status.progress // 데이터가 없으면 0이므로 그대로 더함
      })

      return Math.round(totalProgress / totalWeeks)
    },
    [getStepStatus]
  )

  const getOverallProgress = useCallback((): number => {
    let totalProgress = 0
    const totalWeeks = 12

    for (let week = 1; week <= 12; week++) {
      // 각 회차별로 등록된 계산 함수를 사용 (customProgressCalc 사용 안 함)
      const status = getStepStatus(week)
      totalProgress += status.progress // 데이터가 없으면 0이므로 그대로 더함
    }

    return Math.round(totalProgress / totalWeeks)
  }, [getStepStatus])

  return {
    allSteps,
    isScrolled,
    loadSteps,
    getWeekTitle,
    getStepStatus,
    getPhaseProgress,
    getOverallProgress,
    registerProgressCalculator,
  }
}

