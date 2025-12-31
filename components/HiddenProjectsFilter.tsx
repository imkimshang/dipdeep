'use client'

import { Eye, EyeOff } from 'lucide-react'

interface HiddenProjectsFilterProps {
  showHidden: boolean
  onToggle: () => void
}

export function HiddenProjectsFilter({ showHidden, onToggle }: HiddenProjectsFilterProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
        showHidden
          ? 'bg-purple-50 border-purple-200 text-purple-700'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {showHidden ? (
        <>
          <EyeOff className="w-4 h-4" />
          <span className="text-sm font-medium">숨겨진 프로젝트 숨기기</span>
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">숨겨진 프로젝트 보기</span>
        </>
      )}
    </button>
  )
}

