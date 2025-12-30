'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'

interface WorkbookHeaderProps {
  title: string
  description?: string
  phase: string
  isScrolled: boolean
  currentWeek: number
  overallProgress: number
  phase1Progress: number
  phase2Progress: number
  phase3Progress: number
  isSubmitted: boolean
  themeColor?: 'indigo' | 'violet' | 'emerald' | 'rose' | 'sky'
}

export function WorkbookHeader({
  title,
  description,
  phase,
  isScrolled,
  currentWeek,
  overallProgress,
  phase1Progress,
  phase2Progress,
  phase3Progress,
  isSubmitted,
  themeColor = 'indigo',
}: WorkbookHeaderProps) {
  const gradientColors = {
    indigo: 'from-indigo-500 to-purple-600',
    violet: 'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-pink-600',
    sky: 'from-sky-500 to-blue-600',
  }

  const shadowColors = {
    indigo: 'shadow-indigo-500/30',
    violet: 'shadow-violet-500/30',
    emerald: 'shadow-emerald-500/30',
    rose: 'shadow-rose-500/30',
    sky: 'shadow-sky-500/30',
  }

  const gradient = gradientColors[themeColor]
  const shadow = shadowColors[themeColor]

  return (
    <header
      className={`glass border-b border-gray-100/50 backdrop-blur-2xl sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-2' : 'py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all text-sm font-medium ${
            isScrolled ? 'mb-2' : 'mb-4'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          {isScrolled ? '' : '대시보드로 돌아가기'}
        </Link>
        <div className="flex items-start gap-6">
          {/* Left: Title and Description */}
          <div className="flex-1">
            <div className={`flex items-center gap-3 ${isScrolled ? 'mb-1' : 'mb-3'}`}>
              <div
                className={`rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} transition-all ${
                  isScrolled ? 'w-8 h-8' : 'w-10 h-10'
                }`}
              >
                <Sparkles className={`text-white ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </div>
              <h1
                className={`font-bold text-gray-900 tracking-tight transition-all ${
                  isScrolled ? 'text-lg' : 'text-2xl'
                }`}
              >
                {title}
              </h1>
            </div>
            {!isScrolled && (
              <div className="flex items-center gap-2">
                {description && <p className="text-gray-600 text-sm">{description}</p>}
                {isSubmitted ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    제출 완료
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    작성 중
                  </span>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}

