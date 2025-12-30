'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Star,
  StarOff,
  Palette,
  Type,
  Heart,
  AlertCircle,
  FileText,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  TrendingUp,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Toast } from '@/components/Toast'
import { useWorkbookStorage } from '@/hooks/useWorkbookStorage'
import { useWorkbookNavigation } from '@/hooks/useWorkbookNavigation'
import { useProjectSettings } from '@/hooks/useProjectSettings'
import { useProjectSummary } from '@/hooks/useProjectSummary'
import { WorkbookHeader } from '@/components/workbook/WorkbookHeader'
import { WorkbookSection } from '@/components/workbook/WorkbookSection'
import { WorkbookFooter } from '@/components/workbook/WorkbookFooter'
import { WorkbookNavigation } from '@/components/workbook/WorkbookNavigation'
import { ProjectSettingsModal } from '@/components/workbook/ProjectSettingsModal'
import { ProjectSummaryModal } from '@/components/workbook/ProjectSummaryModal'

export const dynamic = 'force-dynamic'; // 이 페이지는 실시간으로 생성하도록 강제합니다.

interface NamingCandidate {
  id: number
  name: string
  meaning: string
  isFavorite: boolean
}

interface VisualIdentity {
  mainColor: string
  subColor: string
  titleFont: string
  bodyFont: string
  logoDescription: string
  toneAndManner: string
}

interface BrandMood {
  uploadedImages: string[] // 최대 6개
  imagePrompt: string
  visualKeywords: string
  emotionDescription: string
}

interface CompetitorAnalysis {
  id: number
  serviceName: string
  similarPoints: string
  analysisReason: string
}

interface Week9Data {
  naming: {
    candidates: NamingCandidate[]
    slogan: string
  }
  visual: VisualIdentity
  mood: BrandMood
  competitorAnalysis: CompetitorAnalysis[]
  is_submitted?: boolean
}

