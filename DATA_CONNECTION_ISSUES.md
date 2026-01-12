# 데이터 연결 및 오류 정리 보고서

## 🔴 심각한 문제점

### 1. 타입 정의와 실제 데이터베이스 스키마 불일치

#### 1.1 `projects` 테이블 타입 정의 누락
**위치**: `types/supabase.ts`

**문제점**:
- 실제 데이터베이스에는 다음 필드들이 존재하지만 타입 정의에 없음:
  - `is_team` (BOOLEAN)
  - `team_code` (TEXT)
  - `member_emails` (TEXT[])
  - `is_hidden` (BOOLEAN)
  - `last_editor_id` (UUID)
  - `updated_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ)

**영향**:
- 코드 전반에서 `(project as any)`로 타입 캐스팅하여 사용
- TypeScript 타입 체크 기능 상실
- 런타임 오류 가능성 증가

**영향받는 파일들**:
- `hooks/useWorkbookStorage.ts` (121, 122, 150, 220, 221, 226, 227, 282, 283, 316, 364, 365, 370, 371줄)
- `hooks/useProjectAccess.ts` (39, 40, 41줄)
- `hooks/useProjectSettings.ts` (전체)
- `app/api/team-project/info/route.ts` (46, 47줄)
- `app/api/team-project/steps/route.ts` (46, 47줄)
- `components/ProjectListWithFilter.tsx` (전체)
- 모든 워크북 페이지들

#### 1.2 `profiles` 테이블 타입 정의 누락
**위치**: `types/supabase.ts`

**문제점**:
- 실제 데이터베이스에는 다음 필드들이 존재하지만 타입 정의에 없음:
  - `email` (TEXT)
  - `full_name` (TEXT)
  - `phone_number` (TEXT)
  - `interest_fields` (TEXT[])
  - `status` (VARCHAR) - 'active' | 'archived'
  - `deleted_at` (TIMESTAMPTZ)
  - `withdrawn_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)
  - `user_no` (BIGINT)
  - `credit_balance` (INTEGER)

**영향**:
- `app/login/page.tsx`에서 `(profile as any)`로 캐스팅
- `components/StudentDashboard.tsx`에서 `(profile as any)`로 캐스팅
- 타입 안정성 상실

**영향받는 파일들**:
- `app/login/page.tsx` (137, 138, 173, 201, 268, 269, 270, 352, 353, 354, 357, 358, 359줄)
- `app/dashboard/page.tsx` (18, 26, 34, 36줄)
- `components/StudentDashboard.tsx` (137, 138줄)
- `app/api/auth/check-profile/route.ts` (17, 22줄)

### 2. 프로젝트 생성 시 팀 코드 생성 방식 충돌

**위치**: 
- `app/dashboard/student/new/page.tsx` (42-50줄)
- `supabase-team-project-schema.sql` (트리거 함수)

**문제점**:
- 클라이언트에서 직접 팀 코드 생성 (`generateTeamCode()`)
- 데이터베이스 트리거에서도 팀 코드 자동 생성 (`set_team_code()`)
- 두 곳에서 생성하면 충돌 가능성

**영향**:
- 클라이언트에서 생성한 코드가 트리거에 의해 덮어씌워질 수 있음
- 또는 트리거가 생성한 코드가 클라이언트 코드와 다를 수 있음
- 팀 코드 형식 불일치 가능성 (클라이언트: 8자리, DB: DP-XXXXXX 형식)

**해결 방안**:
- 클라이언트에서 팀 코드 생성을 제거하고 데이터베이스 트리거에만 의존
- 또는 트리거를 제거하고 클라이언트에서만 생성 (하지만 이 경우 UNIQUE 제약조건 위반 가능)

### 3. 프로젝트 업데이트 시 필드 타입 오류

**위치**: `hooks/useWorkbookStorage.ts`

**문제점**:
- `last_editor_id`, `updated_at` 필드를 업데이트하려고 하지만 타입 정의에 없음
- `(supabase.from('projects') as any)`로 캐스팅하여 우회

