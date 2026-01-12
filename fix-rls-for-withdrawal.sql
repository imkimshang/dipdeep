-- 회원탈퇴를 위한 RLS 정책 수정
-- UPDATE 정책에서 WITH CHECK 절을 수정하여 status 변경 허용
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- ============================================
-- 프로필 업데이트 정책 수정
-- ============================================
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 새 정책 생성
-- USING: 업데이트 대상이 자신의 활성 계정인지 확인
-- WITH CHECK: 업데이트 후에도 자신의 계정인지 확인 (status는 변경 가능)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id 
    AND status = 'active'  -- 업데이트 전에는 활성 계정이어야 함
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = id  -- 업데이트 후에도 자신의 계정이어야 함 (status는 변경 가능)
  );

-- ============================================
-- 정책 확인
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
  AND policyname = 'Users can update own profile';
