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
        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', projectId)
          .order('step_number', { ascending: true })

        if (!steps || steps.length === 0) {
          return null
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
