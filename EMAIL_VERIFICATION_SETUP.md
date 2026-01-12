# 이메일 인증 설정 가이드

## 문제 상황
회원가입 후 인증 이메일이 오지 않는 경우, Supabase 설정을 확인해야 합니다.

## 해결 방법

### 1. Supabase 대시보드에서 이메일 인증 활성화 확인

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **Authentication > Settings 이동**
   - 왼쪽 메뉴에서 `Authentication` 클릭
   - `Settings` 탭 선택

3. **이메일 인증 설정 확인**
   - `Enable email confirmations` 옵션이 **활성화**되어 있는지 확인
   - 활성화되어 있지 않다면 활성화

### 2. 이메일 템플릿 설정 확인

1. **Authentication > Email Templates 이동**
   - `Confirm signup` 템플릿 확인
   - 기본 템플릿이 설정되어 있는지 확인

2. **리다이렉트 URL 확인**
   - 이메일 템플릿의 리다이렉트 URL이 올바른지 확인
   - 예: `{{ .SiteURL }}/auth/callback`

### 3. Site URL 설정 확인

1. **Authentication > URL Configuration 이동**
   - `Site URL`이 올바르게 설정되어 있는지 확인
   - 예: `http://localhost:3000` (개발 환경)
   - 예: `https://yourdomain.com` (프로덕션 환경)

2. **Redirect URLs 확인**
   - `Redirect URLs`에 다음이 포함되어 있는지 확인:
     - `http://localhost:3000/auth/callback` (개발)
     - `https://yourdomain.com/auth/callback` (프로덕션)

### 4. 개발 환경에서 이메일 확인

개발 환경에서는 실제 이메일이 전송되지 않을 수 있습니다. 다음 방법을 사용하세요:

1. **Supabase 로그 확인**
   - Authentication > Logs에서 이메일 전송 로그 확인

2. **테스트 이메일 사용**
   - Supabase는 개발 환경에서 이메일을 실제로 전송하지 않을 수 있음
   - 프로덕션 환경에서 테스트하거나
   - Supabase의 이메일 서비스 설정 확인

### 5. 이메일 서비스 제공자 설정 (프로덕션)

프로덕션 환경에서는 SMTP 서비스를 설정해야 합니다:

1. **Authentication > Settings > SMTP Settings 이동**
   - SMTP 서비스 제공자 선택 (Gmail, SendGrid, AWS SES 등)
   - SMTP 설정 정보 입력

2. **일반적인 SMTP 설정**
   - **Gmail**: Gmail 앱 비밀번호 사용 필요
   - **SendGrid**: API 키 사용
   - **AWS SES**: AWS 자격 증명 사용

### 6. 코드에서 확인할 사항

현재 코드는 다음과 같이 설정되어 있습니다:

```typescript
// app/login/page.tsx
const redirectTo = `${window.location.origin}/auth/callback`
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: redirectTo,
    data: {
      full_name: fullName,
      phone_number: phone,
      interest_fields: interestFields,
    },
  },
})
```

**확인 사항:**
- `emailRedirectTo`가 올바른 URL인지 확인
- `window.location.origin`이 올바른 도메인을 반환하는지 확인

### 7. 이메일 재전송 기능

코드에 이메일 재전송 기능이 추가되었습니다:

- 회원가입 후 이메일 인증이 필요한 경우, "인증 이메일 다시 보내기" 버튼이 표시됩니다
- 이 버튼을 클릭하면 이메일이 재전송됩니다
- Rate limit이 적용될 수 있으므로, 너무 자주 클릭하지 마세요

### 8. 문제 해결 체크리스트

- [ ] Supabase 대시보드에서 `Enable email confirmations` 활성화 확인
- [ ] Site URL이 올바르게 설정되어 있는지 확인
- [ ] Redirect URLs에 `/auth/callback` 경로가 포함되어 있는지 확인
- [ ] 이메일 템플릿이 설정되어 있는지 확인
- [ ] 프로덕션 환경인 경우 SMTP 설정 확인
- [ ] 스팸 폴더 확인
- [ ] 이메일 주소가 정확한지 확인
- [ ] "인증 이메일 다시 보내기" 버튼 사용

### 9. 추가 디버깅

문제가 계속되면:

1. **브라우저 콘솔 확인**
   - 개발자 도구(F12) > Console 탭
   - 에러 메시지 확인

2. **Supabase 로그 확인**
   - Authentication > Logs
   - 이메일 전송 관련 에러 확인

3. **네트워크 탭 확인**
   - 개발자 도구 > Network 탭
   - `/auth/v1/signup` 요청 확인
   - 응답 상태 코드 및 메시지 확인

## 참고 자료

- [Supabase Email 인증 문서](https://supabase.com/docs/guides/auth/auth-email)
- [Supabase SMTP 설정](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase 이메일 템플릿 커스터마이징](https://supabase.com/docs/guides/auth/auth-email-templates)
