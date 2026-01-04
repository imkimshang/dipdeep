'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { CreditBalance } from '@/components/CreditBalance'
import { LanguageToggle } from '@/components/LanguageToggle'
import { GLOBAL_UI } from '@/i18n/translations'

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
      className={`bg-slate-900 border-b border-slate-700/50 sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-2 h-[60px]' : 'py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        {!isScrolled && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-all text-sm font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {GLOBAL_UI.backToDashboard}
          </Link>
        )}
        <div className={`flex items-center gap-6 ${isScrolled ? 'justify-start' : 'items-start'}`}>
          {/* 스크롤 시 화살표를 로고 왼쪽에 배치 */}
          {isScrolled && (
            <Link
              href="/dashboard"
              className="flex-shrink-0 text-gray-300 hover:text-white transition-all"
              title={GLOBAL_UI.backToDashboard}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          {/* Left: Title and Description */}
          <div className="flex-1">
            <div className={`flex items-center gap-3 ${isScrolled ? 'mb-0' : 'mb-3'}`}>
              <div
                className={`rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} transition-all ${
                  isScrolled ? 'w-8 h-8' : 'w-10 h-10'
                }`}
              >
                <Sparkles className={`text-white ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </div>
              <h1
                className={`font-bold text-white tracking-tight transition-all ${
                  isScrolled ? 'text-lg' : 'text-2xl'
                }`}
                suppressHydrationWarning
              >
                {title}
              </h1>
            </div>
            {!isScrolled && (
              <div className="flex items-center gap-2">
                {description && (
                  <p className="text-gray-300 text-sm" suppressHydrationWarning>
                    {description}
                  </p>
                )}
                {isSubmitted ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-medium rounded-full">
                    Submitted
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium rounded-full">
                    In Progress
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Language Toggle & Credit Balance */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <LanguageToggle />
            <CreditBalance />
          </div>
        </div>
      </div>
    </header>
  )
}

