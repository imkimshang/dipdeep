'use client'

import { Coins } from 'lucide-react'
import { useCredits } from '@/hooks/useCredits'

export function CreditBalance() {
  const { creditBalance, loading } = useCredits()

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-white/30 rounded-lg">
        <Coins className="w-4 h-4 text-white/70 animate-pulse" />
        <span className="text-sm text-white/70">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-white/30 rounded-lg">
      <Coins className="w-4 h-4 text-white" />
      <span className="text-sm text-white">
        {creditBalance.toLocaleString()} 크레딧
      </span>
    </div>
  )
}

