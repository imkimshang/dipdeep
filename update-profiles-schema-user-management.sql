-- 회원 관리 시스템을 위한 profiles 테이블 스키마 업데이트
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- ============================================
-- 1. user_no 필드 추가 (숫자형 시퀀스)
-- ============================================
-- 시퀀스 생성
CREATE SEQUENCE IF NOT EXISTS profiles_user_no_seq;

-- user_no 컬럼 추가 (BIGINT, 자동 증가)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_no BIGINT;

-- 기존 레코드에 user_no 값 부여
UPDATE profiles 
SET user_no = nextval('profiles_user_no_seq')
WHERE user_no IS NULL;

-- user_no를 NOT NULL로 설정하고 기본값 설정
ALTER TABLE profiles 
ALTER COLUMN user_no SET DEFAULT nextval('profiles_user_no_seq'),
ALTER COLUMN user_no SET NOT NULL;

-- user_no에 UNIQUE 제약조건 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_no ON profiles(user_no);

-- ============================================
-- 2. status 필드 추가 ('active' 또는 'archived')
-- ============================================
-- status 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 기존 레코드는 모두 'active'로 설정
UPDATE profiles 
SET status = 'active'
WHERE status IS NULL;

-- status를 NOT NULL로 설정
ALTER TABLE profiles 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'active';

-- status에 CHECK 제약조건 추가
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'archived'));

-- status 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- ============================================
-- 3. withdrawn_at 필드 추가 (탈퇴 일자)
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

-- withdrawn_at 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_withdrawn_at ON profiles(withdrawn_at) WHERE withdrawn_at IS NOT NULL;

-- ============================================
-- 4. deleted_at 필드 확인 및 인덱스 추가 (이미 있을 수 있음)
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- deleted_at 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- 5. email 필드에 UNIQUE 제약조건 추가
-- ============================================
-- email이 이미 존재하는지 확인 후 UNIQUE 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON profiles(email) 
WHERE deleted_at IS NULL; -- 삭제되지 않은 계정만 unique

-- 또는 전체 email에 unique 제약조건 (선택사항)
-- ALTER TABLE profiles 
-- ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- ============================================
-- 6. created_at 필드 확인 및 추가 (필수 필드)
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 레코드에 created_at 값 부여 (없는 경우)
UPDATE profiles 
SET created_at = NOW()
WHERE created_at IS NULL;

-- created_at을 NOT NULL로 설정
ALTER TABLE profiles 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN created_at SET DEFAULT NOW();

-- created_at 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- ============================================
-- 7. name 필드 확인 (full_name 또는 name)
-- ============================================
-- full_name이 있으면 name으로 별칭 생성하거나, name 필드 추가
-- 현재 코드에서는 full_name을 사용하므로 그대로 유지

-- ============================================
-- 8. 현재 스키마 확인 쿼리
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('user_no', 'email', 'status', 'withdrawn_at', 'deleted_at', 'created_at', 'full_name')
ORDER BY column_name;
