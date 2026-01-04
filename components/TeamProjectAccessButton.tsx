'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Users, X, ArrowRight } from 'lucide-react'
import { GLOBAL_UI } from '@/i18n/translations'

export function TeamProjectAccessButton() {
  const [showModal, setShowModal] = useState(false)
  const [teamCode, setTeamCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !user.email) {
        throw new Error('Login required.')
      }

      // 서버 사이드 API를 통해 팀 프로젝트 접근 (RLS 정책 우회)
      const trimmedCode = teamCode.trim().toUpperCase()
      const response = await fetch('/api/team-project/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamCode: trimmedCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API 응답 오류:', {
          status: response.status,
          statusText: response.statusText,
          data,
        })
        throw new Error(data.error || 'Failed to access team project.')
      }

      // 접근 성공 - 로컬 스토리지에 접근 가능한 팀 프로젝트 ID 추가
      try {
        const accessibleProjects = JSON.parse(
          localStorage.getItem('accessible_team_projects') || '[]'
        ) as string[]
        
        if (!accessibleProjects.includes(data.projectId)) {
          accessibleProjects.push(data.projectId)
          localStorage.setItem('accessible_team_projects', JSON.stringify(accessibleProjects))
        }
      } catch (error) {
        console.error('로컬 스토리지 저장 오류:', error)
      }

      // 접근 성공 - 대시보드로 이동 (페이지 새로고침하여 프로젝트 목록 업데이트)
      window.location.href = '/dashboard'
    } catch (error: any) {
      console.error('팀 프로젝트 접속 오류:', error)
      setError(error.message || 'Failed to access team project.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
      >
        <Users className="w-5 h-5" />
        {GLOBAL_UI.teamProjectAccess}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{GLOBAL_UI.teamProjectAccess}</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setTeamCode('')
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              {GLOBAL_UI.enterTeamCode}
            </p>

            <form onSubmit={handleAccess} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {GLOBAL_UI.teamCode}
                </label>
                <input
                  type="text"
                  value={teamCode}
                  onChange={(e) => {
                    setTeamCode(e.target.value.toUpperCase())
                    setError('')
                  }}
                  required
                  className="input-field"
                  placeholder={GLOBAL_UI.teamCodePlaceholder}
                  maxLength={9}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setTeamCode('')
                    setError('')
                  }}
                  className="btn-secondary flex-1"
                >
                  {GLOBAL_UI.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Connecting...'
                  ) : (
                    <>
                      {GLOBAL_UI.accessTeamProject}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

