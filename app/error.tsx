'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 로깅 (선택사항)
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          오류가 발생했습니다
        </h1>
        
        <p className="text-gray-600 mb-6">
          예상치 못한 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
            <p className="text-sm font-semibold text-red-800 mb-2">오류 상세:</p>
            <p className="text-sm text-red-700 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </button>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            대시보드로
          </Link>
        </div>
      </div>
    </div>
  )
}

