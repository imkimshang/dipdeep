import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeacherDashboard from '@/components/TeacherDashboard'
import StudentDashboard from '@/components/StudentDashboard'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with role (활성 상태이고 삭제되지 않은 계정만)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .is('deleted_at', null) // 삭제되지 않은 계정만
    .eq('status', 'active') // 활성 상태인 계정만
    .single()

  // 프로필이 없거나 삭제되었거나 비활성화된 계정인 경우
  if (!profile) {
    // 로그아웃 처리
    await supabase.auth.signOut()
    redirect('/login?error=account_deleted')
  }

  const profileData = profile as Profile
  if (profileData.deleted_at || profileData.status !== 'active') {
    // 로그아웃 처리
    await supabase.auth.signOut()
    redirect('/login?error=account_deleted')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {profileData.role === 'teacher' ? (
        <TeacherDashboard />
      ) : profileData.role === 'student' ? (
        <StudentDashboard />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Role not set.</p>
            <p className="text-sm text-gray-500">
              Please contact the administrator to set your role.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


