import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function useProjectAccess(projectId: string | null) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAccess = async () => {
      if (!projectId) {
        router.push('/dashboard')
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // 프로젝트 정보 및 권한 확인
        const { data: project, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (error || !project) {
          router.push('/dashboard')
          return
        }

        // 권한 검증: 작성자이거나 팀원인지 확인
        const isAuthor = (project as any).user_id === user.id
        const memberEmails = (project as any).member_emails || []
        const isTeamMember = (project as any).is_team && memberEmails.includes(user.email || '')

        if (!isAuthor && !isTeamMember) {
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('권한 확인 오류:', error)
        router.push('/dashboard')
      }
    }

    checkAccess()
  }, [projectId, router, supabase])
}

