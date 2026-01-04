'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Coins, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import { Toast } from '@/components/Toast'
import { useCredits } from '@/hooks/useCredits'

export default function CreditsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { creditBalance, loadBalance, loading } = useCredits()
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 크레딧 충전 패키지 (1,000원 = 10 크레딧 기준)
  const creditPackages = [
    { id: 1, credits: 100, price: 10000, label: '100 크레딧', popular: false },
    { id: 2, credits: 300, price: 25000, label: '300 크레딧', popular: true, bonus: '50 크레딧 추가' },
    { id: 3, credits: 500, price: 40000, label: '500 크레딧', popular: false, bonus: '100 크레딧 추가' },
    { id: 4, credits: 1000, price: 75000, label: '1,000 크레딧', popular: false, bonus: '250 크레딧 추가' },
  ]

  const handlePurchase = async (packageId: number) => {
    const pkg = creditPackages.find((p) => p.id === packageId)
    if (!pkg) return

    // TODO: 실제 결제 시스템 연동 (토스페이먼츠, 아임포트 등)
    // 현재는 테스트용으로 바로 충전
    setToastMessage('결제 시스템 연동 준비 중입니다. 곧 제공될 예정입니다.')
    setToastVisible(true)

    // 결제 완료 후 아래 코드 실행:
    // try {
    //   const { data, error } = await supabase.rpc('charge_credits', {
    //     user_id_input: user.id,
    //     amount: pkg.credits,
    //     description_input: `${pkg.label} 충전`,
    //   })
    //   if (error) throw error
    //   await loadBalance()
    //   setToastMessage('크레딧이 충전되었습니다.')
    //   setToastVisible(true)
    // } catch (error: any) {
    //   setToastMessage('충전 중 오류가 발생했습니다: ' + error.message)
    //   setToastVisible(true)
    // }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">크레딧 충전</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        {/* 현재 크레딧 잔액 */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-2">현재 보유 크레딧</p>
              <p className="text-4xl font-bold">
                {loading ? '로딩 중...' : creditBalance.toLocaleString()}
              </p>
            </div>
            <Coins className="w-16 h-16 text-orange-200" />
          </div>
        </div>

        {/* 크레딧 패키지 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">충전 패키지 선택</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-white rounded-xl shadow-md border-2 p-6 transition-all hover:shadow-lg ${
                  pkg.popular
                    ? 'border-orange-500 ring-2 ring-orange-200'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      인기
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Coins className="w-6 h-6 text-orange-600" />
                    <h3 className="text-2xl font-bold text-gray-900">{pkg.label}</h3>
                  </div>
                  {pkg.bonus && (
                    <p className="text-sm text-orange-600 font-medium mb-2">{pkg.bonus}</p>
                  )}
                  <p className="text-3xl font-bold text-gray-900">
                    {pkg.price.toLocaleString()}원
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    크레딧당 {Math.round(pkg.price / pkg.credits).toLocaleString()}원
                  </p>
                </div>

                <button
                  onClick={() => handlePurchase(pkg.id)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                    pkg.popular
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  충전하기
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 안내 사항 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            크레딧 안내
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 1,000원 = 10 크레딧</li>
            <li>• 워크북 해금: 5 크레딧 (회차별 최초 1회)</li>
            <li>• 제안서 프롬프트: 10 크레딧</li>
            <li>• 제안서 자동 제작: 30 크레딧 (준비 중)</li>
            <li>• 크레딧은 환불되지 않습니다.</li>
          </ul>
        </div>
      </div>

      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        type="info"
      />
    </div>
  )
}

