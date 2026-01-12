# Supabase 이메일 발송 설정 체크리스트

## 🔍 Supabase 대시보드에서 확인할 사항

### 1. Authentication > Settings

#### ✅ 이메일 인증 활성화
- [ ] **Enable email confirmations** 체크박스가 **활성화**되어 있는지 확인
- 위치: Authentication > Settings > Email Auth
- 중요: 이 옵션이 비활성화되어 있으면 이메일이 전송되지 않습니다

#### ✅ 이메일 변경 확인
- [ ] **Enable email change confirmations** (선택사항)
- 이메일 변경 시에도 확인 이메일이 필요하면 활성화

### 2. Authentication > URL Configuration

#### ✅ Site URL 설정
- [ ] **Site URL**이 올바르게 설정되어 있는지 확인
  - 개발 환경: `http://localhost:3000`
  - 프로덕션 환경: `https://yourdomain.com` (실제 도메인)
- 위치: Authentication > URL Configuration > Site URL
- 중요: 이 URL이 잘못되면 이메일 링크가 작동하지 않습니다

#### ✅ Redirect URLs (화이트리스트)
- [ ] **Redirect URLs**에 다음 URL들이 포함되어 있는지 확인:
  ```
  http://localhost:3000/auth/callback
  https://yourdomain.com/auth/callback
  ```
- 위치: Authentication > URL Configuration > Redirect URLs
- 중요: 이 목록에 없는 URL로는 리다이렉트할 수 없습니다
- 와일드카드 사용 가능: `https://*.yourdomain.com/auth/callback`

### 3. Authentication > Email Templates

#### ✅ Confirm signup 템플릿
- [ ] **Confirm signup** 템플릿이 존재하는지 확인
- 위치: Authentication > Email Templates > Confirm signup
- 기본 템플릿이 있어야 합니다

#### ✅ 리다이렉트 URL 확인
템플릿 내에서 다음 변수가 올바르게 사용되는지 확인:
```
{{ .ConfirmationURL }}
또는
{{ .SiteURL }}/auth/callback?token={{ .TokenHash }}&type=signup
```

#### ✅ 이메일 템플릿 내용 확인
- [ ] 이메일 제목과 본문이 올바른지 확인
- [ ] 링크가 포함되어 있는지 확인

### 4. Authentication > Settings > SMTP Settings (프로덕션)

#### ⚠️ 프로덕션 환경에서만 필요
개발 환경에서는 Supabase 기본 이메일 서비스를 사용하지만, 프로덕션에서는 SMTP 설정이 필요할 수 있습니다.

- [ ] **Enable Custom SMTP** 체크박스 확인
- [ ] SMTP 서비스 제공자 선택 (Gmail, SendGrid, AWS SES 등)
- [ ] SMTP 설정 정보 입력:
  - Host
  - Port
  - Username
  - Password (또는 API Key)
  - Sender email
  - Sender name

#### 일반적인 SMTP 설정 예시

**Gmail:**
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: 앱 비밀번호 (일반 비밀번호 아님!)
```

**SendGrid:**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: SendGrid API Key
```

**AWS SES:**
```
Host: email-smtp.region.amazonaws.com
Port: 587
Username: AWS Access Key ID
Password: AWS Secret Access Key
```

### 5. Authentication > Logs

#### ✅ 이메일 전송 로그 확인
- [ ] **Authentication > Logs**에서 이메일 전송 시도 기록 확인
- [ ] 에러 메시지가 있는지 확인
- [ ] Rate limit 에러가 있는지 확인

### 6. Project Settings > API

#### ✅ API URL 확인
- [ ] **Project URL**이 올바른지 확인
- 위치: Project Settings > API > Project URL
- 이 URL이 이메일 링크에 사용됩니다

## 🔍 코드에서 확인할 사항

### 현재 코드 설정

```typescript
// app/login/page.tsx (255-267줄)
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

### 확인 사항

1. **`window.location.origin` 값 확인**
   - 개발 환경: `http://localhost:3000`
   - 프로덕션 환경: 실제 도메인 (예: `https://dipdeep.com`)
   - 브라우저 콘솔에서 확인: `console.log(window.location.origin)`

