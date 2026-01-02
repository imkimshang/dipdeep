import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function useProjectSettings(projectId: string) {
  const supabase = createClient()
  const router = useRouter()
  const [projectInfo, setProjectInfo] = useState<{ 
    title: string | null
    id: string
    type?: string | null
    is_team?: boolean
    team_code?: string | null
    member_emails?: string[]
    is_owner?: boolean
    is_hidden?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const loadProjectInfo = useCallback(async () => {
    if (!projectId) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // 프로젝트 정보 조회 (작성자 또는 팀원 모두 가능)
      const { data: project } = await supabase
        .from('projects')
        .select('title, id, type, is_team, team_code, member_emails, user_id, is_hidden')
        .eq('id', projectId)
        .single()

      if (project) {
        // 권한 확인: 작성자이거나 팀원인지
        const isOwner = (project as any).user_id === user.id
        const memberEmails = (project as any).member_emails || []
        const isTeamMember = (project as any).is_team && Array.isArray(memberEmails) && memberEmails.includes(user.email || '')

        if (!isOwner && !isTeamMember) {
          console.error('프로젝트 접근 권한이 없습니다.')
          return ''
        }

        const proj = project as { 
          title: string | null
          id: string
          type?: string | null
          is_team?: boolean
          team_code?: string | null
          member_emails?: string[]
          user_id?: string
          is_hidden?: boolean
        }
        setProjectInfo({ 
          title: proj.title, 
          id: proj.id,
          type: (project as any).type || null,
          is_team: proj.is_team || false,
          team_code: proj.team_code || null,
          member_emails: proj.member_emails || [],
          is_owner: isOwner,
          is_hidden: proj.is_hidden || false,
        } as any)
        return proj.title || ''
      }
    } catch (error) {
      console.error('프로젝트 정보 로드 오류:', error)
    }
    return ''
  }, [projectId, supabase])

  const updateProjectTitle = useCallback(
    async (newTitle: string): Promise<boolean> => {
      if (!projectInfo || !newTitle.trim()) {
        return false
      }

      // 팀 프로젝트 수정 권한: 팀 개설자만 가능
      if (projectInfo.is_team && !projectInfo.is_owner) {
        console.error('팀 프로젝트명은 팀 개설자만 수정할 수 있습니다.')
        return false
      }

      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return false
        }

        // 개인 프로젝트는 작성자만 수정 가능, 팀 프로젝트는 개설자만 수정 가능
        const { error } = await (supabase.from('projects') as any).update({
          title: newTitle.trim(),
        }).eq('id', projectInfo.id).eq('user_id', user.id)

        if (error) throw error

        setProjectInfo({ ...projectInfo, title: newTitle.trim() })
        return true
      } catch (error: any) {
        console.error('프로젝트명 변경 오류:', error)
        return false
      } finally {
        setLoading(false)
      }
    },
    [projectInfo, supabase, router]
  )

  const deleteProject = useCallback(async (): Promise<boolean> => {
    if (!projectInfo) {
      console.error('프로젝트 정보가 없습니다.')
      return false
    }

    // 팀 프로젝트 삭제 권한: 팀 개설자만 가능
    if (projectInfo.is_team && !projectInfo.is_owner) {
      console.error('팀 프로젝트는 팀 개설자만 삭제할 수 있습니다.')
      return false
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('사용자 인증 정보가 없습니다.')
        router.push('/login')
        return false
      }

      console.log('프로젝트 삭제 시작:', { projectId: projectInfo.id, userId: user.id })

      // Delete project steps first (due to foreign key constraint)
      const { error: stepsError } = await supabase
        .from('project_steps')
        .delete()
        .eq('project_id', projectInfo.id)

      if (stepsError) {
        console.error('프로젝트 스텝 삭제 오류:', stepsError)
        throw new Error(`프로젝트 스텝 삭제 실패: ${stepsError.message}`)
      }

      console.log('프로젝트 스텝 삭제 완료')

      // Delete project - 삭제 전에 프로젝트 존재 여부 확인
      const { data: projectBeforeDelete } = await supabase
        .from('projects')
        .select('id, title')
        .eq('id', projectInfo.id)
        .eq('user_id', user.id)
        .single()

      if (!projectBeforeDelete) {
        console.error('삭제할 프로젝트를 찾을 수 없습니다.')
        throw new Error('삭제할 프로젝트를 찾을 수 없습니다.')
      }

      console.log('삭제할 프로젝트 확인:', projectBeforeDelete)

      // Delete project
      // RLS 정책이 user_id를 확인하므로 WHERE 절에서는 id만 사용
      // .select() 없이 삭제 시도 (일부 RLS 설정에서 select가 문제가 될 수 있음)
      const { data: deletedData, error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectInfo.id)
        .select()

      if (projectError) {
        console.error('프로젝트 삭제 오류:', projectError)
        console.error('에러 코드:', projectError.code)
        console.error('에러 메시지:', projectError.message)
        console.error('에러 상세:', JSON.stringify(projectError, null, 2))
        
        // RLS 정책 위반 에러인지 확인
        if (projectError.code === '42501' || projectError.code === 'PGRST301' || projectError.message?.includes('permission') || projectError.message?.includes('policy')) {
          throw new Error(`프로젝트 삭제 권한이 없습니다. RLS 정책을 확인해주세요. 에러: ${projectError.message} (코드: ${projectError.code})`)
        }
        
        throw new Error(`프로젝트 삭제 실패: ${projectError.message} (코드: ${projectError.code})`)
      }

      // 삭제 결과 확인
      // Supabase의 DELETE 쿼리는 .select()를 사용하면 삭제된 행을 반환합니다
      // 삭제가 성공했지만 반환값이 없는 경우도 있을 수 있으므로
      // 삭제 후 실제로 프로젝트가 존재하지 않는지 확인
      if (deletedData && deletedData.length > 0) {
        console.log('프로젝트 삭제 완료 (삭제된 행:', deletedData.length, '개):', deletedData)
      } else {
        console.warn('삭제 쿼리는 성공했지만 삭제된 행이 반환되지 않았습니다.')
        console.warn('삭제 후 프로젝트 존재 여부 확인 중...')
        
        // 삭제 후 확인: 프로젝트가 실제로 삭제되었는지 확인
        // RLS 정책 때문에 확인이 실패할 수 있으므로 에러를 무시하고 진행
        const { data: projectAfterDelete, error: checkError } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectInfo.id)
          .maybeSingle()

        if (checkError) {
          console.warn('삭제 확인 중 오류 (RLS 정책 때문일 수 있음):', checkError.message)
          // 확인 실패해도 삭제는 성공했을 수 있으므로 진행
          console.log('확인 오류를 무시하고 삭제 성공으로 처리합니다.')
        } else if (projectAfterDelete) {
          console.error('프로젝트가 여전히 존재합니다. 삭제가 실패했습니다.')
          console.error('삭제 시도 정보:', { 
            projectId: projectInfo.id, 
            userId: user.id,
            projectTitle: projectBeforeDelete.title
          })
          throw new Error('프로젝트 삭제가 완료되지 않았습니다. RLS 정책을 확인해주세요.')
        } else {
          console.log('프로젝트가 삭제되었음을 확인했습니다.')
        }
      }

      console.log('프로젝트 삭제 프로세스 완료')

      // 완전한 페이지 새로고침을 위해 window.location 사용
      // 서버 컴포넌트 캐시를 우회하여 최신 데이터를 가져오기 위함
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
      return true
    } catch (error: any) {
      console.error('프로젝트 삭제 오류:', error)
      throw error // 에러를 다시 throw하여 호출자가 에러 메시지를 확인할 수 있도록
    } finally {
      setLoading(false)
    }
  }, [projectInfo, supabase, router])

  const updateTeamMembers = useCallback(
    async (memberEmails: string[]): Promise<boolean> => {
      if (!projectInfo) {
        return false
      }

      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return false
        }

        // 유효성 검사: 빈 값 제거, 중복 제거, 최대 6명
        const validEmails = Array.from(new Set(
          memberEmails.map(email => email.trim()).filter(email => email && email !== user.email)
        )).slice(0, 6)

        const { error } = await (supabase.from('projects') as any).update({
          member_emails: validEmails,
        }).eq('id', projectInfo.id).eq('user_id', user.id)

        if (error) throw error

        setProjectInfo({ ...projectInfo, member_emails: validEmails })
        return true
      } catch (error: any) {
        console.error('팀원 업데이트 오류:', error)
        return false
      } finally {
        setLoading(false)
      }
    },
    [projectInfo, supabase, router]
  )

  const hideProject = useCallback(async (): Promise<boolean> => {
    if (!projectInfo) {
      return false
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return false
      }

      // 팀 프로젝트 숨김 권한: 팀에 속한 누구나 가능
      // 개인 프로젝트는 작성자만 숨김 가능
      let query = (supabase.from('projects') as any).update({
        is_hidden: true,
      }).eq('id', projectInfo.id)

      if (!projectInfo.is_team) {
        // 개인 프로젝트는 작성자만 숨김 가능
        query = query.eq('user_id', user.id)
      } else {
        // 팀 프로젝트는 작성자 또는 팀원 모두 숨김 가능
        // RLS 정책에서 처리하므로 별도 체크 불필요
      }

      const { error } = await query

      if (error) throw error

      // 프로젝트 정보 업데이트
      setProjectInfo({ ...projectInfo, is_hidden: true })

      // 대시보드로 이동하지 않고 현재 페이지에 유지 (토글 기능 지원)
      return true
    } catch (error: any) {
      console.error('프로젝트 숨기기 오류:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [projectInfo, supabase])

  const unhideProject = useCallback(async (): Promise<boolean> => {
    if (!projectInfo) {
      return false
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return false
      }

      // 팀 프로젝트 숨김 해제 권한: 팀에 속한 누구나 가능
      let query = (supabase.from('projects') as any).update({
        is_hidden: false,
      }).eq('id', projectInfo.id)

      if (!projectInfo.is_team) {
        // 개인 프로젝트는 작성자만 숨김 해제 가능
        query = query.eq('user_id', user.id)
      }

      const { error } = await query

      if (error) throw error

      // 프로젝트 정보 업데이트
      setProjectInfo({ ...projectInfo, is_hidden: false })

      return true
    } catch (error: any) {
      console.error('프로젝트 숨김 해제 오류:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [projectInfo, supabase])

  return {
    projectInfo,
    loading,
    loadProjectInfo,
    updateProjectTitle,
    deleteProject,
    updateTeamMembers,
    hideProject,
    unhideProject,
  }
}

