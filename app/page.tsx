import Link from 'next/link'
import { ArrowRight, Sparkles, BookOpen, Target, Brain, CheckCircle, Rocket, Users } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/30" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-600 tracking-wider uppercase">Dip Deep</span>
            </div>

            {/* Main Title */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-6 tracking-tight">
              AI 기획자를<br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                키워내는
              </span>
              <br />
              12주 교육
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-4 font-medium max-w-2xl mx-auto">
              체계적인 커리큘럼과 실전 프로젝트로
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              AI 프로젝트 기획 역량을 단계적으로 향상시키고, AI 피드백을 통해 지속적으로 개선합니다.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link
                href="/login"
                className="btn-primary group shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30"
              >
                시작하기
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="btn-secondary"
              >
                로그인
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">12주</div>
                <div className="text-sm text-gray-500">체계적 커리큘럼</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">3단계</div>
                <div className="text-sm text-gray-500">학습 프로세스</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">100%</div>
                <div className="text-sm text-gray-500">실전 중심</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                왜 Dip Deep인가?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                12주간의 체계적인 학습을 통해 AI 프로젝트 기획 전문가가 되세요
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="card card-hover p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                  체계적인 커리큘럼
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  12주간의 단계별 학습 과정으로 데이터 수집부터 프로토타입 검증까지 AI 프로젝트 기획 역량을 체계적으로 향상시킵니다.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card card-hover p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                  실전 프로젝트
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  웹앱, 스토리, 제품 등 다양한 유형의 프로젝트를 직접 기획하고 실행하여 실무 경험을 쌓습니다.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card card-hover p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                  AI 피드백
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  각 단계마다 AI가 제공하는 상세한 피드백으로 지속적으로 개선하고 학습 효과를 극대화합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                3단계 학습 프로세스
              </h2>
              <p className="text-lg text-gray-600">
                데이터 수집부터 검증까지 체계적인 워크플로우
              </p>
            </div>

            <div className="space-y-12">
              {/* Phase 1 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-3xl font-bold text-white">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">Phase 1: Data</h3>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                      4주
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    문제 발견, 데이터 탐색, 페르소나 설정, 문제 정의까지의 과정을 통해 프로젝트의 기반을 마련합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">문제 발견</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">데이터 탐색</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">페르소나</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">문제 정의</span>
                  </div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="text-3xl font-bold text-white">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">Phase 2: Insight</h3>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      4주
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    사용자 여정 분석, HMW 질문 도출, 아이디어 브레인스토밍, 구조 설계를 통해 해결책을 도출합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">사용자 여정</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">HMW 질문</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">아이디어</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">구조 설계</span>
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-3xl font-bold text-white">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">Phase 3: Prototype</h3>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                      4주
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    요구사항 정의, 브랜딩, UI/UX 설계, 프로토타입 구현 및 검증을 통해 최종 결과물을 완성합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">요구사항</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">브랜딩</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">UI/UX</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">검증</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Rocket className="w-16 h-16 text-white mx-auto mb-6 opacity-90" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              지금 바로 시작하세요
            </h2>
            <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
              AI 프로젝트 기획 전문가가 되기 위한 여정을 시작해보세요
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-full font-semibold text-lg hover:bg-gray-100 active:scale-95 transition-all duration-200 shadow-xl shadow-black/20"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-gray-300">Dip Deep</span>
              </div>
              <p className="text-sm">
                © 2024 Dip Deep. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}


