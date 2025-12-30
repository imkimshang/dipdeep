import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Rocket, CheckSquare } from 'lucide-react'
import { LogoutButton } from '@/components/LogoutButton'
import { Database } from '@/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

// 진행률 계산 함수 (단위별 상태 기반)
// 시작전: 0%, 진행중: 50%, 제출: 100%
function calculateProgress(steps: any[]): { 
  overall: number
  phase1: number
  phase2: number
  phase3: number
  weekly: { week: number; progress: number; status: 'notStarted' | 'inProgress' | 'completed' }[]
} {
  const phaseWeeks = {
    phase1: [1, 2, 3, 4],
    phase2: [5, 6, 7, 8],
    phase3: [9, 10, 11, 12],
  }

  let totalProgress = 0
  let phase1Progress = 0
  let phase2Progress = 0
  let phase3Progress = 0
  const weekly: { week: number; progress: number; status: 'notStarted' | 'inProgress' | 'completed' }[] = []

  for (let week = 1; week <= 12; week++) {
    const step = steps.find((s: any) => s.step_number === week)
    
    // 상태 판단 및 진행률 계산
    let progress = 0
    let status: 'notStarted' | 'inProgress' | 'completed' = 'notStarted'
    
    if (step && step.step_data) {
      const stepData = step.step_data as any
      
      // step_data가 객체가 아닌 경우 처리
      if (typeof stepData !== 'object' || stepData === null) {
        progress = 0
        status = 'notStarted'
      } else {
        // is_submitted가 true면 제출 완료 (100%)
        const isSubmitted = stepData.is_submitted === true || 
                           stepData.is_submitted === 'true' || 
                           stepData.is_submitted === 1
        
        if (isSubmitted) {
          progress = 100
          status = 'completed'
        } else {
          // step_data가 있고 is_submitted가 없거나 false면 진행중 여부 확인
          // 중첩된 객체도 재귀적으로 확인하는 함수
          const hasRealData = (obj: any): boolean => {
            if (obj === null || obj === undefined) return false
            if (typeof obj === 'string') return obj.trim() !== ''
            if (typeof obj === 'number') return true
            if (typeof obj === 'boolean') return true
            if (Array.isArray(obj)) {
              return obj.length > 0 && obj.some(item => hasRealData(item))
            }
            if (typeof obj === 'object') {
              const keys = Object.keys(obj).filter(key => key !== 'is_submitted')
              if (keys.length === 0) return false
              return keys.some(key => hasRealData(obj[key]))
            }
            return false
          }
          
          const keys = Object.keys(stepData).filter(key => key !== 'is_submitted')
          const hasData = keys.length > 0 && hasRealData(stepData)
          
          if (hasData) {
            // 실제 데이터가 있으면 진행중 (50%)
            progress = 50
            status = 'inProgress'
          } else {
            // 데이터가 없으면 시작전 (0%)
            progress = 0
            status = 'notStarted'
          }
        }
      }
    } else {
      // step이 없거나 step_data가 없으면 시작전 (0%)
      progress = 0
      status = 'notStarted'
    }
    
    totalProgress += progress
    weekly.push({ week, progress, status })

    if (phaseWeeks.phase1.includes(week)) {
      phase1Progress += progress
    } else if (phaseWeeks.phase2.includes(week)) {
      phase2Progress += progress
    } else if (phaseWeeks.phase3.includes(week)) {
      phase3Progress += progress
    }
  }

  return {
    overall: Math.round(totalProgress / 12),
    phase1: Math.round(phase1Progress / 4),
    phase2: Math.round(phase2Progress / 4),
    phase3: Math.round(phase3Progress / 4),
    weekly,
  }
}

