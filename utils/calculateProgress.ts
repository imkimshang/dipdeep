// 진행률 계산 함수 (단위별 상태 기반)
// 시작전: 0%, 진행중: 50%, 제출: 100%
export function calculateProgress(steps: any[]): { 
  overall: number
  phase1: number
  phase2: number
  phase3: number
  weekly: { week: number; progress: number; status: 'notStarted' | 'inProgress' | 'completed' }[]
} {
  const phaseWeeks = {
    phase1: [1, 2, 3, 4],
    phase2: [5, 6, 7, 8],
    phase3: [9, 10, 11, 12],
  }

  let totalProgress = 0
  let phase1Progress = 0
  let phase2Progress = 0
  let phase3Progress = 0
  const weekly: { week: number; progress: number; status: 'notStarted' | 'inProgress' | 'completed' }[] = []

  for (let week = 1; week <= 12; week++) {
    const step = steps.find((s: any) => s.step_number === week)
    
    // 상태 판단 및 진행률 계산
    let progress = 0
    let status: 'notStarted' | 'inProgress' | 'completed' = 'notStarted'
    
    if (step && step.step_data) {
      const stepData = step.step_data as any
      
      // step_data가 객체가 아닌 경우 처리
      if (typeof stepData !== 'object' || stepData === null) {
        progress = 0
        status = 'notStarted'
      } else {
        // is_submitted가 true면 제출 완료 (100%)
        const isSubmitted = stepData.is_submitted === true || 
                           stepData.is_submitted === 'true' || 
                           stepData.is_submitted === 1
        
        if (isSubmitted) {
          progress = 100
          status = 'completed'
        } else {
          // step_data가 있고 is_submitted가 없거나 false면 진행중 여부 확인
          // 중첩된 객체도 재귀적으로 확인하는 함수
          // _fieldEditors 같은 메타데이터 필드는 제외
          const hasRealData = (obj: any): boolean => {
            if (obj === null || obj === undefined) return false
            if (typeof obj === 'string') return obj.trim() !== ''
            if (typeof obj === 'number') return true
            if (typeof obj === 'boolean') return true
            if (Array.isArray(obj)) {
              return obj.length > 0 && obj.some(item => hasRealData(item))
            }
            if (typeof obj === 'object') {
              // _fieldEditors 같은 메타데이터 필드 제외
              const keys = Object.keys(obj).filter(key => 
                key !== 'is_submitted' && 
                key !== '_fieldEditors'
              )
              if (keys.length === 0) return false
              return keys.some(key => hasRealData(obj[key]))
            }
            return false
          }
          
          // _fieldEditors 메타데이터 필드 제외
          const keys = Object.keys(stepData).filter(key => 
            key !== 'is_submitted' && 
            key !== '_fieldEditors'
          )
          const hasData = keys.length > 0 && hasRealData(stepData)
          
          if (hasData) {
            // 실제 데이터가 있으면 진행중 (50%)
            progress = 50
            status = 'inProgress'
          } else {
            // 데이터가 없으면 시작전 (0%)
            progress = 0
            status = 'notStarted'
          }
        }
      }
    } else {
      // step이 없거나 step_data가 없으면 시작전 (0%)
      progress = 0
      status = 'notStarted'
    }
    
    totalProgress += progress
    weekly.push({ week, progress, status })

    if (phaseWeeks.phase1.includes(week)) {
      phase1Progress += progress
    } else if (phaseWeeks.phase2.includes(week)) {
      phase2Progress += progress
    } else if (phaseWeeks.phase3.includes(week)) {
      phase3Progress += progress
    }
  }

  return {
    overall: Math.round(totalProgress / 12),
    phase1: Math.round(phase1Progress / 4),
    phase2: Math.round(phase2Progress / 4),
    phase3: Math.round(phase3Progress / 4),
    weekly,
  }
}

