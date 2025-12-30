'use client'

import { Save, RotateCcw, Send, Undo2, Check } from 'lucide-react'

interface WorkbookFooterProps {
  progress: number
  loading: boolean
  isSubmitted: boolean
  projectId: string
  readonly: boolean
  onReset: () => void
  onSave: () => Promise<void>
  onSubmit: () => Promise<void>
  themeColor?: 'indigo' | 'violet' | 'emerald' | 'rose' | 'sky'
}

export function WorkbookFooter({
  progress,
  loading,
  isSubmitted,
  projectId,
  readonly,
  onReset,
  onSave,
  onSubmit,
  themeColor = 'indigo',
}: WorkbookFooterProps) {
  const buttonColors = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    violet: 'bg-violet-600 hover:bg-violet-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    rose: 'bg-rose-600 hover:bg-rose-700',
    sky: 'bg-sky-600 hover:bg-sky-700',
  }

  const buttonClass = buttonColors[themeColor]

  if (!projectId) {
    return null
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={onReset}
          disabled={loading || !projectId || readonly}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          초기화
        </button>

        <div className="flex gap-3">
          <button
            onClick={onSave}
            disabled={loading || !projectId || readonly}
            className={`btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
          >
            <Save className="w-4 h-4" />
            {loading ? '저장 중...' : '임시 저장'}
          </button>

          <button
            onClick={onSubmit}
            disabled={loading || !projectId}
            className={`btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubmitted ? 'bg-gray-600 hover:bg-gray-700' : buttonClass
            }`}
          >
            {isSubmitted ? (
              <>
                <Undo2 className="w-4 h-4" />
                제출 회수
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                제출하기
              </>
            )}
          </button>
        </div>
      </div>

      {isSubmitted && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            이 워크북은 제출되었습니다. 제출 회수 버튼을 눌러 수정할 수 있습니다.
          </p>
        </div>
      )}
    </>
  )
}

