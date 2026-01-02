'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 전역 에러 로깅
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              심각한 오류가 발생했습니다
            </h1>
            
            <p className="text-gray-600 mb-6">
              애플리케이션을 다시 시작해주세요.
            </p>
            
            <button
              onClick={() => {
                reset()
                window.location.href = '/'
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

