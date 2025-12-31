-- profiles 테이블 INSERT RLS 정책 수정
-- 회원가입 시 profiles 테이블에 자동으로 INSERT할 수 있도록 설정

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 새 정책 생성 (auth.uid()가 id와 일치하면 INSERT 허용)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS가 활성화되어 있는지 확인
-- (이미 활성화되어 있으면 오류가 나지만 무시해도 됨)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 정책 확인
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
WHERE tablename = 'profiles';

