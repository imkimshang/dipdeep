/**
 * 행사 제안서 자동 생성 API
 * 
 * 추후 적용: AI 슬라이드 생성 API와 연동하여 자동으로 제안서를 생성하는 엔드포인트
 * 
 * 사용 방법:
 * - POST /api/event-proposal/generate
 * - Body: { projectId: string, summaryType: 'business-plan' | 'proposal' }
 * 
 * 반환:
 * - 생성된 슬라이드 데이터 또는 다운로드 링크
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { projectId, summaryType } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 프로젝트 데이터 조회
    const { data: project } = await supabase
      .from('projects')
      .select('type, title')
      .eq('id', projectId)
      .single()

    if (!project || project.type !== 'event') {
      return NextResponse.json(
        { error: '행사/이벤트 프로젝트가 아닙니다.' },
        { status: 400 }
      )
    }

    // 워크북 데이터 조회
    const { data: steps } = await supabase
      .from('project_steps')
      .select('*')
      .eq('project_id', projectId)
      .order('step_number', { ascending: true })

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { error: '워크북 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // TODO: AI 슬라이드 생성 API 연동
    // 예시:
    // const slideData = await callAISlideGenerationAPI({
    //   projectData: steps,
    //   projectTitle: project.title,
    //   summaryType: summaryType
    // })

    return NextResponse.json({
      success: false,
      message: '이 기능은 아직 준비 중입니다.',
      // 추후 반환 예정:
      // slides: slideData,
      // downloadUrl: 'https://...',
    })
  } catch (error: any) {
    console.error('제안서 생성 오류:', error)
    return NextResponse.json(
      { error: '제안서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

