import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, TrendingUp, Plus, LogOut } from 'lucide-react'
import { LogoutButton } from '@/components/LogoutButton'
import { Database } from '@/types/supabase'

type Team = Database['public']['Tables']['teams']['Row']
type Project = Database['public']['Tables']['projects']['Row']

export default async function TeacherDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('teacher_id', user.id)
    .returns<Team[]>()

  // Get all projects from teams
  const teamIds = teams?.map((team) => team.id).filter(Boolean) as string[] || []
  const { data: projects } = teamIds.length > 0
    ? await supabase
        .from('projects')
        .select('*, profiles(username)')
        .in('team_id', teamIds)
        .returns<(Project & { profiles: { username: string | null } | null })[]>()
    : { data: null }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">교사 대시보드</h1>
          <LogoutButton />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">관리 팀 수</p>
                <p className="text-3xl font-bold text-gray-900">
                  {teams?.length || 0}
                </p>
              </div>
              <Users className="w-12 h-12 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">진행 중인 프로젝트</p>
                <p className="text-3xl font-bold text-gray-900">
                  {projects?.length || 0}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">평균 진행률</p>
                <p className="text-3xl font-bold text-gray-900">
                  {projects && projects.length > 0
                    ? Math.round(
                        projects.reduce(
                          (acc, p) => acc + (p.progress_rate || 0),
                          0
                        ) / projects.length
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Teams Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">팀 관리</h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" />
              새 팀 생성
            </button>
          </div>

          {teams && teams.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {team.name || '이름 없음'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    팀 ID: {team.id.slice(0, 8)}...
                  </p>
                  <Link
                    href={`/dashboard/teacher?team=${team.id}`}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    상세 보기 →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              아직 생성된 팀이 없습니다.
            </p>
          )}
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            학생 프로젝트 현황
          </h2>

          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project: any) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {project.title || '제목 없음'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        작성자: {project.profiles?.username || '알 수 없음'} | 
                        유형: {project.type || 'N/A'}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          진행 단계: {project.current_step || 0}/12
                        </span>
                        <div className="flex-1 max-w-xs">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{
                                width: `${project.progress_rate || 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {project.progress_rate || 0}%
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/workbook/${project.id}`}
                      className="ml-4 px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium"
                    >
                      상세 보기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              아직 프로젝트가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


