-- 삭제된 계정 관련 RLS 정책 업데이트
-- 삭제된 계정(deleted_at이 있는 계정)은 조회되지 않도록 설정
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- 1. profiles 테이블 SELECT 정책 업데이트 (삭제된 계정 제외)
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users based on email" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- 새 정책 생성 (삭제되지 않은 계정만 조회 가능)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id AND (deleted_at IS NULL));

-- 2. 프로필 업데이트 정책도 삭제된 계정 제외
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id AND deleted_at IS NULL);

-- 3. 프로필 삽입 정책은 그대로 유지 (새 계정 생성)
-- DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- CREATE POLICY "Users can insert own profile"
--   ON profiles FOR INSERT
--   WITH CHECK (auth.uid() = id);

-- 4. 삭제된 계정 확인 쿼리
-- SELECT id, email, deleted_at 
-- FROM profiles 
-- WHERE deleted_at IS NOT NULL;

