# 회원 관리 시스템 구현 가이드

이 문서는 회원가입, 회원정보 조회, 회원탈퇴 로직의 구현 상세 가이드를 제공합니다.

## 📋 목차

1. [데이터베이스 스키마](#데이터베이스-스키마)
2. [회원가입 로직](#회원가입-로직)
3. [회원탈퇴 로직](#회원탈퇴-로직)
4. [회원정보 수정](#회원정보-수정)
5. [RLS 정책 설정](#rls-정책-설정)
6. [배포 체크리스트](#배포-체크리스트)

---

## 데이터베이스 스키마

### 필수 필드

- **user_no** (BIGINT, PK): 숫자형 고유 시퀀스 넘버 (자동 증가)
- **email** (VARCHAR, UNIQUE): 로그인 ID, 가입 후 절대 수정 불가
- **name** (VARCHAR): 사용자 이름 (full_name 필드 사용)
- **password**: Supabase Auth에 저장 (profiles 테이블에는 없음)
- **status** (VARCHAR): 'active' 또는 'archived'
- **created_at** (TIMESTAMPTZ): 가입 일자

### 선택 필드

- **phone** (VARCHAR): 전화번호 (phone_number 필드)
- **interests** (TEXT[]): 관심분야 배열 (interest_fields 필드)
- **withdrawn_at** (TIMESTAMPTZ): 탈퇴 일자
- **deleted_at** (TIMESTAMPTZ): 영구 삭제 예정일 (탈퇴 후 5년)

### 스키마 업데이트 실행

```sql
-- Supabase SQL Editor에서 실행
-- 파일: update-profiles-schema-user-management.sql
```

이 스크립트는 다음을 수행합니다:
- `user_no` 시퀀스 및 컬럼 생성
- `status` 컬럼 추가 (기본값: 'active')
- `withdrawn_at` 컬럼 추가
- `deleted_at` 컬럼 확인 및 인덱스 추가
- `email` UNIQUE 제약조건 추가
- `created_at` 컬럼 확인 및 기본값 설정

---

## 회원가입 로직

### 구현 위치

- **파일**: `app/login/page.tsx`
- **함수**: `checkEmailExists()`, `handleSubmit()`

### 주요 기능

1. **이메일 중복 검사**
   - 활성 계정(status='active', deleted_at IS NULL) 확인
   - 활성 계정이 있으면 가입 거부

2. **재가입 유예 기간 검증**
   - 동일 이메일로 탈퇴 기록(status='archived' 또는 withdrawn_at 존재) 확인
   - `withdrawn_at`으로부터 15일 경과 여부 확인
   - 15일 미경과 시 가입 거부 및 남은 기간 안내

3. **신규 레코드 생성**
   - 재가입 시에도 기존 데이터 복구하지 않음
   - 새로운 `user_no`를 가진 신규 레코드 생성
   - `status='active'`로 설정
   - 이전 데이터는 'archived' 상태로 보존

### 코드 흐름

```typescript
// 1. 이메일 중복 확인
checkEmailExists(email)

// 2. 활성 계정 확인
if (activeAccount) → 가입 거부

// 3. 탈퇴 기록 확인
if (archivedAccount && withdrawn_at) {
  if (15일 미경과) → 가입 거부 + 남은 기간 안내
}

// 4. Supabase Auth 계정 생성
supabase.auth.signUp()

// 5. 프로필 생성
profiles.insert({
  status: 'active',
  created_at: now()
})
```

---

## 회원탈퇴 로직

### 구현 위치

- **API 엔드포인트**: `app/api/user/withdraw/route.ts`
- **프론트엔드**: `app/dashboard/profile/ProfileEditPageContent.tsx`

### 주요 기능

1. **아카이빙 (Soft Delete)**
   - 물리적 삭제 대신 `status='archived'`로 변경
   - 데이터 보존 (5년 후 영구 삭제)

2. **탈퇴 일자 기록**
   - `withdrawn_at`에 현재 시간 기록

3. **영구 삭제 예약**
   - `deleted_at`에 현재로부터 5년 후 날짜 계산하여 저장
   - 배치 작업을 통한 파기 목적

4. **사용자 안내**
   - "탈퇴 시 기존 데이터는 복구할 수 없으며, 15일간 재가입이 제한됩니다" 메시지 반환

### API 엔드포인트

**POST** `/api/user/withdraw`

**요청**: 인증 토큰 필요 (세션 쿠키)

**응답**:
```json
{
  "success": true,
  "message": "회원탈퇴가 완료되었습니다...",
  "withdrawnAt": "2024-01-01T00:00:00Z",
  "deletedAt": "2029-01-01T00:00:00Z"
}
```

### 코드 흐름

```typescript
// 1. 사용자 확인
auth.getUser()

// 2. 프로필 아카이빙
profiles.update({
  status: 'archived',
  withdrawn_at: now(),
  deleted_at: now() + 5년
})

// 3. 로그아웃
auth.signOut()

// 4. 성공 메시지 반환
```

---

## 회원정보 수정

### 구현 위치

- **파일**: `app/dashboard/profile/ProfileEditPageContent.tsx`
- **함수**: `handleSubmit()`

### 주요 기능

1. **이메일 수정 제한**
   - `email` 필드는 UI에서 `disabled` 처리
   - 업데이트 쿼리에서 `email` 필드 제외
   - 주석으로 명시: "email 필드는 절대로 업데이트하지 않음"

2. **수정 가능한 필드**
   - `full_name` (이름)
   - `phone_number` (전화번호)
   - `interest_fields` (관심분야)
   - 비밀번호 (Supabase Auth)

### 코드 예시

```typescript
// 프로필 정보 업데이트
// 주의: email 필드는 절대로 업데이트하지 않음
supabase
  .from('profiles')
  .update({
    full_name: formData.fullName,
    phone_number: formData.phone,
    interest_fields: formData.interestFields,
    // email 필드는 의도적으로 제외됨
  })
  .eq('id', userId)
```

---

## RLS 정책 설정

### 구현 위치

- **파일**: `update-rls-for-user-management.sql`

### 정책 내용

1. **SELECT 정책**
   - 자신의 프로필만 조회 가능
   - `status='active'`이고 `deleted_at IS NULL`인 계정만

2. **UPDATE 정책**
   - 자신의 프로필만 수정 가능
   - `status='active'`이고 `deleted_at IS NULL`인 계정만

3. **INSERT 정책**
   - 자신의 프로필만 생성 가능
   - `auth.uid() = id` 조건

### 실행 방법

```sql
-- Supabase SQL Editor에서 실행
-- 파일: update-rls-for-user-management.sql
```

---

## 배포 체크리스트

### 1. 데이터베이스 스키마 업데이트

- [ ] `update-profiles-schema-user-management.sql` 실행
- [ ] `user_no` 시퀀스 생성 확인
- [ ] `status` 컬럼 추가 확인
- [ ] `withdrawn_at` 컬럼 추가 확인
- [ ] `email` UNIQUE 제약조건 확인

### 2. RLS 정책 업데이트

- [ ] `update-rls-for-user-management.sql` 실행
- [ ] SELECT 정책 확인
- [ ] UPDATE 정책 확인
- [ ] INSERT 정책 확인

### 3. 코드 배포

- [ ] 회원가입 로직 업데이트 확인
- [ ] 회원탈퇴 API 엔드포인트 배포 확인
- [ ] 프로필 수정 로직 확인
- [ ] 로그인 시 활성 계정 확인 로직 확인

### 4. 테스트

- [ ] 신규 회원가입 테스트
- [ ] 재가입 유예 기간 테스트 (15일)
- [ ] 회원탈퇴 테스트
- [ ] 탈퇴 후 재가입 테스트 (15일 경과 후)
- [ ] 이메일 수정 불가 확인
- [ ] 활성 계정만 로그인 가능 확인

---

## 보안 및 정책

### 이메일 수정 제한

- 회원정보 수정 API에서 `email` 필드는 업데이트 대상에서 제외
- UI에서 이메일 입력 필드는 `disabled` 처리
- 데이터베이스 레벨에서도 수정 방지 권장 (트리거 또는 제약조건)

### 계정 분실 안내

- 이메일 접근 불가 시 "고객센터를 통해 본인 확인 후 안내받으세요" 가이드
- 로그인 실패 시 안내 메시지에 포함

### 데이터 보존 정책

- 탈퇴 후 15일간 재가입 제한
- 탈퇴 후 5년간 데이터 보존 (배치 작업으로 파기)
- `deleted_at` 필드로 영구 삭제 예정일 관리

---

## 문제 해결

### 재가입이 안 되는 경우

1. `withdrawn_at` 필드 확인
2. 15일 경과 여부 확인
3. `status` 필드 확인 (기존 레코드가 'archived'인지)

### 로그인이 안 되는 경우

1. `status='active'` 확인
2. `deleted_at IS NULL` 확인
3. RLS 정책 확인

### 프로필 수정이 안 되는 경우

1. RLS UPDATE 정책 확인
2. `status='active'` 확인
3. `deleted_at IS NULL` 확인

---

## 추가 참고사항

- Supabase Auth는 별도로 관리되므로, 프로필 삭제와 Auth 계정 삭제는 별개
- 재가입 시 새로운 `user_no`가 부여되므로 이전 데이터와 연결되지 않음
- 배치 작업을 통해 `deleted_at`이 지난 레코드를 주기적으로 삭제 권장
