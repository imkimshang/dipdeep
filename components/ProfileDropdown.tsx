'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut, ChevronDown, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface ProfileDropdownProps {
  username: string
  userId: string
}

export function ProfileDropdown({ username, userId }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showPasswordCheck, setShowPasswordCheck] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleProfileClick = () => {
    setIsOpen(!isOpen)
  }

  const handleEditProfile = () => {
    setIsOpen(false)
    setShowPasswordCheck(true)
  }

  const handlePasswordCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChecking(true)
    setPasswordError('')

    try {
      // 현재 사용자 이메일 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        throw new Error('사용자 정보를 가져올 수 없습니다.')
      }

      // 비밀번호 확인
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (error) {
        setPasswordError('비밀번호가 일치하지 않습니다.')
        setIsChecking(false)
        return
      }

      // 비밀번호 확인 성공 - 프로필 수정 페이지로 이동
      router.push(`/dashboard/profile?userId=${userId}`)
    } catch (error: any) {
      setPasswordError(error.message || '비밀번호 확인 중 오류가 발생했습니다.')
      setIsChecking(false)
    }
  }

  if (showPasswordCheck) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">비밀번호 확인</h2>
            <button
              onClick={() => {
                setShowPasswordCheck(false)
                setCurrentPassword('')
                setPasswordError('')
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            회원정보를 수정하려면 현재 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handlePasswordCheck} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="input-field"
                placeholder="현재 비밀번호를 입력하세요"
              />
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {passwordError}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordCheck(false)
                  setCurrentPassword('')
                  setPasswordError('')
                }}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isChecking}
                className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isChecking ? '확인 중...' : '확인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleProfileClick}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <User className="w-5 h-5 text-white" />
        <span className="text-sm font-medium text-white">{username}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/70 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/50 overflow-hidden z-50">
          <div className="py-2">
            <button
              onClick={handleEditProfile}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors text-gray-700"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">회원정보 수정</span>
            </button>
            <div className="border-t border-gray-200/50 my-1"></div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">로그아웃</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

