import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, TrendingUp } from 'lucide-react'

export default async function TeacherTeamPage({
  searchParams,
}: {
  searchParams: { team?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const teamId = searchParams.team

  if (!teamId) {
    redirect('/dashboard')
  }

  // Get team info
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .eq('teacher_id', user.id)
    .single()

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">팀을 찾을 수 없습니다.</p>
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // Get projects from this team
  const { data: projects } = await supabase
    .from('projects')
    .select('*, profiles(username)')
    .eq('team_id', teamId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Team Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">팀 프로젝트</p>
                <p className="text-3xl font-bold text-gray-900">
                  {projects?.length || 0}
                </p>
              </div>
              <Users className="w-12 h-12 text-indigo-600" />
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
              <TrendingUp className="w-12 h-12 text-green-600" />
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            프로젝트 목록
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
              이 팀에는 아직 프로젝트가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


