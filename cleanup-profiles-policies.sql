-- profiles 테이블 중복 정책 정리
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- 중복된 정책 제거
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- 필요한 정책만 유지 (이미 존재하는 정책은 유지)
-- 다음 정책들이 있어야 합니다:
-- 1. "Users can view own profile" (SELECT)
-- 2. "Users can insert own profile" (INSERT)
-- 3. "Users can update own profile" (UPDATE)

-- 만약 위 정책이 없다면 다시 생성
DO $$
BEGIN
  -- INSERT 정책 확인 및 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;

  -- UPDATE 정책 확인 및 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  -- SELECT 정책 확인 및 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- 최종 정책 확인
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

