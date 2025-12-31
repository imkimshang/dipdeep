'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface WorkbookStatusBarProps {
  projectId: string
}

export function WorkbookStatusBar({ projectId }: WorkbookStatusBarProps) {
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [editorInfo, setEditorInfo] = useState<{ name: string; email: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadProjectInfo = async () => {
      if (!projectId) return

      try {
        const { data: project, error } = await supabase
          .from('projects')
          .select('updated_at, last_editor_id')
          .eq('id', projectId)
          .single()

        if (error) throw error

        // updated_at 포맷팅
        if ((project as any)?.updated_at) {
          const date = new Date((project as any).updated_at)
          const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
          setLastUpdate(formattedDate)
        }

        // 수정자 정보 가져오기
        const lastEditorId = (project as any)?.last_editor_id
        if (lastEditorId) {
          const { data: editorProfile } = await supabase
            .from('profiles')
            .select('full_name, username, email')
            .eq('id', lastEditorId)
            .single()

          if (editorProfile) {
            setEditorInfo({
              name: (editorProfile as any).full_name || (editorProfile as any).username || '알 수 없음',
              email: (editorProfile as any).email || '',
            })
          }
        }

        // 실시간 업데이트를 위한 구독 (선택사항)
        const channel = supabase
          .channel(`project-${projectId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'projects',
              filter: `id=eq.${projectId}`,
            },
            (payload) => {
              const updatedProject = payload.new as any
              if (updatedProject.updated_at) {
                const date = new Date(updatedProject.updated_at)
                const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                setLastUpdate(formattedDate)
              }
              
              // 수정자 정보 다시 로드
              if (updatedProject.last_editor_id) {
                supabase
                  .from('profiles')
                  .select('full_name, username, email')
                  .eq('id', updatedProject.last_editor_id)
                  .single()
                  .then(({ data: profile }) => {
                    if (profile) {
                      setEditorInfo({
                        name: (profile as any).full_name || (profile as any).username || '알 수 없음',
                        email: (profile as any).email || '',
                      })
                    }
                  })
              }
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.error('프로젝트 정보 로드 오류:', error)
      }
    }

    loadProjectInfo()
    
    // 주기적으로 업데이트 (30초마다)
    const interval = setInterval(loadProjectInfo, 30000)
    
    return () => clearInterval(interval)
  }, [projectId, supabase])

  if (!lastUpdate && !editorInfo) return null

  const editorDisplay = editorInfo
    ? `${editorInfo.name}${editorInfo.email ? `(${editorInfo.email.split('@')[0]}@...)` : ''}`
    : '알 수 없음'

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/10 backdrop-blur-md border-t border-gray-200/50 z-40">
      <div className="container mx-auto px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span>
                Lastupdate - {lastUpdate}
              </span>
            )}
            {editorInfo && (
              <span>
                / {editorDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

