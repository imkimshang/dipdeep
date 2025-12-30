-- Supabase Row Level Security (RLS) 정책 설정 가이드
-- 이 파일의 SQL 명령어들을 Supabase SQL Editor에서 실행하세요.

-- 1. profiles 테이블 RLS 정책
-- 사용자가 자신의 프로필을 읽고 수정할 수 있도록 허용
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. projects 테이블 RLS 정책
-- 사용자가 자신의 프로젝트를 생성할 수 있도록 허용
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 프로젝트를 조회할 수 있도록 허용
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자가 자신의 프로젝트를 수정할 수 있도록 허용
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자가 자신의 프로젝트를 삭제할 수 있도록 허용
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- 교사가 자신의 팀 프로젝트를 조회할 수 있도록 허용
CREATE POLICY "Teachers can view team projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = projects.team_id
      AND teams.teacher_id = auth.uid()
    )
  );

-- 3. project_steps 테이블 RLS 정책
-- 사용자가 자신의 프로젝트 단계를 생성할 수 있도록 허용
CREATE POLICY "Users can insert own project steps"
  ON project_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 사용자가 자신의 프로젝트 단계를 조회할 수 있도록 허용
CREATE POLICY "Users can view own project steps"
  ON project_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 사용자가 자신의 프로젝트 단계를 수정할 수 있도록 허용
CREATE POLICY "Users can update own project steps"
  ON project_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 교사가 자신의 팀 프로젝트 단계를 조회할 수 있도록 허용
CREATE POLICY "Teachers can view team project steps"
  ON project_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      INNER JOIN teams ON teams.id = projects.team_id
      WHERE projects.id = project_steps.project_id
      AND teams.teacher_id = auth.uid()
    )
  );

-- 4. teams 테이블 RLS 정책 (교사용)
-- 교사가 자신의 팀을 생성할 수 있도록 허용
CREATE POLICY "Teachers can insert own teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- 교사가 자신의 팀을 조회할 수 있도록 허용
CREATE POLICY "Teachers can view own teams"
  ON teams FOR SELECT
  USING (auth.uid() = teacher_id);

-- 교사가 자신의 팀을 수정할 수 있도록 허용
CREATE POLICY "Teachers can update own teams"
  ON teams FOR UPDATE
  USING (auth.uid() = teacher_id);


