'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'webapp',
    team_id: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: formData.title || '제목 없음',
          type: formData.type,
          team_id: formData.team_id || null,
          progress_rate: 0,
          current_step: 0,
        } as any)
        .select()
        .single()

      if (error) {
        console.error('프로젝트 생성 오류:', error)
        throw error
      }

      if (!project || !project.id) {
        throw new Error('프로젝트가 생성되지 않았습니다.')
      }

      // Show success message and redirect
      alert('프로젝트가 성공적으로 생성되었습니다!')
      
      // Redirect to week1 workbook with project ID
      router.push(`/workbook/week1?projectId=${project.id}`)
    } catch (error: any) {
      console.error('프로젝트 생성 실패:', error)
      
      // RLS 정책 오류인 경우 안내 메시지 표시
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        alert(
          `프로젝트 생성 권한 오류가 발생했습니다.\n\n` +
          `Supabase에서 Row Level Security (RLS) 정책을 설정해야 합니다.\n\n` +
          `RLS_SETUP.md 파일을 참고하여 설정해주세요.`
        )
      } else {
        alert(
          `프로젝트 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <header className="glass border-b border-gray-100/50 backdrop-blur-2xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">새 프로젝트 생성</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <div className="glass rounded-3xl shadow-xl shadow-black/5 p-10">
          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-3"
              >
                프로젝트 제목 *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="input-field"
                placeholder="예: AI 챗봇 기획 프로젝트"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 mb-3"
              >
                프로젝트 유형 *
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="input-field"
              >
                <option value="webapp">웹 애플리케이션</option>
                <option value="story">스토리</option>
                <option value="product">제품</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="team_id"
                className="block text-sm font-medium text-gray-700 mb-3"
              >
                팀 ID (선택사항)
              </label>
              <input
                id="team_id"
                type="text"
                value={formData.team_id}
                onChange={(e) =>
                  setFormData({ ...formData, team_id: e.target.value })
                }
                className="input-field"
                placeholder="팀에 속해있다면 팀 ID를 입력하세요"
              />
              <p className="mt-2 text-sm text-gray-400">
                개인 프로젝트인 경우 비워두세요
              </p>
            </div>

            <div className="flex gap-4 pt-6">
              <Link
                href="/dashboard"
                className="btn-secondary flex-1 text-center"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
              >
                <Save className="w-5 h-5" />
                {loading ? '생성 중...' : '프로젝트 생성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