export default function Week9Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const supabase = createClient()

  // Hooks
  const { loadStepData, saveStepData, submitStep, loading: storageLoading } = useWorkbookStorage(
    projectId
  )
  const {
    isScrolled,
    allSteps,
    loadSteps,
    getWeekTitle,
    getStepStatus: getBaseStepStatus,
    getPhaseProgress: getBasePhaseProgress,
    getOverallProgress: getBaseOverallProgress,
  } = useWorkbookNavigation(projectId)
  const {
    projectInfo,
    loadProjectInfo,
    updateProjectTitle,
    deleteProject,
  } = useProjectSettings(projectId)
  const { generateSummary } = useProjectSummary()

  // State
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [summaryPrompt, setSummaryPrompt] = useState('')
  const [referenceData, setReferenceData] = useState<{
    week4HMW: string
    week8Requirements: string
  } | null>(null)

  const [formData, setFormData] = useState<Week9Data>({
    naming: {
      candidates: [],
      slogan: '',
    },
    visual: {
      mainColor: '#4F46E5',
      subColor: '#818CF8',
      fontStyle: '',
    },
      mood: {
        uploadedImages: [],
        imagePrompt: '',
        visualKeywords: '',
        emotionDescription: '',
      },
      competitorAnalysis: [],
  })

  // Custom progress calculation for week 9 (섹션 가중치 방식)
  const calculateProgress = (): number => {
    // 섹션 1: 네이밍 스튜디오 (가중치: 30%)
    const section1Weight = 30
    let section1Filled = 0
    let section1Total = 2

    if (formData.naming.candidates.length > 0) section1Filled++
    if (formData.naming.slogan?.trim()) section1Filled++

    const section1Progress = Math.min((section1Filled / section1Total) * 100, section1Weight)

    // 섹션 2: 비주얼 아이덴티티 (가중치: 40%)
    const section2Weight = 40
    let section2Filled = 0
    let section2Total = 6

    if (formData.visual.mainColor) section2Filled++
    if (formData.visual.subColor) section2Filled++
    if (formData.visual.titleFont?.trim()) section2Filled++
    if (formData.visual.bodyFont?.trim()) section2Filled++
    if (formData.visual.logoDescription?.trim()) section2Filled++
    if (formData.visual.toneAndManner?.trim()) section2Filled++

    const section2Progress = Math.min((section2Filled / section2Total) * 100, section2Weight)

    // 섹션 3: 브랜드 무드보드 (가중치: 20%)
    const section3Weight = 20
    let section3Filled = 0
    let section3Total = 3

    if (formData.mood.uploadedImages.length > 0) section3Filled++
    if (formData.mood.visualKeywords?.trim()) section3Filled++
    if (formData.mood.emotionDescription?.trim()) section3Filled++

    const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

    // 섹션 4: 유사 서비스 분석 (가중치: 10%)
    const section4Weight = 10
    let section4Filled = 0
    let section4Total = 0

    if (formData.competitorAnalysis.length > 0) {
      formData.competitorAnalysis.forEach((analysis) => {
        section4Total += 3 // serviceName, similarPoints, analysisReason
        if (analysis.serviceName.trim()) section4Filled++
        if (analysis.similarPoints.trim()) section4Filled++
        if (analysis.analysisReason.trim()) section4Filled++
      })
    }

    const section4Progress = section4Total > 0
      ? Math.min((section4Filled / section4Total) * 100, section4Weight)
      : 0

    // 전체 진척도 = 섹션별 완료율의 합
    const totalProgress = Math.min(section1Progress + section2Progress + section3Progress + section4Progress, 100)
    return Math.round(totalProgress)
  }

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 9) {
      const progress = calculateProgress()
      return { hasData: progress > 0, isSubmitted, progress }
    }
    return getBaseStepStatus(stepNumber, (data: any) => {
      if (stepNumber === 9) {
        // 섹션 1: 네이밍 스튜디오 (가중치: 30%)
        const section1Weight = 30
        let section1Filled = 0
        let section1Total = 2

        if (data.naming?.candidates?.length > 0) section1Filled++
        if (data.naming?.slogan?.trim()) section1Filled++

        const section1Progress = Math.min((section1Filled / section1Total) * 100, section1Weight)

        // 섹션 2: 비주얼 아이덴티티 (가중치: 40%)
        const section2Weight = 40
        let section2Filled = 0
        let section2Total = 6

        if (data.visual?.mainColor) section2Filled++
        if (data.visual?.subColor) section2Filled++
        if (data.visual?.titleFont?.trim()) section2Filled++
        if (data.visual?.bodyFont?.trim()) section2Filled++
        if (data.visual?.logoDescription?.trim()) section2Filled++
        if (data.visual?.toneAndManner?.trim()) section2Filled++

        const section2Progress = Math.min((section2Filled / section2Total) * 100, section2Weight)

        // 섹션 3: 브랜드 무드보드 (가중치: 20%)
        const section3Weight = 20
        let section3Filled = 0
        let section3Total = 3

        if ((data.mood?.uploadedImages?.length || 0) > 0) section3Filled++
        if (data.mood?.visualKeywords?.trim()) section3Filled++
        if (data.mood?.emotionDescription?.trim()) section3Filled++

        const section3Progress = Math.min((section3Filled / section3Total) * 100, section3Weight)

        // 섹션 4: 유사 서비스 분석 (가중치: 10%)
        const section4Weight = 10
        let section4Filled = 0
        let section4Total = 0

        if (data.competitorAnalysis && Array.isArray(data.competitorAnalysis) && data.competitorAnalysis.length > 0) {
          data.competitorAnalysis.forEach((analysis: any) => {
            section4Total += 3
            if (analysis.serviceName?.trim()) section4Filled++
            if (analysis.similarPoints?.trim()) section4Filled++
            if (analysis.analysisReason?.trim()) section4Filled++
          })
        }

        const section4Progress = section4Total > 0
          ? Math.min((section4Filled / section4Total) * 100, section4Weight)
          : 0

        const totalProgress = Math.min(section1Progress + section2Progress + section3Progress + section4Progress, 100)
        return Math.round(totalProgress)
      }
      return 50
    })
  }

  const getPhaseProgress = (phase: 1 | 2 | 3) => {
    return getBasePhaseProgress(phase, (data: any) => {
      return getStepStatus(9).progress
    })
  }

  const getOverallProgress = () => {
    return getBaseOverallProgress((data: any) => {
      return getStepStatus(9).progress
    })
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      const title = await loadProjectInfo()
      if (title) setNewProjectTitle(title)

      // Load reference data
      const supabaseClient = createClient()
      try {
        const { data: steps } = await supabaseClient
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .in('step_number', [4, 8])

        const stepsData = steps as any[]
        const week4Data = stepsData?.find((s: any) => s.step_number === 4)?.step_data
        const week8Data = stepsData?.find((s: any) => s.step_number === 8)?.step_data

        setReferenceData({
          week4HMW: week4Data?.conclusion || '',
          week8Requirements: week8Data?.requirements
            ? `${week8Data.requirements.length}개 요구사항 정의됨`
            : '',
        })
      } catch (error) {
        console.error('Reference data load error:', error)
      }

      // Load week9 data
      const data = await loadStepData(9)
      if (data) {
        const week9Data = data as any
        // 기존 데이터와 새 데이터 구조 병합 (호환성 유지)
        setFormData({
          naming: {
            candidates: week9Data.naming?.candidates || [],
            slogan: week9Data.naming?.slogan || '',
          },
          visual: {
            mainColor: week9Data.visual?.mainColor || '#FFFFFF',
            subColor: week9Data.visual?.subColor || '#FFFFFF',
            titleFont: week9Data.visual?.titleFont || '',
            bodyFont: week9Data.visual?.bodyFont || '',
            logoDescription: week9Data.visual?.logoDescription || '',
            toneAndManner: week9Data.visual?.toneAndManner || '',
          },
          mood: {
            uploadedImages: week9Data.mood?.uploadedImages || [],
            imagePrompt: week9Data.mood?.imagePrompt || '',
            visualKeywords: week9Data.mood?.visualKeywords || '',
            emotionDescription: week9Data.mood?.emotionDescription || '',
          },
          competitorAnalysis: week9Data.competitorAnalysis || [],
        })
        if (week9Data.is_submitted !== undefined) {
          setIsSubmitted(week9Data.is_submitted)
        }
      }

      loadSteps()
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])


  // 네이밍 후보 추가
  const handleAddNamingCandidate = () => {
    const newId =
      formData.naming.candidates.length > 0
        ? Math.max(...formData.naming.candidates.map((c) => c.id)) + 1
        : 1

    const newCandidate: NamingCandidate = {
      id: newId,
      name: '',
      meaning: '',
      isFavorite: false,
    }
    setFormData({
      ...formData,
      naming: {
        ...formData.naming,
        candidates: [...formData.naming.candidates, newCandidate],
      },
    })
  }

  // 네이밍 후보 삭제
  const handleDeleteNamingCandidate = (id: number) => {
    setFormData({
      ...formData,
      naming: {
        ...formData.naming,
        candidates: formData.naming.candidates.filter((c) => c.id !== id),
      },
    })
  }

  // 네이밍 후보 업데이트
  const handleUpdateNamingCandidate = (id: number, updates: Partial<NamingCandidate>) => {
    setFormData({
      ...formData,
      naming: {
        ...formData.naming,
        candidates: formData.naming.candidates.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      },
    })
  }

  // 즐겨찾기 토글
  const handleToggleFavorite = (id: number) => {
    setFormData({
      ...formData,
      naming: {
        ...formData.naming,
        candidates: formData.naming.candidates.map((c) =>
          c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
        ),
      },
    })
  }

  // 유사 서비스 분석 추가
  const handleAddCompetitorAnalysis = () => {
    const newId =
      formData.competitorAnalysis.length > 0
        ? Math.max(...formData.competitorAnalysis.map((c) => c.id)) + 1
        : 1

    const newCompetitor: CompetitorAnalysis = {
      id: newId,
      serviceName: '',
      similarPoints: '',
      analysisReason: '',
    }
    setFormData({
      ...formData,
      competitorAnalysis: [...formData.competitorAnalysis, newCompetitor],
    })
  }

  // 유사 서비스 분석 삭제
  const handleDeleteCompetitorAnalysis = (id: number) => {
    setFormData({
      ...formData,
      competitorAnalysis: formData.competitorAnalysis.filter((c) => c.id !== id),
    })
  }

  // 유사 서비스 분석 업데이트
  const handleUpdateCompetitorAnalysis = (
    id: number,
    field: keyof CompetitorAnalysis,
    value: string
  ) => {
    setFormData({
      ...formData,
      competitorAnalysis: formData.competitorAnalysis.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    })
  }

  // 이미지 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = 6 - formData.mood.uploadedImages.length

    if (remainingSlots <= 0) {
      setToastMessage('이미지는 최대 6개까지 업로드할 수 있습니다.')
      setToastVisible(true)
      return
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots)

    const imagePromises = filesToProcess.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
    )

    const newImages = await Promise.all(imagePromises)

    setFormData({
      ...formData,
      mood: {
        ...formData.mood,
        uploadedImages: [...formData.mood.uploadedImages, ...newImages],
      },
    })

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = ''
  }

  // 이미지 삭제 핸들러
  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      mood: {
        ...formData.mood,
        uploadedImages: formData.mood.uploadedImages.filter((_, i) => i !== index),
      },
    })
  }

  // Save handler
  const handleSave = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const progress = calculateProgress()
    const success = await saveStepData(9, formData, progress)

    if (success) {
      setToastMessage('임시 저장되었습니다.')
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('저장 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  // Submit handler
  const handleSubmit = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    if (!isSubmitted) {
      if (!confirm('워크북을 제출하시겠습니까?\n제출 후에는 수정이 제한됩니다.')) {
        return
      }
    }

    const progress = calculateProgress()
    const newSubmittedState = !isSubmitted
    const success = await submitStep(9, formData, newSubmittedState, progress)

    if (success) {
      setIsSubmitted(newSubmittedState)
      setToastMessage(
        newSubmittedState ? '워크북이 제출되었습니다.' : '제출이 회수되었습니다.'
      )
      setToastVisible(true)
      loadSteps()
    } else {
      setToastMessage('처리 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  const handleUpdateProjectTitle = async () => {
    const success = await updateProjectTitle(newProjectTitle)
    if (success) {
      setShowSettings(false)
      setToastMessage('프로젝트명이 변경되었습니다.')
      setToastVisible(true)
    } else {
      setToastMessage('프로젝트명 변경 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  const handleDeleteProject = async () => {
    if (
      !confirm(
        '프로젝트를 삭제하시겠습니까?\n모든 워크북 데이터가 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return
    }

    const success = await deleteProject()
    if (success) {
      setToastMessage('프로젝트가 삭제되었습니다.')
      setToastVisible(true)
    } else {
      setToastMessage('프로젝트 삭제 중 오류가 발생했습니다.')
      setToastVisible(true)
    }
  }

  const handleProjectSummary = async () => {
    if (!projectId) {
      setToastMessage('프로젝트 ID가 필요합니다.')
      setToastVisible(true)
      return
    }

    const summary = await generateSummary(projectId, projectInfo?.title || null)
    if (summary) {
      setSummaryPrompt(summary)
      setShowProjectSummary(true)
    } else {
      setToastMessage('워크북 데이터가 없습니다.')
      setToastVisible(true)
    }
  }

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryPrompt)
      setToastMessage('프롬프트가 클립보드에 복사되었습니다.')
      setToastVisible(true)
    } catch (error) {
      setToastMessage('복사 실패')
      setToastVisible(true)
    }
  }

  const handleReset = () => {
    if (!confirm('모든 입력 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }
    setFormData({
      naming: {
        candidates: [],
        slogan: '',
      },
      visual: {
        mainColor: '#FFFFFF',
        subColor: '#FFFFFF',
        titleFont: '',
        bodyFont: '',
        logoDescription: '',
        toneAndManner: '',
      },
      mood: {
        uploadedImages: [],
        imagePrompt: '',
        visualKeywords: '',
        emotionDescription: '',
      },
      competitorAnalysis: [],
    })
    setToastMessage('데이터가 초기화되었습니다.')
    setToastVisible(true)
  }

  const progress = calculateProgress()
  const readonly = isSubmitted

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">프로젝트 ID가 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastMessage.includes('오류') ? 'error' : 'success'}
      />
      <WorkbookHeader
        title="Phase 2: Ideation - 9회차: 브랜드 네이밍 및 비주얼 아이덴티티"
        description="서비스의 이름과 시각적 정체성을 정의하세요."
        phase="Phase 2: Ideation"
        isScrolled={isScrolled}
        currentWeek={9}
        overallProgress={getOverallProgress()}
        phase1Progress={getPhaseProgress(1)}
        phase2Progress={getPhaseProgress(2)}
        phase3Progress={getPhaseProgress(3)}
        isSubmitted={isSubmitted}
        themeColor="indigo"
      />

      <div className="flex min-h-[calc(100vh-140px)]">
        <WorkbookNavigation
          projectId={projectId}
          currentWeek={9}
          isScrolled={isScrolled}
          projectInfo={projectInfo}
          allSteps={allSteps}
          getWeekTitle={getWeekTitle}
          getStepStatus={getStepStatus}
          onSettingsClick={() => {
            setShowSettings(true)
            setNewProjectTitle(projectInfo?.title || '')
          }}
          onProjectSummaryClick={handleProjectSummary}
          themeColor="indigo"
        />

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Reference Data Panel */}
        {referenceData && (referenceData.week4HMW || referenceData.week8Requirements) && (
          <div className="mb-6 glass rounded-xl p-4 border-2 border-gray-300 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-semibold text-gray-900">참고 데이터</h4>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-xs text-gray-600">
              {referenceData.week4HMW && (
                <div>
                  <span className="font-medium">4회차 HMW:</span>{' '}
                  <span className="line-clamp-2">{referenceData.week4HMW}</span>
                </div>
              )}
              {referenceData.week8Requirements && (
                <div>
                  <span className="font-medium">8회차 요구사항:</span>{' '}
                  {referenceData.week8Requirements}
                </div>
              )}
            </div>
          </div>
        )}

            {/* Section 1: Naming Studio */}
            <WorkbookSection
              icon={Type}
              title="섹션 1: 네이밍 스튜디오 (Naming Studio)"
              description="서비스의 얼굴이 될 이름과 슬로건을 정하세요."
              themeColor="indigo"
            >

          <div className="space-y-6">
            {/* 네이밍 후보 리스트 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">네이밍 후보군</h3>
              {formData.naming.candidates.length > 0 ? (
                <div className="space-y-3">
                  {formData.naming.candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              서비스 이름
                            </label>
                            <input
                              type="text"
                              value={candidate.name}
                              onChange={(e) =>
                                handleUpdateNamingCandidate(candidate.id, { name: e.target.value })
                              }
                              placeholder="서비스 이름을 입력하세요"
                              disabled={readonly}
                              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              의미/유래
                            </label>
                            <textarea
                              value={candidate.meaning}
                              onChange={(e) =>
                                handleUpdateNamingCandidate(candidate.id, {
                                  meaning: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder="이름의 의미나 유래를 설명하세요"
                              disabled={readonly}
                              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <button
                            onClick={() => handleToggleFavorite(candidate.id)}
                            disabled={readonly}
                            className={`p-2 rounded-lg transition-colors ${
                              candidate.isFavorite
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={candidate.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          >
                            {candidate.isFavorite ? (
                              <Star className="w-5 h-5 fill-current" />
                            ) : (
                              <StarOff className="w-5 h-5" />
                            )}
                          </button>
                          {!readonly && (
                            <button
                              onClick={() => handleDeleteNamingCandidate(candidate.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              title="삭제"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Type className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">네이밍 후보를 추가해주세요.</p>
                </div>
              )}

              {!readonly && (
                <button
                  onClick={handleAddNamingCandidate}
                  className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  네이밍 후보 추가
                </button>
              )}
            </div>

            {/* 슬로건 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                슬로건
              </label>
              <p className="text-xs text-gray-500 mb-3">
                서비스의 핵심 가치를 담은 한 줄 슬로건을 작성하세요.
              </p>
              <textarea
                value={formData.naming.slogan}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    naming: { ...formData.naming, slogan: e.target.value },
                  })
                }
                rows={2}
                placeholder="예: 당신의 일상을 더 스마트하게"
                disabled={readonly}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          </WorkbookSection>

          {/* Section 2: Visual Identity */}
          <WorkbookSection
            icon={Palette}
            title="섹션 2: 비주얼 아이덴티티 (Visual Identity)"
            description="서비스의 분위기를 결정하는 컬러와 폰트를 설정하세요."
            themeColor="indigo"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* 왼쪽 열: 브랜드 요소 */}
              <div className="space-y-6">
                {/* 메인 컬러 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    메인 컬러
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={formData.visual.mainColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visual: { ...formData.visual, mainColor: e.target.value },
                        })
                      }
                      disabled={readonly}
                      className="w-12 h-12 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={formData.visual.mainColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visual: { ...formData.visual, mainColor: e.target.value },
                        })
                      }
                      placeholder="#FFFFFF"
                      disabled={readonly}
                      className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 font-mono"
                    />
                  </div>
                </div>

                {/* 서브 컬러 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    서브 컬러
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={formData.visual.subColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visual: { ...formData.visual, subColor: e.target.value },
                        })
                      }
                      disabled={readonly}
                      className="w-12 h-12 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={formData.visual.subColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visual: { ...formData.visual, subColor: e.target.value },
                        })
                      }
                      placeholder="#FFFFFF"
                      disabled={readonly}
                      className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 font-mono"
                    />
                  </div>
                </div>

                {/* 제목용 폰트 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    제목용 폰트
                  </label>
                  <select
                    value={formData.visual.titleFont}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        visual: { ...formData.visual, titleFont: e.target.value },
                      })
                    }
                    disabled={readonly}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 mb-3"
                  >
                    <option value="">폰트 선택...</option>
                    <option value="Noto Sans KR">Noto Sans KR (고딕)</option>
                    <option value="Pretendard">Pretendard</option>
                    <option value="Nanum Gothic">Nanum Gothic</option>
                    <option value="Nanum Myeongjo">Nanum Myeongjo (명조)</option>
                    <option value="Gowun Batang">Gowun Batang</option>
                    <option value="IBM Plex Sans">IBM Plex Sans</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                  </select>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p
                      className="text-2xl font-bold"
                      style={{
                        fontFamily:
                          formData.visual.titleFont || 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      AaBbCc 가나다라
                    </p>
                  </div>
                </div>

                {/* 본문용 폰트 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    본문용 폰트
                  </label>
                  <select
                    value={formData.visual.bodyFont}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        visual: { ...formData.visual, bodyFont: e.target.value },
                      })
                    }
                    disabled={readonly}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 mb-3"
                  >
                    <option value="">폰트 선택...</option>
                    <option value="Noto Sans KR">Noto Sans KR (고딕)</option>
                    <option value="Pretendard">Pretendard</option>
                    <option value="Nanum Gothic">Nanum Gothic</option>
                    <option value="Nanum Myeongjo">Nanum Myeongjo (명조)</option>
                    <option value="Gowun Batang">Gowun Batang</option>
                    <option value="IBM Plex Sans">IBM Plex Sans</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                  </select>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p
                      className="text-base"
                      style={{
                        fontFamily:
                          formData.visual.bodyFont || 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      AaBbCc 가나다라
                    </p>
                  </div>
                </div>
              </div>

              {/* 오른쪽 열: 설명 텍스트 영역 */}
              <div className="space-y-6">
                {/* 로고 디자인 설명 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    로고 디자인 설명
                  </label>
                  <textarea
                    value={formData.visual.logoDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        visual: { ...formData.visual, logoDescription: e.target.value },
                      })
                    }
                    rows={8}
                    placeholder="로고의 형태, 색상, 상징적 의미 등을 AI에게 지시할 수 있도록 구체적으로 작성합니다."
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 톤앤매너 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    톤앤매너 (Brand Voice)
                  </label>
                  <textarea
                    value={formData.visual.toneAndManner}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        visual: { ...formData.visual, toneAndManner: e.target.value },
                      })
                    }
                    rows={8}
                    placeholder="사용자에게 어떤 말투와 어조로 소통할지 정의합니다. (예: 친근하고 유머러스한, 전문적이고 신뢰감 있는)"
                    disabled={readonly}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </WorkbookSection>

          {/* Section 3: Brand Mood */}
          <WorkbookSection
            icon={Heart}
            title="섹션 3: 브랜드 무드보드 (Brand Mood)"
            description="서비스가 사용자에게 전달하고 싶은 느낌을 정의하세요."
            themeColor="indigo"
          >
            <div className="space-y-6">
              {/* 이미지 업로드 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  무드 이미지 (최대 6개)
                </label>
                {formData.mood.uploadedImages.length > 0 ? (
                  <div
                    className={`grid gap-4 ${
                      formData.mood.uploadedImages.length === 1
                        ? 'grid-cols-1'
                        : formData.mood.uploadedImages.length === 2
                        ? 'grid-cols-2'
                        : formData.mood.uploadedImages.length === 3
                        ? 'grid-cols-3'
                        : formData.mood.uploadedImages.length === 4
                        ? 'grid-cols-2'
                        : formData.mood.uploadedImages.length === 5
                        ? 'grid-cols-3' // 3개 첫 줄, 2개 둘째 줄
                        : 'grid-cols-3' // 6개: 3x2
                    }`}
                  >
                    {formData.mood.uploadedImages.map((image, index) => (
                      <div
                        key={index}
                        className={`relative group ${
                          formData.mood.uploadedImages.length === 1 ? '' : 'aspect-square'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Mood image ${index + 1}`}
                          className={`w-full ${
                            formData.mood.uploadedImages.length === 1
                              ? 'h-64'
                              : 'h-full'
                          } object-cover rounded-lg border-2 border-gray-200`}
                        />
                        {!readonly && (
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-12">
                    <div className="flex flex-col items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-sm mb-4">이미지를 업로드하세요</p>
                    </div>
                  </div>
                )}
                {!readonly && formData.mood.uploadedImages.length < 6 && (
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors mt-4">
                    <Upload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      이미지 업로드 ({formData.mood.uploadedImages.length}/6)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={readonly}
                    />
                  </label>
                )}
                {formData.mood.uploadedImages.length >= 6 && (
                  <p className="text-sm text-gray-500 mt-2">
                    이미지 업로드 최대 개수(6개)에 도달했습니다.
                  </p>
                )}
              </div>

              {/* 이미지 생성 프롬프트 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  이미지 생성 프롬프트
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  AI에게 전달할 이미지 생성 프롬프트를 입력하세요.
                </p>
                <textarea
                  value={formData.mood.imagePrompt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mood: { ...formData.mood, imagePrompt: e.target.value },
                    })
                  }
                  rows={5}
                  placeholder="AI에게 전달할 이미지 생성 프롬프트"
                  disabled={readonly}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* 시각적 키워드 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  시각적 키워드
                </label>
                <input
                  type="text"
                  value={formData.mood.visualKeywords}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mood: { ...formData.mood, visualKeywords: e.target.value },
                    })
                  }
                  placeholder="예: #Minimal #Blue #Calm"
                  disabled={readonly}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* 감성/분위기 설명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  감성/분위기 설명
                </label>
                <input
                  type="text"
                  value={formData.mood.emotionDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mood: { ...formData.mood, emotionDescription: e.target.value },
                    })
                  }
                  placeholder="예: 차분하고 전문적인 느낌"
                  disabled={readonly}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </WorkbookSection>

          {/* Section 4: Competitor Analysis */}
          <WorkbookSection
            icon={TrendingUp}
            title="섹션 4: 유사 서비스 분석 (Competitor Analysis)"
            description="현재 기획 중인 서비스와 유사한 기존 서비스를 분석하여 차별점을 찾으세요."
            themeColor="indigo"
          >
            <div className="space-y-4">
              {formData.competitorAnalysis.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    유사 서비스를 분석하려면 아래 버튼을 클릭하여 항목을 추가하세요.
                  </p>
                  <button
                    onClick={handleAddCompetitorAnalysis}
                    disabled={readonly}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    유사 서비스 추가
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      분석 목록 ({formData.competitorAnalysis.length}개)
                    </h3>
                    {!readonly && (
                      <button
                        onClick={handleAddCompetitorAnalysis}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                      >
                        <TrendingUp className="w-4 h-4" />
                        항목 추가
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {formData.competitorAnalysis.map((competitor) => (
                      <div
                        key={competitor.id}
                        className="bg-white border border-gray-300 rounded-xl p-6 space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-base font-semibold text-gray-900">
                            {competitor.serviceName || `서비스 ${competitor.id}`}
                          </h4>
                          {!readonly && (
                            <button
                              onClick={() => handleDeleteCompetitorAnalysis(competitor.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title="삭제"
                            >
                              <RotateCcw className="w-4 h-4 rotate-45" />
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            서비스 명칭
                          </label>
                          <input
                            type="text"
                            value={competitor.serviceName}
                            onChange={(e) =>
                              handleUpdateCompetitorAnalysis(
                                competitor.id,
                                'serviceName',
                                e.target.value
                              )
                            }
                            placeholder="예: 카카오톡, 인스타그램, 네이버"
                            disabled={readonly}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            유사 포인트
                          </label>
                          <textarea
                            value={competitor.similarPoints}
                            onChange={(e) =>
                              handleUpdateCompetitorAnalysis(
                                competitor.id,
                                'similarPoints',
                                e.target.value
                              )
                            }
                            placeholder="기능, 타겟, 비주얼 등 우리 서비스와 닮은 점을 기술하세요."
                            disabled={readonly}
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            분석 사유
                          </label>
                          <textarea
                            value={competitor.analysisReason}
                            onChange={(e) =>
                              handleUpdateCompetitorAnalysis(
                                competitor.id,
                                'analysisReason',
                                e.target.value
                              )
                            }
                            placeholder="왜 이 서비스를 유사 사례로 선정했는지 논리적 이유를 설명하세요."
                            disabled={readonly}
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </WorkbookSection>

          {/* Footer */}
          <WorkbookFooter
            progress={progress}
            loading={storageLoading}
            isSubmitted={isSubmitted}
            projectId={projectId}
            readonly={readonly}
            onReset={handleReset}
            onSave={handleSave}
            onSubmit={handleSubmit}
            themeColor="indigo"
          />
          </div>
        </main>
      </div>

      <ProjectSettingsModal
        isOpen={showSettings}
        projectTitle={projectInfo?.title || ''}
        newProjectTitle={newProjectTitle}
        onClose={() => setShowSettings(false)}
        onTitleChange={setNewProjectTitle}
        onSave={handleUpdateProjectTitle}
        onDelete={handleDeleteProject}
      />

      <ProjectSummaryModal
        isOpen={showProjectSummary}
        summaryPrompt={summaryPrompt}
        onClose={() => setShowProjectSummary(false)}
        onCopy={handleCopySummary}
      />
    </div>
  )
}

