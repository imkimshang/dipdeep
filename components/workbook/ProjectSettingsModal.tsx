'use client'

import { useState, useEffect } from 'react'
import { X, Check, EyeOff, Copy, Plus, Trash2, Users } from 'lucide-react'

interface ProjectSettingsModalProps {
  isOpen: boolean
  projectTitle: string
  newProjectTitle: string
  onClose: () => void
  onTitleChange: (title: string) => void
  onSave: () => void
  onDelete: () => void
  // 팀 프로젝트 관련 props
  isTeam?: boolean
  teamCode?: string | null
  memberEmails?: string[]
  onUpdateTeamMembers?: (emails: string[]) => Promise<boolean>
  onHideProject?: () => Promise<boolean>
  onUnhideProject?: () => Promise<boolean>
  // 권한 체크
  isOwner?: boolean
  isHidden?: boolean
}

export function ProjectSettingsModal({
  isOpen,
  projectTitle,
  newProjectTitle,
  onClose,
  onTitleChange,
  onSave,
  onDelete,
  isTeam = false,
  teamCode = null,
  memberEmails = [],
  onUpdateTeamMembers,
  onHideProject,
  onUnhideProject,
  isOwner = true,
  isHidden = false,
}: ProjectSettingsModalProps) {
  const [localMemberEmails, setLocalMemberEmails] = useState<string[]>([''])
  const [savingMembers, setSavingMembers] = useState(false)
  const [hidingProject, setHidingProject] = useState(false)

  useEffect(() => {
    if (isOpen && memberEmails) {
      setLocalMemberEmails(memberEmails.length > 0 ? [...memberEmails, ''] : [''])
    }
  }, [isOpen, memberEmails])

  const handleCopyTeamCode = async () => {
    if (!teamCode) return
    try {
      await navigator.clipboard.writeText(teamCode)
      alert(`팀 코드가 복사되었습니다: ${teamCode}`)
    } catch (error) {
      // 폴백
      const textArea = document.createElement('textarea')
      textArea.value = teamCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert(`팀 코드가 복사되었습니다: ${teamCode}`)
    }
  }

  const handleSaveMembers = async () => {
    if (!onUpdateTeamMembers) return

    setSavingMembers(true)
    try {
      // 빈 값 제거
      const validEmails = localMemberEmails
        .map(email => email.trim())
        .filter(email => email)

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = validEmails.filter(email => !emailRegex.test(email))
      
      if (invalidEmails.length > 0) {
        alert(`올바르지 않은 이메일 형식입니다: ${invalidEmails.join(', ')}`)
        setSavingMembers(false)
        return
      }

      const success = await onUpdateTeamMembers(validEmails)
      if (success) {
        alert('팀원 목록이 업데이트되었습니다.')
        // 마지막 빈 필드 유지
        setLocalMemberEmails([...validEmails, ''])
      } else {
        alert('팀원 목록 업데이트에 실패했습니다.')
      }
    } catch (error: any) {
      alert(`오류: ${error.message || '팀원 목록 업데이트에 실패했습니다.'}`)
    } finally {
      setSavingMembers(false)
    }
  }

  const handleToggleHideProject = async () => {
    if (isHidden) {
      // 숨김 해제
      if (!onUnhideProject) return
      
      setHidingProject(true)
      try {
        const success = await onUnhideProject()
        if (success) {
          alert('프로젝트 숨김 해제되었습니다.')
        } else {
          alert('프로젝트 숨김 해제에 실패했습니다.')
          setHidingProject(false)
        }
      } catch (error: any) {
        alert(`오류: ${error.message || '프로젝트 숨김 해제에 실패했습니다.'}`)
        setHidingProject(false)
      }
    } else {
      // 숨김 처리
      if (!onHideProject) return

      if (!confirm('정말로 이 프로젝트를 숨기시겠습니까? 숨긴 프로젝트는 대시보드에서 기본적으로 표시되지 않습니다.')) {
        return
      }

      setHidingProject(true)
      try {
        const success = await onHideProject()
        if (success) {
          alert('프로젝트가 숨겨졌습니다.')
        } else {
          alert('프로젝트 숨기기에 실패했습니다.')
          setHidingProject(false)
        }
      } catch (error: any) {
        alert(`오류: ${error.message || '프로젝트 숨기기에 실패했습니다.'}`)
        setHidingProject(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">프로젝트 설정</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 프로젝트명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로젝트명
            </label>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="프로젝트명을 입력하세요"
              className="input-field"
              autoFocus
            />
          </div>

          {/* 팀 코드 (팀 프로젝트인 경우만) */}
          {isTeam && teamCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 코드
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-sm font-mono font-bold text-purple-700">
                    {teamCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyTeamCode}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
                  title="팀 코드 복사"
                >
                  <Copy className="w-4 h-4" />
                  복사
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                이 코드를 팀원들과 공유하면 팀 프로젝트에 참여할 수 있습니다.
              </p>
            </div>
          )}

          {/* 팀원 관리 (팀 프로젝트이고 소유자인 경우만) */}
          {isTeam && isOwner && onUpdateTeamMembers && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀원 관리 (최대 6명)
              </label>
              <div className="space-y-2">
                {localMemberEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const newEmails = [...localMemberEmails]
                        newEmails[index] = e.target.value
                        setLocalMemberEmails(newEmails)
                      }}
                      className="input-field flex-1"
                      placeholder={`팀원 ${index + 1} 이메일`}
                      disabled={savingMembers}
                    />
                    {localMemberEmails.length > 1 && (
                      <button
                        onClick={() => {
                          const newEmails = localMemberEmails.filter((_, i) => i !== index)
                          setLocalMemberEmails(newEmails.length > 0 ? newEmails : [''])
                        }}
                        className="px-3 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        disabled={savingMembers}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                {localMemberEmails.length < 6 && (
                  <button
                    onClick={() => setLocalMemberEmails([...localMemberEmails, ''])}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 disabled:opacity-50"
                    disabled={savingMembers}
                  >
                    <Plus className="w-4 h-4" />
                    팀원 추가
                  </button>
                )}
              </div>
              <button
                onClick={handleSaveMembers}
                disabled={savingMembers}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                {savingMembers ? '저장 중...' : '팀원 목록 저장'}
              </button>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {/* 저장: 팀 개설자만 표시 */}
            {isOwner && (
              <button 
                onClick={onSave} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1"
              >
                <Check className="w-4 h-4" />
                저장
              </button>
            )}
            
            {/* 숨김/숨김해제 토글: 팀에 속한 누구나 표시 */}
            {(onHideProject || onUnhideProject) && (
              <button
                onClick={handleToggleHideProject}
                disabled={hidingProject}
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 ${
                  isHidden 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isHidden ? '프로젝트 숨김을 해제합니다.' : '프로젝트를 숨깁니다. 삭제하지 않습니다.'}
              >
                {isHidden ? (
                  <>
                    <Check className="w-4 h-4" />
                    {hidingProject ? '해제 중...' : '숨김 해제'}
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    {hidingProject ? '숨기는 중...' : '프로젝트 숨기기'}
                  </>
                )}
              </button>
            )}
            
            {/* 삭제: 팀 개설자만 표시 */}
            {isOwner && (
              <button
                onClick={onDelete}
                className="p-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title="프로젝트 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
