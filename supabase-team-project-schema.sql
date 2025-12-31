-- 팀 프로젝트 협업 시스템을 위한 데이터베이스 스키마 업데이트

-- 1. projects 테이블에 협업 관련 컬럼 추가
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS is_team BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS member_emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_editor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. team_code 생성 함수 (8자리 고유 난수 코드: DP-XXXXXX 형식)
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- I, O, 0, 1 제외
  code TEXT := 'DP-';
  i INTEGER;
  random_char TEXT;
BEGIN
  -- 6자리 랜덤 코드 생성
  FOR i IN 1..6 LOOP
    random_char := SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    code := code || random_char;
  END LOOP;
  
  -- 중복 확인 및 재생성
  WHILE EXISTS (SELECT 1 FROM projects WHERE team_code = code) LOOP
    code := 'DP-';
    FOR i IN 1..6 LOOP
      random_char := SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
      code := code || random_char;
    END LOOP;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 3. team_code 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION set_team_code()
RETURNS TRIGGER AS $$
BEGIN
  -- is_team이 true이고 team_code가 없을 때만 생성
  IF NEW.is_team = TRUE AND (NEW.team_code IS NULL OR NEW.team_code = '') THEN
    NEW.team_code := generate_team_code();
  END IF;
  
  -- is_team이 false일 때 team_code 초기화
  IF NEW.is_team = FALSE THEN
    NEW.team_code := NULL;
    NEW.member_emails := '{}';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 트리거 생성
DROP TRIGGER IF EXISTS trigger_set_team_code ON projects;
CREATE TRIGGER trigger_set_team_code
BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_team_code();

-- 5. 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_projects_team_code ON projects(team_code);
CREATE INDEX IF NOT EXISTS idx_projects_is_team ON projects(is_team);
CREATE INDEX IF NOT EXISTS idx_projects_last_editor_id ON projects(last_editor_id);

-- 6. RLS 정책 업데이트 (팀 프로젝트 접근 권한)
-- 기존 정책 확인 후 필요시 추가

-- 팀 프로젝트 읽기 권한: 작성자 또는 member_emails에 포함된 사용자
CREATE POLICY IF NOT EXISTS "Users can read team projects they are members of"
ON projects
FOR SELECT
USING (
  auth.uid() = user_id OR
  (is_team = TRUE AND auth.email() = ANY(member_emails))
);

-- 팀 프로젝트 업데이트 권한: 작성자 또는 member_emails에 포함된 사용자
CREATE POLICY IF NOT EXISTS "Users can update team projects they are members of"
ON projects
FOR UPDATE
USING (
  auth.uid() = user_id OR
  (is_team = TRUE AND auth.email() = ANY(member_emails))
)
WITH CHECK (
  auth.uid() = user_id OR
  (is_team = TRUE AND auth.email() = ANY(member_emails))
);

-- 확인 쿼리
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('is_team', 'team_code', 'member_emails', 'last_editor_id')
ORDER BY column_name;

