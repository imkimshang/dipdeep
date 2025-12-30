'use client'

import { X, Check, Trash2 } from 'lucide-react'

interface ProjectSettingsModalProps {
  isOpen: boolean
  projectTitle: string
  newProjectTitle: string
  onClose: () => void
  onTitleChange: (title: string) => void
  onSave: () => void
  onDelete: () => void
}

export function ProjectSettingsModal({
  isOpen,
  projectTitle,
  newProjectTitle,
  onClose,
  onTitleChange,
  onSave,
  onDelete,
}: ProjectSettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">프로젝트 설정</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로젝트명
            </label>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="프로젝트명을 입력하세요"
              className="input-field"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onSave} className="btn-primary flex-1">
              <Check className="w-4 h-4" />
              저장
            </button>
            <button
              onClick={onDelete}
              className="btn-secondary border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


