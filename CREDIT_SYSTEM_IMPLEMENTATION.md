# 크레딧 과금 시스템 구현 가이드

## 구현 완료 사항

### 1. 데이터베이스 스키마
- ✅ `supabase-credit-system-schema.sql` 파일 생성
- ✅ `profiles.credit_balance` 컬럼 추가
- ✅ `transactions` 테이블 생성 (거래 내역)
- ✅ `purchased_items` 테이블 생성 (구매 목록)
- ✅ `user_workbooks` 테이블 생성 (선택사항)
- ✅ RLS 정책 설정
- ✅ RPC 함수: `purchase_item`, `charge_credits`
- ✅ 신규 가입 환영 크레딧 트리거

### 2. 프론트엔드 컴포넌트
- ✅ `hooks/useCredits.ts` - 크레딧 관리 훅
- ✅ `components/CreditBalance.tsx` - 크레딧 잔액 표시
- ✅ `components/workbook/WorkbookLockScreen.tsx` - 워크북 잠금 화면
- ✅ `components/workbook/WorkbookHeader.tsx` - 헤더에 크레딧 표시 추가
- ✅ `components/workbook/ProjectSummaryModal.tsx` - 제안서 프롬프트 복사 시 크레딧 차감

### 3. 과금 정책 적용
- ✅ 워크북 해금: 5 크레딧 (회차별 최초 1회)
- ✅ 사업기획서 프롬프트: 무료
- ✅ 제안서 프롬프트: 10 크레딧
- ✅ 제안서 제작: 30 크레딧 (추후 적용)

## 설치 및 설정 방법

### 1. Supabase 데이터베이스 설정

1. Supabase 대시보드 → SQL Editor 접속
2. `supabase-credit-system-schema.sql` 파일의 내용을 복사하여 실행
3. 실행 결과 확인:
   - `profiles` 테이블에 `credit_balance` 컬럼 추가 확인
   - `transactions`, `purchased_items`, `user_workbooks` 테이블 생성 확인
   - RLS 정책 활성화 확인
   - RPC 함수 생성 확인

### 2. 테스트 데이터 생성 (선택사항)

```sql
-- 테스트 사용자에게 크레딧 지급
UPDATE profiles 
SET credit_balance = 100 
WHERE id = 'YOUR_USER_ID';
```

### 3. 워크북 페이지에 잠금 화면 통합

각 워크북 페이지(week2부터)에 다음 코드를 추가:

```typescript
// 1. Import 추가
import { WorkbookLockScreen } from '@/components/workbook/WorkbookLockScreen'
import { useCredits } from '@/hooks/useCredits'

// 2. State 추가
const [isUnlocked, setIsUnlocked] = useState(false)
const { checkPurchaseStatus } = useCredits()

// 3. 잠금 상태 확인 useEffect
useEffect(() => {
  const checkLockStatus = async () => {
    if (!projectId) return
    
    const sessionNumber = 2 // 해당 회차 번호
    const isPurchased = await checkPurchaseStatus(`session${sessionNumber}`, 'WORKBOOK')
    setIsUnlocked(isPurchased)
  }
  
  checkLockStatus()
}, [projectId, checkPurchaseStatus])

// 4. 메인 콘텐츠를 조건부 렌더링
<main className="flex-1 pb-16">
  {!isUnlocked ? (
    <WorkbookLockScreen
      sessionNumber={2}
      sessionTitle="타겟 페르소나"
      cost={5}
      onUnlock={() => setIsUnlocked(true)}
    />
  ) : (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* 기존 워크북 콘텐츠 */}
    </div>
  )}
</main>
```

## 사용 방법

### 1. 크레딧 잔액 확인
- 워크북 헤더 우측 상단에 크레딧 잔액이 표시됩니다.

### 2. 워크북 해금
- 2회차부터 워크북에 접근 시 잠금 화면이 표시됩니다.
- "5 크레딧으로 해금하기" 버튼 클릭
- 크레딧이 차감되고 워크북이 해금됩니다.

### 3. 제안서 프롬프트 생성
- 프로젝트 요약 모달에서 "제안서" 탭 선택
- "프롬프트 복사 (10 크레딧)" 버튼 클릭
- 크레딧이 차감되고 프롬프트가 복사됩니다.

### 4. 사업기획서 프롬프트
- 무료로 사용 가능 (크레딧 차감 없음)

## 다음 단계

1. **모든 워크북 페이지에 잠금 화면 통합**
   - week2부터 week12까지 각 페이지에 잠금 화면 추가
   - 각 회차별 세션 번호와 제목 설정

2. **크레딧 충전 시스템 구현**
   - 결제 API 연동 (토스페이먼츠, 아임포트 등)
   - 크레딧 충전 페이지 생성
   - `charge_credits` RPC 함수 호출

3. **거래 내역 페이지**
   - `transactions` 테이블 조회
   - 크레딧 사용/충전 내역 표시

4. **제안서 자동 제작 기능**
   - AI API 연동
   - 30 크레딧 차감 로직 추가

## 주의사항

- RPC 함수는 `SECURITY DEFINER`로 실행되므로 RLS를 우회합니다.
- 모든 크레딧 거래는 `transactions` 테이블에 기록됩니다.
- 중복 구매 방지를 위해 `purchased_items` 테이블에 UNIQUE 제약 조건이 있습니다.
- 워크북 해금은 회차별 최초 1회만 크레딧이 차감됩니다.

