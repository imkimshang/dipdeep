import { useCallback } from 'react'
import { useCredits } from './useCredits'

/**
 * 워크북에서 사용하는 크레딧 차감 훅
 * 최초 1회 저장/제출 시 크레딧을 차감합니다.
 */
export function useWorkbookCredit(projectId: string, sessionNumber: number) {
  const { checkPurchaseStatus, purchaseItem, creditBalance, loading: creditsLoading } = useCredits()

  /**
   * 워크북 해금 상태 확인 및 필요시 차감
   * @returns 차감 성공 여부 또는 이미 해금됨
   */
  const checkAndDeductCredit = useCallback(async (): Promise<boolean> => {
    if (!projectId || !sessionNumber) {
      console.log('[크레딧] projectId나 sessionNumber가 없습니다.', { projectId, sessionNumber })
      return true
    }

    // 1회차는 무료
    if (sessionNumber === 1) {
      console.log('[크레딧] 1회차는 무료입니다.')
      return true
    }

    // 크레딧 로딩 대기
    if (creditsLoading) {
      console.log('[크레딧] 크레딧 로딩 중... 잠시 후 재시도해주세요.')
      // 잠시 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 500))
      // 재귀 호출은 무한 루프 위험이 있으므로, 단순히 에러를 발생시킵니다
      if (creditsLoading) {
        throw new Error('크레딧 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      }
    }

    try {
      // 이미 구매했는지 확인
      const itemId = `session${sessionNumber}`
      console.log('[크레딧] 구매 상태 확인:', { itemId, sessionNumber, currentBalance: creditBalance })
      const isPurchased = await checkPurchaseStatus(itemId, 'WORKBOOK')
      console.log('[크레딧] 구매 상태:', { isPurchased })

      if (isPurchased) {
        // 이미 구매함
        console.log('[크레딧] 이미 구매한 항목입니다.')
        return true
      }

      // 크레딧 부족 확인
      const cost = 5 // 워크북 해금 비용
      console.log('[크레딧] 크레딧 확인:', { currentBalance: creditBalance, required: cost })
      if (creditBalance < cost) {
        const errorMsg = `크레딧이 부족합니다. (현재: ${creditBalance}, 필요: ${cost})`
        console.error('[크레딧]', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('[크레딧] 크레딧 차감 시도:', { itemId, cost, currentBalance: creditBalance })
      // 크레딧 차감
      const result = await purchaseItem(itemId, 'WORKBOOK', cost, `${sessionNumber}회차 워크북 해금`)
      console.log('[크레딧] 차감 완료:', result)

      return true
    } catch (error: any) {
      console.error('[크레딧] 크레딧 차감 오류:', error)
      throw error
    }
  }, [projectId, sessionNumber, checkPurchaseStatus, purchaseItem, creditBalance, creditsLoading])

  return {
    checkAndDeductCredit,
    creditBalance,
  }
}