2. **에러 메시지 확인**
   - 회원가입 시 브라우저 콘솔에 에러가 있는지 확인
   - `error.message` 내용 확인

3. **이메일 재전송 기능 테스트**
   - "인증 이메일 다시 보내기" 버튼 클릭
   - 재전송 시 에러 메시지 확인

## 🐛 일반적인 문제 및 해결 방법

### 문제 1: 이메일이 전혀 오지 않음

**가능한 원인:**
1. `Enable email confirmations` 비활성화
2. SMTP 설정 오류 (프로덕션)
3. Site URL 설정 오류
4. Redirect URLs에 콜백 URL 미등록

**해결 방법:**
1. Supabase 대시보드에서 위 항목들 확인
2. Authentication > Logs에서 에러 확인
3. 브라우저 콘솔에서 에러 확인

### 문제 2: 이메일은 오지만 링크가 작동하지 않음

**가능한 원인:**
1. Redirect URLs에 콜백 URL 미등록
2. Site URL 설정 오류
3. 이메일 템플릿의 URL 형식 오류

**해결 방법:**
1. Redirect URLs에 `/auth/callback` 경로 추가
2. Site URL이 실제 도메인과 일치하는지 확인
3. 이메일 템플릿에서 `{{ .ConfirmationURL }}` 사용 확인

### 문제 3: 개발 환경에서만 작동하지 않음

**가능한 원인:**
1. Supabase는 개발 환경에서 이메일을 실제로 전송하지 않을 수 있음
2. Rate limit에 걸림

**해결 방법:**
1. 프로덕션 환경에서 테스트
2. Supabase 로그에서 이메일 전송 기록 확인
3. Rate limit 에러가 있으면 대기 후 재시도

### 문제 4: 프로덕션에서만 작동하지 않음

**가능한 원인:**
1. SMTP 설정 누락 또는 오류
2. Site URL이 프로덕션 도메인으로 설정되지 않음
3. Redirect URLs에 프로덕션 URL 미등록

**해결 방법:**
1. SMTP 설정 확인 및 테스트
2. Site URL을 프로덕션 도메인으로 변경
3. Redirect URLs에 프로덕션 URL 추가

## 📋 빠른 체크리스트

### 필수 확인 사항 (즉시 확인)
- [ ] Authentication > Settings > Enable email confirmations **활성화**
- [ ] Authentication > URL Configuration > Site URL **올바른 도메인 설정**
- [ ] Authentication > URL Configuration > Redirect URLs에 **`/auth/callback` 포함**
- [ ] Authentication > Email Templates > Confirm signup **템플릿 존재**

### 프로덕션 환경 추가 확인
- [ ] Authentication > Settings > SMTP Settings **설정 완료**
- [ ] SMTP 서비스 **테스트 성공**
- [ ] Site URL이 **프로덕션 도메인**으로 설정

### 디버깅
- [ ] Authentication > Logs에서 **이메일 전송 기록 확인**
- [ ] 브라우저 콘솔에서 **에러 메시지 확인**
- [ ] "인증 이메일 다시 보내기" 버튼으로 **재전송 테스트**

## 🔧 코드 개선 제안

현재 코드는 올바르게 설정되어 있습니다. 하지만 다음 개선을 고려할 수 있습니다:

1. **환경 변수로 리다이렉트 URL 관리**
   ```typescript
   const redirectTo = process.env.NEXT_PUBLIC_SITE_URL 
     ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
     : `${window.location.origin}/auth/callback`
   ```

2. **에러 로깅 개선**
   - 이메일 전송 실패 시 더 자세한 에러 정보 표시

3. **이메일 전송 상태 확인**
   - 회원가입 후 이메일 전송 성공 여부를 사용자에게 명확히 안내

## 📞 추가 도움

문제가 계속되면:
1. Supabase 지원팀에 문의
2. Supabase 문서 확인: https://supabase.com/docs/guides/auth/auth-email
3. GitHub Issues 확인
