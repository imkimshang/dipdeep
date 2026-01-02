import { useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useProjectSummary() {
  const supabase = createClient()

  const generateSummary = useCallback(
    async (
      projectId: string,
      projectTitle: string | null
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
          return generateEventSummary(steps, projectTitle)
        }

        // 서비스 기획 제안서 슬라이드 생성 프롬프트
        let summary = `서비스 기획 제안서 슬라이드 생성 프롬프트\n\n`
        summary += `[사용 방법]\n`
        summary += `아래 전체 프롬프트를 NotebookLM, Genspark, Gamma, Pitch 등의 슬라이드 생성 서비스에 복사하여 붙여넣으세요.\n`
        summary += `AI가 자동으로 전문적인 서비스 기획 제안서 슬라이드를 생성해줍니다.\n\n`
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

        // 각 회차별 데이터 상세 추출
        steps.forEach((step: any) => {
          const weekNum = step.step_number
          const data = step.step_data as any

          summary += `[${weekNum}회차]\n`
          
          if (!data) {
            summary += `데이터 없음\n\n`
            return
          }

          // 회차별 상세 데이터 추출
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
      } catch (error: any) {
        console.error('요약 생성 오류:', error)
        return null
      }
    },
    [supabase]
  )

  return { generateSummary }
}

// 이벤트 워크북용 요약 생성 함수
function generateEventSummary(
  steps: any[],
  projectTitle: string | null
): string {
  let summary = `행사 기획서 생성 프롬프트\n\n`
  summary += `[사용 방법]\n`
  summary += `아래 전체 프롬프트를 NotebookLM, Genspark, Gamma, Pitch 등의 슬라이드 생성 서비스에 복사하여 붙여넣으세요.\n`
  summary += `AI가 자동으로 전문적인 행사 기획서 슬라이드를 생성해줍니다.\n\n`
  summary += `[작업 지시]\n`
  summary += `당신은 행사 기획 전문가입니다. 아래 제공된 프로젝트 데이터를 분석하여, 이해관계자에게 행사를 효과적으로 설명할 수 있는 기획서 슬라이드를 만들어주세요.\n\n`
  summary += `각 슬라이드는 다음 형식으로 구성해주세요:\n`
  summary += `- 슬라이드 제목 (명확하고 간결하게)\n`
  summary += `- 핵심 내용 (불릿 포인트 또는 간단한 문단)\n`
  summary += `- 필요한 경우 시각화 제안 (차트, 다이어그램, 이미지 등)\n\n`
  summary += `[슬라이드 구성 (입력된 데이터에 따라 자동 조정)]\n\n`
  summary += `프로젝트명: ${projectTitle || '미정'}\n\n`
  summary += `[프로젝트 데이터]\n\n`

  // 입력된 데이터만 추출하여 추가
  let hasData = false

  steps.forEach((step: any) => {
    const weekNum = step.step_number
    const data = step.step_data as any

    if (!data) return

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
      
      if (data.insightResult && data.insightResult.trim()) {
        weekSummary += `트렌드 분석 리포트:\n${data.insightResult}\n`
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
    } else if (weekNum === 5 && (data.themeKeywords || data.universe || data.viralTeasing)) {
      weekSummary += `[5회차: 세계관 및 스토리텔링]\n`
      
      if (data.themeKeywords && Array.isArray(data.themeKeywords) && data.themeKeywords.length > 0) {
        weekSummary += `테마 키워드: ${data.themeKeywords.join(', ')}\n`
        weekHasData = true
      }
      
      if (data.universe) {
        const uni = data.universe
        if (uni.concept?.trim() || uni.portal?.trim() || uni.journey?.trim() || uni.character?.trim()) {
          weekSummary += `세계관:\n`
          if (uni.concept?.trim()) weekSummary += `  컨셉: ${uni.concept}\n`
          if (uni.portal?.trim()) weekSummary += `  입구 연출: ${uni.portal}\n`
          if (uni.journey?.trim()) weekSummary += `  여정: ${uni.journey}\n`
          if (uni.character?.trim()) weekSummary += `  캐릭터/오브제: ${uni.character}\n`
          weekHasData = true
        }
      }
      
      if (data.viralTeasing) {
        const vt = data.viralTeasing
        if (vt.targetEmotion && Array.isArray(vt.targetEmotion) && vt.targetEmotion.length > 0) {
          weekSummary += `바이럴 티징 타겟 감정: ${vt.targetEmotion.join(', ')}\n`
          weekHasData = true
        }
        if (vt.phase1?.trim() || vt.phase2?.trim() || vt.phase3?.trim()) {
          weekSummary += `바이럴 티징 시나리오:\n`
          if (vt.phase1?.trim()) weekSummary += `  Phase 1 (의문/호기심): ${vt.phase1}\n`
          if (vt.phase2?.trim()) weekSummary += `  Phase 2 (단서/공개): ${vt.phase2}\n`
          if (vt.phase3?.trim()) weekSummary += `  Phase 3 (확신/행동): ${vt.phase3}\n`
          weekHasData = true
        }
      }
    } else if (weekNum === 6 && (data.booking || data.journey || data.selfCheck)) {
      weekSummary += `[6회차: 방문객 여정 지도]\n`
      
      if (data.booking) {
        const booking = data.booking
        if (booking.requiresBooking !== undefined) {
          weekSummary += `사전 예약: ${booking.requiresBooking ? '필요' : '불필요'}\n`
          weekHasData = true
        }
        if (booking.channel && Array.isArray(booking.channel) && booking.channel.length > 0) {
          weekSummary += `예약 채널: ${booking.channel.join(', ')}\n`
          weekHasData = true
        }
        if (booking.flow && Array.isArray(booking.flow) && booking.flow.length > 0) {
          weekSummary += `신청 흐름 (${booking.flow.length}단계):\n`
          booking.flow.forEach((flow: any, idx: number) => {
            if (flow.title || flow.description) {
              weekSummary += `  ${idx + 1}. ${flow.title || ''}: ${flow.description || ''}\n`
              if (flow.friction?.trim()) weekSummary += `     이탈 요인: ${flow.friction}\n`
              weekHasData = true
            }
          })
        }
      }
      
      if (data.journey && data.journey.steps && Array.isArray(data.journey.steps) && data.journey.steps.length > 0) {
        weekSummary += `방문객 여정 (${data.journey.steps.length}단계):\n`
        data.journey.steps.forEach((step: any, idx: number) => {
          if (step.label || step.action) {
            weekSummary += `  ${idx + 1}. ${step.label || ''}: ${step.action || ''}\n`
            if (step.emotion) weekSummary += `     감정: ${step.emotion}\n`
            if (step.touchpoint) weekSummary += `     접점: ${step.touchpoint}\n`
            if (step.duration) weekSummary += `     체류 시간: ${step.duration}\n`
            if (step.isBottleneck) {
              weekSummary += `     [병목 구간]\n`
              if (step.selectedSolutions && Array.isArray(step.selectedSolutions) && step.selectedSolutions.length > 0) {
                weekSummary += `       해결 방안: ${step.selectedSolutions.join(', ')}\n`
              }
              if (step.customSolution?.trim()) {
                weekSummary += `       기타 해결 방안: ${step.customSolution}\n`
              }
            }
            weekHasData = true
          }
        })
      }
      
      if (data.selfCheck) {
        const sc = data.selfCheck
        if (sc.consistency?.trim() || sc.convenience?.trim() || sc.experience?.trim() || sc.closing?.trim()) {
          weekSummary += `기획 가이드 (Self-Check):\n`
          if (sc.consistency?.trim()) {
            weekSummary += `  일관성: ${sc.consistency}\n`
            weekHasData = true
          }
          if (sc.convenience?.trim()) {
            weekSummary += `  편의성: ${sc.convenience}\n`
            weekHasData = true
          }
          if (sc.experience?.trim()) {
            weekSummary += `  경험 관리: ${sc.experience}\n`
            weekHasData = true
          }
          if (sc.closing?.trim()) {
            weekSummary += `  마무리: ${sc.closing}\n`
            weekHasData = true
          }
        }
      }
    } else if (weekNum === 7 && (data.programs || data.viralTrigger)) {
      weekSummary += `[7회차: 킬러 콘텐츠 및 바이럴 기획]\n`
      
      if (data.programs && Array.isArray(data.programs) && data.programs.length > 0) {
        weekSummary += `프로그램 (${data.programs.length}개):\n`
        data.programs.forEach((prog: any, idx: number) => {
          if (prog.name) {
            weekSummary += `  ${idx + 1}. ${prog.name} [${prog.category || '기타'}]\n`
            if (prog.description?.trim()) weekSummary += `     설명: ${prog.description}\n`
            if (prog.operation?.trim()) weekSummary += `     운영 방식: ${prog.operation}\n`
            if (prog.targetEmotion?.trim()) weekSummary += `     목표 감정: ${prog.targetEmotion}\n`
            weekHasData = true
          }
        })
      }
      
      if (data.viralTrigger) {
        const vt = data.viralTrigger
        if (vt.photoZone) {
          const pz = vt.photoZone
          if (pz.visualConcept?.trim() || pz.why?.trim()) {
            weekSummary += `인증샷 스팟:\n`
            if (pz.visualConcept?.trim()) weekSummary += `  비주얼 컨셉: ${pz.visualConcept}\n`
            if (pz.why?.trim()) weekSummary += `  촬영 동기: ${pz.why}\n`
            weekHasData = true
          }
        }
        
        if (vt.viralEvent) {
          const ve = vt.viralEvent
          if (ve.mission?.trim() || ve.reward?.trim()) {
            weekSummary += `바이럴 이벤트:\n`
            if (ve.mission?.trim()) weekSummary += `  미션: ${ve.mission}\n`
            if (ve.reward?.trim()) weekSummary += `  리워드: ${ve.reward}\n`
            weekHasData = true
          }
        }
      }
      
      if (data.aiIdeation) {
        const ai = data.aiIdeation
        if (ai.result?.trim()) {
          weekSummary += `AI 아이데이션 결과:\n${ai.result}\n`
          weekHasData = true
        }
      }
    } else if (weekNum === 8 && (data.zoning || data.budget)) {
      weekSummary += `[8회차: 마스터 플랜]\n`
      
      if (data.zoning && data.zoning.zones && Array.isArray(data.zoning.zones) && data.zoning.zones.length > 0) {
        weekSummary += `공간 조닝 (${data.zoning.zones.length}개 구역):\n`
        data.zoning.zones.forEach((zone: any) => {
          if (zone.zoneName || zone.zoneLabel) {
            weekSummary += `  ${zone.zoneName || ''}: ${zone.zoneLabel || ''}\n`
            if (zone.assignedPrograms && Array.isArray(zone.assignedPrograms) && zone.assignedPrograms.length > 0) {
              weekSummary += `     배치 프로그램: ${zone.assignedPrograms.length}개\n`
            }
            if (zone.notes?.trim()) weekSummary += `     메모: ${zone.notes}\n`
            weekHasData = true
          }
        })
      }
      
      if (data.budget) {
        const budget = data.budget
        if (budget.totalCap) {
          weekSummary += `예산 상한선: ${budget.totalCap}만원\n`
          weekHasData = true
        }
        if (budget.items && Array.isArray(budget.items) && budget.items.length > 0) {
          const total = budget.items.reduce((sum: number, item: any) => {
            const amount = parseFloat(item.amount?.replace(/,/g, '') || '0')
            return sum + amount
          }, 0)
          weekSummary += `상세 예산 계획 (총 ${total.toLocaleString()}만원):\n`
          
          // 대분류별로 그룹화
          const categoryGroups: { [key: string]: any[] } = {}
          budget.items.forEach((item: any) => {
            if (item.category && item.itemName?.trim()) {
              if (!categoryGroups[item.category]) {
                categoryGroups[item.category] = []
              }
              categoryGroups[item.category].push(item)
            }
          })
          
          // 각 대분류별 상세 항목 출력
          Object.entries(categoryGroups).forEach(([category, items]) => {
            const categoryTotal = items.reduce((sum: number, item: any) => {
              const amount = parseFloat(item.amount?.replace(/,/g, '') || '0')
              return sum + amount
            }, 0)
            weekSummary += `  [${category}] (소계: ${categoryTotal.toLocaleString()}만원)\n`
            items.forEach((item: any) => {
              if (item.itemName?.trim()) {
                weekSummary += `    - ${item.itemName}`
                if (item.unitPrice?.trim() && item.quantity?.trim()) {
                  weekSummary += ` (단가: ${item.unitPrice}만원 × 수량: ${item.quantity})`
                }
                if (item.amount?.trim()) {
                  weekSummary += ` = ${item.amount}만원`
                }
                weekSummary += `\n`
                if (item.notes?.trim()) {
                  weekSummary += `      비고: ${item.notes}\n`
                }
              }
            })
            weekHasData = true
          })
          
          // 예산 현황 요약
          const cap = parseFloat(budget.totalCap?.replace(/,/g, '') || '0')
          const balance = cap - total
          weekSummary += `  예산 현황:\n`
          weekSummary += `    총 예산 상한선: ${cap.toLocaleString()}만원\n`
          weekSummary += `    현재 합계: ${total.toLocaleString()}만원\n`
          weekSummary += `    잔액: ${balance >= 0 ? balance.toLocaleString() : '초과 ' + Math.abs(balance).toLocaleString()}만원\n`
        }
      }
    } else if (weekNum === 9 && (data.visualIdentity || data.goodsLineup)) {
      weekSummary += `[9회차: 행사 브랜딩 기획]\n`
      
      if (data.visualIdentity) {
        const vi = data.visualIdentity
        if (vi.colors) {
          if (vi.colors.primary || (vi.colors.secondary && Array.isArray(vi.colors.secondary) && vi.colors.secondary.length > 0)) {
            weekSummary += `컬러 시스템:\n`
            if (vi.colors.primary) weekSummary += `  주조색: ${vi.colors.primary}\n`
            if (vi.colors.secondary && Array.isArray(vi.colors.secondary) && vi.colors.secondary.length > 0) {
              weekSummary += `  보조색: ${vi.colors.secondary.join(', ')}\n`
            }
            weekHasData = true
          }
        }
        if (vi.typography && Array.isArray(vi.typography) && vi.typography.length > 0) {
          weekSummary += `타이포그래피 무드: ${vi.typography.join(', ')}\n`
          weekHasData = true
        }
        if (vi.graphicMotifs && Array.isArray(vi.graphicMotifs) && vi.graphicMotifs.length > 0) {
          weekSummary += `그래픽 모티브: ${vi.graphicMotifs.length}개\n`
          weekHasData = true
        }
      }
      
      if (data.goodsLineup && Array.isArray(data.goodsLineup) && data.goodsLineup.length > 0) {
        weekSummary += `굿즈 라인업 (${data.goodsLineup.length}개):\n`
        data.goodsLineup.forEach((item: any, idx: number) => {
          if (item.itemName || item.category) {
            weekSummary += `  ${idx + 1}. [${item.category || '기타'}] ${item.itemName || '이름없음'}\n`
            if (item.selectedStyles && Array.isArray(item.selectedStyles) && item.selectedStyles.length > 0) {
              weekSummary += `     스타일: ${item.selectedStyles.length}개 선택\n`
            }
            if (item.productionSpec?.trim()) {
              weekSummary += `     제작 사양: ${item.productionSpec}\n`
            }
            if (item.planningIntent?.trim()) {
              weekSummary += `     기획 의도: ${item.planningIntent}\n`
            }
            weekHasData = true
          }
        })
      }
    } else if (weekNum === 10 && (data.atmosphere || data.zones || data.brief)) {
      weekSummary += `[10회차: 공간 연출 기획]\n`
      
      if (data.atmosphere) {
        const atm = data.atmosphere
        if (atm.lightingStyles && Array.isArray(atm.lightingStyles) && atm.lightingStyles.length > 0) {
          weekSummary += `조명 스타일: ${atm.lightingStyles.length}개 선택\n`
          weekHasData = true
        }
        if (atm.materialTextures && Array.isArray(atm.materialTextures) && atm.materialTextures.length > 0) {
          weekSummary += `마감재 텍스처: ${atm.materialTextures.length}개 선택\n`
          weekHasData = true
        }
        if (atm.spatialKeywords && Array.isArray(atm.spatialKeywords) && atm.spatialKeywords.length > 0) {
          weekSummary += `공간감 키워드: ${atm.spatialKeywords.join(', ')}\n`
          weekHasData = true
        }
      }
      
      if (data.zones && Array.isArray(data.zones) && data.zones.length > 0) {
        weekSummary += `구역별 연출 (${data.zones.length}개 구역):\n`
        data.zones.forEach((zone: any) => {
          if (zone.zoneName || zone.zoneLabel) {
            weekSummary += `  ${zone.zoneName || '구역'}: ${zone.zoneLabel || ''}\n`
            if (zone.entranceStyle && Array.isArray(zone.entranceStyle) && zone.entranceStyle.length > 0) {
              weekSummary += `     입구 스타일: ${zone.entranceStyle.length}개 선택\n`
            }
            if (zone.boothFixtures && Array.isArray(zone.boothFixtures) && zone.boothFixtures.length > 0) {
              weekSummary += `     부스/집기: ${zone.boothFixtures.length}개 선택\n`
            }
            if (zone.decorativeElements && Array.isArray(zone.decorativeElements) && zone.decorativeElements.length > 0) {
              weekSummary += `     장식 요소: ${zone.decorativeElements.length}개 선택\n`
            }
            if (zone.notes?.trim()) {
              weekSummary += `     연출 의도: ${zone.notes}\n`
            }
            if (zone.requiredFixtures?.trim()) {
              weekSummary += `     필요 집기: ${zone.requiredFixtures}\n`
            }
            weekHasData = true
          }
        })
      }
      
      if (data.brief) {
        const brief = data.brief
        if (brief.constructionConstraints && Array.isArray(brief.constructionConstraints) && brief.constructionConstraints.length > 0) {
          weekSummary += `시공/설치 제약사항: ${brief.constructionConstraints.join(', ')}\n`
          weekHasData = true
        }
        if (brief.flowPlanSummary?.trim()) {
          weekSummary += `동선 계획: ${brief.flowPlanSummary}\n`
          weekHasData = true
        }
      }
    } else if (weekNum === 11 && (data.projectSchedule || data.timeline || data.cueSheet || data.postEvent)) {
      weekSummary += `[11회차: D-Day 통합 실행 계획]\n`
      
      if (data.projectSchedule) {
        const ps = data.projectSchedule
        if (ps.kickOff || ps.dDay || ps.wrapUp) {
          weekSummary += `프로젝트 기간:\n`
          if (ps.kickOff) weekSummary += `  준비 시작일: ${ps.kickOff}\n`
          if (ps.dDay) weekSummary += `  행사 당일: ${ps.dDay}\n`
          if (ps.wrapUp) weekSummary += `  프로젝트 종료일: ${ps.wrapUp}\n`
          weekHasData = true
        }
      }
      
      if (data.timeline && Array.isArray(data.timeline) && data.timeline.length > 0) {
        weekSummary += `D-Day 통합 타임라인:\n`
        data.timeline.forEach((phase: any) => {
          if (phase.phase && phase.tasks && Array.isArray(phase.tasks) && phase.tasks.length > 0) {
            const completedTasks = phase.tasks.filter((t: any) => t.completed).length
            weekSummary += `  ${phase.phase}: ${phase.tasks.length}개 과업 (완료: ${completedTasks}개)\n`
            phase.tasks.forEach((task: any) => {
              if (task.task?.trim()) {
                weekSummary += `    - [${task.part || '일반'}] ${task.task}${task.completed ? ' ✓' : ''}\n`
                if (task.memo?.trim()) {
                  weekSummary += `      메모: ${task.memo}\n`
                }
              }
            })
            weekHasData = true
          }
        })
      }
      
      if (data.cueSheet && Array.isArray(data.cueSheet) && data.cueSheet.length > 0) {
        weekSummary += `행사 당일 큐시트 (${data.cueSheet.length}개 항목):\n`
        data.cueSheet.forEach((row: any, idx: number) => {
          if (row.time || row.program) {
            weekSummary += `  ${idx + 1}. ${row.time || ''} (${row.duration || ''}) - ${row.program || ''}\n`
            if (row.audioVisual?.trim()) {
              weekSummary += `     기술: ${row.audioVisual}\n`
            }
            if (row.staff?.trim()) {
              weekSummary += `     운영: ${row.staff}\n`
            }
            weekHasData = true
          }
        })
      }
      
      if (data.postEvent) {
        const pe = data.postEvent
        if (pe.teardown && Array.isArray(pe.teardown) && pe.teardown.length > 0) {
          const completedTeardown = pe.teardown.filter((c: boolean) => c).length
          if (completedTeardown > 0) {
            weekSummary += `사후 관리 - 철수 및 원상복구: ${completedTeardown}/${pe.teardown.length} 완료\n`
            weekHasData = true
          }
        }
        if (pe.settlement && Array.isArray(pe.settlement) && pe.settlement.length > 0) {
          const completedSettlement = pe.settlement.filter((c: boolean) => c).length
          if (completedSettlement > 0) {
            weekSummary += `사후 관리 - 정산 및 행정: ${completedSettlement}/${pe.settlement.length} 완료\n`
            weekHasData = true
          }
        }
        if (pe.dataFeedback && Array.isArray(pe.dataFeedback) && pe.dataFeedback.length > 0) {
          const completedDataFeedback = pe.dataFeedback.filter((c: boolean) => c).length
          if (completedDataFeedback > 0) {
            weekSummary += `사후 관리 - 데이터 및 피드백: ${completedDataFeedback}/${pe.dataFeedback.length} 완료\n`
            weekHasData = true
          }
        }
      }
    } else if (weekNum === 12 && (data.usps || data.benefits || data.successMetrics)) {
      weekSummary += `[12회차: 최종 제안 및 소구 포인트 도출]\n`
      
      if (data.usps && Array.isArray(data.usps) && data.usps.length > 0) {
        const validUsps = data.usps.filter((usp: any) => usp.keyword?.trim() && usp.description?.trim())
        if (validUsps.length > 0) {
          weekSummary += `핵심 소구 포인트 (${validUsps.length}개):\n`
          validUsps.forEach((usp: any, idx: number) => {
            weekSummary += `  ${idx + 1}. ${usp.keyword || ''}\n`
            weekSummary += `     ${usp.description || ''}\n`
            if (usp.imageUrl?.trim()) {
              weekSummary += `     이미지: ${usp.imageUrl}\n`
            }
            weekHasData = true
          })
        }
      }
      
      if (data.benefits) {
        const benefits = data.benefits
        if (benefits.functional && Array.isArray(benefits.functional) && benefits.functional.length > 0) {
          const validFunctional = benefits.functional.filter((b: string) => b?.trim())
          if (validFunctional.length > 0) {
            weekSummary += `기능적 혜택:\n`
            validFunctional.forEach((benefit: string) => {
              if (benefit.trim()) {
                weekSummary += `  - ${benefit}\n`
                weekHasData = true
              }
            })
          }
        }
        if (benefits.emotional && Array.isArray(benefits.emotional) && benefits.emotional.length > 0) {
          const validEmotional = benefits.emotional.filter((b: string) => b?.trim())
          if (validEmotional.length > 0) {
            weekSummary += `정서적 혜택:\n`
            validEmotional.forEach((benefit: string) => {
              if (benefit.trim()) {
                weekSummary += `  - ${benefit}\n`
                weekHasData = true
              }
            })
          }
        }
      }
      
      if (data.successMetrics) {
        const sm = data.successMetrics
        if (sm.goalScenario?.trim()) {
          weekSummary += `Goal 달성 시나리오:\n${sm.goalScenario}\n`
          weekHasData = true
        }
        if (sm.rippleEffect?.trim()) {
          weekSummary += `파급 효과:\n${sm.rippleEffect}\n`
          weekHasData = true
        }
        if (sm.lastPitching?.trim()) {
          weekSummary += `최종 설득 문구:\n${sm.lastPitching}\n`
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
  summary += `위 데이터를 바탕으로 다음을 수행해주세요:\n\n`
  summary += `1. 입력된 데이터만을 기반으로 행사 기획서 슬라이드를 생성하세요.\n`
  summary += `2. 각 회차별 핵심 내용을 요약하여 슬라이드에 배치하세요.\n`
  summary += `3. 데이터 간의 논리적 흐름을 파악하여 스토리텔링 구조를 만드세요.\n`
  summary += `   (예: 행사 목적 → 타겟 분석 → 레퍼런스 벤치마킹 → 행사 개요 → 세계관 → 여정 설계 → 콘텐츠 기획 → 마스터 플랜 → 브랜딩)\n`
  summary += `4. 각 슬라이드에 제목, 핵심 내용(불릿 포인트), 그리고 필요한 경우 시각화 제안을 포함하세요.\n`
  summary += `5. 구체적인 수치, 통계, 목표 등을 적극 활용하여 신뢰성을 높이세요.\n`
  summary += `6. 전문적이지만 이해하기 쉬운 문체를 사용하세요.\n`
  summary += `7. 입력되지 않은 항목은 무시하고, 입력된 데이터만 기반으로 슬라이드를 구성하세요.\n\n`
  summary += `위 데이터를 분석하여 행사 기획서 슬라이드를 생성해주세요.`

  return summary
}
