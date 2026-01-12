'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Lock, Trash2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function ProfileEditPageContent() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    interestFields: [] as string[],
    newPassword: '',
    confirmPassword: '',
  })
  
  // 관심분야 선택 옵션
  const interestOptions = [
    '웹/앱서비스기획',
    '제품/상품기획',
    '행사/전시기획',
    '사업기획',
    '전략기획',
    '마케팅',
    '학생',
    '취업준비',
    '기타',
  ]
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // 회원탈퇴 처리 (API 엔드포인트 사용)
  const handleDeleteAccount = async () => {
    if (!confirm(
      '정말 회원탈퇴를 하시겠습니까?\n\n' +
      '탈퇴 시 기존 데이터는 복구할 수 없으며, 15일간 재가입이 제한됩니다.\n\n' +
      '계속하시겠습니까?'
    )) {
      return
    }
    
    setDeleting(true)
    setError('')
    
    try {
      // 회원탈퇴 API 호출
      const response = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // 서버 오류 상세 메시지 표시
        const errorMessage = data.details 
          ? `${data.error}\n\n상세: ${data.details}` 
          : data.error || '서버 오류가 발생했습니다.'
        throw new Error(errorMessage)
      }
      
      // 성공 시 완료 페이지로 이동
      router.push('/user/withdraw-complete')
    } catch (error: any) {
      console.error('회원탈퇴 오류:', error)
      setError(error.message || '서버 오류가 발생했습니다.')
      setDeleting(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 현재 로그인한 사용자 정보 가져오기
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/login')
          return
        }
        
        setUserId(user.id)

        // 프로필 정보 불러오기 (활성 계정만, RLS 정책으로 필터링되지 않도록 모든 필드 조회)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('프로필 로드 오류:', profileError)
          throw profileError
        }
        
        // 프로필이 없는 경우
        if (!profile) {
          setFormData({
            email: user.email || '',
            fullName: '',
            phone: '',
            interestFields: [],
            newPassword: '',
            confirmPassword: '',
          })
          setError('프로필 정보를 찾을 수 없습니다. 프로필을 생성해주세요.')
          return
        }
        
        // 탈퇴된 계정인 경우 (이중 체크)
        if ((profile as any).status === 'archived' || (profile as any).deleted_at) {
          await supabase.auth.signOut()
          router.push('/login')
          setError('회원탈퇴된 계정입니다. 다시 회원가입이 필요합니다.')
          return
        }

        // 프로필 정보를 폼에 반영
        setFormData({
          email: (profile as any)?.email || user.email || '',
          fullName: (profile as any)?.full_name || '',
          phone: (profile as any)?.phone_number || '',
          interestFields: Array.isArray((profile as any)?.interest_fields) 
            ? (profile as any).interest_fields 
            : (profile as any)?.interest_fields 
            ? JSON.parse((profile as any).interest_fields) 
            : [],
          newPassword: '',
          confirmPassword: '',
        })
      } catch (error: any) {
        console.error('프로필 로드 오류:', error)
        setError('프로필 정보를 불러올 수 없습니다.')
      }
    }

    loadProfile()
  }, [router])

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
      // 주의: email 필드는 절대로 업데이트하지 않음 (회원가입 후 수정 불가 정책)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone_number: formData.phone,
          interest_fields: formData.interestFields.length > 0 ? formData.interestFields : null,
          updated_at: new Date(),
          // email 필드는 의도적으로 제외됨 (수정 불가)
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
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-gray-600" />
                <label htmlFor="profile-email" className="block text-sm font-semibold text-gray-700">
                  이메일 <span className="text-xs text-gray-500 font-normal">(수정 불가)</span>
                </label>
              </div>
              <input
                id="profile-email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="input-field bg-gray-100 cursor-not-allowed"
                placeholder="이메일"
              />
            </div>
            
            <div>
              <label htmlFor="profile-fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                이름
              </label>
              <input
                id="profile-fullName"
                name="fullName"
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
              <label htmlFor="profile-phone" className="block text-sm font-semibold text-gray-700 mb-2">
                전화번호
              </label>
              <input
                id="profile-phone"
                name="phone"
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
                관심분야 <span className="text-gray-500 text-xs font-normal">(다중 선택 가능)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {interestOptions.map((option) => (
                  <label
                    key={option}
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.interestFields.includes(option)
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.interestFields.includes(option)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            interestFields: [...formData.interestFields, option],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            interestFields: formData.interestFields.filter((f) => f !== option),
                          })
                        }
                      }}
                      className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium leading-tight break-words whitespace-normal">{option}</span>
                  </label>
                ))}
              </div>
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
                  id="profile-newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  minLength={6}
                  className="input-field"
                  placeholder="새 비밀번호 (최소 6자)"
                  autoComplete="new-password"
                />
                <div>
                  <label htmlFor="profile-confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    새 비밀번호 확인
                  </label>
                  <input
                    id="profile-confirmPassword"
                    name="confirmPassword"
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
                    autoComplete="new-password"
                  />
                </div>
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
                disabled={loading || success || deleting}
                className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {loading ? '저장 중...' : '저장하기'}
              </button>
            </div>
            
            <div className="pt-8 mt-8 border-t border-red-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">회원탈퇴</h3>
              <p className="text-sm text-gray-600 mb-4">
                회원탈퇴 시 기존 데이터는 복구할 수 없으며, 15일간 재가입이 제한됩니다.
                <br />
                탈퇴 후 5년이 지나면 모든 데이터가 영구 삭제됩니다.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? '탈퇴 처리 중...' : '회원탈퇴'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

