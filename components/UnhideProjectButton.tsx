'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface UnhideProjectButtonProps {
  projectId: string
  onSuccess?: () => void
}

export function UnhideProjectButton({ projectId, onSuccess }: UnhideProjectButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleUnhide = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('이 프로젝트를 다시 표시하시겠습니까?')) {
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      const { error } = await (supabase.from('projects') as any).update({
        is_hidden: false,
      }).eq('id', projectId).eq('user_id', user.id)

      if (error) throw error

      alert('프로젝트가 다시 표시되었습니다.')
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (error: any) {
      console.error('프로젝트 숨김 해제 오류:', error)
      alert(`오류: ${error.message || '프로젝트 숨김 해제에 실패했습니다.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUnhide}
      disabled={loading}
      className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
      title="프로젝트 다시 표시"
    >
      <Eye className="w-3.5 h-3.5" />
      {loading ? '처리 중...' : '숨김 해제'}
    </button>
  )
}

