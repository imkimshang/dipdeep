-- 팀 프로젝트 접근을 위한 간단한 RLS 정책 (대안 방법)
-- 이 방법은 팀 프로젝트를 모두 조회 가능하게 하고, 실제 검증은 애플리케이션 레벨에서 수행합니다.
-- 
-- 주의: 이 방법은 보안이 약하므로, 반드시 애플리케이션 레벨(API Route)에서
-- member_emails 검증을 수행해야 합니다.

-- ============================================
-- projects 테이블 정책
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can read team projects they are members of" ON projects;
DROP POLICY IF EXISTS "Users can update team projects they are members of" ON projects;

-- 새 SELECT 정책: 자신의 프로젝트 또는 모든 팀 프로젝트 조회 가능
-- (실제 검증은 애플리케이션 레벨에서 수행)
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_team = TRUE  -- 팀 프로젝트는 모두 조회 가능 (애플리케이션 레벨에서 검증)
  );

-- 새 UPDATE 정책: 작성자만 수정 가능
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (
    auth.uid() = user_id  -- 작성자만 수정 가능
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- ============================================
-- project_steps 테이블 정책
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own project steps" ON project_steps;
DROP POLICY IF EXISTS "Users can update own project steps" ON project_steps;
DROP POLICY IF EXISTS "Users can insert own project steps" ON project_steps;

-- 새 SELECT 정책: 자신의 프로젝트 단계 또는 팀 프로젝트 단계 조회 가능
CREATE POLICY "Users can view own project steps"
  ON project_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND (
        projects.user_id = auth.uid() OR
        projects.is_team = TRUE  -- 팀 프로젝트는 모두 조회 가능
      )
    )
  );

-- 새 UPDATE 정책: 자신의 프로젝트 단계 또는 팀 프로젝트 단계 수정 가능
CREATE POLICY "Users can update own project steps"
  ON project_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND (
        projects.user_id = auth.uid() OR
        projects.is_team = TRUE  -- 팀 프로젝트는 모두 수정 가능 (필드별 권한은 애플리케이션 레벨에서)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND (
        projects.user_id = auth.uid() OR
        projects.is_team = TRUE
      )
    )
  );

-- 새 INSERT 정책: 자신의 프로젝트 단계 또는 팀 프로젝트 단계 생성 가능
CREATE POLICY "Users can insert own project steps"
  ON project_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND (
        projects.user_id = auth.uid() OR
        projects.is_team = TRUE
      )
    )
  );

-- 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('projects', 'project_steps')
ORDER BY tablename, policyname;

