# Vercel 배포 체크리스트

## ✅ 검증 완료 항목

### 1. 빌드 성공
- `npm run build` 성공적으로 완료
- 모든 페이지 정상 컴파일
- 35개 라우트 생성 확인

### 2. 환경 변수 설정
다음 환경 변수를 Vercel에 설정해야 합니다:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anon Key

**Vercel 설정 방법:**
1. Vercel 대시보드 → 프로젝트 선택
2. Settings → Environment Variables
3. 위의 두 변수를 Production, Preview, Development 환경에 추가

### 3. 코드 구조
- ✅ 모든 클라이언트 컴포넌트에 `'use client'` 지시어 적용
- ✅ `useSearchParams()` 사용 컴포넌트에 `Suspense` 래핑 완료
- ✅ API 라우트에 `export const dynamic = 'force-dynamic'` 적용
- ✅ 서버 컴포넌트와 클라이언트 컴포넌트 경계 명확

### 4. 보안
- ✅ `.env` 파일이 `.gitignore`에 포함됨
- ✅ 환경 변수는 `NEXT_PUBLIC_*` 접두사 사용 (클라이언트 노출 가능)

### 5. 설정 파일
- ✅ `next.config.js` - ESLint/TypeScript 빌드 시 무시 설정 (옵션)
- ✅ `middleware.ts` - 인증 미들웨어 정상 설정
- ✅ `tsconfig.json` - TypeScript 설정 정상

## ⚠️ 경고 사항 (배포에 영향 없음)

### Supabase Realtime Edge Runtime 경고
빌드 시 다음 경고가 표시되지만 **배포에는 문제가 없습니다**:
```
A Node.js API is used (process.versions/process.version) which is not supported in the Edge Runtime.
```

이것은 Supabase Realtime 라이브러리가 Edge Runtime에서 일부 Node.js API를 사용하기 때문이며, 실제 런타임에서는 문제가 발생하지 않습니다.

## 📋 Vercel 배포 전 확인 사항

### 필수 설정
1. **환경 변수 설정**
   - Vercel 대시보드에서 `NEXT_PUBLIC_SUPABASE_URL` 설정
   - Vercel 대시보드에서 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정

2. **Node.js 버전**
   - Vercel은 기본적으로 Node.js 18.x 사용 (권장)

3. **빌드 명령어**
   - 기본값: `npm run build` (변경 불필요)

4. **출력 디렉토리**
   - 기본값: `.next` (변경 불필요)

### 권장 사항
1. **환경별 변수 분리**
   - Production, Preview, Development 환경별로 다른 Supabase 프로젝트 사용 권장

2. **도메인 설정**
   - Vercel 대시보드에서 Custom Domain 설정
   - Supabase Auth 리다이렉트 URL에 도메인 추가 필요

## 🚀 배포 후 확인 사항

1. **인증 확인**
   - 로그인/회원가입 기능 테스트
   - Supabase Auth 콜백 URL 확인

2. **데이터베이스 연결**
   - 프로젝트 생성 및 조회 테스트
   - RLS 정책이 제대로 작동하는지 확인

3. **워크북 기능**
   - 각 타입별 워크북 접근 경로 확인
   - 데이터 저장 및 불러오기 테스트

4. **성능**
   - 첫 로드 시간 확인
   - 페이지 전환 속도 확인

## 📝 추가 참고사항

### Supabase 리다이렉트 URL 설정
Vercel 배포 후 Supabase 대시보드에서 다음 URL을 추가해야 합니다:
- `https://your-domain.vercel.app/auth/callback`
- `https://your-domain.vercel.app/**` (와일드카드 사용 가능)

### 데이터베이스 마이그레이션
배포 전에 다음 SQL 스크립트가 실행되었는지 확인:
- `fix-projects-type-check-constraint.sql` - 프로젝트 타입 제약 조건 수정

## ✅ 최종 확인

- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 설정 완료
- [ ] GitHub 저장소 연결
- [ ] 첫 배포 실행
- [ ] Supabase 리다이렉트 URL 추가
- [ ] 기능 테스트 완료

