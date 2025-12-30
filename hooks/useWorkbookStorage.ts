import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface StepData {
  [key: string]: any
  is_submitted?: boolean
}

export function useWorkbookStorage(projectId: string) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStepData = useCallback(
    async (stepNumber: number): Promise<StepData | null> => {
      if (!projectId) return null

      try {
        const { data: step, error: err } = (await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .eq('step_number', stepNumber)
          .maybeSingle()) as any

        // 데이터가 없거나 에러가 발생한 경우 (PGRST116 등) null 반환
        if (err) {
          // PGRST116은 "결과가 0개 행" 오류 - 정상적인 상황
          if (err.code === 'PGRST116') {
            return null
          }
          throw err
        }

        return step?.step_data || null
      } catch (err: any) {
        // 예상치 못한 에러만 콘솔에 출력
        if (err.code !== 'PGRST116') {
          console.error('데이터 로드 오류:', err)
          setError(err.message)
        }
        return null
      }
    },
    [projectId, supabase]
  )

  const loadAllSteps = useCallback(async () => {
    if (!projectId) return []

    try {
      const { data: steps, error: err } = await supabase
        .from('project_steps')
        .select('*')
        .eq('project_id', projectId)
        .order('step_number', { ascending: true })

      if (err) throw err
      return steps || []
    } catch (err: any) {
      console.error('Steps 로드 오류:', err)
      setError(err.message)
      return []
    }
  }, [projectId, supabase])

  const saveStepData = useCallback(
    async (
      stepNumber: number,
      data: StepData,
      progressRate?: number
    ): Promise<boolean> => {
      if (!projectId) {
        setError('프로젝트 ID가 필요합니다.')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return false
        }

        // Verify project ownership
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single()

        if (!project) {
          setError('프로젝트를 찾을 수 없습니다.')
          return false
        }

        // Save step data
        const { error: err } = await supabase.from('project_steps').upsert(
          {
            project_id: projectId,
            step_number: stepNumber,
            step_data: data,
          } as any,
          {
            onConflict: 'project_id,step_number',
          }
        )

        if (err) throw err

        // Update project progress if provided
        if (progressRate !== undefined) {
          await (supabase.from('projects') as any).update({
            current_step: stepNumber,
            progress_rate: progressRate,
          }).eq('id', projectId)
        }

        return true
      } catch (err: any) {
        console.error('저장 오류:', err)
        setError(err.message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [projectId, supabase, router]
  )

  const submitStep = useCallback(
    async (
      stepNumber: number,
      data: StepData,
      isSubmitted: boolean,
      progressRate?: number
    ): Promise<boolean> => {
      if (!projectId) {
        setError('프로젝트 ID가 필요합니다.')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return false
        }

        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single()

        if (!project) {
          setError('프로젝트를 찾을 수 없습니다.')
          return false
        }

        const stepDataWithSubmit: StepData = {
          ...data,
          is_submitted: isSubmitted,
        }

        const { error: err } = await (supabase.from('project_steps') as any).upsert(
          {
            project_id: projectId,
            step_number: stepNumber,
            step_data: stepDataWithSubmit,
          },
          {
            onConflict: 'project_id,step_number',
          }
        )

        if (err) throw err

        if (progressRate !== undefined) {
          await (supabase.from('projects') as any).update({
            current_step: stepNumber,
            progress_rate: progressRate,
          }).eq('id', projectId)
        }

        return true
      } catch (err: any) {
        console.error('제출 오류:', err)
        setError(err.message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [projectId, supabase, router]
  )

  return {
    loading,
    error,
    loadStepData,
    loadAllSteps,
    saveStepData,
    submitStep,
  }
}

