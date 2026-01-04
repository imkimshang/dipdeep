import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface CreditBalance {
  balance: number
  loading: boolean
  error: string | null
}

interface PurchaseResult {
  success: boolean
  new_balance: number
  message: string
}

export function useCredits() {
  const supabase = createClient()
  const [creditBalance, setCreditBalance] = useState<CreditBalance>({
    balance: 0,
    loading: true,
    error: null,
  })

  // 크레딧 잔액 조회
  const loadBalance = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCreditBalance({ balance: 0, loading: false, error: null })
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setCreditBalance({
        balance: data?.credit_balance || 0,
        loading: false,
        error: null,
      })
    } catch (error: any) {
      console.error('크레딧 잔액 조회 오류:', error)
      setCreditBalance({
        balance: 0,
        loading: false,
        error: error.message || '크레딧 잔액을 불러올 수 없습니다.',
      })
    }
  }, [supabase])

  // 실시간 구독 (크레딧 잔액 변경 감지)
  useEffect(() => {
    loadBalance()

    let channel: any = null

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      channel = supabase
        .channel(`credit-balance-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.credit_balance !== undefined) {
              setCreditBalance((prev) => ({
                ...prev,
                balance: payload.new.credit_balance as number,
              }))
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [loadBalance, supabase])

  // 항목 구매
  const purchaseItem = useCallback(
    async (
      itemId: string,
      itemType: 'WORKBOOK' | 'PROMPT' | 'PROPOSAL' | 'PROPOSAL_CREATE',
      cost: number,
      description?: string
    ): Promise<PurchaseResult> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('로그인이 필요합니다.')
        }

        console.log('[구매] RPC 호출 시작:', { userId: user.id, itemId, itemType, cost, description })
        const { data, error } = await supabase.rpc('purchase_item', {
          item_id_input: itemId,
          item_type_input: itemType,
          cost: cost,
          description_input: description || null,
        })

        if (error) {
          console.error('[구매] RPC 오류:', error)
          throw error
        }

        console.log('[구매] RPC 응답:', data)
        const result = data as PurchaseResult

        if (!result || !result.success) {
          throw new Error(result?.message || '구매에 실패했습니다.')
        }

        // 잔액 업데이트
        setCreditBalance((prev) => ({
          ...prev,
          balance: result.new_balance,
        }))

        console.log('[구매] 완료:', { newBalance: result.new_balance })
        return result
      } catch (error: any) {
        console.error('[구매] 구매 오류:', error)
        throw new Error(error.message || '구매 중 오류가 발생했습니다.')
      }
    },
    [supabase]
  )

  // 구매 여부 확인
  const checkPurchaseStatus = useCallback(
    async (
      itemId: string,
      itemType: 'WORKBOOK' | 'PROMPT' | 'PROPOSAL' | 'PROPOSAL_CREATE'
    ): Promise<boolean> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log('[구매상태] 사용자가 로그인되지 않았습니다.')
          return false
        }

        // PROMPT와 PROPOSAL_CREATE는 구매 기록이 없어도 사용 가능 (일회성 차감)
        if (itemType === 'PROMPT' || itemType === 'PROPOSAL_CREATE') {
          console.log('[구매상태] PROMPT/PROPOSAL_CREATE는 일회성 차감이므로 true 반환')
          return false // 실제로는 항상 차감해야 하므로 false 반환 (차감 필요)
        }

        console.log('[구매상태] purchased_items 테이블 확인:', { userId: user.id, itemId, itemType })
        const { data, error } = await supabase
          .from('purchased_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_id', itemId)
          .eq('item_type', itemType)
          .maybeSingle()

        if (error) {
          console.error('[구매상태] 조회 오류:', error)
          throw error
        }

        const isPurchased = !!data
        console.log('[구매상태] 결과:', { isPurchased, data })
        return isPurchased
      } catch (error: any) {
        console.error('[구매상태] 구매 상태 확인 오류:', error)
        return false
      }
    },
    [supabase]
  )

  return {
    creditBalance: creditBalance.balance,
    loading: creditBalance.loading,
    error: creditBalance.error,
    loadBalance,
    purchaseItem,
    checkPurchaseStatus,
  }
}

