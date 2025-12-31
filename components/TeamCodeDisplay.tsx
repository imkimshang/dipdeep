'use client'

import { Users } from 'lucide-react'

interface TeamCodeDisplayProps {
  teamCode: string
  isTeam: boolean
}

export function TeamCodeDisplay({ teamCode, isTeam }: TeamCodeDisplayProps) {
  if (!isTeam || !teamCode) return null

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(teamCode).then(() => {
      alert(`팀 코드가 복사되었습니다: ${teamCode}`)
    }).catch(() => {
      // 복사 실패 시 폴백
      const textArea = document.createElement('textarea')
      textArea.value = teamCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert(`팀 코드가 복사되었습니다: ${teamCode}`)
    })
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg">
      <span className="text-xs font-medium text-purple-900">접속 코드:</span>
      <span className="text-xs font-mono font-bold text-purple-700">
        {teamCode}
      </span>
      <button
        onClick={handleCopy}
        className="text-purple-600 hover:text-purple-800 transition-colors"
        title="팀 코드 복사"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  )
}

