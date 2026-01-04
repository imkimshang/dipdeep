'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          language === 'en'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
        }`}
        aria-label="Switch to English"
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => setLanguage('ko')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          language === 'ko'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
        }`}
        aria-label="Switch to Korean"
      >
        🇰🇷 KR
      </button>
    </div>
  )
}

