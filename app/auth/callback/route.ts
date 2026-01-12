import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 이메일 확인 성공 - 프로필이 없으면 생성
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 프로필 확인
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // 프로필이 없으면 생성 (회원가입 시 전달된 메타데이터 사용)
        if (!profile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              phone_number: user.user_metadata?.phone_number || null,
              interest_fields: user.user_metadata?.interest_fields || null,
              role: 'student',
              username: user.email?.split('@')[0] || 'user',
              status: 'active', // 회원가입 시 활성 상태로 설정
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            } as any)

          if (profileError) {
            console.error('프로필 생성 오류:', profileError)
            // 프로필 생성 실패해도 계속 진행 (나중에 생성 가능)
          }
        }
      }

      // 리다이렉트
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // 오류 발생 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/login?error=email_confirmation_failed', request.url))
}
