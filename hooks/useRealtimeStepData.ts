/**
 * 워크북 step 데이터의 실시간 업데이트를 위한 훅
 * 다른 팀원이 데이터를 저장하면 자동으로 화면에 반영됩니다.
 */

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface UseRealtimeStepDataOptions {
  projectId: string
  stepNumber: number
  onUpdate: () => void | Promise<void>
}

export function useRealtimeStepData({
  projectId,
  stepNumber,
  onUpdate,
}: UseRealtimeStepDataOptions) {
  useEffect(() => {
    if (!projectId) return

    const supabase = createClient()

    // 실시간 업데이트 구독
    const channel = supabase
      .channel(`project-steps-${projectId}-week${stepNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_steps',
          filter: `project_id=eq.${projectId}&step_number=eq.${stepNumber}`,
        },
        async (payload) => {
          console.log(`Week ${stepNumber} 데이터 업데이트 감지:`, payload)
          await onUpdate()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_steps',
          filter: `project_id=eq.${projectId}&step_number=eq.${stepNumber}`,
        },
        async (payload) => {
          console.log(`Week ${stepNumber} 데이터 삽입 감지:`, payload)
          await onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, stepNumber, onUpdate])
}

