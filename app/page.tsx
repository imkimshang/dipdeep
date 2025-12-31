import Link from 'next/link'
import { ArrowRight, Sparkles, Target, BarChart3, Zap, TrendingUp, Rocket, FileText } from 'lucide-react'
import { InteractiveHeroBackground } from '@/components/InteractiveHeroBackground'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/10 via-indigo-50/30 to-blue-50/20" />
        <InteractiveHeroBackground />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24 lg:py-32 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 mb-4 sm:mb-5 md:mb-6 tracking-tight leading-tight sm:leading-tight">
              기획의 본질은 논리입니다.
              <br className="hidden sm:block" />
              <span className="block sm:inline">
                <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  AI로 당신의 기획력을
                </span>
              </span>
              <br />
              높여주는 12개의 워크북
              <br />
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold inline-block animate-shimmer bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-blue-500 bg-[length:300%_auto] bg-clip-text text-transparent mt-2 sm:mt-3">
                D.I.P Deep
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed font-light px-4 sm:px-0">
              AI와 데이터를 활용해 아이디어의 파편을 단단한 논리 구조로 전환하는 3단계 기술
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 md:mb-20 px-4 sm:px-0">
              <Link
                href="/login"
                className="btn-primary group shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 text-base sm:text-lg w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-center"
              >
                프로젝트 시작하기
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login?mode=signup"
                className="btn-secondary text-base sm:text-lg w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-center"
              >
                회원가입
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-2xl mx-auto px-4 sm:px-0">
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">12회</div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">논리 고도화</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">3단계</div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-tight">Data → Insight<br className="hidden sm:block" /> → Prototype</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">12개</div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">전략적 무기(Output)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4 tracking-tight leading-tight">
                기획 전문가를 위한<br className="hidden sm:block" />3가지 핵심 레버리지
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto mt-3 sm:mt-4 px-4 sm:px-0">
                기획자의 잠재력을 AI로 레버리지하여 설득력과 실행력을 동시에 확보합니다
              </p>
            </div>

            {/* Core Values Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Value 1: Strategic AI-Leap */}
              <div className="card card-hover p-6 sm:p-8 border border-slate-200">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-indigo-500/20">
                  <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                  Strategic AI-Leap
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  AI를 가장 영리하게 활용해 기획의 생산성과 깊이를 동시에 확보하는 프로세스. 단순 도구가 아닌 전략적 파트너로 AI를 다루어 기획의 밀도를 높입니다.
                </p>
              </div>

              {/* Value 2: Data-Backed Logic */}
              <div className="card card-hover p-6 sm:p-8 border border-slate-200">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-blue-500/20">
                  <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                  Data-Backed Logic
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  막연한 주장이 아닌, 공공데이터와 팩트체크로 무장하여 반박 불가능한 논리 구축. 감이 아닌 데이터로, 추측이 아닌 사실로 설득력을 확보합니다.
                </p>
              </div>

              {/* Value 3: High-Impact Persuasion */}
              <div className="card card-hover p-6 sm:p-8 border border-slate-200 sm:col-span-2 lg:col-span-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-indigo-500/20">
                  <Target className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                  High-Impact Persuasion
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  시각화와 로지컬 라이팅으로 완성되는, 의사결정권자를 움직이는 압도적인 설득력. 논리적 근거와 명확한 시각화로 설득의 수준을 한 단계 높입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Journey Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4 tracking-tight">
                12번의 논리 고도화
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4 sm:px-0 leading-relaxed">
                Data → Insight → Prototype으로 이어지는 3단계 Phase.<br className="hidden sm:block" />
                매 회차가 끝날 때마다 기획자가 즉시 실무에 활용할 수 있는 <span className="font-semibold">전략적 무기(Output)</span>가 하나씩 완성됩니다.
              </p>
            </div>

            <div className="space-y-8 sm:space-y-10 md:space-y-12">
              {/* Phase 1: Data */}
              <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-2xl sm:text-3xl font-bold text-white">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Phase 1: Data</h3>
                    <span className="px-2 sm:px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full w-fit">
                      4회차 · 전략적 무기 #1~#4
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
                    문제 발견, 데이터 탐색, 페르소나 설정, 문제 정의. 공공데이터와 사용자 데이터를 바탕으로 명확한 문제 정의와 근거 있는 페르소나를 완성합니다. 각 회차마다 데이터 기반의 기획 근거를 구축합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">문제 발견</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">데이터 탐색</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">페르소나</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">문제 정의</span>
                  </div>
                </div>
              </div>

              {/* Phase 2: Insight */}
              <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="text-2xl sm:text-3xl font-bold text-white">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Phase 2: Insight</h3>
                    <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full w-fit">
                      4회차 · 전략적 무기 #5~#8
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
                    사용자 여정 분석, HMW 질문 도출, 아이디어 브레인스토밍, 구조 설계. 데이터에서 인사이트를 도출하고 논리적 해결책을 설계합니다. 각 회차마다 실행 가능한 전략을 완성합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">사용자 여정</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">HMW 질문</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">아이디어</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">구조 설계</span>
                  </div>
                </div>
              </div>

              {/* Phase 3: Prototype */}
              <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-2xl sm:text-3xl font-bold text-white">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Phase 3: Prototype</h3>
                    <span className="px-2 sm:px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full w-fit">
                      4회차 · 전략적 무기 #9~#12
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
                    요구사항 정의, 브랜딩, UI/UX 설계, 프로토타입 구현 및 검증. 논리를 시각화하고 검증 가능한 프로토타입으로 완성하여 최종 설득력을 확보합니다. 각 회차마다 즉시 활용 가능한 결과물을 완성합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">요구사항</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">브랜딩</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">UI/UX</span>
                    <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-lg font-medium">검증</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Rocket className="w-12 h-12 sm:w-14 sm:h-16 text-white mx-auto mb-4 sm:mb-6 opacity-90" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight px-4 sm:px-0">
              12회 빌드업을 시작하세요
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-indigo-100 mb-8 sm:mb-10 leading-relaxed px-4 sm:px-0">
              상상은 자유롭게, 논리는 빈틈없이.<br className="hidden sm:block" />
              기획자를 위한 실전 워크스페이스가 당신을 기다립니다.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-900 rounded-full font-semibold text-base sm:text-lg hover:bg-gray-100 active:scale-95 transition-all duration-200 shadow-xl shadow-black/20 mx-4 sm:mx-0"
            >
              12회 빌드업 시작하기
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-slate-300">D.I.P Deep</span>
              </div>
              <p className="text-sm">
                © 2024 D.I.P Deep. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
