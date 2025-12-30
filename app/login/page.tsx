'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [experience, setExperience] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          console.error('로그인 오류:', error)
          throw error
        }
        
        // 세션이 제대로 설정되었는지 확인
        if (data.user) {
          console.log('로그인 성공, 사용자:', data.user.email)
          
          // 세션이 클라이언트에 저장되도록 약간 대기
          await new Promise((resolve) => setTimeout(resolve, 200))
          
          // 현재 세션 확인
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('세션 확인 오류:', sessionError)
            throw new Error('세션 확인에 실패했습니다: ' + sessionError.message)
          }
          
          if (sessionData?.session) {
            console.log('세션이 설정되었습니다.')
            // 완전한 페이지 리로드를 통해 세션을 서버에 전달
            window.location.href = '/dashboard'
          } else {
            console.error('세션이 없습니다.')
            throw new Error('세션 설정에 실패했습니다. 다시 시도해주세요.')
          }
        } else {
          throw new Error('로그인에 실패했습니다. 사용자 정보를 가져올 수 없습니다.')
        }
      } else {
        // 1. Supabase Auth에 계정 생성
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          alert("가입 에러: " + error.message)
          throw error
        }

        // 2. 계정 생성 성공 시, 방금 생성된 유저 ID를 가지고 profiles 테이블에 추가 정보 저장
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id, // Auth의 유저 ID와 연결
              email: email,
              full_name: fullName,
              phone_number: phone,
              experience: experience,
              role: 'student' as const, // 기본값으로 student 설정
              username: email.split('@')[0], // 이메일의 @ 앞부분을 username으로 사용
              updated_at: new Date(),
            } as any)

          if (profileError) {
            console.error("프로필 저장 에러:", profileError)
            alert("프로필 저장 중 오류가 발생했습니다: " + profileError.message)
            throw profileError
          } else {
            alert("회원가입이 완료되었습니다!")
            router.push('/dashboard')
          }
        }
      }
    } catch (error: any) {
      setError(error.message || '오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass rounded-3xl shadow-2xl shadow-black/5 p-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            {isLogin ? '로그인' : '회원가입'}
          </h1>
          <p className="text-gray-500 text-base">
            {isLogin
              ? 'Dip Deep에 오신 것을 환영합니다'
              : '새로운 계정을 만들어보세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2.5"
            >
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field pl-12"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2.5"
            >
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field pl-12"
                placeholder="••••••••"
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-2.5"
                >
                  이름
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="input-field"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2.5"
                >
                  전화번호
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required={!isLogin}
                  className="input-field"
                  placeholder="010-1234-5678"
                />
              </div>

              <div>
                <label
                  htmlFor="experience"
                  className="block text-sm font-medium text-gray-700 mb-2.5"
                >
                  경력
                </label>
                <textarea
                  id="experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  required={!isLogin}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="관련 업무 경력이나 교육 이력을 입력해주세요"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
          >
            {loading
              ? '처리 중...'
              : isLogin
              ? '로그인'
              : '회원가입'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
              // 회원가입 모드로 전환할 때 추가 필드 초기화
              if (!isLogin) {
                setFullName('')
                setPhone('')
                setExperience('')
              }
            }}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
          >
            {isLogin
              ? '계정이 없으신가요? 회원가입'
              : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}


