'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, X, Users, User } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [isTeamProject, setIsTeamProject] = useState(false)
  const [teamMembers, setTeamMembers] = useState<string[]>([''])
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

      // 팀원 이메일 배열 처리 (빈 문자열 제거 및 현재 사용자 제외)
      const memberEmails = isTeamProject
        ? teamMembers
            .map((email) => email.trim())
            .filter((email) => email && email !== user.email)
        : []

      // 팀 코드 생성 (8자리 알파벳+숫자 조합)
      const generateTeamCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
      }

      const teamCode = isTeamProject ? generateTeamCode() : null

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: formData.title || '제목 없음',
          type: formData.type,
          team_id: formData.team_id || null,
          progress_rate: 0,
          current_step: 0,
          is_team: isTeamProject,
          member_emails: memberEmails,
          team_code: teamCode,
        } as any)
        .select()
        .single()

      if (error) {
        console.error('프로젝트 생성 오류:', error)
        throw error
      }

      if (!project || !(project as any).id) {
        throw new Error('프로젝트가 생성되지 않았습니다.')
      }

      // Show success message and redirect
      if (isTeamProject && (project as any).team_code) {
        const teamCode = (project as any).team_code
        alert(
          `팀 프로젝트가 성공적으로 생성되었습니다!\n\n` +
          `팀 코드: ${teamCode}\n\n` +
          `이 코드를 팀원들에게 공유해주세요.`
        )
      } else {
        alert('프로젝트가 성공적으로 생성되었습니다!')
      }
      
      // Redirect to week1 workbook with project ID (프로젝트 타입에 따라 다른 경로)
      const projectType = formData.type
      if (projectType === 'event') {
        router.push(`/workbook-event/week1?projectId=${(project as any).id}`)
      } else {
        router.push(`/workbook/week1?projectId=${(project as any).id}`)
      }
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
                <option value="event">행사/이벤트</option>
                <option value="product">제품</option>
              </select>
            </div>

            {/* 프로젝트 유형 선택 (개인/팀) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                프로젝트 형태
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTeamProject(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    !isTeamProject
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="w-4 h-4" />
                  개인 프로젝트
                </button>
                <button
                  type="button"
                  onClick={() => setIsTeamProject(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    isTeamProject
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  팀 프로젝트
                </button>
              </div>
            </div>

            {/* 팀원 이메일 입력 필드 (팀 프로젝트일 때만 표시) */}
            {isTeamProject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  팀원 이메일 (최대 6명)
                </label>
                <div className="space-y-2">
                  {teamMembers.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const newMembers = [...teamMembers]
                          newMembers[index] = e.target.value
                          setTeamMembers(newMembers)
                        }}
                        className="input-field flex-1"
                        placeholder={`팀원 ${index + 1} 이메일`}
                      />
                      {teamMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTeamMembers(teamMembers.filter((_, i) => i !== index))
                          }}
                          className="px-3 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {teamMembers.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setTeamMembers([...teamMembers, ''])}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + 팀원 추가
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  프로젝트 생성 후 팀 코드가 자동 생성됩니다. 팀원들에게 코드를 공유해주세요.
                </p>
              </div>
            )}

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


