# 나머지 워크북에 크레딧 차감 로직 적용

## 적용 완료
- ✅ week1 (이벤트)
- ✅ week2 (이벤트)
- ✅ week3 (이벤트)
- ✅ week4 (이벤트)

## 적용 필요
- [ ] week5~week12 (이벤트)
- [ ] week1~week12 (웹/어플리케이션)

## 적용 패턴

각 파일에 다음을 추가:

1. Import:
```typescript
import { useWorkbookCredit } from '@/hooks/useWorkbookCredit'
```

2. 훅 사용 (useProjectSummary 다음):
```typescript
const { generateSummary } = useProjectSummary()
const { checkAndDeductCredit } = useWorkbookCredit(projectId, WEEK_NUMBER)
```

3. handleSave에 추가 (if (!projectId) 다음):
```typescript
// 최초 1회 저장 시 크레딧 차감
try {
  await checkAndDeductCredit()
} catch (error: any) {
  setToastMessage(error.message || '크레딧 차감 중 오류가 발생했습니다.')
  setToastVisible(true)
  return
}
```

4. handleSubmit에 추가 (confirm 다음, if (!isSubmitted) 블록 안):
```typescript
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
```

