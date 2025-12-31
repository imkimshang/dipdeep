import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { DashboardActionButtons } from '@/components/DashboardActionButtons'
import { ProjectListWithFilter } from '@/components/ProjectListWithFilter'
import { Database } from '@/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

import { calculateProgress } from '@/utils/calculateProgress'

export default async function StudentDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for username
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', user.id)
    .single()

  // Get username - prefer full_name, fallback to username, fallback to email prefix
  const username = (profile as any)?.full_name || 
                   (profile as any)?.username || 
                   user.email?.split('@')[0] || 
                   '학생'

  // Get user projects (작성자 프로젝트만)
  // 보안: 팀 프로젝트는 팀 코드 입력 후에만 접근 가능하도록 함
  // is_hidden은 필터링하지 않고 클라이언트에서 처리
  const { data: userProjects, error: userProjectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .returns<Project[]>()

  // 팀 프로젝트는 팀 코드 입력 후 로컬 스토리지에 저장된 것만 클라이언트에서 추가
  const projects = (userProjects || []) as Project[]

  if (userProjectsError) {
    console.error('프로젝트 로드 오류:', userProjectsError)
  }

  // Get steps for each project to calculate progress
  const projectsWithProgress = await Promise.all(
    (projects || []).map(async (project) => {
      const { data: steps, error: stepsError } = await supabase
        .from('project_steps')
        .select('step_number, step_data')
        .eq('project_id', project.id)

      if (stepsError) {
        console.error(`프로젝트 ${project.id}의 steps 로드 오류:`, stepsError)
      }

      const progress = steps ? calculateProgress(steps as any[]) : { 
        overall: 0, 
        phase1: 0, 
        phase2: 0, 
        phase3: 0,
        weekly: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          progress: 0,
          status: 'notStarted' as const,
        })),
      }
      
      return { ...project, progress }
    })
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header with dark background */}
      <header className="relative border-b border-gray-800 sticky top-0 z-50 bg-slate-900" style={{ height: '80px' }}>
        <div className="relative container mx-auto px-6 h-full flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {username}님의 <span className="text-indigo-400">D.I.P Deep</span>
              <span className="text-xs font-normal text-gray-400 ml-2">Data-Insight-Prototype workspace</span>
            </h1>
          </div>
          <ProfileDropdown username={username} userId={user.id} />
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Welcome Section - 프로젝트가 없을 때만 표시 */}
        {(!projectsWithProgress || projectsWithProgress.length === 0) && (
          <div className="glass rounded-3xl shadow-xl shadow-black/5 p-10 mb-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white border-0">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">내 프로젝트</h2>
            <p className="text-lg text-indigo-100/90">
              새로운 프로젝트를 시작하거나 기존 프로젝트를 이어서 진행하세요.
            </p>
          </div>
        )}

        {/* Projects List */}
        <div className="glass rounded-3xl shadow-xl shadow-black/5 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              프로젝트 리스트
            </h2>
            <DashboardActionButtons />
          </div>

          <ProjectListWithFilter projects={(projectsWithProgress || []) as any} />
        </div>
      </div>
    </div>
  )
}


