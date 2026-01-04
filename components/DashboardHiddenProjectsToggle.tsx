'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { GLOBAL_UI } from '@/i18n/translations'

interface DashboardHiddenProjectsToggleProps {
  showHidden: boolean
  onToggle: () => void
}

export function DashboardHiddenProjectsToggle({
  showHidden,
  onToggle,
}: DashboardHiddenProjectsToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
        showHidden
          ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {showHidden ? (
        <>
          <EyeOff className="w-4 h-4" />
          {GLOBAL_UI.hideHidden}
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" />
          {GLOBAL_UI.showHidden}
        </>
      )}
    </button>
  )
}

