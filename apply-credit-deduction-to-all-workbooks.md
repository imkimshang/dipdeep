# 모든 워크북에 크레딧 차감 로직 적용 가이드

## 적용 방법

각 워크북 페이지(`app/workbook-event/week*/page.tsx` 및 `app/workbook/week*/page.tsx`)에 다음을 적용해야 합니다:

### 1. Import 추가

```typescript
import { useWorkbookCredit } from '@/hooks/useWorkbookCredit'
```

### 2. 훅 사용

```typescript
const { checkAndDeductCredit } = useWorkbookCredit(projectId, sessionNumber)
```

예: week2의 경우 `useWorkbookCredit(projectId, 2)`

### 3. handleSave 함수에 추가

```typescript
const handleSave = async () => {
  if (!projectId) {
    setToastMessage('프로젝트 ID가 필요합니다.')
    setToastVisible(true)
    return
  }

  // 최초 1회 저장 시 크레딧 차감
  try {
    await checkAndDeductCredit()
  } catch (error: any) {
    setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
    setToastVisible(true)
    return
  }

  // 기존 저장 로직...
}
```

### 4. handleSubmit 함수에 추가

```typescript
const handleSubmit = async () => {
  // confirm 로직...

  // 제출 시에도 크레딧 차감 (저장 시 차감 안 했을 경우)
  if (!isSubmitted) {
    try {
      await checkAndDeductCredit()
    } catch (error: any) {
      setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
      setToastVisible(true)
      return
    }
  }

  // 기존 제출 로직...
}
```

## 적용 대상

### 이벤트 워크북
- [x] week1 (완료 - 예시로 적용)
- [ ] week2 ~ week12

### 웹/어플리케이션 워크북
- [ ] week1 ~ week12

## 참고사항

- 1회차는 무료이므로 크레딧 차감하지 않음
- 최초 1회만 차감되도록 `purchased_items` 테이블에서 확인
- 워크북 해금 비용: 5 크레딧
- 크레딧 부족 시 에러 메시지 표시 및 저장/제출 중단

