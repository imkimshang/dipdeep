-- profiles 테이블 RLS 정책 최종 수정
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- 1. 모든 기존 정책 제거 (중복 제거)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- 2. RLS 활성화 확인
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. 필수 정책 생성
-- SELECT: 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT: 자신의 프로필만 생성 가능 (회원가입 시 필요)
-- 중요: WITH CHECK 조건으로 auth.uid() = id를 확인
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 5. RLS 활성화 상태 확인
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

