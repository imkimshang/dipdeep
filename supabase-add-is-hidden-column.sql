-- 프로젝트 숨김 기능을 위한 컬럼 추가

-- 1. projects 테이블에 is_hidden 컬럼 추가
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 2. 인덱스 생성 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_projects_is_hidden ON projects(is_hidden);

-- 3. 기존 데이터는 모두 숨김 해제 상태로 설정
UPDATE projects SET is_hidden = FALSE WHERE is_hidden IS NULL;

-- 확인 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name = 'is_hidden';

