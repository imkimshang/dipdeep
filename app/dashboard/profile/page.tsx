'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Lock } from 'lucide-react'
import Link from 'next/link'

export default function ProfileEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    experience: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        router.push('/dashboard')
        return
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone_number, experience')
          .eq('id', userId)
          .single()

        if (profileError) throw profileError

        setFormData({
          fullName: (profile as any)?.full_name || '',
          phone: (profile as any)?.phone_number || '',
          experience: (profile as any)?.experience || '',
          newPassword: '',
          confirmPassword: '',
        })
      } catch (error: any) {
        console.error('프로필 로드 오류:', error)
        setError('프로필 정보를 불러올 수 없습니다.')
      }
    }

    loadProfile()
  }, [userId, supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!userId) {
        throw new Error('사용자 ID가 없습니다.')
      }

      // 비밀번호 변경이 있는 경우
      if (formData.newPassword) {
        if (formData.newPassword.length < 6) {
          throw new Error('새 비밀번호는 최소 6자 이상이어야 합니다.')
        }

        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('새 비밀번호가 일치하지 않습니다.')
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.newPassword,
        })

        if (updateError) throw updateError
      }

      // 프로필 정보 업데이트
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone_number: formData.phone,
          experience: formData.experience,
          updated_at: new Date(),
        } as any)
        .eq('id', userId)

      if (profileError) throw profileError

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh() // 페이지 새로고침하여 변경사항 반영
      }, 1500)
    } catch (error: any) {
      console.error('프로필 수정 오류:', error)
      setError(error.message || '프로필 수정 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          대시보드로 돌아가기
        </Link>

        <div className="glass rounded-3xl shadow-xl shadow-black/5 p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">
            회원정보 수정
          </h1>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              회원정보가 성공적으로 수정되었습니다. 대시보드로 이동합니다...
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                이름
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="input-field"
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="input-field"
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                경력
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) =>
                  setFormData({ ...formData, experience: e.target.value })
                }
                rows={4}
                className="input-field resize-none"
                placeholder="관련 업무 경력이나 교육 이력을 입력해주세요"
              />
            </div>

            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-gray-600" />
                <label className="block text-sm font-semibold text-gray-700">
                  새 비밀번호 (변경 시에만 입력)
                </label>
              </div>
              <div className="space-y-4">
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  minLength={6}
                  className="input-field"
                  placeholder="새 비밀번호 (최소 6자)"
                />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  minLength={6}
                  className="input-field"
                  placeholder="새 비밀번호 확인"
                />
              </div>
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
                disabled={loading || success}
                className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {loading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

