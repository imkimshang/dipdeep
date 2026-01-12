import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function GET() {
  const supabase = createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ valid: false, error: 'Not authenticated' }, { status: 401 })
    }
    
    // 프로필 확인 (활성 상태이고 삭제되지 않은 계정만)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .is('deleted_at', null)
      .eq('status', 'active')
      .maybeSingle()
    
    if (profileError || !profile) {
      // 삭제되었거나 비활성화된 계정이면 로그아웃
      await supabase.auth.signOut()
      return NextResponse.json({ 
        valid: false, 
        deleted: true,
        error: 'Account deleted or inactive' 
      }, { status: 403 })
    }

    // 이미 쿼리에서 status='active'와 deleted_at IS NULL을 체크했으므로 추가 확인 불필요
    const profileData = profile as Profile
    
    return NextResponse.json({ valid: true })
  } catch (error) {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}

