-- 안전한 단계별 RLS 정책 설정
-- 각 섹션을 하나씩 실행하세요.

-- ============================================
-- 1단계: projects 테이블 정책 (가장 중요!)
-- ============================================
-- 프로젝트 생성 권한
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 프로젝트 조회 권한
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- 프로젝트 수정 권한
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 2단계: project_steps 테이블 정책
-- ============================================
-- 프로젝트 단계 생성 권한
CREATE POLICY "Users can insert own project steps"
  ON project_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 프로젝트 단계 조회 권한
CREATE POLICY "Users can view own project steps"
  ON project_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 프로젝트 단계 수정 권한
CREATE POLICY "Users can update own project steps"
  ON project_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- 3단계: profiles 테이블 정책 (선택사항)
-- ============================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


