import { useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export type SummaryType = 'business-plan' | 'proposal' | 'proposal-create'

export function useProjectSummary() {
  const supabase = createClient()

  const generateSummary = useCallback(
    async (
      projectId: string,
      projectTitle: string | null,
      summaryType: SummaryType = 'proposal'
    ): Promise<string | null> => {
      try {
        // 프로젝트 타입 확인
        const { data: project } = await supabase
          .from('projects')
          .select('type')
          .eq('id', projectId)
          .single()

        const projectType = project?.type || 'webapp'

        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .order('step_number', { ascending: true })

        if (!steps || steps.length === 0) {
          return null
        }

        // 이벤트 워크북인 경우
        if (projectType === 'event') {
          if (summaryType === 'business-plan') {
            return generateEventBusinessPlan(steps, projectTitle)
          } else if (summaryType === 'proposal') {
            return generateEventProposal(steps, projectTitle)
          } else if (summaryType === 'proposal-create') {
            // 추후 적용: AI API 연동
            return null
          }
          return generateEventProposal(steps, projectTitle)
        }

        // 웹/앱 워크북인 경우
        if (projectType === 'webapp') {
          if (summaryType === 'business-plan') {
            return generateWebAppBusinessPlan(steps, projectTitle)
          } else if (summaryType === 'proposal') {
            // 기존 제안서 프롬프트 유지
            return generateWebAppProposal(steps, projectTitle)
          } else if (summaryType === 'proposal-create') {
            // 추후 적용: AI API 연동
            return null
          }
          return generateWebAppProposal(steps, projectTitle)
        }

        // 기본값: 제안서 (하위 호환성)
        return generateWebAppProposal(steps, projectTitle)
      } catch (error: any) {
        console.error('요약 생성 오류:', error)
        return null
      }
    },
    [supabase]
  )

  return { generateSummary }
}

// 웹/앱 워크북용 사업기획서 생성 함수 (1~6회차 기반)
function generateWebAppBusinessPlan(
  steps: any[],
  projectTitle: string | null
): string {
  let summary = `웹/앱 사업 기획서 작성 프롬프트\n\n`
  summary += `[역할 정의]\n`
  summary += `너는 10년 차 IT 서비스 기획자이자 비즈니스 전략가야. 내가 제공하는 정보를 바탕으로, 투자자나 결정권자에게 제출할 수 있는 WORD 문서 형태의 공식 사업 기획안을 작성해줘.\n\n`
  summary += `[핵심 정보 데이터] -> 사용자가 입력한 내용 기반 1~6회차\n\n`
  summary += `[작성 가이드라인]\n\n`
  summary += `가독성 최적화: PPT가 아니므로 문장형 설명과 개조식(Bullet point)을 적절히 섞어 작성할 것. 중요 키워드는 강조해줘.\n\n`
  summary += `논리적 전개: '문제 제기 -> 해결책(서비스) -> 효과-> 실행 가능성'의 논리 구조를 가질 것.\n\n`
  summary += `분량: 출력 시 A4 2~3장이 되도록 각 항목의 내용을 상세히 풀어서 작성할 것.\n\n`
  summary += `표 활용: '경쟁사 비교', '추진 일정', '예산' 등은 WORD에서 보기 편하게 표(Table) 형태로 구성해줘.\n\n`
  // 8회차 수익모델 데이터 미리 확인 (목차 결정용)
  const week8DataForOutline = steps.find((s: any) => s.step_number === 8)?.step_data as any
  const hasRevenueModel = week8DataForOutline?.revenueModel?.needsRevenueModel === true

  summary += `[목차 및 포함 내용]\n\n`
  summary += `1. 사업 개요: 서비스의 비전과 필요성을 한 문장으로 정의하고 추진 배경 설명.\n`
  summary += `2. 시장 분석: 현재 시장의 페인 포인트(Pain Point)와 우리 서비스만의 차별화 포인트(USP) 기술.\n`
  summary += `3. 서비스 설계: 주요 기능 3~4가지를 상세히 기술하고, 사용자가 이용하는 흐름(User Flow)을 설명.\n`
  if (hasRevenueModel) {
    summary += `4. 비즈니스 모델: 어떻게 돈을 벌 것인지(구독, 광고, 수수료 등) 구체적 수익 구조 제시.\n`
    summary += `5. 기대 효과: 사업 성공 시 예상되는 정량적 성과와 시장 영향력.\n\n`
  } else {
    summary += `4. 기대 효과: 사업 성공 시 예상되는 정량적 성과와 시장 영향력.\n\n`
  }
  summary += `프로젝트명: ${projectTitle || '미정'}\n\n`
  summary += `[프로젝트 데이터 (1~6회차)]\n\n`

  // 1~6회차 데이터만 추출
  let hasData = false

  steps.forEach((step: any) => {
    const weekNum = step.step_number
    const data = step.step_data as any

    if (!data || weekNum > 6) return

    let weekSummary = ''
    let weekHasData = false

    if (weekNum === 1 && data.problems) {
      weekSummary += `[1회차: 문제 발견과 목표 설정]\n`
      if (data.problems && Array.isArray(data.problems)) {
        weekSummary += `발견한 문제들:\n`
        data.problems.forEach((p: any, idx: number) => {
          if (p.title) {
            weekSummary += `  ${idx + 1}. ${p.title}\n`
            if (p.description) weekSummary += `     설명: ${p.description}\n`
            if (p.goal) weekSummary += `     목표: ${p.goal}\n`
            weekHasData = true
          }
        })
      }
    } else if (weekNum === 2 && (data.aiSearchLog || data.factCheckTable || data.structuredData)) {
      weekSummary += `[2회차: 데이터 탐색 및 교차 검증]\n`
      if (data.aiSearchLog && Array.isArray(data.aiSearchLog)) {
        const validLogs = data.aiSearchLog.filter((log: any) => log.query?.trim())
        if (validLogs.length > 0) {
          weekSummary += `AI 검색 기록 (${validLogs.length}건):\n`
          validLogs.forEach((log: any, idx: number) => {
            weekSummary += `  ${idx + 1}. 검색어: ${log.query}\n`
            if (log.tool) weekSummary += `     도구: ${log.tool}\n`
            if (log.findings) weekSummary += `     발견사항: ${log.findings}\n`
            weekHasData = true
          })
        }
      }
      if (data.factCheckTable && Array.isArray(data.factCheckTable)) {
        const validChecks = data.factCheckTable.filter((item: any) => item.metric?.trim())
        if (validChecks.length > 0) {
          weekSummary += `팩트체크 (${validChecks.length}건):\n`
          validChecks.forEach((item: any, idx: number) => {
            weekSummary += `  ${idx + 1}. ${item.metric}: AI ${item.aiValue || ''} vs 실제 ${item.actualValue || ''}\n`
            weekHasData = true
          })
        }
      }
      if (data.structuredData && Array.isArray(data.structuredData)) {
        const validData = data.structuredData.filter((d: any) => d.category?.trim() || d.value?.trim())
        if (validData.length > 0) {
          weekSummary += `구조화 데이터 (${validData.length}건)\n`
          weekHasData = true
        }
      }
    } else if (weekNum === 3 && (data.persona || data.surveyQuestions || data.virtualAnalysis)) {
      weekSummary += `[3회차: 가상 페르소나 설정 및 설문 설계]\n`
      if (data.persona && Array.isArray(data.persona)) {
        const validPersonas = data.persona.filter((p: any) => p.name || p.age)
        if (validPersonas.length > 0) {
          weekSummary += `페르소나 (${validPersonas.length}명):\n`
          validPersonas.forEach((p: any, idx: number) => {
            weekSummary += `  ${idx + 1}. ${p.name || '이름없음'}`
            if (p.age) weekSummary += ` (${p.age}세)`
            if (p.job) weekSummary += ` - ${p.job}`
            weekSummary += `\n`
            if (p.lifestyle) weekSummary += `     라이프스타일: ${p.lifestyle}\n`
            if (p.painPoint) weekSummary += `     고충: ${p.painPoint}\n`
            weekHasData = true
          })
        }
      }
      if (data.surveyQuestions && Array.isArray(data.surveyQuestions)) {
        const validQuestions = data.surveyQuestions.filter((q: any) => q.question?.trim())
        if (validQuestions.length > 0) {
          weekSummary += `설문 질문 (${validQuestions.length}개)\n`
          weekHasData = true
        }
      }
      if (data.virtualAnalysis) {
        if (data.virtualAnalysis.positiveRatio !== undefined || data.virtualAnalysis.insight?.trim()) {
          weekSummary += `가상 설문 분석: 완료\n`
          if (data.virtualAnalysis.insight) {
            weekSummary += `인사이트: ${data.virtualAnalysis.insight}\n`
          }
          weekHasData = true
        }
      }
    } else if (weekNum === 4 && (data.status || data.conclusion || data.visualization)) {
      weekSummary += `[4회차: 문제 정의]\n`
      if (data.status?.trim()) {
        weekSummary += `현황: ${data.status}\n`
        weekHasData = true
      }
      if (data.evidence?.trim()) {
        weekSummary += `증거: ${data.evidence}\n`
        weekHasData = true
      }
      if (data.persona?.trim()) {
        weekSummary += `사용자: ${data.persona}\n`
        weekHasData = true
      }
      if (data.conclusion?.trim()) {
        weekSummary += `결론(HMW): ${data.conclusion}\n`
        weekHasData = true
      }
      if (data.visualization) {
        if (data.visualization.metric?.trim() || data.visualization.chartType) {
          weekSummary += `시각화: 완료\n`
          weekHasData = true
        }
      }
    } else if (weekNum === 5 && (data.advancedPersona || data.ujm || data.coreInsight)) {
      weekSummary += `[5회차: 인사이트 도출]\n`
      if (data.advancedPersona && Array.isArray(data.advancedPersona)) {
        const validPersonas = data.advancedPersona.filter((p: any) => p.name?.trim())
        if (validPersonas.length > 0) {
          weekSummary += `고급 페르소나 (${validPersonas.length}명):\n`
          validPersonas.forEach((p: any, idx: number) => {
            weekSummary += `  ${idx + 1}. ${p.name}`
            if (p.age) weekSummary += ` (${p.age}세)`
            if (p.job) weekSummary += ` - ${p.job}`
            weekSummary += `\n`
            if (p.goals) weekSummary += `     목표: ${p.goals}\n`
            if (p.complaints) weekSummary += `     불만사항: ${p.complaints}\n`
            weekHasData = true
          })
        }
      }
      if (data.ujm && Array.isArray(data.ujm)) {
        const validStages = data.ujm.filter((stage: any) => stage.stage?.trim())
        if (validStages.length > 0) {
          weekSummary += `사용자 여정 지도 (${validStages.length}단계):\n`
          validStages.forEach((stage: any, idx: number) => {
            weekSummary += `  ${idx + 1}. ${stage.stage}: 감정점수 ${stage.emotionScore || 0}\n`
            if (stage.action) weekSummary += `     행동: ${stage.action}\n`
            weekHasData = true
          })
        }
      }
      if (data.coreInsight?.trim()) {
        weekSummary += `핵심 인사이트: ${data.coreInsight}\n`
        weekHasData = true
      }
      if (data.painPoint?.trim()) {
        weekSummary += `고통 지점: ${data.painPoint}\n`
        weekHasData = true
      }
    } else if (weekNum === 6 && (data.hmwQuestion || data.ideas || data.matrixData)) {
      weekSummary += `[6회차: 의미 탐구]\n`
      if (data.hmwQuestion?.trim()) {
        weekSummary += `HMW 질문: ${data.hmwQuestion}\n`
        weekHasData = true
      }
      if (data.ideas && Array.isArray(data.ideas)) {
        const validIdeas = data.ideas.filter((idea: any) => idea.title?.trim())
        if (validIdeas.length > 0) {
          weekSummary += `해결 아이디어 (${validIdeas.length}개):\n`
          validIdeas.forEach((idea: any, idx: number) => {
            weekSummary += `  ${idx + 1}. ${idea.title} [${idea.type || 'N/A'}]\n`
            if (idea.description) weekSummary += `     ${idea.description}\n`
            weekHasData = true
          })
        }
      }
      if (data.matrixData && Array.isArray(data.matrixData)) {
        const validMatrix = data.matrixData.filter((item: any) => item.ideaTitle?.trim())
        if (validMatrix.length > 0) {
          weekSummary += `우선순위 매트릭스:\n`
          validMatrix.forEach((item: any) => {
            weekSummary += `  - ${item.ideaTitle}: Impact ${item.impact || 0}, Effort ${item.effort || 0}\n`
            weekHasData = true
          })
        }
      }
    }

    if (weekHasData) {
      summary += weekSummary + `\n`
      hasData = true
    }
  })

  if (!hasData) {
    summary += `입력된 데이터가 없습니다.\n`
  }

  summary += `\n[최종 지시사항]\n\n`
  
  // 8회차 수익모델 데이터 확인
  const week8Data = steps.find((s: any) => s.step_number === 8)?.step_data as any
  const needsRevenueModel = week8Data?.revenueModel?.needsRevenueModel === true
  
  if (needsRevenueModel) {
    summary += `위 데이터를 바탕으로 다음 5단계 목차 구조를 준수하여 전문적인 웹/앱 사업 기획서를 작성해주세요:\n\n`
  } else {
    summary += `위 데이터를 바탕으로 다음 4단계 목차 구조를 준수하여 전문적인 웹/앱 사업 기획서를 작성해주세요:\n\n`
    summary += `**중요: 이 프로젝트는 수익모델 검토 대상이 아니므로 '비즈니스 모델' 목차(4번)는 절대 포함하지 마세요. 목차 번호를 다음과 같이 구성하세요.\n\n`
  }
  
  summary += `1. 사업 개요\n`
  summary += `   - 1회차 문제 발견 데이터를 활용하여 서비스의 비전과 필요성을 한 문장으로 정의\n`
  summary += `   - 추진 배경과 시장 기회를 설득력 있게 서술\n\n`
  summary += `2. 시장 분석\n`
  summary += `   - 2회차 데이터(팩트체크, 검색 기록)를 활용하여 현재 시장의 페인 포인트 기술\n`
  summary += `   - 우리 서비스만의 차별화 포인트(USP) 제시\n\n`
  summary += `3. 서비스 설계\n`
  summary += `   - 6회차 아이디어 및 우선순위 매트릭스 데이터를 활용하여 주요 기능 3~4가지 상세 기술\n`
  summary += `   - 5회차 사용자 여정 지도 데이터를 기반으로 사용자가 이용하는 흐름(User Flow) 설명\n\n`
  
  if (needsRevenueModel) {
    summary += `4. 비즈니스 모델\n`
    const revenueModel = week8Data.revenueModel
    summary += `   - 수익모델 검토 대상 프로젝트입니다.\n`
    
    // 정량적 KPI
    if (revenueModel.kpi?.quantitative && Array.isArray(revenueModel.kpi.quantitative) && revenueModel.kpi.quantitative.length > 0) {
      summary += `   - 정량적 KPI:\n`
      revenueModel.kpi.quantitative.forEach((kpi: any) => {
        if (kpi.goal || kpi.value || kpi.unit) {
          summary += `     * ${kpi.goal || ''}: ${kpi.value || ''} ${kpi.unit || ''}\n`
        }
      })
    }
    
    // 정성적 KPI
    if (revenueModel.kpi?.qualitative && Array.isArray(revenueModel.kpi.qualitative) && revenueModel.kpi.qualitative.length > 0) {
      summary += `   - 정성적 KPI:\n`
      revenueModel.kpi.qualitative.forEach((kpi: any) => {
        if (kpi.goal) {
          summary += `     * ${kpi.goal}\n`
        }
      })
    }
    
    // 수익화 모델
    if (revenueModel.revenueStream && Array.isArray(revenueModel.revenueStream) && revenueModel.revenueStream.length > 0) {
      summary += `   - 수익화 모델:\n`
      revenueModel.revenueStream.forEach((rs: any) => {
        if (rs.revenueModel || rs.amount || rs.expectedRevenue || rs.note) {
          summary += `     * ${rs.revenueModel || ''} | 금액: ${rs.amount || ''} | 예상매출: ${rs.expectedRevenue || ''}${rs.note ? ` | 비고: ${rs.note}` : ''}\n`
        }
      })
    }
    
    // 추진일정
    if (revenueModel.projectSchedule && Array.isArray(revenueModel.projectSchedule) && revenueModel.projectSchedule.length > 0) {
      summary += `   - 추진일정:\n`
      revenueModel.projectSchedule.forEach((schedule: any) => {
        if (schedule.phase || schedule.period || schedule.activity || schedule.budget) {
          summary += `     * ${schedule.phase || ''} | ${schedule.period || ''} | ${schedule.activity || ''} | 예산: ${schedule.budget || ''}\n`
        }
      })
    }
    
    // 초기 투자 예산
    if (revenueModel.investmentBudget && Array.isArray(revenueModel.investmentBudget) && revenueModel.investmentBudget.length > 0) {
      summary += `   - 초기 투자 예산:\n`
      let totalBudget = 0
      revenueModel.investmentBudget.forEach((budget: any) => {
        if (budget.item || budget.amount || budget.note) {
          const amount = parseInt(budget.amount) || 0
          totalBudget += amount
          summary += `     * ${budget.item || ''}: ${budget.amount ? `${parseInt(budget.amount).toLocaleString('ko-KR')} 만원` : ''}${budget.note ? ` (${budget.note})` : ''}\n`
        }
      })
      if (totalBudget > 0) {
        summary += `     * 총 예산 합계: ${totalBudget.toLocaleString('ko-KR')} 만원\n`
      }
    }
    
    summary += `   - 위 내용을 바탕으로 구체적 수익 구조를 상세히 제시해주세요.\n`
    summary += `   - 추진 일정은 표(Table) 형태로 구성\n\n`
    summary += `5. 기대 효과\n`
  } else {
    summary += `4. 기대 효과\n`
  }
  summary += `   - 사업 성공 시 예상되는 정량적 성과와 시장 영향력 제시\n`
  summary += `   - 3회차 페르소나 및 5회차 인사이트 데이터를 활용\n\n`
  summary += `[문서 작성 형식]\n`
  summary += `- Word 문서 스타일로 작성\n`
  summary += `- A4 용지 2~3장 분량 (출력 기준)\n`
  summary += `- 문장형 설명과 개조식(Bullet point) 적절히 혼용\n`
  summary += `- 중요 키워드는 강조\n`
  summary += `- 경쟁사 비교, 추진 일정, 예산 등은 표(Table) 형태로 작성\n\n`
  summary += `위 데이터를 분석하여 5단계 목차 구조를 준수한 전문적인 웹/앱 사업 기획서를 작성해주세요.`

  return summary
}

// 웹/앱 워크북용 제안서 생성 함수 (전체 회차 기반, PPT 형태)
function generateWebAppProposal(
  steps: any[],
  projectTitle: string | null
): string {
  let summary = `서비스 기획 제안서 슬라이드 생성 프롬프트\n\n`
  summary += `[작업 지시]\n`
  summary += `당신은 서비스 기획 전문가입니다. 아래 제공된 12주간의 프로젝트 데이터를 분석하여, 이해관계자에게 서비스를 효과적으로 설명할 수 있는 기획 제안서 슬라이드를 만들어주세요.\n\n`
  summary += `각 슬라이드는 다음 형식으로 구성해주세요:\n`
  summary += `- 슬라이드 제목 (명확하고 간결하게)\n`
  summary += `- 핵심 내용 (불릿 포인트 또는 간단한 문단)\n`
  summary += `- 필요한 경우 시각화 제안 (차트, 다이어그램 등)\n\n`
  summary += `[슬라이드 구성 (총 10-12장 권장)]\n\n`
  summary += `슬라이드 1: 커버\n`
  summary += `- 서비스명 (9회차)\n`
  summary += `- 슬로건 (9회차)\n`
  summary += `- 프로젝트명: ${projectTitle || '미정'}\n\n`
  summary += `슬라이드 2: 문제 정의\n`
  summary += `- 1회차에서 발견한 일상의 불편함과 페인 포인트\n`
  summary += `- 2회차와 4회차의 데이터로 증명된 문제의 심각성\n\n`
  summary += `슬라이드 3: 타겟 사용자\n`
  summary += `- 3회차와 5회차에서 정의한 페르소나 프로필\n`
  summary += `- 사용자의 주요 특성 및 라이프스타일\n\n`
  summary += `슬라이드 4: 사용자 여정 분석\n`
  summary += `- 5회차 UJM에서 발견한 고충 발생 지점\n`
  summary += `- 감정 곡선 상의 결정적 순간\n\n`
  summary += `슬라이드 5: 솔루션 개요\n`
  summary += `- 4회차의 HMW 질문 및 최종 문제 정의\n`
  summary += `- 6회차의 핵심 해결 아이디어\n\n`
  summary += `슬라이드 6: MVP 기능\n`
  summary += `- 6회차 우선순위 매트릭스에서 선정된 MVP 아이디어\n`
  summary += `- 각 기능의 Impact/Effort 분석\n\n`
  summary += `슬라이드 7: 서비스 구조\n`
  summary += `- 7회차 IA 트리 구조\n`
  summary += `- 해피 패스 사용자 플로우\n`
  summary += `- 핵심 화면 구성\n\n`
  summary += `슬라이드 8: 비주얼 아이덴티티\n`
  summary += `- 9회차 브랜드 컬러 및 폰트\n`
  summary += `- 디자인 컨셉 및 무드\n`
  summary += `- 유사 서비스와의 차별점\n\n`
  
  // 8회차 수익모델 데이터 확인
  const week8ProposalData = steps.find((s: any) => s.step_number === 8)?.step_data as any
  if (week8ProposalData?.revenueModel?.needsRevenueModel) {
    const revenueModel = week8ProposalData.revenueModel
    summary += `슬라이드 8.5: 비즈니스 모델 (수익모델 검토 대상)\n`
    
    // 정량적 KPI
    if (revenueModel.kpi?.quantitative && Array.isArray(revenueModel.kpi.quantitative) && revenueModel.kpi.quantitative.length > 0) {
      summary += `- 정량적 KPI:\n`
      revenueModel.kpi.quantitative.forEach((kpi: any) => {
        if (kpi.goal || kpi.value || kpi.unit) {
          summary += `  * ${kpi.goal || ''}: ${kpi.value || ''} ${kpi.unit || ''}\n`
        }
      })
    }
    
    // 정성적 KPI
    if (revenueModel.kpi?.qualitative && Array.isArray(revenueModel.kpi.qualitative) && revenueModel.kpi.qualitative.length > 0) {
      summary += `- 정성적 KPI:\n`
      revenueModel.kpi.qualitative.forEach((kpi: any) => {
        if (kpi.goal) {
          summary += `  * ${kpi.goal}\n`
        }
      })
    }
    
    // 수익화 모델
    if (revenueModel.revenueStream && Array.isArray(revenueModel.revenueStream) && revenueModel.revenueStream.length > 0) {
      summary += `- 수익화 모델:\n`
      revenueModel.revenueStream.forEach((rs: any) => {
        if (rs.revenueModel || rs.amount || rs.expectedRevenue) {
          summary += `  * ${rs.revenueModel || ''} (${rs.amount || ''}) - 예상매출: ${rs.expectedRevenue || ''}${rs.note ? ` - 비고: ${rs.note}` : ''}\n`
        }
      })
    }
    
    // 추진일정
    if (revenueModel.projectSchedule && Array.isArray(revenueModel.projectSchedule) && revenueModel.projectSchedule.length > 0) {
      summary += `- 추진일정:\n`
      revenueModel.projectSchedule.forEach((schedule: any) => {
        if (schedule.phase || schedule.period || schedule.activity) {
          summary += `  * ${schedule.phase || ''} (${schedule.period || ''}): ${schedule.activity || ''} - 예산: ${schedule.budget || ''}\n`
        }
      })
    }
    
    // 초기 투자 예산
    if (revenueModel.investmentBudget && Array.isArray(revenueModel.investmentBudget) && revenueModel.investmentBudget.length > 0) {
      summary += `- 초기 투자 예산:\n`
      let totalBudget = 0
      revenueModel.investmentBudget.forEach((budget: any) => {
        if (budget.item || budget.amount) {
          const amount = parseInt(budget.amount) || 0
          totalBudget += amount
          summary += `  * ${budget.item || ''}: ${budget.amount ? `${parseInt(budget.amount).toLocaleString('ko-KR')} 만원` : ''}${budget.note ? ` (${budget.note})` : ''}\n`
        }
      })
      if (totalBudget > 0) {
        summary += `  * 총 예산 합계: ${totalBudget.toLocaleString('ko-KR')} 만원\n`
      }
    }
    
    summary += `- 구체적인 수익 구조 및 수익화 전략 제시\n\n`
  }
  
  summary += `슬라이드 9: UI/UX 하이라이트\n`
  summary += `- 10회차 핵심 화면 레이아웃 설계\n`
  summary += `- 11회차 주요 인터랙션 및 UX 라이팅 전략\n\n`
  summary += `슬라이드 10: 실현 가능성\n`
  summary += `- 8회차 주요 기능 요구사항 및 우선순위\n`
  summary += `- 기술적 제약사항 및 개발 범위\n\n`
  summary += `슬라이드 11: 검증 및 피벗\n`
  summary += `- 12회차 요구사항 정합성 체크 결과\n`
  summary += `- 기획 대비 실제 구현 변경 사유\n\n`
  summary += `슬라이드 12: 다음 단계\n`
  summary += `- 향후 개발 계획\n`
  summary += `- 고도화 방향\n\n`
  summary += `[작성 가이드라인]\n`
  summary += `- 각 슬라이드는 하나의 핵심 메시지에 집중\n`
  summary += `- 구체적인 데이터와 수치를 적극 인용\n`
  summary += `- 읽기 쉽고 이해하기 쉬운 구조\n`
  summary += `- 시각적 요소(차트, 다이어그램) 제안 포함\n`
  summary += `- 전문적이면서도 접근하기 쉬운 문체 사용\n\n`
  summary += `[프로젝트 데이터]\n\n`
  summary += `프로젝트명: ${projectTitle || '미정'}\n\n`
  summary += `=== 1~12회차 워크북 전체 데이터 ===\n\n`

  // 기존 데이터 추출 로직 (109~412 라인과 동일)
  steps.forEach((step: any) => {
    const weekNum = step.step_number
    const data = step.step_data as any

    summary += `[${weekNum}회차]\n`
    
    if (!data) {
      summary += `데이터 없음\n\n`
      return
    }

    // 회차별 상세 데이터 추출 (기존 로직과 동일)
    if (weekNum === 1) {
      if (data.problems && Array.isArray(data.problems)) {
        summary += `문제 발견:\n`
        data.problems.forEach((p: any, idx: number) => {
          if (p.title) {
            summary += `  ${idx + 1}. 제목: ${p.title}\n`
            if (p.description) summary += `     설명: ${p.description}\n`
            if (p.goal) summary += `     목표: ${p.goal}\n`
          }
        })
      }
      if (data.promptStudio) {
        summary += `프롬프트 훈련: 완료\n`
      }
    } else if (weekNum === 2) {
      if (data.aiSearchLog && Array.isArray(data.aiSearchLog)) {
        summary += `AI 검색 기록 (${data.aiSearchLog.length}건):\n`
        data.aiSearchLog.forEach((log: any, idx: number) => {
          if (log.query) {
            summary += `  ${idx + 1}. 검색어: ${log.query}\n`
            if (log.tool) summary += `     도구: ${log.tool}\n`
            if (log.findings) summary += `     발견사항: ${log.findings}\n`
            if (log.url) summary += `     출처: ${log.url}\n`
          }
        })
      }
      if (data.factCheckTable && Array.isArray(data.factCheckTable)) {
        summary += `팩트체크 테이블 (${data.factCheckTable.length}건):\n`
        data.factCheckTable.forEach((item: any, idx: number) => {
          if (item.metric) {
            summary += `  ${idx + 1}. 지표: ${item.metric}\n`
            if (item.aiValue) summary += `     AI 답변: ${item.aiValue}\n`
            if (item.actualValue) summary += `     실제 수치: ${item.actualValue}\n`
            if (item.status) summary += `     상태: ${item.status}\n`
          }
        })
      }
      if (data.structuredData && Array.isArray(data.structuredData)) {
        summary += `구조화 데이터 (${data.structuredData.length}건)\n`
      }
    } else if (weekNum === 3) {
      if (data.persona && Array.isArray(data.persona)) {
        summary += `페르소나 (${data.persona.length}명):\n`
        data.persona.forEach((p: any, idx: number) => {
          if (p.name || p.age) {
            summary += `  ${idx + 1}. ${p.name || '이름없음'}`
            if (p.age) summary += ` (${p.age}세)`
            if (p.job) summary += ` - ${p.job}`
            summary += `\n`
            if (p.lifestyle) summary += `     라이프스타일: ${p.lifestyle}\n`
            if (p.painPoint) summary += `     고충: ${p.painPoint}\n`
            if (p.dataSource) summary += `     데이터 근거: ${p.dataSource}\n`
          }
        })
      }
      if (data.surveyQuestions && Array.isArray(data.surveyQuestions)) {
        summary += `설문 질문 (${data.surveyQuestions.length}개):\n`
        data.surveyQuestions.forEach((q: any, idx: number) => {
          if (q.question) {
            summary += `  ${idx + 1}. ${q.question}\n`
            if (q.responseType) summary += `     응답 유형: ${q.responseType}\n`
          }
        })
      }
      if (data.virtualAnalysis) {
        if (data.virtualAnalysis.positiveRatio !== undefined) {
          summary += `긍정 비율: ${data.virtualAnalysis.positiveRatio}%\n`
        }
        if (data.virtualAnalysis.neutralRatio !== undefined) {
          summary += `중립 비율: ${data.virtualAnalysis.neutralRatio}%\n`
        }
        if (data.virtualAnalysis.negativeRatio !== undefined) {
          summary += `부정 비율: ${data.virtualAnalysis.negativeRatio}%\n`
        }
        if (data.virtualAnalysis.insight) {
          summary += `인사이트 요약: ${data.virtualAnalysis.insight}\n`
        }
      }
    } else if (weekNum === 4) {
      if (data.status) summary += `현황: ${data.status}\n`
      if (data.evidence) summary += `증거: ${data.evidence}\n`
      if (data.persona) summary += `사용자: ${data.persona}\n`
      if (data.conclusion) summary += `결론(HMW): ${data.conclusion}\n`
      if (data.visualization) {
        if (data.visualization.metric) {
          summary += `시각화 지표: ${data.visualization.metric}\n`
        }
        if (data.visualization.chartType) {
          summary += `차트 유형: ${data.visualization.chartType}\n`
        }
      }
    } else if (weekNum === 5) {
      if (data.advancedPersona && Array.isArray(data.advancedPersona)) {
        summary += `고급 페르소나 (${data.advancedPersona.length}명):\n`
        data.advancedPersona.forEach((p: any, idx: number) => {
          if (p.name) {
            summary += `  ${idx + 1}. ${p.name}`
            if (p.age) summary += ` (${p.age}세)`
            if (p.job) summary += ` - ${p.job}`
            summary += `\n`
            if (p.goals) summary += `     목표: ${p.goals}\n`
            if (p.complaints) summary += `     불만사항: ${p.complaints}\n`
            if (p.keywords) summary += `     키워드: ${p.keywords}\n`
          }
        })
      }
      if (data.ujm && Array.isArray(data.ujm)) {
        summary += `사용자 여정 지도 (${data.ujm.length}단계):\n`
        data.ujm.forEach((stage: any, idx: number) => {
          if (stage.stage) {
            summary += `  ${stage.stage}: 감정점수 ${stage.emotionScore || 0}\n`
            if (stage.action) summary += `     행동: ${stage.action}\n`
            if (stage.thought) summary += `     생각: ${stage.thought}\n`
          }
        })
      }
      if (data.coreInsight) summary += `핵심 인사이트: ${data.coreInsight}\n`
      if (data.painPoint) summary += `고통 지점: ${data.painPoint}\n`
      if (data.deficiency) summary += `결핍 요인: ${data.deficiency}\n`
    } else if (weekNum === 6) {
      if (data.hmwQuestion) summary += `HMW 질문: ${data.hmwQuestion}\n`
      if (data.ideas && Array.isArray(data.ideas)) {
        summary += `아이디어 (${data.ideas.length}개):\n`
        data.ideas.forEach((idea: any, idx: number) => {
          if (idea.title) {
            summary += `  ${idx + 1}. ${idea.title} [${idea.type || 'N/A'}]\n`
            if (idea.description) summary += `     ${idea.description}\n`
          }
        })
      }
      if (data.matrixData && Array.isArray(data.matrixData)) {
        summary += `우선순위 매트릭스:\n`
        data.matrixData.forEach((item: any) => {
          if (item.ideaTitle) {
            summary += `  - ${item.ideaTitle}: Impact ${item.impact || 0}, Effort ${item.effort || 0}\n`
          }
        })
      }
    } else if (weekNum === 7) {
      if (data.iaTree && Array.isArray(data.iaTree)) {
        summary += `IA 트리 구조 (${data.iaTree.length}항목):\n`
        data.iaTree.forEach((item: any, idx: number) => {
          if (item.name) {
            const indent = '  '.repeat(item.depth || 0)
            summary += `${indent}- ${item.name}`
            if (item.description) summary += `: ${item.description}`
            summary += `\n`
          }
        })
      }
      if (data.userFlow && Array.isArray(data.userFlow)) {
        summary += `해피 패스 플로우 (${data.userFlow.length}단계):\n`
        data.userFlow.forEach((flow: any, idx: number) => {
          if (flow.action) {
            summary += `  ${idx + 1}. ${flow.action}\n`
            if (flow.systemResponse) summary += `     시스템 반응: ${flow.systemResponse}\n`
          }
        })
      }
      if (data.keyScreens && Array.isArray(data.keyScreens)) {
        summary += `핵심 화면 (${data.keyScreens.length}개):\n`
        data.keyScreens.forEach((screen: any, idx: number) => {
          if (screen.screenName) {
            summary += `  ${idx + 1}. ${screen.screenName} [${screen.priority || 'N/A'}]\n`
            if (screen.keyComponents) summary += `     주요 컴포넌트: ${screen.keyComponents}\n`
          }
        })
      }
    } else if (weekNum === 8) {
      if (data.requirements && Array.isArray(data.requirements)) {
        summary += `요구사항 정의서 (${data.requirements.length}건):\n`
        data.requirements.forEach((req: any, idx: number) => {
          if (req.name) {
            summary += `  ${idx + 1}. [${req.category || 'N/A'}] ${req.name} (${req.priority || 'N/A'})\n`
            if (req.description) summary += `     ${req.description}\n`
          }
        })
      }
      if (data.scopeData) {
        if (data.scopeData.inScope) summary += `In-Scope: ${data.scopeData.inScope}\n`
        if (data.scopeData.outOfScope) summary += `Out-of-Scope: ${data.scopeData.outOfScope}\n`
        if (data.scopeData.technicalConstraints) summary += `기술 제약: ${data.scopeData.technicalConstraints}\n`
      }
      // 수익모델 데이터 추가
      if (data.revenueModel?.needsRevenueModel) {
        summary += `수익모델 검토 대상: 예\n`
        
        // 정량적 KPI
        if (data.revenueModel.kpi?.quantitative && Array.isArray(data.revenueModel.kpi.quantitative) && data.revenueModel.kpi.quantitative.length > 0) {
          summary += `정량적 KPI:\n`
          data.revenueModel.kpi.quantitative.forEach((kpi: any) => {
            if (kpi.goal || kpi.value || kpi.unit) {
              summary += `  - ${kpi.goal || ''}: ${kpi.value || ''} ${kpi.unit || ''}\n`
            }
          })
        }
        
        // 정성적 KPI
        if (data.revenueModel.kpi?.qualitative && Array.isArray(data.revenueModel.kpi.qualitative) && data.revenueModel.kpi.qualitative.length > 0) {
          summary += `정성적 KPI:\n`
          data.revenueModel.kpi.qualitative.forEach((kpi: any) => {
            if (kpi.goal) {
              summary += `  - ${kpi.goal}\n`
            }
          })
        }
        
        // 수익화 모델
        if (data.revenueModel.revenueStream && Array.isArray(data.revenueModel.revenueStream) && data.revenueModel.revenueStream.length > 0) {
          summary += `수익화 모델:\n`
          data.revenueModel.revenueStream.forEach((rs: any) => {
            if (rs.revenueModel || rs.amount || rs.expectedRevenue || rs.note) {
              summary += `  - ${rs.revenueModel || ''} | 금액: ${rs.amount || ''} | 예상매출: ${rs.expectedRevenue || ''}${rs.note ? ` | 비고: ${rs.note}` : ''}\n`
            }
          })
        }
        
        // 추진일정
        if (data.revenueModel.projectSchedule && Array.isArray(data.revenueModel.projectSchedule) && data.revenueModel.projectSchedule.length > 0) {
          summary += `추진일정:\n`
          data.revenueModel.projectSchedule.forEach((schedule: any) => {
            if (schedule.phase || schedule.period || schedule.activity || schedule.budget) {
              summary += `  - ${schedule.phase || ''} | ${schedule.period || ''} | ${schedule.activity || ''} | 예산: ${schedule.budget || ''}\n`
            }
          })
        }
        
        // 초기 투자 예산
        if (data.revenueModel.investmentBudget && Array.isArray(data.revenueModel.investmentBudget) && data.revenueModel.investmentBudget.length > 0) {
          summary += `초기 투자 예산:\n`
          let totalBudget = 0
          data.revenueModel.investmentBudget.forEach((budget: any) => {
            if (budget.item || budget.amount || budget.note) {
              const amount = parseInt(budget.amount) || 0
              totalBudget += amount
              summary += `  - ${budget.item || ''}: ${budget.amount ? `${parseInt(budget.amount).toLocaleString('ko-KR')} 만원` : ''}${budget.note ? ` (${budget.note})` : ''}\n`
            }
          })
          if (totalBudget > 0) {
            summary += `  - 총 예산 합계: ${totalBudget.toLocaleString('ko-KR')} 만원\n`
          }
        }
      }
    } else if (weekNum === 9) {
      if (data.naming && data.naming.candidates) {
        const favorite = data.naming.candidates.find((c: any) => c.isFavorite)
        if (favorite) {
          summary += `서비스명: ${favorite.name}\n`
          if (favorite.meaning) summary += `의미: ${favorite.meaning}\n`
        }
        if (data.naming.slogan) summary += `슬로건: ${data.naming.slogan}\n`
      }
      if (data.visual) {
        if (data.visual.mainColor) summary += `메인 컬러: ${data.visual.mainColor}\n`
        if (data.visual.subColor) summary += `서브 컬러: ${data.visual.subColor}\n`
        if (data.visual.titleFont) summary += `제목 폰트: ${data.visual.titleFont}\n`
        if (data.visual.bodyFont) summary += `본문 폰트: ${data.visual.bodyFont}\n`
        if (data.visual.logoDescription) summary += `로고 설명: ${data.visual.logoDescription}\n`
        if (data.visual.toneAndManner) summary += `톤앤매너: ${data.visual.toneAndManner}\n`
      }
      if (data.mood) {
        if (data.mood.visualKeywords) summary += `비주얼 키워드: ${data.mood.visualKeywords}\n`
        if (data.mood.emotionDescription) summary += `감성 설명: ${data.mood.emotionDescription}\n`
        if (data.mood.imagePrompt) summary += `이미지 프롬프트: ${data.mood.imagePrompt}\n`
      }
      if (data.competitorAnalysis && Array.isArray(data.competitorAnalysis)) {
        summary += `유사 서비스 분석 (${data.competitorAnalysis.length}개):\n`
        data.competitorAnalysis.forEach((comp: any, idx: number) => {
          if (comp.serviceName) {
            summary += `  ${idx + 1}. ${comp.serviceName}\n`
            if (comp.similarPoints) summary += `     유사 포인트: ${comp.similarPoints}\n`
            if (comp.analysisReason) summary += `     분석 사유: ${comp.analysisReason}\n`
          }
        })
      }
    } else if (weekNum === 10) {
      if (data.screenLayouts && Array.isArray(data.screenLayouts)) {
        summary += `화면 레이아웃 설계 (${data.screenLayouts.length}개 화면):\n`
        data.screenLayouts.forEach((screen: any, idx: number) => {
          const screenNames = ['메인', '핵심 기능', '결과/프로필']
          summary += `  화면 ${idx + 1} (${screenNames[idx] || 'N/A'}): ${screen.purpose || 'N/A'}\n`
          if (screen.coreFunction) summary += `     핵심 기능: ${screen.coreFunction}\n`
          if (screen.header && Array.isArray(screen.header) && screen.header.length > 0) {
            summary += `     상단 요소: ${screen.header.join(', ')}\n`
          }
          if (screen.body && Array.isArray(screen.body) && screen.body.length > 0) {
            summary += `     중단 요소: ${screen.body.join(', ')}\n`
          }
          if (screen.footer && Array.isArray(screen.footer) && screen.footer.length > 0) {
            summary += `     하단 요소: ${screen.footer.join(', ')}\n`
          }
        })
      }
    } else if (weekNum === 11) {
      if (data.interactionMap && Array.isArray(data.interactionMap)) {
        summary += `인터랙션 매핑 (${data.interactionMap.length}건):\n`
        data.interactionMap.forEach((interaction: any, idx: number) => {
          if (interaction.trigger) {
            summary += `  ${idx + 1}. ${interaction.trigger} → ${interaction.targetScreen || 'N/A'}\n`
            if (interaction.action) summary += `     액션: ${interaction.action}\n`
            if (interaction.transitionEffect) summary += `     전환: ${interaction.transitionEffect}\n`
          }
        })
      }
      if (data.uxWritingData && Array.isArray(data.uxWritingData)) {
        summary += `UX 라이팅 항목 (${data.uxWritingData.length}개):\n`
        data.uxWritingData.forEach((writing: any, idx: number) => {
          if (writing.draft) {
            summary += `  ${idx + 1}. 기존 문구: ${writing.draft}\n`
            if (writing.concept) summary += `     컨셉: ${writing.concept}\n`
          }
        })
      }
      if (data.prototypeLink) summary += `프로토타입 링크: ${data.prototypeLink}\n`
      if (data.testComment) summary += `테스트 코멘트: ${data.testComment}\n`
    } else if (weekNum === 12) {
      if (data.requirementChecks && Array.isArray(data.requirementChecks)) {
        summary += `요구사항 정합성 체크 (${data.requirementChecks.length}건):\n`
        data.requirementChecks.forEach((check: any) => {
          if (check.requirementName) {
            summary += `  - ${check.requirementName}: ${check.status || '미선택'}\n`
            if (check.actualResult) summary += `     실제 결과물: ${check.actualResult}\n`
            if (check.changeReason) summary += `     변경 사유: ${check.changeReason}\n`
            if (check.changeType) summary += `     변경 유형: ${check.changeType}\n`
          }
        })
      }
      if (data.changeReasons && Array.isArray(data.changeReasons)) {
        summary += `전체 변경 사유: ${data.changeReasons.join(', ')}\n`
      }
      if (data.retrospective) {
        summary += `프로젝트 회고: ${data.retrospective}\n`
      }
    }

    summary += `---\n\n`
  })

  summary += `[최종 지시사항]\n\n`
  summary += `위 데이터를 바탕으로 다음을 수행해주세요:\n\n`
  summary += `1. 각 슬라이드별로 가장 적합한 데이터를 추출하여 핵심 내용을 요약하세요.\n`
  summary += `2. 데이터 간의 논리적 흐름을 파악하여 스토리텔링 구조를 만드세요.\n`
  summary += `   (예: 문제 발견 → 데이터 증명 → 사용자 분석 → 솔루션 → 구현 계획)\n`
  summary += `3. 각 슬라이드에 제목, 핵심 내용(불릿 포인트), 그리고 필요한 경우 시각화 제안을 포함하세요.\n`
  summary += `4. 구체적인 수치, 통계, 사용자 인용구 등을 적극 활용하여 신뢰성을 높이세요.\n`
  summary += `5. 전문적이지만 이해하기 쉬운 문체를 사용하세요.\n\n`
  summary += `위 데이터를 분석하여 서비스 기획 제안서 슬라이드를 생성해주세요.`

  return summary
}

// 이벤트 워크북용 사업기획서 생성 함수 (1~4회차 기반)
function generateEventBusinessPlan(
  steps: any[],
  projectTitle: string | null
): string {
  let summary = `행사 사업기획서 작성 프롬프트\n\n`
  summary += `[작업 지시]\n`
  summary += `당신은 행사 기획 전문가이자 비즈니스 문서 작성 전문가입니다. 아래 제공된 프로젝트 데이터(1~4회차)를 분석하여, 본격적인 사업기획에 앞서 전체적인 사업의 개요를 정리한 사업기획서를 작성해주세요.\n\n`
  summary += `[사업기획서 작성 가이드라인]\n\n`
  summary += `문체: 비즈니스 전문 용어를 사용하며, 명조체 문서에 어울리는 격식 있는 문체(~함, ~임 등 개조식과 서술식 혼용)로 작성할 것.\n\n`
  summary += `분량: 출력 시 A4 용지 2~3장 분량이 나오도록 각 항목을 구체적으로 확장해서 서술할 것.\n\n`
  summary += `구조: 아래 8단계 목차를 반드시 준수할 것.\n\n`
  summary += `[목차 구조]\n\n`
  summary += `1. 행사 개요: 목적과 배경을 설득력 있게 서술\n`
  summary += `2. 기본 방향 및 컨셉: 타 행사와 차별화되는 핵심 전략 포함\n`
  summary += `3. 세부 실행 계획: 시간대별 큐시트나 공간 배치안을 텍스트로 상세히 묘사\n`
  summary += `4. 운영 및 인력 계획: 구체적인 R&R과 시스템 사양 제안\n`
  summary += `5. 홍보 및 마케팅: 채널별 상세 로드맵 제시\n`
  summary += `6. 예산 계획: 항목별 예상 비용을 표(Table) 형태로 구성\n`
  summary += `7. 안전 및 리스크 관리: 실효성 있는 대응 매뉴얼 작성\n`
  summary += `8. 기대 효과: 정량적/정성적 성과 예측\n\n`
  summary += `[작성 시 주의사항]\n\n`
  summary += `- 각 섹션은 전문적이고 논리적으로 작성하며, 구체적인 데이터와 수치를 포함해주세요.\n`
  summary += `- 비즈니스 전문 용어를 적절히 사용하고, 격식 있는 문체를 유지해주세요.\n`
  summary += `- 개조식(~함, ~임)과 서술식을 적절히 혼용하여 가독성을 높여주세요.\n`
  summary += `- 입력되지 않은 항목은 무시하고, 입력된 데이터만 기반으로 작성하세요.\n`
  summary += `- 예산 계획 섹션은 반드시 표(Table) 형태로 작성해주세요.\n\n`
  summary += `프로젝트명: ${projectTitle || '미정'}\n\n`
  summary += `[프로젝트 데이터 (1~4회차)]\n\n`

  // 1~4회차 데이터만 추출 (기존 구현과 동일)
  let hasData = false

  steps.forEach((step: any) => {
    const weekNum = step.step_number
    const data = step.step_data as any

    if (!data || weekNum > 4) return

    let weekSummary = ''
    let weekHasData = false

    if (weekNum === 1 && data.eventCriteria) {
      weekSummary += `[1회차: 행사 방향성 설정 및 트렌드 헌팅]\n`
      
      if (data.eventCriteria?.type) {
        weekSummary += `행사 유형: ${data.eventCriteria.type}\n`
        weekHasData = true
      }
      
      if (data.eventCriteria?.goals && Array.isArray(data.eventCriteria.goals) && data.eventCriteria.goals.length > 0) {
        weekSummary += `핵심 목적: ${data.eventCriteria.goals.join(', ')}\n`
        weekHasData = true
      }
      
      if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
        weekSummary += `관심 키워드: ${data.keywords.join(', ')}\n`
        weekHasData = true
      }
      
      if (data.trendLogs && Array.isArray(data.trendLogs) && data.trendLogs.length > 0) {
        weekSummary += `트렌드 데이터 (${data.trendLogs.length}건):\n`
        data.trendLogs.forEach((log: any, idx: number) => {
          if (log.platform || log.keyword) {
            weekSummary += `  ${idx + 1}. ${log.platform || ''}: ${log.keyword || ''}`
            if (log.volume) weekSummary += ` (볼륨: ${log.volume})`
            weekSummary += `\n`
            if (log.insight) weekSummary += `     인사이트: ${log.insight}\n`
            weekHasData = true
          }
        })
      }
      
      if (data.insightReport?.result && data.insightReport.result.trim()) {
        weekSummary += `트렌드 분석 리포트:\n${data.insightReport.result}\n`
        weekHasData = true
      }
    } else if (weekNum === 2 && data.personas) {
      weekSummary += `[2회차: 타겟 페르소나]\n`
      
      if (data.personas && Array.isArray(data.personas) && data.personas.length > 0) {
        weekSummary += `방문객 페르소나 (${data.personas.length}명):\n`
        data.personas.forEach((persona: any, idx: number) => {
          if (persona.profile?.name || persona.profile?.age || persona.profile?.job) {
            weekSummary += `  ${idx + 1}. ${persona.profile?.name || '이름없음'}`
            if (persona.profile?.age) weekSummary += ` (${persona.profile.age}세)`
            if (persona.profile?.job) weekSummary += ` - ${persona.profile.job}`
            weekSummary += `\n`
            
            if (persona.profile?.lifestyleTags && Array.isArray(persona.profile.lifestyleTags) && persona.profile.lifestyleTags.length > 0) {
              weekSummary += `     라이프스타일: ${persona.profile.lifestyleTags.join(', ')}\n`
            }
            
            if (persona.profile?.visitMotivation && Array.isArray(persona.profile.visitMotivation) && persona.profile.visitMotivation.length > 0) {
              weekSummary += `     방문 동기: ${persona.profile.visitMotivation.join(', ')}\n`
            }
            
            if (persona.behaviorPattern) {
              const bp = persona.behaviorPattern
              if (bp.goodsPurchase !== undefined) weekSummary += `     굿즈 구매 성향: ${bp.goodsPurchase}%\n`
              if (bp.photoZonePreference !== undefined) weekSummary += `     포토존 선호도: ${bp.photoZonePreference}%\n`
              if (bp.stayDuration !== undefined) weekSummary += `     체류 시간: ${bp.stayDuration}%\n`
              if (bp.companionType !== undefined) weekSummary += `     동반인 유형: ${bp.companionType}%\n`
            }
            
            if (persona.behaviorScenario) {
              if (persona.behaviorScenario.before?.trim()) {
                weekSummary += `     방문 전: ${persona.behaviorScenario.before}\n`
              }
              if (persona.behaviorScenario.during?.trim()) {
                weekSummary += `     방문 중: ${persona.behaviorScenario.during}\n`
              }
              if (persona.behaviorScenario.after?.trim()) {
                weekSummary += `     방문 후: ${persona.behaviorScenario.after}\n`
              }
            }
            weekHasData = true
          }
        })
      }
    } else if (weekNum === 3 && (data.references || data.swot)) {
      weekSummary += `[3회차: 레퍼런스 벤치마킹 및 정량 분석]\n`
      
      if (data.references && Array.isArray(data.references) && data.references.length > 0) {
        weekSummary += `레퍼런스 행사 (${data.references.length}건):\n`
        data.references.forEach((ref: any, idx: number) => {
          if (ref.name) {
            weekSummary += `  ${idx + 1}. ${ref.name}\n`
            if (ref.coreGoal) weekSummary += `     핵심 목표: ${ref.coreGoal}\n`
            if (ref.budget) weekSummary += `     예산: ${ref.budget}만원\n`
            if (ref.duration) weekSummary += `     기간: ${ref.duration}일\n`
            if (ref.officialVisitors) weekSummary += `     공개 방문객 수: ${ref.officialVisitors}명\n`
            if (ref.estimatedVisitors) weekSummary += `     예상 방문객 수: ${ref.estimatedVisitors}명\n`
            if (ref.pros?.trim()) weekSummary += `     배울 점: ${ref.pros}\n`
            if (ref.cons?.trim()) weekSummary += `     아쉬운 점: ${ref.cons}\n`
            weekHasData = true
          }
        })
      }
      
      if (data.swot) {
        const swot = data.swot
        if (swot.strength?.trim() || swot.weakness?.trim() || swot.opportunity?.trim() || swot.threat?.trim()) {
          weekSummary += `SWOT 분석:\n`
          if (swot.strength?.trim()) weekSummary += `  강점(S): ${swot.strength}\n`
          if (swot.weakness?.trim()) weekSummary += `  약점(W): ${swot.weakness}\n`
          if (swot.opportunity?.trim()) weekSummary += `  기회(O): ${swot.opportunity}\n`
          if (swot.threat?.trim()) weekSummary += `  위협(T): ${swot.threat}\n`
          weekHasData = true
        }
      }
    } else if (weekNum === 4 && (data.basicInfo || data.kpi || data.venue)) {
      weekSummary += `[4회차: 행사 개요 및 환경 분석]\n`
      
      if (data.basicInfo) {
        const bi = data.basicInfo
        if (bi.eventName?.trim()) {
          weekSummary += `행사명: ${bi.eventName}\n`
          weekHasData = true
        }
        if (bi.concept?.trim()) {
          weekSummary += `한 줄 컨셉: ${bi.concept}\n`
          weekHasData = true
        }
        if (bi.startDate && bi.endDate) {
          weekSummary += `기간: ${bi.startDate} ~ ${bi.endDate}\n`
          weekHasData = true
        }
        if (bi.operatingHours?.trim()) {
          weekSummary += `운영 시간: ${bi.operatingHours}\n`
          weekHasData = true
        }
      }
      
      if (data.kpi) {
        const kpi = data.kpi
        if (kpi.targetVisitors?.trim() || kpi.targetRevenue?.trim() || kpi.targetViral?.trim() || kpi.expectedEffect?.trim()) {
          weekSummary += `KPI 목표:\n`
          if (kpi.targetVisitors?.trim()) weekSummary += `  목표 방문객: ${kpi.targetVisitors}명\n`
          if (kpi.targetRevenue?.trim()) weekSummary += `  목표 매출: ${kpi.targetRevenue}만원\n`
          if (kpi.targetViral?.trim()) weekSummary += `  바이럴 목표: ${kpi.targetViral}\n`
          if (kpi.expectedEffect?.trim()) weekSummary += `  기대 효과: ${kpi.expectedEffect}\n`
          weekHasData = true
        }
      }
      
      if (data.venue) {
        const venue = data.venue
        if (venue.type || venue.area || venue.capacity || venue.budgetCap) {
          weekSummary += `장소 정보:\n`
          if (venue.type) weekSummary += `  공간 타입: ${venue.type}\n`
          if (venue.area) weekSummary += `  규모: ${venue.area}평\n`
          if (venue.capacity) weekSummary += `  수용 인원: ${venue.capacity}명\n`
          if (venue.budgetCap) weekSummary += `  총 예산: ${venue.budgetCap}만원\n`
          if (venue.constraints && Array.isArray(venue.constraints) && venue.constraints.length > 0) {
            weekSummary += `  물리적 제약: ${venue.constraints.join(', ')}\n`
          }
          weekHasData = true
        }
      }
    }

    if (weekHasData) {
      summary += weekSummary + `\n`
      hasData = true
    }
  })

  if (!hasData) {
    summary += `입력된 데이터가 없습니다.\n`
  }

  summary += `\n[최종 지시사항]\n\n`
  summary += `위 데이터를 바탕으로 다음 8단계 목차 구조를 준수하여 전문적인 사업기획서를 작성해주세요:\n\n`
  summary += `1. 행사 개요\n`
  summary += `   - 1회차 데이터(행사 유형, 핵심 목적, 트렌드 분석)를 활용하여 목적과 배경을 설득력 있게 서술\n`
  summary += `   - 행사의 필요성과 기대 효과를 명확히 제시\n\n`
  summary += `2. 기본 방향 및 컨셉\n`
  summary += `   - 4회차 데이터(행사명, 한 줄 컨셉)를 기반으로 핵심 컨셉 설명\n`
  summary += `   - 3회차 데이터(SWOT 분석, 레퍼런스 비교)를 활용하여 타 행사와의 차별화 포인트 제시\n\n`
  summary += `3. 세부 실행 계획\n`
  summary += `   - 4회차 데이터(기간, 운영 시간, 장소 정보)를 활용하여 시간대별/공간별 계획 상세 묘사\n`
  summary += `   - 구체적인 프로그램 흐름과 공간 배치를 텍스트로 설명\n\n`
  summary += `4. 운영 및 인력 계획\n`
  summary += `   - 행사 운영에 필요한 인력 규모와 역할(R&R) 정의\n`
  summary += `   - 필요한 시스템 및 장비 사양 제안\n\n`
  summary += `5. 홍보 및 마케팅\n`
  summary += `   - 1회차 트렌드 데이터와 4회차 바이럴 목표를 활용\n`
  summary += `   - 채널별(소셜미디어, 온라인, 오프라인 등) 상세 로드맵 제시\n\n`
  summary += `6. 예산 계획\n`
  summary += `   - 4회차 예산 데이터를 활용하여 항목별 예상 비용을 표(Table) 형태로 구성\n`
  summary += `   - 대분류(대관료, 제작비, 인건비 등)와 소분류 항목으로 체계화\n\n`
  summary += `7. 안전 및 리스크 관리\n`
  summary += `   - 4회차 물리적 제약사항을 반영한 안전 관리 방안\n`
  summary += `   - 예상 리스크와 대응 매뉴얼 작성 (안전사고, 날씨, 인력 부족 등)\n\n`
  summary += `8. 기대 효과\n`
  summary += `   - 4회차 KPI 목표(목표 방문객, 목표 매출, 기대 효과)를 활용\n`
  summary += `   - 정량적 지표와 정성적 성과를 모두 예측하여 제시\n\n`
  summary += `[문서 작성 형식]\n`
  summary += `- Word 문서 스타일로 작성\n`
  summary += `- A4 용지 2~3장 분량 (출력 기준)\n`
  summary += `- 명조체에 어울리는 격식 있는 문체(~함, ~임 등 개조식과 서술식 혼용)\n`
  summary += `- 비즈니스 전문 용어 사용\n`
  summary += `- 예산 계획은 반드시 표(Table) 형태로 작성\n\n`
  summary += `위 데이터를 분석하여 8단계 목차 구조를 준수한 전문적인 행사 사업기획서를 작성해주세요.`

  return summary
}

