# Supabase RLS (Row Level Security) 설정 가이드

## 문제 상황
프로젝트 생성 시 "new row violates row-level security policy" 오류가 발생하는 경우, Supabase의 Row Level Security 정책이 설정되지 않았거나 잘못 설정된 것입니다.

## 해결 방법

### 1. Supabase 대시보드 접속
1. https://supabase.com 에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2. RLS 정책 활성화 확인
각 테이블의 RLS가 활성화되어 있는지 확인:
- `profiles`
- `projects`
- `project_steps`
- `teams`

### 3. SQL 정책 실행
`supabase-rls-policies.sql` 파일의 내용을 복사하여 SQL Editor에서 실행하세요.

또는 아래 SQL을 직접 실행:

```sql
-- projects 테이블 정책 (가장 중요!)
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- project_steps 테이블 정책
CREATE POLICY "Users can insert own project steps"
  ON project_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own project steps"
  ON project_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project steps"
  ON project_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

### 4. 기존 정책 확인 및 삭제 (필요시)
```sql
-- 기존 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- 기존 정책 삭제 (필요시)
DROP POLICY IF EXISTS "policy_name" ON projects;
```

### 5. 테스트
프로젝트 생성 기능을 다시 시도해보세요.

## 참고
- RLS는 데이터베이스 레벨에서 보안을 제공하는 기능입니다
- 각 테이블별로 적절한 정책이 필요합니다
- 정책이 없으면 어떤 데이터도 조회/수정/삽입할 수 없습니다


