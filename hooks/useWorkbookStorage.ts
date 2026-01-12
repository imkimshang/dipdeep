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
import { Database } from '@/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
type ProjectStepInsert = Database['public']['Tables']['project_steps']['Insert']

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
        const { data: step, error: err } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .eq('step_number', stepNumber)
          .maybeSingle()

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
        const projectData = project as Project
        const isAuthor = projectData.user_id === user.id
        const memberEmails = projectData.member_emails || []
        const isTeamMember = projectData.is_team && memberEmails.includes(user.email || '')

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
        if (projectData.is_team && isTeamMember) {
          try {
            const changedFields = getChangedFields(cleanOldData, data, user.id)
            
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
            
            // Save step data with field editors
            const stepInsert: ProjectStepInsert = {
              project_id: projectId,
              step_number: stepNumber,
              step_data: dataWithEditors,
            }
            const { error: err } = await supabase.from('project_steps').upsert(stepInsert, {
              onConflict: 'project_id,step_number',
            })
            
            if (err) throw err
          } catch (err: any) {
            console.error('필드 편집자 추적 오류:', err)
            // 오류 발생 시 기존 방식으로 저장 시도 (하위 호환성)
            const stepInsertFallback: ProjectStepInsert = {
              project_id: projectId,
              step_number: stepNumber,
              step_data: data,
            }
            const { error: err2 } = await supabase.from('project_steps').upsert(stepInsertFallback, {
              onConflict: 'project_id,step_number',
            })
            if (err2) throw err2
          }
        } else {
          // 개인 프로젝트이거나 작성자인 경우 - 기존처럼 저장
          const stepInsert: ProjectStepInsert = {
            project_id: projectId,
            step_number: stepNumber,
            step_data: data,
          }
          const { error: err } = await supabase.from('project_steps').upsert(stepInsert, {
            onConflict: 'project_id,step_number',
          })
          
          if (err) throw err
        }

        // Update project progress and last_editor_id if provided
        const updateData: ProjectUpdate = {
          last_editor_id: profile?.id || user.id,
          updated_at: new Date().toISOString(),
        }
        
        if (progressRate !== undefined) {
          updateData.current_step = stepNumber
          updateData.progress_rate = progressRate
        }
        
        await supabase.from('projects').update(updateData).eq('id', projectId)

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
        const projectData = project as Project
        const isAuthor = projectData.user_id === user.id
        const memberEmails = projectData.member_emails || []
        const isTeamMember = projectData.is_team && memberEmails.includes(user.email || '')

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
        if (projectData.is_team && isTeamMember) {
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
          
          const stepInsert: ProjectStepInsert = {
            project_id: projectId,
            step_number: stepNumber,
            step_data: dataWithEditors,
          }
          const { error: err } = await supabase.from('project_steps').upsert(stepInsert, {
            onConflict: 'project_id,step_number',
          })
          
          if (err) throw err
        } else {
          // 개인 프로젝트이거나 작성자인 경우
          const stepInsert: ProjectStepInsert = {
            project_id: projectId,
            step_number: stepNumber,
            step_data: stepDataWithSubmit,
          }
          const { error: err } = await supabase.from('project_steps').upsert(stepInsert, {
            onConflict: 'project_id,step_number',
          })
          
          if (err) throw err
        }

        const updateData: ProjectUpdate = {
          last_editor_id: profile?.id || user.id,
          updated_at: new Date().toISOString(),
        }
        
        if (progressRate !== undefined) {
          updateData.current_step = stepNumber
          updateData.progress_rate = progressRate
        }
        
        await supabase.from('projects').update(updateData).eq('id', projectId)

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

