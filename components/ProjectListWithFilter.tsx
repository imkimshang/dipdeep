'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Users, Rocket, CheckSquare } from 'lucide-react'
import { DashboardHiddenProjectsToggle } from '@/components/DashboardHiddenProjectsToggle'
import { UnhideProjectButton } from '@/components/UnhideProjectButton'
import { createClient } from '@/utils/supabase/client'
import { calculateProgress } from '@/utils/calculateProgress'

interface ProjectWithProgress {
  id: string
  title: string | null
  type: string | null
  current_step: number | null
  is_team?: boolean
  team_code?: string | null
  member_emails?: string[]
  is_hidden?: boolean
  progress: {
    overall: number
    phase1: number
    phase2: number
    phase3: number
    weekly: Array<{
      week: number
      progress: number
      status: 'notStarted' | 'inProgress' | 'completed'
    }>
  }
}

interface ProjectListWithFilterProps {
  projects: ProjectWithProgress[]
}

export function ProjectListWithFilter({ projects }: ProjectListWithFilterProps) {
  const [showHidden, setShowHidden] = useState(false)
  const [accessibleTeamProjects, setAccessibleTeamProjects] = useState<ProjectWithProgress[]>([])
  const [loadingTeamProjects, setLoadingTeamProjects] = useState(true)

  // 로컬 스토리지에서 접근 가능한 팀 프로젝트 ID 목록 가져오기
  useEffect(() => {
    const loadAccessibleTeamProjects = async () => {
      try {
        const accessibleIds = JSON.parse(
          localStorage.getItem('accessible_team_projects') || '[]'
        ) as string[]

        if (accessibleIds.length === 0) {
          setLoadingTeamProjects(false)
          return
        }

        // API Route를 통해 팀 프로젝트 정보 가져오기 (RLS 정책 우회)
        const teamProjects: any[] = []
        const errors: any[] = []
        
        for (const projectId of accessibleIds) {
          try {
            const response = await fetch(`/api/team-project/info?projectId=${projectId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.project) {
                teamProjects.push(data.project)
              }
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
              console.error(`프로젝트 ${projectId} 로드 오류:`, errorData)
              errors.push(errorData)
            }
          } catch (err) {
            console.error(`프로젝트 ${projectId} 조회 중 예외:`, err)
            errors.push(err)
          }
        }
        
        if (errors.length > 0 && teamProjects.length === 0) {
          console.warn('일부 팀 프로젝트를 로드하지 못했습니다. 계속 진행합니다.')
        }

        // 각 팀 프로젝트의 진행률 정보 가져오기 (API Route 사용)
        const teamProjectsWithProgress = await Promise.all(
          (teamProjects || []).map(async (project: any) => {
            let steps: any[] = []
            try {
              const response = await fetch(`/api/team-project/steps?projectId=${project.id}`)
              if (response.ok) {
                const data = await response.json()
                steps = data.steps || []
              }
            } catch (err) {
              console.error(`프로젝트 ${project.id}의 steps 로드 오류:`, err)
            }

            // StudentDashboard와 동일한 calculateProgress 함수 사용
            const progress = steps && steps.length > 0 
              ? calculateProgress(steps) 
              : {
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

            return {
              ...project,
              progress,
            }
          })
        )

        setAccessibleTeamProjects(teamProjectsWithProgress as ProjectWithProgress[])
      } catch (error) {
        console.error('로컬 스토리지 읽기 오류:', error)
      } finally {
        setLoadingTeamProjects(false)
      }
    }

    loadAccessibleTeamProjects()
  }, [])

  // 모든 프로젝트 병합 (개인 프로젝트 + 접근 가능한 팀 프로젝트)
  const allProjects = [
    ...projects,
    ...accessibleTeamProjects.filter(
      (tp) => !projects.some((p) => p.id === tp.id)
    ),
  ]

  // 필터링: 기본적으로 is_hidden이 false인 것만, showHidden이 true면 모든 것
  const filteredProjects = showHidden
    ? allProjects
    : allProjects.filter((p) => !p.is_hidden)

  const visibleProjects = filteredProjects.filter((p) => !p.is_hidden)
  const hiddenProjects = filteredProjects.filter((p) => p.is_hidden)

  if (filteredProjects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-gray-300" />
        </div>
        <p className="text-gray-600 mb-2 font-medium">
          {showHidden ? '표시할 프로젝트가 없습니다.' : '아직 생성된 프로젝트가 없습니다.'}
        </p>
        <p className="text-sm text-gray-400">
          {showHidden ? '' : '새 프로젝트를 생성하여 시작해보세요!'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 필터 버튼 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          총 {visibleProjects.length}개의 프로젝트
          {showHidden && hiddenProjects.length > 0 && (
            <span className="ml-2 text-purple-600">
              (숨김: {hiddenProjects.length}개)
            </span>
          )}
        </div>
        <DashboardHiddenProjectsToggle
          showHidden={showHidden}
          onToggle={() => setShowHidden(!showHidden)}
        />
      </div>

      {/* 일반 프로젝트 */}
      {visibleProjects.length > 0 && (
        <div className="space-y-4">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* 숨겨진 프로젝트 */}
      {showHidden && hiddenProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">숨겨진 프로젝트</h3>
          {hiddenProjects.map((project) => (
            <ProjectCard key={project.id} project={project} isHidden={true} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  isHidden = false,
}: {
  project: ProjectWithProgress
  isHidden?: boolean
}) {
  return (
    <Link
      href={`/workbook/week1?projectId=${project.id}`}
      className={`card card-hover p-6 group flex items-center justify-between gap-6 border-2 rounded-xl hover:border-indigo-300 transition-colors ${
        isHidden ? 'border-gray-300 bg-gray-50/50' : 'border-gray-200'
      }`}
    >
      {/* Left: Project Info */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors flex-shrink-0 ${
                isHidden ? 'bg-gray-200' : 'bg-indigo-100'
              }`}
            >
              <BookOpen className={`w-6 h-6 ${isHidden ? 'text-gray-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={`font-semibold mb-1 text-lg tracking-tight transition-colors ${
                    isHidden
                      ? 'text-gray-500'
                      : 'text-gray-900 group-hover:text-indigo-600'
                  }`}
                >
                  {project.title || '제목 없음'}
                </h3>
                {/* 프로젝트 유형 배지 (팀/개인) */}
                {project.is_team ? (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    <span>팀</span>
                    {project.team_code && (
                      <>
                        <span className="text-purple-600">(코드 -</span>
                        <span className="font-mono font-bold">{project.team_code}</span>
                        <span className="text-purple-600">)</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    개인
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
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
                  진행 단계: {project.current_step ?? 0}/12
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 단위별 진척률 (회차별) */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">단위별 진척률</h4>
          <div className="flex gap-1 flex-wrap">
            {project.progress.weekly.map((week) => (
              <div
                key={week.week}
                className={`w-6 h-6 rounded text-xs font-medium flex items-center justify-center ${
                  week.status === 'completed'
                    ? 'bg-green-500 text-white'
                    : week.status === 'inProgress'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
                title={`${week.week}주차: ${
                  week.status === 'completed'
                    ? '제출 완료'
                    : week.status === 'inProgress'
                    ? '진행중'
                    : '시작전'
                } (${week.progress}%)`}
              >
                {week.week}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Statistics and Actions */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* 숨김 해제 버튼 (숨겨진 프로젝트인 경우만) */}
        {isHidden && (
          <UnhideProjectButton
            projectId={project.id}
            onSuccess={() => window.location.reload()}
          />
        )}

        {/* Statistics */}
        <div className="flex gap-3">
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
      </div>
    </Link>
  )
}

