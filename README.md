# Dip Deep - AI 기획자 교육 플랫폼

Next.js 14, TypeScript, Tailwind CSS, Supabase를 사용한 AI 기획자 교육 플랫폼입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend/Auth**: Supabase
- **Icons**: Lucide React

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 Supabase 정보를 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
app/
  ├── (routes)/
  │   ├── page.tsx              # 랜딩 페이지
  │   ├── login/
  │   │   └── page.tsx          # 로그인/회원가입
  │   ├── auth/
  │   │   └── callback/
  │   │       └── route.ts      # Supabase 인증 콜백
  │   ├── dashboard/
  │   │   ├── page.tsx          # 역할별 대시보드 (분기 처리)
  │   │   ├── teacher/
  │   │   │   └── page.tsx      # 교사 전용 대시보드
  │   │   └── student/
  │   │       └── page.tsx      # 학생 전용 대시보드
  │   └── workbook/
  │       └── [id]/
  │           └── page.tsx      # 워크북 입력 화면
  ├── layout.tsx
  └── globals.css

components/
  ├── TeacherDashboard.tsx      # 교사 대시보드 컴포넌트
  ├── StudentDashboard.tsx      # 학생 대시보드 컴포넌트
  ├── WorkbookForm.tsx          # 워크북 폼 컴포넌트
  └── LogoutButton.tsx          # 로그아웃 버튼

utils/
  └── supabase/
      ├── client.ts             # 클라이언트 Supabase 클라이언트
      └── server.ts             # 서버 Supabase 클라이언트

types/
  └── supabase.ts               # Supabase 타입 정의
```

## 주요 기능

- ✅ 이메일 기반 인증 (Supabase Auth)
- ✅ 역할 기반 대시보드 (교사/학생)
- ✅ 팀 관리 (교사)
- ✅ 프로젝트 관리
- ✅ 12주차 워크북 시스템
- ✅ 프로젝트 진행률 추적

## 데이터베이스 구조

프로젝트는 다음 Supabase 테이블을 사용합니다:

- `profiles`: 사용자 프로필 및 역할
- `teams`: 팀 정보
- `projects`: 프로젝트 정보
- `project_steps`: 프로젝트 단계별 데이터

## 라이선스

MIT


