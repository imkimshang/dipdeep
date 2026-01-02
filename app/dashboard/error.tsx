'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-16 h-16 text-orange-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          대시보드 로드 오류
        </h1>
        
        <p className="text-gray-600 mb-6">
          대시보드를 불러오는 중 오류가 발생했습니다.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}

