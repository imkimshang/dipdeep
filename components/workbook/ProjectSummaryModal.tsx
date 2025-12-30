'use client'

import { X, Copy } from 'lucide-react'

interface ProjectSummaryModalProps {
  isOpen: boolean
  summaryPrompt: string
  onClose: () => void
  onCopy: () => void
}

export function ProjectSummaryModal({
  isOpen,
  summaryPrompt,
  onClose,
  onCopy,
}: ProjectSummaryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">프로젝트 요약 프롬프트</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {summaryPrompt}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button onClick={onCopy} className="btn-primary flex-1">
            <Copy className="w-4 h-4" />
            프롬프트 복사
          </button>
          <button onClick={onClose} className="btn-secondary">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}


