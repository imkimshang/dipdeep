'use client'

import { useState } from 'react'
import { Lock, Coins, Unlock } from 'lucide-react'
import { useCredits } from '@/hooks/useCredits'

interface WorkbookLockScreenProps {
  sessionNumber: number
  sessionTitle: string
  cost: number
  onUnlock: () => void
}

export function WorkbookLockScreen({
  sessionNumber,
  sessionTitle,
  cost,
  onUnlock,
}: WorkbookLockScreenProps) {
  const { creditBalance, purchaseItem, loading: creditsLoading } = useCredits()
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    if (creditBalance < cost) {
      setError(`크레딧이 부족합니다. (현재: ${creditBalance}, 필요: ${cost})`)
      return
    }

    setIsPurchasing(true)
    setError(null)

    try {
      const result = await purchaseItem(
        `session${sessionNumber}`,
        'WORKBOOK',
        cost,
        `${sessionNumber}회차 워크북 해금`
      )

      if (result.success) {
        onUnlock()
      }
    } catch (err: any) {
      setError(err.message || '구매 중 오류가 발생했습니다.')
    } finally {
      setIsPurchasing(false)
    }
  }

  const canPurchase = creditBalance >= cost && !isPurchasing && !creditsLoading

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border-2 border-gray-200">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {sessionNumber}회차 잠금
        </h2>
        <p className="text-gray-600 mb-6">{sessionTitle}</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-orange-600" />
            <span className="text-lg font-semibold text-gray-900">
              {cost} 크레딧 필요
            </span>
          </div>
          <p className="text-sm text-gray-500">
            현재 보유: {creditBalance.toLocaleString()} 크레딧
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={!canPurchase}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            canPurchase
              ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-md'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isPurchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              구매 중...
            </>
          ) : (
            <>
              <Unlock className="w-5 h-5" />
              {cost} 크레딧으로 해금하기
            </>
          )}
        </button>

        {creditBalance < cost && (
          <p className="mt-4 text-sm text-gray-500">
            크레딧이 부족합니다. 충전이 필요합니다.
          </p>
        )}
      </div>
    </div>
  )
}

