import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { teamCode } = await request.json()

    if (!teamCode) {
      return NextResponse.json(
        { error: '팀 코드가 필요합니다.' },
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

    // 팀 코드로 프로젝트 찾기 (서버 사이드에서는 RLS 정책이 다르게 적용될 수 있음)
    const trimmedCode = teamCode.trim().toUpperCase()
    console.log('검색 중인 팀 코드:', trimmedCode)
    console.log('현재 사용자:', { id: user.id, email: user.email })
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('team_code', trimmedCode)
      .eq('is_team', true)
      .single()

    if (projectError) {
      console.error('프로젝트 조회 오류:', {
        code: projectError.code,
        message: projectError.message,
        details: projectError.details,
        hint: projectError.hint,
      })
      
      // RLS 정책 오류인 경우
      if (projectError.code === 'PGRST301' || projectError.code === '42501') {
        return NextResponse.json(
          { 
            error: '팀 프로젝트 조회 권한이 없습니다. RLS 정책을 확인해주세요.',
            details: projectError.message 
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: '유효하지 않은 팀 코드입니다. 팀 코드를 다시 확인해주세요.',
          details: projectError.message 
        },
        { status: 404 }
      )
    }

    if (!project) {
      console.log('프로젝트를 찾을 수 없음:', trimmedCode)
      return NextResponse.json(
        { error: '유효하지 않은 팀 코드입니다. 팀 코드를 다시 확인해주세요.' },
        { status: 404 }
      )
    }

    console.log('찾은 프로젝트:', {
      id: project.id,
      title: (project as any).title,
      is_team: (project as any).is_team,
      member_emails: (project as any).member_emails,
      user_id: (project as any).user_id,
    })

    // 이중 보안 검증: 현재 사용자 이메일이 member_emails에 포함되어 있는지 확인
    const memberEmails = (project as any).member_emails || []
    const isAuthor = (project as any).user_id === user.id
    const isMember = Array.isArray(memberEmails) && memberEmails.includes(user.email)
    
    console.log('권한 확인:', {
      isAuthor,
      isMember,
      memberEmails,
      userEmail: user.email,
      projectUserId: (project as any).user_id,
    })

    if (!isAuthor && !isMember) {
      console.warn('접근 거부:', {
        userEmail: user.email,
        memberEmails,
        isAuthor,
        isMember,
      })
      return NextResponse.json(
        { 
          error: '이 프로젝트에 대한 접근 권한이 없습니다. 프로젝트 관리자에게 팀원으로 추가를 요청해주세요.',
          details: `현재 이메일: ${user.email}, 팀원 목록: ${JSON.stringify(memberEmails)}`
        },
        { status: 403 }
      )
    }

    // 접근 성공
    return NextResponse.json({
      success: true,
      projectId: project.id,
      projectTitle: (project as any).title,
    })
  } catch (error: any) {
    console.error('팀 프로젝트 접속 오류:', error)
    return NextResponse.json(
      { error: error.message || '팀 프로젝트 접속에 실패했습니다.' },
      { status: 500 }
    )
  }
}

