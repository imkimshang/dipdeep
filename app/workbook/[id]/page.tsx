import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'
import { WorkbookForm } from '@/components/WorkbookForm'

export default async function WorkbookPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project) {
    notFound()
  }

  // Check if user has access (owner or teacher)
  const isOwner = project.user_id === user.id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'teacher'

  if (!isOwner && !isTeacher) {
    redirect('/dashboard')
  }

  // Get project steps
  const { data: steps } = await supabase
    .from('project_steps')
    .select('*')
    .eq('project_id', params.id)
    .order('step_number', { ascending: true })

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
          <h1 className="text-2xl font-bold text-gray-900">
            {project.title || '워크북'}
          </h1>
          <p className="text-gray-600 mt-1">
            {project.type && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded mr-2">
                {project.type}
              </span>
            )}
            진행 단계: {project.current_step || 0}/12
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">전체 진행률</h2>
            <span className="text-2xl font-bold text-indigo-600">
              {project.progress_rate || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${project.progress_rate || 0}%` }}
            />
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            회차별 워크북
          </h2>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => {
              const step = steps?.find((s) => s.step_number === week)
              const isCompleted = step?.step_data !== null
              const isCurrent =
                (project.current_step || 0) >= week &&
                (project.current_step || 0) < week + 1

              return (
                <a
                  key={week}
                  href={`#week-${week}`}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    isCurrent
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                      : isCompleted
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs mb-1">Week</div>
                  <div className="text-lg font-bold">{week}</div>
                  {isCompleted && (
                    <CheckCircle2 className="w-4 h-4 mx-auto mt-1 text-green-600" />
                  )}
                </a>
              )
            })}
          </div>
        </div>

        {/* Workbook Form */}
        <WorkbookForm projectId={params.id} steps={steps || []} />
      </div>
    </div>
  )
}


