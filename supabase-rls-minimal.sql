-- 최소 필수 정책만 포함 (프로젝트 생성/워크북 저장을 위한 필수 정책)
-- 기존 정책이 있어도 안전하게 실행 가능

-- ============================================
-- 필수: projects 테이블 정책
-- ============================================
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 필수: project_steps 테이블 정책
-- ============================================
DROP POLICY IF EXISTS "Users can insert own project steps" ON project_steps;
DROP POLICY IF EXISTS "Users can view own project steps" ON project_steps;
DROP POLICY IF EXISTS "Users can update own project steps" ON project_steps;

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

