-- 기존 정책이 있을 수 있으므로 DROP 후 재생성하는 안전한 버전
-- 이 SQL은 기존 정책이 있어도 안전하게 실행할 수 있습니다.

-- ============================================
-- projects 테이블 정책 (가장 중요!)
-- ============================================

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- 새 정책 생성
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- project_steps 테이블 정책
-- ============================================

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Users can insert own project steps" ON project_steps;
DROP POLICY IF EXISTS "Users can view own project steps" ON project_steps;
DROP POLICY IF EXISTS "Users can update own project steps" ON project_steps;
DROP POLICY IF EXISTS "Users can delete own project steps" ON project_steps;
DROP POLICY IF EXISTS "Teachers can view team project steps" ON project_steps;

-- 새 정책 생성
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

CREATE POLICY "Users can delete own project steps"
  ON project_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- profiles 테이블 정책 (선택사항)
-- ============================================

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 새 정책 생성
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- teams 테이블 정책 (교사용, 선택사항)
-- ============================================

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Teachers can insert own teams" ON teams;
DROP POLICY IF EXISTS "Teachers can view own teams" ON teams;
DROP POLICY IF EXISTS "Teachers can update own teams" ON teams;

-- 새 정책 생성
CREATE POLICY "Teachers can insert own teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view own teams"
  ON teams FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own teams"
  ON teams FOR UPDATE
  USING (auth.uid() = teacher_id);

