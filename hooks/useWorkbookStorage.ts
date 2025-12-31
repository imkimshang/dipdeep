import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  extractFieldEditors,
  mergeFieldEditors,
  getChangedFields,
  canEditField,
  FieldEditors,
} from './useFieldEditorTracking'

interface StepData {
  [key: string]: any
  is_submitted?: boolean
  _fieldEditors?: FieldEditors
}

export function useWorkbookStorage(projectId: string) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStepData = useCallback(
    async (stepNumber: number, forceReload = false): Promise<StepData | null> => {
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

        // 필드 편집자 정보 제거하여 깨끗한 데이터 반환
        const stepData = step?.step_data || null
        if (stepData && typeof stepData === 'object') {
          const { data } = extractFieldEditors(stepData)
          return data
        }
        return stepData
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

        // Verify project access (작성자이거나 팀원인지 확인)
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (!project) {
          setError('프로젝트를 찾을 수 없습니다.')
          return false
        }

        // 권한 검증: 작성자이거나 팀원인지 확인
        const isAuthor = (project as any).user_id === user.id
        const memberEmails = (project as any).member_emails || []
        const isTeamMember = (project as any).is_team && memberEmails.includes(user.email)

        if (!isAuthor && !isTeamMember) {
          setError('이 프로젝트에 대한 접근 권한이 없습니다.')
          router.push('/dashboard')
          return false
        }

        // Get user profile for last_editor_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // 기존 step_data 로드하여 필드 편집자 정보 추출
        const { data: existingStep } = await supabase
          .from('project_steps')
          .select('step_data')
          .eq('project_id', projectId)
          .eq('step_number', stepNumber)
          .maybeSingle()

        const { data: cleanOldData, fieldEditors: oldFieldEditors } = extractFieldEditors(
          existingStep?.step_data || null
        )

        // 변경된 필드 추출 및 편집 권한 확인 (팀 프로젝트인 경우만)
        if ((project as any).is_team && isTeamMember) {
          try {
            const changedFields = getChangedFields(cleanOldData, data, user.id)
            
            console.log('변경된 필드:', changedFields)
            console.log('기존 필드 편집자:', oldFieldEditors)
            
            // 변경된 필드 중 권한이 없는 필드가 있는지 확인
            for (const [fieldPath, editorId] of Object.entries(changedFields)) {
              if (!canEditField(fieldPath, oldFieldEditors, user.id, cleanOldData)) {
                const fieldName = fieldPath.split(/[\.\[\]]/).pop() || fieldPath
                setError(`'${fieldName}' 필드는 작성자만 수정할 수 있습니다.`)
                setLoading(false)
                return false
              }
            }
            
            // 필드 편집자 정보 병합
            const dataWithEditors = mergeFieldEditors(data, oldFieldEditors, changedFields)
            console.log('병합된 데이터:', dataWithEditors)
            
            // Save step data with field editors
            const { error: err } = await supabase.from('project_steps').upsert(
              {
                project_id: projectId,
                step_number: stepNumber,
                step_data: dataWithEditors,
              } as any,
              {
                onConflict: 'project_id,step_number',
              }
            )
            
            if (err) throw err
          } catch (err: any) {
            console.error('필드 편집자 추적 오류:', err)
            // 오류 발생 시 기존 방식으로 저장 시도 (하위 호환성)
            const { error: err2 } = await supabase.from('project_steps').upsert(
              {
                project_id: projectId,
                step_number: stepNumber,
                step_data: data,
              } as any,
              {
                onConflict: 'project_id,step_number',
              }
            )
            if (err2) throw err2
          }
        } else {
          // 개인 프로젝트이거나 작성자인 경우 - 기존처럼 저장
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
        }

        // Update project progress and last_editor_id if provided
        if (progressRate !== undefined) {
          await (supabase.from('projects') as any).update({
            current_step: stepNumber,
            progress_rate: progressRate,
            last_editor_id: profile?.id || user.id,
            updated_at: new Date(),
          }).eq('id', projectId)
        } else {
          // progressRate가 없어도 last_editor_id는 업데이트
          await (supabase.from('projects') as any).update({
            last_editor_id: profile?.id || user.id,
            updated_at: new Date(),
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

        // Verify project access (작성자이거나 팀원인지 확인)
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (!project) {
          setError('프로젝트를 찾을 수 없습니다.')
          return false
        }

        // 권한 검증: 작성자이거나 팀원인지 확인
        const isAuthor = (project as any).user_id === user.id
        const memberEmails = (project as any).member_emails || []
        const isTeamMember = (project as any).is_team && memberEmails.includes(user.email)

        if (!isAuthor && !isTeamMember) {
          setError('이 프로젝트에 대한 접근 권한이 없습니다.')
          router.push('/dashboard')
          return false
        }

        // Get user profile for last_editor_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // 기존 step_data 로드하여 필드 편집자 정보 추출
        const { data: existingStep } = await supabase
          .from('project_steps')
          .select('step_data')
          .eq('project_id', projectId)
          .eq('step_number', stepNumber)
          .maybeSingle()

        const { data: cleanOldData, fieldEditors: oldFieldEditors } = extractFieldEditors(
          existingStep?.step_data || null
        )

        const stepDataWithSubmit: StepData = {
          ...data,
          is_submitted: isSubmitted,
        }

        // 팀 프로젝트인 경우 필드 편집자 정보 처리
        if ((project as any).is_team && isTeamMember) {
          const changedFields = getChangedFields(cleanOldData, stepDataWithSubmit, user.id)
          
          // 변경된 필드 중 권한이 없는 필드가 있는지 확인 (is_submitted 필드는 제외)
          for (const [fieldPath, editorId] of Object.entries(changedFields)) {
            if (fieldPath !== 'is_submitted' && !canEditField(fieldPath, oldFieldEditors, user.id, cleanOldData)) {
              const fieldName = fieldPath.split('.').pop() || fieldPath
              setError(`'${fieldName}' 필드는 작성자만 수정할 수 있습니다.`)
              setLoading(false)
              return false
            }
          }
          
          // 필드 편집자 정보 병합
          const dataWithEditors = mergeFieldEditors(stepDataWithSubmit, oldFieldEditors, changedFields)
          
          const { error: err } = await (supabase.from('project_steps') as any).upsert(
            {
              project_id: projectId,
              step_number: stepNumber,
              step_data: dataWithEditors,
            },
            {
              onConflict: 'project_id,step_number',
            }
          )
          
          if (err) throw err
        } else {
          // 개인 프로젝트이거나 작성자인 경우
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
        }

        if (progressRate !== undefined) {
          await (supabase.from('projects') as any).update({
            current_step: stepNumber,
            progress_rate: progressRate,
            last_editor_id: profile?.id || user.id,
            updated_at: new Date(),
          }).eq('id', projectId)
        } else {
          // progressRate가 없어도 last_editor_id는 업데이트
          await (supabase.from('projects') as any).update({
            last_editor_id: profile?.id || user.id,
            updated_at: new Date(),
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

