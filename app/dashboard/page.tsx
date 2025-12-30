import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeacherDashboard from '@/components/TeacherDashboard'
import StudentDashboard from '@/components/StudentDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with role
  const { data: profile }: { data: { role: string } | null } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">프로필을 불러올 수 없습니다.</p>
          <p className="text-sm text-gray-500">
            관리자에게 문의해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {(profile as any).role === 'teacher' ? (
        <TeacherDashboard />
      ) : (profile as any).role === 'student' ? (
        <StudentDashboard />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">역할이 설정되지 않았습니다.</p>
            <p className="text-sm text-gray-500">
              관리자에게 문의하여 역할을 설정해주세요.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


