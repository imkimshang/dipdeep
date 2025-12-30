'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Save, CheckCircle2 } from 'lucide-react'

interface ProjectStep {
  id: string
  project_id: string | null
  step_number: number | null
  step_data: any
  ai_feedback: any
}

interface WorkbookFormProps {
  projectId: string
  steps: ProjectStep[]
}

export function WorkbookForm({ projectId, steps }: WorkbookFormProps) {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [stepData, setStepData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Load current week's data
    const step = steps.find((s) => s.step_number === currentWeek)
    if (step?.step_data) {
      setStepData(step.step_data)
    } else {
      setStepData({})
    }
    setSaved(false)
  }, [currentWeek, steps])

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)

    try {
      // Find or create step
      const existingStep = steps.find((s) => s.step_number === currentWeek)

      if (existingStep) {
        // Update existing step
        const { error } = await supabase
          .from('project_steps')
          .update({ step_data: stepData })
          .eq('id', existingStep.id)

        if (error) throw error
      } else {
        // Create new step
        const { error } = await supabase.from('project_steps').insert({
          project_id: projectId,
          step_number: currentWeek,
          step_data: stepData,
        })

        if (error) throw error
      }

      // Update project progress
      const completedSteps = steps.filter((s) => s.step_data !== null).length
      const newProgress = Math.round(((completedSteps + 1) / 12) * 100)
      const newCurrentStep = Math.max(currentWeek, steps.length)

      await supabase
        .from('projects')
        .update({
          progress_rate: newProgress,
          current_step: newCurrentStep,
        })
        .eq('id', projectId)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      alert('저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const currentStep = steps.find((s) => s.step_number === currentWeek)

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <div className="mb-6">
        <h2 id={`week-${currentWeek}`} className="text-2xl font-bold text-gray-900 mb-2">
          {currentWeek}주차 워크북
        </h2>
        <p className="text-gray-600">
          이번 주차의 내용을 작성해주세요.
        </p>
      </div>

      {/* Week Selector */}
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
          <button
            key={week}
            onClick={() => setCurrentWeek(week)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentWeek === week
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {week}주
          </button>
        ))}
      </div>

      {/* Form Fields */}
      <div className="space-y-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제목
          </label>
          <input
            type="text"
            value={stepData.title || ''}
            onChange={(e) =>
              setStepData({ ...stepData, title: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder={`${currentWeek}주차 제목을 입력하세요`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            주요 내용
          </label>
          <textarea
            value={stepData.content || ''}
            onChange={(e) =>
              setStepData({ ...stepData, content: e.target.value })
            }
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder={`${currentWeek}주차의 주요 내용을 작성해주세요.`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            학습 포인트
          </label>
          <textarea
            value={stepData.learningPoints || ''}
            onChange={(e) =>
              setStepData({ ...stepData, learningPoints: e.target.value })
            }
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="이번 주차에서 배운 주요 포인트를 정리해주세요."
          />
        </div>

        {currentStep?.ai_feedback && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-900 mb-2">AI 피드백</h3>
            <pre className="text-sm text-indigo-800 whitespace-pre-wrap">
              {JSON.stringify(currentStep.ai_feedback, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {currentStep?.step_data && (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              저장됨
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Save className="w-5 h-5" />
          {loading ? '저장 중...' : saved ? '저장 완료!' : '저장하기'}
        </button>
      </div>
    </div>
  )
}


