# 워크북 데이터 복구 가이드

## 즉시 확인 사항

### 1. 브라우저 개발자 도구 확인
- F12 키를 눌러 개발자 도구 열기
- **Console 탭**: 에러 메시지 확인
- **Network 탭**: 
  - `project_steps` 관련 API 요청이 실패했는지 확인
  - 요청 상태 코드 확인 (200: 성공, 401/403: 권한 문제, 500: 서버 오류)

### 2. Supabase 대시보드 확인
1. Supabase 대시보드 접속
2. **Table Editor** → `project_steps` 테이블 확인
3. 프로젝트 ID로 필터링하여 데이터 존재 여부 확인
4. `projects` 테이블에서 프로젝트가 존재하는지 확인

### 3. 프로젝트 ID 확인
- URL의 `?projectId=...` 파라미터 확인
- 대시보드에서 프로젝트 클릭 시 올바른 ID로 이동하는지 확인

## 가능한 원인 및 해결 방법

### 원인 1: RLS (Row Level Security) 정책 문제
**증상**: 데이터는 있지만 읽을 수 없음

**해결 방법**:
```sql
-- project_steps 테이블의 SELECT 정책 확인
SELECT * FROM pg_policies 
WHERE tablename = 'project_steps' 
AND policyname LIKE '%SELECT%';

-- 필요시 정책 재생성
CREATE POLICY "Users can view own project steps"
  ON project_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

### 원인 2: 데이터베이스 연결 문제
**증상**: 네트워크 에러, 타임아웃

**해결 방법**:
1. `.env.local` 파일에서 Supabase 환경 변수 확인
2. Supabase 프로젝트 상태 확인
3. 인터넷 연결 확인

### 원인 3: 프로젝트 ID 변경
**증상**: 다른 프로젝트의 데이터가 보이거나 데이터가 없음

**해결 방법**:
- 대시보드에서 올바른 프로젝트 선택
- URL의 projectId 파라미터 확인

### 원인 4: 실제 데이터 삭제
**증상**: Supabase에서도 데이터가 없음

**해결 방법**:
1. Supabase 대시보드 → **Database** → **Backups** 확인
2. 백업이 있다면 복구 시도
3. 팀 프로젝트인 경우 다른 팀원의 데이터 확인

### 원인 5: 브라우저 캐시 문제
**증상**: 데이터가 있지만 화면에 표시되지 않음

**해결 방법**:
1. 브라우저 하드 리프레시: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
2. 브라우저 캐시 삭제
3. 시크릿/프라이빗 모드로 테스트

## 데이터 복구 SQL 쿼리

### 프로젝트별 데이터 확인
```sql
-- 특정 프로젝트의 모든 워크북 데이터 확인
SELECT 
  step_number,
  step_data,
  created_at,
  updated_at
FROM project_steps
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY step_number;
```

### 데이터 복구 (백업이 있는 경우)
```sql
-- 백업 테이블에서 복구 (백업 테이블이 있는 경우)
INSERT INTO project_steps (project_id, step_number, step_data)
SELECT project_id, step_number, step_data
FROM project_steps_backup
WHERE project_id = 'YOUR_PROJECT_ID'
ON CONFLICT (project_id, step_number) DO NOTHING;
```

## 예방 조치

1. **정기적인 백업**: Supabase 자동 백업 활성화
2. **데이터 검증**: 저장 후 즉시 로드하여 확인
3. **에러 로깅**: 콘솔 에러를 주의 깊게 확인
4. **권한 확인**: RLS 정책이 올바르게 설정되어 있는지 확인

## 추가 지원

문제가 지속되면 다음 정보를 제공해주세요:
1. 브라우저 콘솔 에러 메시지
2. Network 탭의 실패한 요청 상세 정보
3. Supabase 대시보드에서 확인한 데이터 존재 여부
4. 프로젝트 ID
5. 프로젝트 타입 (개인/팀)