**영향받는 코드**:
```typescript
// 220-222줄, 226-228줄, 364-366줄, 370-372줄
await (supabase.from('projects') as any).update({
  current_step: stepNumber,
  progress_rate: progressRate,
  last_editor_id: profile?.id || user.id,
  updated_at: new Date(),
}).eq('id', projectId)
```

**영향**:
- 타입 안정성 상실
- 필드명 오타 시 런타임에만 발견

## ⚠️ 중간 수준 문제점

### 4. API 라우트와 클라이언트 간 데이터 구조 불일치

**위치**: 
- `app/api/team-project/info/route.ts`
- `app/api/team-project/steps/route.ts`

**문제점**:
- API에서 `member_emails`를 배열로 반환하지만 타입 정의 없음
- `is_team` 필드 사용하지만 타입 정의 없음

**영향**:
- 클라이언트에서 받은 데이터를 `(project as any)`로 처리해야 함

### 5. 프로필 조회 시 필드 누락 가능성

**위치**: `app/dashboard/page.tsx`

**문제점**:
- `profiles` 테이블에서 `role`, `deleted_at`만 조회
- 하지만 `status` 필드도 확인해야 할 수 있음 (현재는 `deleted_at`만 확인)

**코드**:
```typescript
const { data: profile }: { data: { role: string; deleted_at?: string } | null } = await supabase
  .from('profiles')
  .select('role, deleted_at')
  .eq('id', user.id)
  .is('deleted_at', null)
  .single()
```

**영향**:
- `status='archived'`인 계정도 접근 가능할 수 있음 (현재는 `deleted_at`만 체크)

## 💡 권장 수정 사항

### 우선순위 1: 타입 정의 업데이트

1. **`types/supabase.ts` 업데이트**:
   - `projects` 테이블에 누락된 필드 추가
   - `profiles` 테이블에 누락된 필드 추가
   - Supabase CLI를 사용하여 자동 생성 권장

2. **타입 캐스팅 제거**:
   - 모든 `(project as any)`, `(profile as any)` 제거
   - 적절한 타입 사용

### 우선순위 2: 팀 코드 생성 로직 통일

1. **클라이언트 코드 제거**:
   - `app/dashboard/student/new/page.tsx`에서 `generateTeamCode()` 제거
   - 데이터베이스 트리거에만 의존

2. **또는 트리거 제거**:
   - 클라이언트에서만 생성하되, UNIQUE 제약조건 위반 처리 로직 추가

### 우선순위 3: 프로필 조회 로직 개선

1. **`app/dashboard/page.tsx` 수정**:
   - `status` 필드도 함께 조회 및 확인
   - `status='active'`이고 `deleted_at IS NULL`인 경우만 접근 허용

## 📋 체크리스트

- [ ] `types/supabase.ts`에 `projects` 테이블 누락 필드 추가
- [ ] `types/supabase.ts`에 `profiles` 테이블 누락 필드 추가
- [ ] 모든 `(project as any)` 캐스팅 제거
- [ ] 모든 `(profile as any)` 캐스팅 제거
- [ ] 팀 코드 생성 로직 통일 (클라이언트 또는 트리거 중 하나만 사용)
- [ ] 프로필 조회 시 `status` 필드 확인 추가
- [ ] 타입 오류 없는지 전체 코드베이스 검증

## 🔍 추가 확인 필요 사항

1. **크레딧 시스템 관련 필드**:
   - `profiles.credit_balance` 필드가 타입에 정의되어 있는지 확인 필요
   - `transactions`, `purchased_items` 테이블 타입 정의 확인 필요

2. **RLS 정책과 타입 정의 일치성**:
   - RLS 정책에서 사용하는 필드들이 타입 정의에 있는지 확인

3. **API 응답 타입 정의**:
   - API 라우트의 응답 타입을 명시적으로 정의하여 클라이언트에서 안전하게 사용
