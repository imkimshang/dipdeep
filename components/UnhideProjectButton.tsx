'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { GLOBAL_UI } from '@/i18n/translations'

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

    if (!confirm('Do you want to unhide this project?')) {
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Login required.')
        return
      }

      const { error } = await (supabase.from('projects') as any).update({
        is_hidden: false,
      }).eq('id', projectId).eq('user_id', user.id)

      if (error) throw error

      alert('Project has been unhidden.')
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Unhide project error:', error)
      alert(`Error: ${error.message || 'Failed to unhide project.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUnhide}
      disabled={loading}
      className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
      title={GLOBAL_UI.unhideProject}
    >
      <Eye className="w-3.5 h-3.5" />
      {loading ? GLOBAL_UI.unhiding : GLOBAL_UI.unhideProject}
    </button>
  )
}

