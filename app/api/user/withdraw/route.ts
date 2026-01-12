import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 회원탈퇴 API
 * POST /api/user/withdraw
 * 
 * 요구사항:
 * - status를 'archived'로 변경 (Soft Delete)
 * - withdrawn_at에 현재 시간 기록
 * - deleted_at에 현재로부터 5년 후 날짜 계산하여 저장
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // 현재 로그인한 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const userId = user.id
    
    // 현재 시간
    const now = new Date()
    const withdrawnAt = now.toISOString()
    
    // 5년 후 삭제 예정일 계산
    const deletedAt = new Date(now)
    deletedAt.setFullYear(deletedAt.getFullYear() + 5)
    const deletedAtISO = deletedAt.toISOString()
    
    // 프로필이 활성 상태인지 확인
    const { data: profile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('id', userId)
      .single()
    
    if (profileCheckError || !profile) {
      console.error('프로필 확인 오류:', profileCheckError)
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다.', details: profileCheckError?.message },
        { status: 404 }
      )
    }
    
    // 이미 탈퇴된 계정인지 확인
    if ((profile as any).status === 'archived') {
      return NextResponse.json(
        { error: '이미 탈퇴된 계정입니다.' },
        { status: 400 }
      )
    }
    
    // 프로필 아카이빙 (Soft Delete)
    // RLS 정책에 따라 자신의 프로필만 업데이트 가능
    // status를 'archived'로 변경 (활성 계정에서만 가능)
    const { error: archiveError } = await supabase
      .from('profiles')
      .update({
        status: 'archived',
        withdrawn_at: withdrawnAt,
        deleted_at: deletedAtISO,
        updated_at: now.toISOString(),
      } as any)
      .eq('id', userId)
      .eq('status', 'active') // 활성 상태인 경우만 업데이트 (보안)
    
    if (archiveError) {
      console.error('프로필 아카이빙 오류:', archiveError)
      console.error('오류 상세:', JSON.stringify(archiveError, null, 2))
      
      // RLS 정책 오류인 경우
      if (archiveError.code === '42501' || archiveError.code === 'PGRST301' || 
          archiveError.message?.includes('row-level security') || 
          archiveError.message?.includes('RLS')) {
        return NextResponse.json(
          { 
            error: '회원탈퇴 처리 권한 오류가 발생했습니다. RLS 정책을 확인해주세요.',
            details: archiveError.message 
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: '회원탈퇴 처리 중 오류가 발생했습니다.', details: archiveError.message },
        { status: 500 }
      )
    }
    
    // 로그아웃 처리 (성공 후)
    try {
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.error('로그아웃 오류 (무시 가능):', signOutError)
    }
    
    return NextResponse.json({
      success: true,
      message: '회원탈퇴가 완료되었습니다. 탈퇴 시 기존 데이터는 복구할 수 없으며, 15일간 재가입이 제한됩니다.',
      withdrawnAt,
      deletedAt: deletedAtISO,
    })
  } catch (error: any) {
    console.error('회원탈퇴 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
