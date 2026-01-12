# 코드 리뷰 및 버그 리포트

## 🔴 심각한 문제점

### 1. 타입 안정성 문제 - 아직 남아있는 `as any` 사용

#### 1.1 `hooks/useWorkbookStorage.ts`
**위치**: 125-127줄, 277-279줄

**문제점**:
```typescript
// 현재 코드
const isAuthor = (project as any).user_id === user.id
const memberEmails = (project as any).member_emails || []
const isTeamMember = (project as any).is_team && memberEmails.includes(user.email)
```

**해결 방안**:
```typescript
// 수정 필요
const projectData = project as Project
const isAuthor = projectData.user_id === user.id
const memberEmails = projectData.member_emails || []
const isTeamMember = projectData.is_team && memberEmails.includes(user.email || '')
```

#### 1.2 `hooks/useProjectAccess.ts`
**위치**: 39-41줄

**문제점**: `as any` 사용으로 타입 안정성 상실

**해결 방안**: Database 타입 import 및 사용

#### 1.3 `hooks/useProjectSettings.ts`
**위치**: 38-40줄, 99줄, 267줄, 303줄, 349줄

**문제점**: 여러 곳에서 `as any` 사용

**해결 방안**: 모든 `as any` 제거 및 적절한 타입 사용

#### 1.4 API 라우트들
**위치**:
- `app/api/team-project/info/route.ts` (45-47줄)
- `app/api/team-project/steps/route.ts` (45-47줄)
- `app/api/team-project/access/route.ts` (여러 곳)

**문제점**: 프로젝트 데이터를 `as any`로 캐스팅

**해결 방안**: Database 타입 사용

### 2. 중복된 프로필 확인 로직

#### 2.1 `app/api/auth/check-profile/route.ts`
**위치**: 26-44줄

**문제점**:
```typescript
// 첫 번째 확인
if (profileError || !profile) {
  // 로그아웃 처리
}

// 두 번째 확인 (불필요한 중복)
const profileData = profile as Profile
if (profileData.deleted_at || profileData.status !== 'active') {
  // 로그아웃 처리
}
```

**해결 방안**: 첫 번째 확인에서 이미 `status='active'`와 `deleted_at IS NULL`을 체크하므로 두 번째 확인은 불필요. 제거하거나 첫 번째 확인을 단순화.

### 3. useEffect 의존성 배열 문제

#### 3.1 `hooks/useProjectAccess.ts`
**위치**: 54줄

**문제점**:
```typescript
useEffect(() => {
  // ...
}, [projectId, router, supabase])
```

**문제**: `supabase`는 매번 새로운 인스턴스를 생성하므로 useEffect가 불필요하게 재실행될 수 있음.

**해결 방안**: `supabase`를 의존성 배열에서 제거. `createClient()`는 안정적인 싱글톤이므로 의존성에 포함할 필요 없음.

### 4. 에러 처리 누락

#### 4.1 API 라우트에서 `.single()` 사용 시
**위치**:
- `app/api/team-project/info/route.ts` (35줄)
- `app/api/team-project/steps/route.ts` (35줄)
- `app/api/team-project/access/route.ts` (39줄)

**문제점**: `.single()`은 결과가 없거나 여러 개일 때 에러를 발생시킴. 에러 처리가 없으면 500 에러 발생 가능.

**해결 방안**: `.maybeSingle()` 사용 또는 에러 처리 추가

#### 4.2 `hooks/useProjectAccess.ts`
**위치**: 33-35줄

**문제점**:
```typescript
if (error || !project) {
  router.push('/dashboard')
  return
}
```

**문제**: 에러 발생 시 사용자에게 알림 없이 리다이렉트만 함. 디버깅이 어려움.

**해결 방안**: 에러 로깅 추가 및 사용자에게 적절한 메시지 표시

### 5. 날짜 형식 불일치

#### 5.1 `hooks/useWorkbookStorage.ts`
**위치**: 221줄, 227줄, 365줄, 371줄

