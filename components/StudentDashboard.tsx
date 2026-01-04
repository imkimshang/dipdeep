import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { DashboardActionButtons } from '@/components/DashboardActionButtons'
import { ProjectListWithFilter } from '@/components/ProjectListWithFilter'
import { CreditBalanceDisplay } from '@/components/CreditBalanceDisplay'
import { Database } from '@/types/supabase'
import { GLOBAL_UI } from '@/i18n/translations'

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
                   'Student'

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
              {username}'s <span className="text-indigo-400">D.I.P Deep</span>
              <span className="text-xs font-normal text-gray-400 ml-2">Data-Insight-Prototype workspace</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <CreditBalanceDisplay userId={user.id} />
            <ProfileDropdown username={username} userId={user.id} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Welcome Section - 프로젝트가 없을 때만 표시 */}
        {(!projectsWithProgress || projectsWithProgress.length === 0) && (
          <div className="glass rounded-3xl shadow-xl shadow-black/5 p-10 mb-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white border-0">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">{GLOBAL_UI.myProjects}</h2>
            <p className="text-lg text-indigo-100/90">
              {GLOBAL_UI.welcomeMessage}
            </p>
          </div>
        )}

        {/* Projects List */}
        <div className="glass rounded-3xl shadow-xl shadow-black/5 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              {GLOBAL_UI.projectList}
            </h2>
            <DashboardActionButtons />
          </div>

          <ProjectListWithFilter projects={(projectsWithProgress || []) as any} />
        </div>
      </div>
    </div>
  )
}