export default async function StudentDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user projects
  // cache: 'no-store'를 사용하여 항상 최신 데이터를 가져옴
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .returns<Project[]>()

  if (projectsError) {
    console.error('프로젝트 로드 오류:', projectsError)
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
      {/* Header */}
      <header className="glass border-b border-gray-100/50 backdrop-blur-2xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">학생 대시보드</h1>
          <LogoutButton />
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Welcome Section */}
        <div className="glass rounded-3xl shadow-xl shadow-black/5 p-10 mb-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white border-0">
          <h2 className="text-3xl font-bold mb-3 tracking-tight">내 프로젝트</h2>
          <p className="text-lg text-indigo-100/90">
            새로운 프로젝트를 시작하거나 기존 프로젝트를 이어서 진행하세요.
          </p>
        </div>

        {/* Create New Project Button */}
        <div className="mb-10">
          <Link
            href="/dashboard/student/new"
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            새 프로젝트 생성
          </Link>
        </div>

        {/* Projects List */}
        <div className="glass rounded-3xl shadow-xl shadow-black/5 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-8 tracking-tight">
            프로젝트 리스트
          </h2>

          {projectsWithProgress && projectsWithProgress.length > 0 ? (
            <div className="space-y-4">
              {projectsWithProgress.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/workbook/week1?projectId=${project.id}`}
                  className="card card-hover p-6 group flex items-center justify-between gap-6"
                >
                  {/* Left: Project Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors flex-shrink-0">
                          <BookOpen className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">
                            {project.title || '제목 없음'}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                              {project.type === 'webapp'
                                ? '웹 애플리케이션'
                                : project.type === 'story'
                                ? '스토리'
                                : project.type === 'product'
                                ? '제품'
                                : project.type || '일반'}
                            </span>
                            <span className="text-sm text-gray-500">
                              진행 단계: {project.current_step || 0}/12
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 단위별 진척률 (회차별) */}
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">단위별 진척률</h4>
                      <div className="flex gap-1 flex-wrap">
                        {project.progress.weekly.map((week: any) => (
                          <div
                            key={week.week}
                            className={`w-6 h-6 rounded text-xs font-medium flex items-center justify-center ${
                              week.status === 'completed'
                                ? 'bg-green-500 text-white'
                                : week.status === 'inProgress'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                            title={`${week.week}주차: ${week.status === 'completed' ? '제출 완료' : week.status === 'inProgress' ? '진행중' : '시작전'} (${week.progress}%)`}
                          >
                            {week.week}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Statistics */}
                  <div className="flex gap-3 flex-shrink-0">
                    {/* Overall Progress */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-3 min-w-[100px]">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-700">Overall</h3>
                        <Rocket className="text-indigo-600 w-3.5 h-3.5" />
                      </div>
                      <div className="font-bold text-gray-900 mb-1 text-xl">
                        {project.progress.overall}%
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress.overall}%` }}
                        />
                      </div>
                    </div>

                    {/* Phase 1 */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-3 min-w-[90px]">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-700">Phase 1</h3>
                        <CheckSquare className="text-indigo-600 w-3.5 h-3.5" />
                      </div>
                      <div className="font-bold text-gray-900 mb-1 text-xl">
                        {project.progress.phase1}%
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress.phase1}%` }}
                        />
                      </div>
                    </div>

                    {/* Phase 2 */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-3 min-w-[90px]">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-700">Phase 2</h3>
                        <CheckSquare className="text-indigo-600 w-3.5 h-3.5" />
                      </div>
                      <div className="font-bold text-gray-900 mb-1 text-xl">
                        {project.progress.phase2}%
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress.phase2}%` }}
                        />
                      </div>
                    </div>

                    {/* Phase 3 */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-3 min-w-[90px]">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-700">Phase 3</h3>
                        <CheckSquare className="text-indigo-600 w-3.5 h-3.5" />
                      </div>
                      <div className="font-bold text-gray-900 mb-1 text-xl">
                        {project.progress.phase3}%
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress.phase3}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-600 mb-2 font-medium">아직 생성된 프로젝트가 없습니다.</p>
              <p className="text-sm text-gray-400">
                새 프로젝트를 생성하여 시작해보세요!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


