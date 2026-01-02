'use client'

import Link from 'next/link'
import { Settings, FileDown, Users, Copy } from 'lucide-react'
import { StepStatus } from '@/hooks/useWorkbookNavigation'

interface WorkbookNavigationProps {
  projectId: string
  currentWeek: number
  isScrolled: boolean
  projectInfo: { 
    title: string | null
    id: string
    type?: string | null
    is_team?: boolean
    team_code?: string | null
    member_emails?: string[]
  } | null
  allSteps: any[]
  getWeekTitle: (week: number) => string
  getStepStatus: (week: number) => StepStatus
  onSettingsClick: () => void
  onProjectSummaryClick: () => void
  themeColor?: 'indigo' | 'violet' | 'emerald' | 'rose' | 'sky'
}

export function WorkbookNavigation({
  projectId,
  currentWeek,
  isScrolled,
  projectInfo,
  allSteps,
  getWeekTitle,
  getStepStatus,
  onSettingsClick,
  onProjectSummaryClick,
  themeColor = 'indigo',
}: WorkbookNavigationProps) {
  const themeColors = {
    indigo: {
      current: 'bg-indigo-50 border-2 border-indigo-600 text-indigo-700',
      button: 'hover:text-indigo-600 hover:bg-indigo-50',
      progress: 'bg-indigo-600',
      buttonGradient: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
    },
    violet: {
      current: 'bg-violet-50 border-2 border-violet-600 text-violet-700',
      button: 'hover:text-violet-600 hover:bg-violet-50',
      progress: 'bg-violet-600',
      buttonGradient: 'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700',
    },
    emerald: {
      current: 'bg-emerald-50 border-2 border-emerald-600 text-emerald-700',
      button: 'hover:text-emerald-600 hover:bg-emerald-50',
      progress: 'bg-emerald-600',
      buttonGradient: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
    },
    rose: {
      current: 'bg-rose-50 border-2 border-rose-600 text-rose-700',
      button: 'hover:text-rose-600 hover:bg-rose-50',
      progress: 'bg-rose-600',
      buttonGradient: 'from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700',
    },
    sky: {
      current: 'bg-sky-50 border-2 border-sky-600 text-sky-700',
      button: 'hover:text-sky-600 hover:bg-sky-50',
      progress: 'bg-sky-600',
      buttonGradient: 'from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700',
    },
  }

  const colors = themeColors[themeColor]

  return (
    <aside
      className={`glass border-r border-gray-200/50 sticky transition-all duration-300 ${
        isScrolled ? 'top-[60px]' : 'top-[140px]'
      } h-[calc(100vh-140px)] overflow-y-auto`}
    >
      <div className="p-3">
        {/* Project Info */}
        {projectInfo && (
          <div className="mb-4 pb-4 border-b-2 border-blue-600/50 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white truncate flex-1">
                {projectInfo.title || '프로젝트명 없음'}
              </h4>
              <button
                onClick={onSettingsClick}
                className={`flex-shrink-0 p-1.5 text-gray-300 hover:text-white ${colors.button} rounded-lg transition-colors`}
                title="설정"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            {/* 팀 프로젝트 배지 및 코드 */}
            {projectInfo.is_team && (
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2.5 py-1 bg-purple-500/30 text-purple-200 text-xs font-medium rounded-full flex items-center gap-1.5 border border-purple-400/50">
                  <Users className="w-3 h-3" />
                  <span>팀</span>
                  {projectInfo.team_code && (
                    <>
                      <span className="text-purple-300">(코드 -</span>
                      <span className="font-mono font-bold">{projectInfo.team_code}</span>
                      <span className="text-purple-300">)</span>
                    </>
                  )}
                </span>
                {projectInfo.team_code && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigator.clipboard.writeText(projectInfo.team_code || '').then(() => {
                        // 간단한 피드백 (Toast로 변경 가능)
                        const btn = e.currentTarget
                        const originalHTML = btn.innerHTML
                        btn.innerHTML = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                        setTimeout(() => {
                          btn.innerHTML = originalHTML
                        }, 1000)
                      }).catch(() => {
                        alert(`팀 코드: ${projectInfo.team_code}`)
                      })
                    }}
                    className="p-1 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 rounded transition-colors"
                    title="팀 코드 복사"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <h3 className="text-xs font-semibold text-gray-700 mb-2">회차별 워크북</h3>
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => {
            const status = getStepStatus(week)
            const isCurrentWeek = week === currentWeek
            
            // 프로젝트 타입에 따른 경로 결정
            const projectType = projectInfo?.type || 'webapp'
            let weekPath: string
            if (projectType === 'event') {
              weekPath = `/workbook-event/week${week}`
            } else if (projectType === 'product') {
              weekPath = `/workbook-product/week${week}`
            } else {
              weekPath = `/workbook/week${week}`
            }
            
            // 상태 결정: 완료 > 진행중 > 시작전
            let statusType: 'notStarted' | 'inProgress' | 'completed'
            let statusText: string
            let statusColor: string
            let statusBg: string
            
            if (status.isSubmitted) {
              statusType = 'completed'
              statusText = '완료'
              statusColor = 'text-green-700'
              statusBg = 'bg-green-50 border-green-200'
            } else if (status.hasData) {
              statusType = 'inProgress'
              statusText = '진행중'
              statusColor = 'text-blue-700'
              statusBg = 'bg-blue-50 border-blue-200'
            } else {
              statusType = 'notStarted'
              statusText = '시작전'
              statusColor = 'text-gray-600'
              statusBg = 'bg-gray-50 border-gray-200'
            }

            return (
              <Link
                key={week}
                href={`${weekPath}?projectId=${projectId}`}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 group border ${
                  isCurrentWeek
                    ? `${colors.current} font-semibold border-2`
                    : `${statusBg} ${statusColor} hover:opacity-80`
                }`}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-white flex items-center justify-center font-bold text-xs">
                  {week}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-tight">
                    {getWeekTitle(week)}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    statusType === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : statusType === 'inProgress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {statusText}
                  </span>
                </div>
              </Link>
            )
          })}

          {/* Project Summary Button */}
          <button
            onClick={onProjectSummaryClick}
            className={`mt-4 w-full py-2.5 px-3 bg-gradient-to-r ${colors.buttonGradient} text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2`}
          >
            <FileDown className="w-4 h-4" />
            프로젝트 요약
          </button>
        </div>
      </div>
    </aside>
  )
}

