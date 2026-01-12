-- 회원 관리 시스템을 위한 RLS 정책 업데이트
-- status='active'이고 deleted_at이 NULL인 계정만 접근 가능하도록 설정
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- ============================================
-- 1. profiles 테이블 SELECT 정책 업데이트
-- ============================================
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users based on email" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- 새 정책 생성 (활성 계정만 조회 가능)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id 
    AND status = 'active' 
    AND deleted_at IS NULL
  );

-- ============================================
-- 2. 프로필 업데이트 정책 업데이트
-- ============================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id 
    AND status = 'active' 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = id 
    AND status = 'active' 
    AND deleted_at IS NULL
  );

-- ============================================
-- 3. 프로필 삽입 정책 (새 계정 생성)
-- ============================================
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. 현재 정책 확인 쿼리
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
