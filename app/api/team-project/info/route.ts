import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 프로젝트 정보 가져오기
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 권한 확인: 작성자이거나 팀원인지
    const isAuthor = (project as any).user_id === user.id
    const memberEmails = (project as any).member_emails || []
    const isMember = (project as any).is_team && Array.isArray(memberEmails) && memberEmails.includes(user.email)

    if (!isAuthor && !isMember) {
      return NextResponse.json(
        { error: '이 프로젝트에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 접근 성공
    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error: any) {
    console.error('팀 프로젝트 정보 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || '팀 프로젝트 정보를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

