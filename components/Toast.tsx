'use client'

import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface ToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
  type?: 'success' | 'error'
}

export function Toast({ message, isVisible, onClose, type = 'success' }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-xl border min-w-[300px] ${
          type === 'success'
            ? 'bg-green-50/95 border-green-200 text-green-800'
            : 'bg-red-50/95 border-red-200 text-red-800'
        }`}
      >
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium text-sm flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}


