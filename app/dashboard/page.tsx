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
          <p className="text-gray-600 mb-4">Unable to load profile.</p>
          <p className="text-sm text-gray-500">
            Please contact the administrator.
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