// 이벤트 워크북용 제안서 생성 함수 (전체 회차 기반, PPT 형태)
function generateEventProposal(
  steps: any[],
  projectTitle: string | null
): string {
  let summary = `행사 제안서 생성 프롬프트\n\n`
  summary += `[작업 지시]\n`
  summary += `당신은 행사 기획 전문가입니다. 아래 제공된 프로젝트 데이터를 분석하여, 이해관계자에게 행사를 효과적으로 설명할 수 있는 제안서 슬라이드(PPT 형태)를 만들어주세요.\n`
  summary += `사업기획서를 기반으로 구체적인 실행 방안을 담은 제안서 형식으로 작성해주세요.\n\n`
  summary += `각 슬라이드는 다음 형식으로 구성해주세요:\n`
  summary += `- 슬라이드 제목 (명확하고 간결하게)\n`
  summary += `- 핵심 내용 (불릿 포인트 또는 간단한 문단)\n`
  summary += `- 필요한 경우 시각화 제안 (차트, 다이어그램, 이미지 등)\n\n`
  summary += `[슬라이드 구성 (입력된 데이터에 따라 자동 조정)]\n\n`
  summary += `프로젝트명: ${projectTitle || '미정'}\n\n`
  summary += `[프로젝트 데이터]\n\n`

  // 입력된 데이터만 추출하여 추가 (기존 구현과 동일하지만 간략화)
  let hasData = false

  steps.forEach((step: any) => {
    const weekNum = step.step_number
    const data = step.step_data as any

    if (!data) return

    let weekSummary = ''
    let weekHasData = false

    // 각 회차별 데이터 추출 (기존 generateEventProposal과 동일한 로직)
    // 간략화된 버전으로 구현
    if (weekNum === 1 && data.eventCriteria) {
      weekSummary += `[1회차: 행사 방향성 설정 및 트렌드 헌팅]\n`
      if (data.eventCriteria?.type) weekSummary += `행사 유형: ${data.eventCriteria.type}\n`
      if (data.eventCriteria?.goals && Array.isArray(data.eventCriteria.goals) && data.eventCriteria.goals.length > 0) {
        weekSummary += `핵심 목적: ${data.eventCriteria.goals.join(', ')}\n`
      }
      if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
        weekSummary += `관심 키워드: ${data.keywords.join(', ')}\n`
      }
      if (data.trendLogs && Array.isArray(data.trendLogs) && data.trendLogs.length > 0) {
        weekSummary += `트렌드 데이터: ${data.trendLogs.length}건\n`
      }
      if (data.insightReport?.result?.trim()) {
        weekSummary += `트렌드 분석 리포트: 작성 완료\n`
      }
      weekHasData = true
    } else if (weekNum === 2 && data.personas) {
      weekSummary += `[2회차: 타겟 페르소나]\n`
      if (data.personas && Array.isArray(data.personas) && data.personas.length > 0) {
        weekSummary += `방문객 페르소나: ${data.personas.length}명\n`
        weekHasData = true
      }
    } else if (weekNum === 3 && (data.references || data.swot)) {
      weekSummary += `[3회차: 레퍼런스 벤치마킹 및 정량 분석]\n`
      if (data.references && Array.isArray(data.references) && data.references.length > 0) {
        weekSummary += `레퍼런스 행사: ${data.references.length}건\n`
      }
      if (data.swot && (data.swot.strength || data.swot.weakness || data.swot.opportunity || data.swot.threat)) {
        weekSummary += `SWOT 분석: 완료\n`
      }
      weekHasData = true
    } else if (weekNum === 4 && (data.basicInfo || data.kpi || data.venue)) {
      weekSummary += `[4회차: 행사 개요 및 환경 분석]\n`
      if (data.basicInfo?.eventName) weekSummary += `행사명: ${data.basicInfo.eventName}\n`
      if (data.basicInfo?.concept) weekSummary += `컨셉: ${data.basicInfo.concept}\n`
      if (data.kpi) weekSummary += `KPI 설정: 완료\n`
      if (data.venue) weekSummary += `장소 정보: 설정 완료\n`
      weekHasData = true
    } else if (weekNum === 5 && (data.themeKeywords || data.universe || data.viralTeasing)) {
      weekSummary += `[5회차: 세계관 및 스토리텔링]\n`
      if (data.themeKeywords && Array.isArray(data.themeKeywords) && data.themeKeywords.length > 0) {
        weekSummary += `테마 키워드: ${data.themeKeywords.join(', ')}\n`
      }
      if (data.universe) weekSummary += `세계관 설정: 완료\n`
      if (data.viralTeasing) weekSummary += `바이럴 티징: 완료\n`
      weekHasData = true
    } else if (weekNum === 6 && (data.booking || data.journey)) {
      weekSummary += `[6회차: 방문객 여정 지도]\n`
      if (data.booking) weekSummary += `사전 예약 프로세스: 설정 완료\n`
      if (data.journey?.steps && Array.isArray(data.journey.steps) && data.journey.steps.length > 0) {
        weekSummary += `여정 단계: ${data.journey.steps.length}단계\n`
      }
      weekHasData = true
    } else if (weekNum === 7 && (data.programs || data.viralTrigger)) {
      weekSummary += `[7회차: 킬러 콘텐츠 및 바이럴 기획]\n`
      if (data.programs && Array.isArray(data.programs) && data.programs.length > 0) {
        weekSummary += `프로그램: ${data.programs.length}개\n`
      }
      if (data.viralTrigger) weekSummary += `바이럴 트리거: 설정 완료\n`
      weekHasData = true
    } else if (weekNum === 8 && (data.zoning || data.budget)) {
      weekSummary += `[8회차: 마스터 플랜]\n`
      if (data.zoning?.zones && Array.isArray(data.zoning.zones) && data.zoning.zones.length > 0) {
        weekSummary += `공간 조닝: ${data.zoning.zones.length}개 구역\n`
      }
      if (data.budget) weekSummary += `예산 계획: 설정 완료\n`
      weekHasData = true
    } else if (weekNum === 9 && (data.visualIdentity || data.goodsLineup)) {
      weekSummary += `[9회차: 행사 브랜딩 기획]\n`
      if (data.visualIdentity) weekSummary += `비주얼 아이덴티티: 설정 완료\n`
      if (data.goodsLineup && Array.isArray(data.goodsLineup) && data.goodsLineup.length > 0) {
        weekSummary += `굿즈 라인업: ${data.goodsLineup.length}개\n`
      }
      weekHasData = true
    } else if (weekNum === 10 && (data.atmosphere || data.zones)) {
      weekSummary += `[10회차: 공간 연출 기획]\n`
      if (data.atmosphere) weekSummary += `공간 무드 설정: 완료\n`
      if (data.zones && Array.isArray(data.zones) && data.zones.length > 0) {
        weekSummary += `구역별 연출: ${data.zones.length}개 구역\n`
      }
      weekHasData = true
    } else if (weekNum === 11 && (data.projectSchedule || data.timeline || data.cueSheet)) {
      weekSummary += `[11회차: D-Day 통합 실행 계획]\n`
      if (data.projectSchedule) weekSummary += `프로젝트 기간: 설정 완료\n`
      if (data.timeline) weekSummary += `타임라인: 설정 완료\n`
      if (data.cueSheet) weekSummary += `큐시트: 설정 완료\n`
      weekHasData = true
    } else if (weekNum === 12 && (data.usps || data.benefits || data.successMetrics)) {
      weekSummary += `[12회차: 최종 제안 및 소구 포인트 도출]\n`
      if (data.usps && Array.isArray(data.usps) && data.usps.length > 0) {
        weekSummary += `핵심 소구 포인트: ${data.usps.length}개\n`
      }
      if (data.benefits) weekSummary += `타겟별 혜택: 설정 완료\n`
      if (data.successMetrics) weekSummary += `성공 시나리오: 작성 완료\n`
      weekHasData = true
    }

    if (weekHasData) {
      summary += weekSummary + `\n`
      hasData = true
    }
  })

  if (!hasData) {
    summary += `입력된 데이터가 없습니다.\n`
  }

  summary += `\n[최종 지시사항]\n\n`
  summary += `위 데이터를 바탕으로 다음을 수행해주세요:\n\n`
  summary += `1. 입력된 데이터만을 기반으로 행사 제안서 슬라이드를 생성하세요.\n`
  summary += `2. 각 회차별 핵심 내용을 요약하여 슬라이드에 배치하세요.\n`
  summary += `3. 데이터 간의 논리적 흐름을 파악하여 스토리텔링 구조를 만드세요.\n`
  summary += `   (예: 행사 목적 → 타겟 분석 → 레퍼런스 벤치마킹 → 행사 개요 → 세계관 → 여정 설계 → 콘텐츠 기획 → 마스터 플랜 → 브랜딩 → 실행 계획 → 최종 제안)\n`
  summary += `4. 각 슬라이드에 제목, 핵심 내용(불릿 포인트), 그리고 필요한 경우 시각화 제안을 포함하세요.\n`
  summary += `5. 구체적인 수치, 통계, 목표 등을 적극 활용하여 신뢰성을 높이세요.\n`
  summary += `6. 전문적이지만 이해하기 쉬운 문체를 사용하세요.\n`
  summary += `7. 입력되지 않은 항목은 무시하고, 입력된 데이터만 기반으로 슬라이드를 구성하세요.\n`
  summary += `8. 사업기획서를 기반으로 구체적인 실행 방안을 담은 제안서 형식으로 작성하세요.\n\n`
  summary += `위 데이터를 분석하여 행사 제안서 슬라이드를 생성해주세요.`

  return summary
}
