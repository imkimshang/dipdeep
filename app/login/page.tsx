'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Lock, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

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
  const [interestFields, setInterestFields] = useState<string[]>([])
  const [emailCheckLoading, setEmailCheckLoading] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [resendEmailLoading, setResendEmailLoading] = useState(false)
  const [resendEmailSuccess, setResendEmailSuccess] = useState(false)
  
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
  
  // 이메일 중복 확인 및 재가입 유예 기간 검증
  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      setEmailExists(false)
      return
    }
    
    setEmailCheckLoading(true)
    try {
      // 1. 활성 계정 확인 (status='active'이고 deleted_at이 null)
      const { data: activeAccount, error: activeError } = await supabase
        .from('profiles')
        .select('email, status, deleted_at')
        .eq('email', emailToCheck)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle()
      
      // 활성 계정이 있으면 중복
      if (activeAccount && !activeError) {
        setEmailExists(true)
        return
      }
      
      // 2. 탈퇴한 계정 확인 (status='archived' 또는 withdrawn_at이 있는 경우)
      const { data: archivedAccount, error: archivedError } = await supabase
        .from('profiles')
        .select('email, status, withdrawn_at')
        .eq('email', emailToCheck)
        .or('status.eq.archived,withdrawn_at.not.is.null')
        .order('withdrawn_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      
      // 탈퇴 기록이 있는 경우 재가입 유예 기간 확인
      if (archivedAccount && !archivedError && archivedAccount.withdrawn_at) {
        const withdrawnDate = new Date(archivedAccount.withdrawn_at)
        const now = new Date()
        const daysSinceWithdrawal = Math.floor((now.getTime() - withdrawnDate.getTime()) / (1000 * 60 * 60 * 24))
        const remainingDays = 15 - daysSinceWithdrawal
        
        if (remainingDays > 0) {
          // 유예 기간이 지나지 않음
          setEmailExists(true)
          setError(`이 이메일은 ${remainingDays}일 후 재가입이 가능합니다. (탈퇴일로부터 15일 유예 기간)`)
          return
        }
        // 유예 기간이 지났으므로 재가입 가능
      }
      
      // 중복 없음
      setEmailExists(false)
    } catch (err) {
      // 에러 발생 시 중복 없음으로 처리
      setEmailExists(false)
    } finally {
      setEmailCheckLoading(false)
    }
  }
  
  // 이메일 변경 시 중복 확인
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && !isLogin) {
        checkEmailExists(email)
      } else {
        setEmailExists(false)
      }
    }, 500) // 500ms 디바운스
    
    return () => clearTimeout(timer)
  }, [email, isLogin])
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
          if (error.message?.includes('Email not confirmed') || 
              error.message?.includes('email not confirmed') ||
              error.message?.includes('not been confirmed')) {
            setShowEmailVerification(true)
            setError("이메일 인증이 필요합니다. 확인 이메일의 링크를 클릭해주세요.")
            return
          }
          
          throw error
        }
        
        // 이메일 인증 확인
        if (data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut()
          setShowEmailVerification(true)
          setError("이메일 인증이 필요합니다. 확인 이메일의 링크를 클릭해주세요.")
          return
        }
        
        // 로그인 성공 후 활성 계정인지 확인
        if (data.user) {
          // 프로필 조회 시 status='active'이고 deleted_at IS NULL 조건으로 필터링
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, status, deleted_at')
            .eq('id', data.user.id)
            .eq('status', 'active') // 활성 계정만
            .is('deleted_at', null) // 삭제되지 않은 계정만
            .maybeSingle() // single 대신 maybeSingle 사용 (없을 수도 있음)
          
          if (profileError) {
            console.error('프로필 확인 오류:', profileError)
            // 프로필 조회 오류 발생 시 로그아웃
            await supabase.auth.signOut()
            setError('프로필을 확인할 수 없습니다. 다시 시도해주세요.')
            throw new Error('프로필 확인 실패')
          }
          
          // 프로필이 없거나 탈퇴된 계정인 경우
          if (!profile) {
            // 프로필이 없거나 status가 'archived'인 경우
            await supabase.auth.signOut()
            alert(
              "이 계정은 회원탈퇴된 계정입니다.\n\n" +
              "다시 이용하시려면 회원가입을 진행해주세요.\n" +
              "이메일 접근이 불가능한 경우 고객센터를 통해 본인 확인 후 안내받으세요."
            )
            setError("회원탈퇴된 계정입니다. 다시 회원가입이 필요합니다.")
            throw new Error('회원탈퇴된 계정입니다.')
          }
          
          // 프로필이 있지만 status가 'archived'이거나 deleted_at이 설정된 경우 (이중 체크)
          const profileData = profile as Profile
          if (profileData && (profileData.status !== 'active' || profileData.deleted_at)) {
            await supabase.auth.signOut()
            alert(
              "이 계정은 회원탈퇴된 계정입니다.\n\n" +
              "다시 이용하시려면 회원가입을 진행해주세요.\n" +
              "이메일 접근이 불가능한 경우 고객센터를 통해 본인 확인 후 안내받으세요."
            )
            setError("회원탈퇴된 계정입니다. 다시 회원가입이 필요합니다.")
            throw new Error('회원탈퇴된 계정입니다.')
          }
        }
        
        // 로그인 성공 - 프로필 확인 후 리다이렉트
        if (data.user && data.session) {
          console.log('로그인 성공, 사용자:', data.user.email)
          // 프로필이 정상적으로 확인된 경우에만 대시보드로 이동
          // 완전한 페이지 리로드를 통해 세션을 서버에 전달
          window.location.href = '/dashboard'
        } else if (data.user) {
          // 세션이 없지만 사용자는 있는 경우
          // 프로필 확인이 완료되었으므로 리다이렉트
          console.log('로그인 성공, 세션 확인 중...')
          window.location.href = '/dashboard'
        } else {
          throw new Error('로그인에 실패했습니다. 사용자 정보를 가져올 수 없습니다.')
        }
      } else {
        // 이메일 중복 확인 및 재가입 유예 기간 검증
        if (emailExists) {
          // checkEmailExists에서 이미 에러 메시지 설정됨
          // 에러 메시지가 없으면 기본 메시지 설정
          const errorMsg = '이미 사용 중인 이메일이거나 재가입 유예 기간이 남아있습니다.'
          setError(errorMsg)
          throw new Error('이메일 중복 또는 재가입 유예 기간 미경과')
        }
        
        // 재가입 유예 기간 추가 검증 (서버 사이드 검증)
        const { data: archivedAccount } = await supabase
          .from('profiles')
          .select('withdrawn_at')
          .eq('email', email)
          .or('status.eq.archived,withdrawn_at.not.is.null')
          .order('withdrawn_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()
        
        if (archivedAccount && archivedAccount.withdrawn_at) {
          const withdrawnDate = new Date(archivedAccount.withdrawn_at)
          const now = new Date()
          const daysSinceWithdrawal = Math.floor((now.getTime() - withdrawnDate.getTime()) / (1000 * 60 * 60 * 24))
          const remainingDays = 15 - daysSinceWithdrawal
          
          if (remainingDays > 0) {
            setError(`이 이메일은 ${remainingDays}일 후 재가입이 가능합니다. (탈퇴일로부터 15일 유예 기간)`)
            throw new Error(`재가입 유예 기간이 남아있습니다. ${remainingDays}일 후 재가입 가능합니다.`)
          }
        }
        
        // 1. Supabase Auth에 계정 생성 (이메일 인증 필수)
        // 이메일 확인 링크의 리다이렉트 URL 설정
        const redirectTo = `${window.location.origin}/auth/callback`
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: fullName,
              phone_number: phone,
              interest_fields: interestFields,
            },
          },
        })

        if (error) {
          console.error("가입 에러:", error)
          console.error("에러 코드:", error.status)
          console.error("에러 상세:", JSON.stringify(error, null, 2))
          
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
          
          // 데이터베이스 오류 처리 (트리거/함수 관련)
          if (error.message?.includes('Database error') || error.message?.includes('saving new user')) {
            console.error('데이터베이스 트리거/함수 오류 의심')
            alert(
              "회원가입 중 데이터베이스 오류가 발생했습니다.\n\n" +
              "가능한 원인:\n" +
              "1. 프로필 생성 트리거 오류\n" +
              "2. 환영 크레딧 지급 함수 오류\n\n" +
              "Supabase SQL Editor에서 다음을 확인해주세요:\n" +
              "- profiles 테이블 트리거 상태\n" +
              "- give_welcome_credits 함수 문법\n" +
              "- RLS 정책 설정\n\n" +
              "에러 상세: " + (error.message || '알 수 없는 오류')
            )
            setError("데이터베이스 오류: " + error.message)
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
          const profileInsert: ProfileInsert = {
            id: data.user.id, // Auth의 유저 ID와 연결
            email: email,
            full_name: fullName,
            phone_number: phone,
            interest_fields: interestFields.length > 0 ? interestFields : null,
            role: 'student', // 기본값으로 student 설정
            username: email.split('@')[0], // 이메일의 @ 앞부분을 username으로 사용
            status: 'active', // 회원가입 시 활성 상태로 설정
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }
          const { error: profileError } = await supabase
            .from('profiles')
            .insert(profileInsert)

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
            // 이메일 인증이 필요한 경우 안내
            if (!data.user?.email_confirmed_at) {
              setShowEmailVerification(true)
              setError(null) // 에러 메시지 초기화
              return
            }
            
            alert("회원가입이 완료되었습니다!")
            // 완전한 페이지 리로드를 통해 세션을 서버에 전달
            window.location.href = '/dashboard'
          }
        }
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 이메일 재전송 함수
  const handleResendEmail = async () => {
    if (!email) {
      setError('이메일 주소를 입력해주세요.')
      return
    }

    setResendEmailLoading(true)
    setResendEmailSuccess(false)
    setError(null)

    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (resendError) {
        console.error('이메일 재전송 오류:', resendError)
        
        // Rate limit 오류 처리
        if (resendError.message?.includes('seconds') || resendError.message?.includes('rate limit')) {
          const waitTimeMatch = resendError.message.match(/(\d+)\s*seconds?/i)
          const waitTime = waitTimeMatch ? waitTimeMatch[1] : '일부'
          setError(`잠시 후 다시 시도해주세요. (약 ${waitTime}초 대기 필요)`)
        } else {
          setError(`이메일 재전송 실패: ${resendError.message}`)
        }
        return
      }

      setResendEmailSuccess(true)
      setTimeout(() => {
        setResendEmailSuccess(false)
      }, 5000)
    } catch (err: any) {
      console.error('이메일 재전송 예외:', err)
      setError('이메일 재전송 중 오류가 발생했습니다.')
    } finally {
      setResendEmailLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass rounded-3xl shadow-2xl shadow-black/5 p-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            {isLogin ? '로그인' : '회원가입'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-base">
            {isLogin
              ? 'Dip Deep에 오신 것을 환영합니다'
              : '새로운 계정을 만들어보세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5"
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
              {!isLogin && email && (
                <div className="mt-2">
                  {emailCheckLoading ? (
                    <span className="text-xs text-gray-500 whitespace-normal break-words">확인 중...</span>
                  ) : emailExists ? (
                    <span className="text-xs text-red-500 whitespace-normal break-words">이미 사용 중인 이메일입니다.</span>
                  ) : email.includes('@') ? (
                    <span className="text-xs text-green-500 whitespace-normal break-words">사용 가능한 이메일입니다.</span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5"
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5"
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
                  관심분야 <span className="text-gray-500 text-xs">(다중 선택 가능)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {interestOptions.map((option) => (
                    <label
                      key={option}
                      className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        interestFields.includes(option)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={interestFields.includes(option)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInterestFields([...interestFields, option])
                          } else {
                            setInterestFields(interestFields.filter((f) => f !== option))
                          }
                        }}
                        className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium leading-tight break-words whitespace-normal">{option}</span>
                    </label>
                  ))}
                </div>
                {interestFields.length === 0 && !isLogin && (
                  <p className="mt-2 text-xs text-red-500 whitespace-normal break-words">최소 1개 이상 선택해주세요.</p>
                )}
              </div>
            </>
          )}

          {/* 이메일 인증 안내 UI */}
          {showEmailVerification && (
            <div className="p-6 bg-blue-50/80 backdrop-blur-sm border-2 border-blue-200/50 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">이메일 인증이 필요합니다</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    회원가입이 완료되었습니다!<br />
                    <strong>{email}</strong>로 발송된 확인 링크를 클릭해주세요.
                  </p>
                  
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resendEmailLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {resendEmailLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          전송 중...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          인증 이메일 다시 보내기
                        </>
                      )}
                    </button>

                    {resendEmailSuccess && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>이메일이 재전송되었습니다. 받은편지함을 확인해주세요.</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs text-blue-600 mb-2 font-medium">이메일을 받지 못하셨나요?</p>
                      <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                        <li>스팸 폴더를 확인해주세요</li>
                        <li>이메일 주소가 정확한지 확인해주세요</li>
                        <li>몇 분 후에도 이메일이 오지 않으면 위의 "다시 보내기" 버튼을 클릭해주세요</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {!showEmailVerification && (
            <button
              type="submit"
              disabled={loading || (!isLogin && (emailExists || interestFields.length === 0))}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {loading
                ? '처리 중...'
                : isLogin
                ? '로그인'
                : '회원가입'}
            </button>
          )}

          {showEmailVerification && (
            <button
              type="button"
              onClick={() => {
                setShowEmailVerification(false)
                setIsLogin(true)
                setError(null)
              }}
              className="btn-secondary w-full"
            >
              로그인 페이지로 이동
            </button>
          )}
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
            setInterestFields([])
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


