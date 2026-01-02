'use client'

import { useState, useEffect } from 'react'
import { X, Copy, FileText, Presentation, Sparkles } from 'lucide-react'
import type { SummaryType } from '@/hooks/useProjectSummary'

interface ProjectSummaryModalProps {
  isOpen: boolean
  summaryPrompt: string
  onClose: () => void
  onCopy: () => void
  onTypeChange?: (type: SummaryType) => void
  summaryType?: SummaryType
  projectType?: string | null
}

export function ProjectSummaryModal({
  isOpen,
  summaryPrompt,
  onClose,
  onCopy,
  onTypeChange,
  summaryType = 'proposal',
  projectType = null,
}: ProjectSummaryModalProps) {
  const [selectedType, setSelectedType] = useState<SummaryType>(summaryType)

  useEffect(() => {
    setSelectedType(summaryType)
  }, [summaryType])

  if (!isOpen) return null

  const isEventProject = projectType === 'event'

  const handleTypeChange = (type: SummaryType) => {
    setSelectedType(type)
    if (onTypeChange) {
      onTypeChange(type)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">프로젝트 요약</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 선택 (행사/이벤트 프로젝트인 경우만 표시) */}
        {isEventProject && (
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 px-6 pt-4">
              <button
                onClick={() => handleTypeChange('business-plan')}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-all flex items-center justify-center gap-2 ${
                  selectedType === 'business-plan'
                    ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>사업기획서</span>
              </button>

              <button
                onClick={() => handleTypeChange('proposal')}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-all flex items-center justify-center gap-2 ${
                  selectedType === 'proposal'
                    ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Presentation className="w-4 h-4" />
                <span>제안서</span>
              </button>

              <button
                onClick={() => handleTypeChange('proposal-create')}
                disabled
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-all flex items-center justify-center gap-2 relative ${
                  selectedType === 'proposal-create'
                    ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
                    : 'text-gray-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>제안서 만들기</span>
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gray-600 text-white text-xs rounded">
                  추후
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {selectedType === 'proposal-create' ? (
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                준비 중인 기능입니다
              </h4>
              <p className="text-sm text-gray-600">
                AI 슬라이드 생성 API와 연동하여 자동으로 제안서를 만들어주는 기능이 곧 추가될 예정입니다.
              </p>
            </div>
          ) : (
            <>
              {/* 사용 방법 안내 */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  사용 방법
                </h4>
                <p className="text-sm text-blue-800">
                  {selectedType === 'business-plan' ? (
                    <>
                      아래 프롬프트를 <strong>ChatGPT, Claude, Notion AI</strong> 등에 복사하여 붙여넣으세요.
                      <br />
                      AI가 자동으로 전문적인 행사 사업기획서(Word 문서)를 생성해줍니다.
                    </>
                  ) : (
                    <>
                      아래 프롬프트를 <strong>NotebookLM, Genspark, Gamma, Pitch</strong> 등의 슬라이드 생성 서비스에 복사하여 붙여넣으세요.
                      <br />
                      AI가 자동으로 전문적인 행사 제안서 슬라이드를 생성해줍니다.
                    </>
                  )}
                </p>
              </div>

              {/* 프롬프트 영역 */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {summaryPrompt}
                </pre>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          {selectedType !== 'proposal-create' && (
            <button onClick={onCopy} className="btn-primary flex-1">
              <Copy className="w-4 h-4" />
              프롬프트 복사
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}


