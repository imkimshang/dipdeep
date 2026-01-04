'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Lock } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const [isLogin, setIsLogin] = useState(mode !== 'signup')
  
  useEffect(() => {
    if (mode === 'signup') {
      setIsLogin(false)
    } else {
      setIsLogin(true)
    }
  }, [mode])
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
          
          // 이메일 미확인 오류 처리
          if (error.message?.includes('Email not confirmed') || error.message?.includes('email not confirmed')) {
            alert(
              "이메일 확인이 필요합니다.\n\n" +
              "가입 시 발송된 확인 이메일의 링크를 클릭해주세요.\n\n" +
              "이메일을 받지 못하셨다면, 스팸 폴더를 확인하거나\n" +
              "다시 회원가입을 시도해주세요."
            )
            setError("이메일 확인이 필요합니다. 확인 이메일의 링크를 클릭해주세요.")
            throw error
          }
          
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
        // 이메일 확인 링크의 리다이렉트 URL 설정
        const redirectTo = `${window.location.origin}/auth/callback`
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        })

        if (error) {
          console.error("가입 에러:", error)
          
          // Rate limit 오류 처리
          if (error.message?.includes('seconds') || error.message?.includes('rate limit')) {
            const waitTimeMatch = error.message.match(/(\d+)\s*seconds?/i)
            const waitTime = waitTimeMatch ? waitTimeMatch[1] : '일부'
            
            alert(
              `보안을 위해 잠시 후 다시 시도해주세요.\n\n` +
              `잠시 기다렸다가 (약 ${waitTime}초 후) 다시 회원가입을 시도해주세요.`
            )
            setError(`잠시 후 다시 시도해주세요. (약 ${waitTime}초 대기 필요)`)
            throw error
          }
          
          // 일반 오류
          setError("가입 에러: " + error.message)
          alert("가입 에러: " + error.message)
          throw error
        }

        // 2. 계정 생성 성공 시, 방금 생성된 유저 ID를 가지고 profiles 테이블에 추가 정보 저장
        if (data.user) {
          // 세션이 완전히 설정될 때까지 대기 (최대 5초, 더 자주 확인)
          let sessionReady = false
          for (let i = 0; i < 10; i++) {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            if (sessionData?.session && sessionData.session.user?.id === data.user.id) {
              sessionReady = true
              console.log('세션 설정 완료, 프로필 생성 시도')
              break
            }
            // 500ms마다 확인
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
          
          if (!sessionReady) {
            // 세션이 설정되지 않으면 프로필 생성을 서버 사이드에서 처리하도록 안내
            console.error('세션 설정 실패 - 이메일 확인이 필요할 수 있습니다')
            alert(
              "회원가입 요청이 접수되었습니다.\n\n" +
              (data.user.email_confirmed_at 
                ? "프로필은 자동으로 생성됩니다. 잠시 후 다시 로그인해주세요."
                : "이메일 확인 링크를 클릭한 후 로그인해주세요.\n프로필은 로그인 시 자동으로 생성됩니다.")
            )
            // 프로필 없이도 계속 진행 (나중에 로그인 시 생성됨)
            window.location.href = '/login?mode=login'
            return
          }

          // 프로필 생성 시도
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
              updated_at: new Date().toISOString(),
            } as any)

          if (profileError) {
            console.error("프로필 저장 에러:", profileError)
            console.error("에러 코드:", profileError.code)
            console.error("에러 상세:", JSON.stringify(profileError, null, 2))
            
            // RLS 정책 오류인 경우 안내 메시지 표시
            if (profileError.code === '42501' || profileError.code === 'PGRST301' || profileError.message?.includes('row-level security') || profileError.message?.includes('RLS')) {
              alert(
                "프로필 저장 권한 오류가 발생했습니다.\n\n" +
                "Supabase SQL Editor에서 다음 파일을 실행해주세요:\n\n" +
                "fix-profiles-rls-final.sql\n\n" +
                "또는 다음 SQL을 직접 실행:\n\n" +
                "DROP POLICY IF EXISTS \"Users can insert own profile\" ON profiles;\n" +
                "CREATE POLICY \"Users can insert own profile\"\n" +
                "  ON profiles FOR INSERT\n" +
                "  WITH CHECK (auth.uid() = id);"
              )
              throw profileError
            } else {
              alert("프로필 저장 중 오류가 발생했습니다: " + profileError.message)
              throw profileError
            }
          } else {
            alert("회원가입이 완료되었습니다!")
            // 완전한 페이지 리로드를 통해 세션을 서버에 전달
            window.location.href = '/dashboard'
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}


