'use client'

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface WorkbookSectionProps {
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
  themeColor?: 'indigo' | 'violet' | 'emerald' | 'rose' | 'sky'
  className?: string
}

export function WorkbookSection({
  icon: Icon,
  title,
  description,
  children,
  themeColor = 'indigo',
  className = '',
}: WorkbookSectionProps) {
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

  const borderColors = {
    indigo: 'border-indigo-100',
    violet: 'border-violet-100',
    emerald: 'border-emerald-100',
    rose: 'border-rose-100',
    sky: 'border-sky-100',
  }

  const gradient = gradientColors[themeColor]
  const shadow = shadowColors[themeColor]
  const border = borderColors[themeColor]

  return (
    <div className={`glass rounded-2xl shadow-lg p-8 mb-8 border ${border} ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      {description && <p className="text-gray-600 mb-6">{description}</p>}
      {children}
    </div>
  )
}

