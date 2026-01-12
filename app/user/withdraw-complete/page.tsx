'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Home } from 'lucide-react'

export default function WithdrawCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // 3초 카운트다운 후 메인 페이지로 이동
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass rounded-3xl shadow-2xl shadow-black/5 p-10 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
          회원탈퇴가 완료되었습니다
        </h1>

        <div className="space-y-4 mb-8 text-left bg-gray-50 rounded-xl p-6">
          <p className="text-gray-700 text-sm leading-relaxed">
            회원탈퇴 처리가 완료되었습니다.
          </p>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>탈퇴 시 기존 데이터는 복구할 수 없습니다.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>동일 이메일로 15일간 재가입이 제한됩니다.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">•</span>
              <span>탈퇴 후 5년이 지나면 모든 데이터가 영구 삭제됩니다.</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{countdown}초</span> 후 메인 페이지로 이동합니다...
          </div>
          
          <div className="flex gap-3">
            <Link
              href="/"
              className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              메인으로 이동
            </Link>
            <Link
              href="/login"
              className="flex-1 btn-secondary inline-flex items-center justify-center gap-2"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