**문제점**: `updated_at`을 `new Date().toISOString()`으로 설정했지만, 타입 정의는 `string | null`이므로 일관성은 있음. 하지만 일부 코드에서는 `new Date()`만 사용하는 경우가 있을 수 있음.

**현재 상태**: 이미 `toISOString()` 사용 중이므로 문제 없음.

### 6. Race Condition 가능성

#### 6.1 `hooks/useWorkbookStorage.ts`
**위치**: `saveStepData`와 `submitStep` 함수

**문제점**: 동시에 여러 번 호출되면 마지막 호출만 반영될 수 있음.

**해결 방안**: 
- 로딩 상태로 중복 호출 방지 (이미 구현됨)
- Optimistic locking 고려 (선택사항)

## ⚠️ 중간 수준 문제점

### 7. 프로필 업데이트 시 타입 캐스팅

#### 7.1 `app/dashboard/profile/ProfileEditPageContent.tsx`
**위치**: 189줄

**문제점**:
```typescript
.update({
  // ...
} as any)
```

**해결 방안**: Database 타입 사용

### 8. 콘솔 로그 남아있음

#### 8.1 `hooks/useWorkbookStorage.ts`
**위치**: 159-160줄, 174줄

**문제점**: 디버깅용 `console.log`가 프로덕션 코드에 남아있음.

**해결 방안**: 제거하거나 개발 환경에서만 실행되도록 조건부 처리

### 9. 에러 메시지 일관성 부족

#### 9.1 여러 파일
**문제점**: 에러 메시지 형식이 일관되지 않음 (한글/영문 혼용, 형식 불일치)

**해결 방안**: 에러 메시지 상수화 또는 i18n 사용

## 💡 개선 권장 사항

### 10. 타입 가드 함수 생성

**권장 사항**: 프로젝트 데이터 타입 검증을 위한 유틸리티 함수 생성

```typescript
// utils/typeGuards.ts
export function isProject(data: any): data is Project {
  return data && typeof data.id === 'string'
}

export function isProfile(data: any): data is Profile {
  return data && typeof data.id === 'string' && typeof data.status === 'string'
}
```

### 11. 에러 처리 유틸리티

**권장 사항**: 공통 에러 처리 함수 생성

```typescript
// utils/errorHandler.ts
export function handleSupabaseError(error: any, defaultMessage: string): string {
  if (error.code === 'PGRST116') {
    return '데이터를 찾을 수 없습니다.'
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    return '권한이 없습니다.'
  }
  return error.message || defaultMessage
}
```

### 12. API 응답 타입 정의

**권장 사항**: API 라우트의 응답 타입을 명시적으로 정의

```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

## 📋 수정 우선순위

### 우선순위 1 (즉시 수정 필요)
1. ✅ 타입 정의 업데이트 (이미 완료)
2. ⚠️ `hooks/useWorkbookStorage.ts` - 남아있는 `as any` 제거
3. ⚠️ `hooks/useProjectAccess.ts` - `as any` 제거 및 useEffect 의존성 수정
4. ⚠️ `hooks/useProjectSettings.ts` - `as any` 제거
5. ⚠️ API 라우트들 - `as any` 제거 및 에러 처리 개선

### 우선순위 2 (빠른 시일 내 수정)
6. 중복된 프로필 확인 로직 제거
7. API 라우트 에러 처리 개선
8. 콘솔 로그 정리

### 우선순위 3 (점진적 개선)
9. 타입 가드 함수 생성
10. 에러 처리 유틸리티 생성
11. API 응답 타입 정의

## 🔍 추가 확인 필요 사항

1. **메모리 누수**: useEffect cleanup 함수 확인 필요
2. **성능**: 불필요한 리렌더링 확인
3. **접근성**: 키보드 네비게이션 및 스크린 리더 지원
4. **보안**: XSS 방지, CSRF 보호 확인
5. **테스트**: 단위 테스트 및 통합 테스트 필요
