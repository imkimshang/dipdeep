'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Language = 'en' | 'ko'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 서버와 클라이언트 초기 렌더링 일치를 위해 항상 'ko'로 시작
  const [language, setLanguageState] = useState<Language>('ko')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 클라이언트 마운트 후에만 localStorage에서 언어 읽기
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dip-deep-language') as Language
      if (saved === 'en' || saved === 'ko') {
        setLanguageState(saved)
      } else {
        // 브라우저 언어 확인 (ko로 시작하면 ko, 아니면 en)
        const browserLang = navigator.language.toLowerCase()
        const detectedLang = browserLang.startsWith('ko') ? 'ko' : 'en'
        setLanguageState(detectedLang)
        localStorage.setItem('dip-deep-language', detectedLang)
      }
    }
  }, [])

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('dip-deep-language', language)
    }
  }, [language, mounted])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  // 간단한 번역 함수 (필요시 확장 가능)
  const t = (key: string, fallback?: string) => {
    // 현재는 fallback만 반환 (실제 번역은 컴포넌트에서 직접 TRANSLATIONS 객체 사용)
    return fallback || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

