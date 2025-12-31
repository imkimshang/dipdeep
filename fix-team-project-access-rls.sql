-- 팀 프로젝트 접근을 위한 RLS 정책 수정
-- 팀 코드로 프로젝트를 검색하고 접근할 수 있도록 정책 추가
-- 
-- 주의: auth 스키마에 직접 접근할 수 없으므로, JWT에서 이메일을 추출하거나
-- public 스키마에 함수를 생성하여 사용합니다.

-- 기존 정책 확인 및 삭제
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can read team projects they are members of" ON projects;
DROP POLICY IF EXISTS "Users can update team projects they are members of" ON projects;

-- 이메일 확인을 위한 함수 생성 (public 스키마에 생성)
-- 주의: auth 스키마에 직접 접근할 수 없으므로 JWT에서만 이메일을 추출합니다.
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- JWT에서 이메일 추출 (Supabase는 JWT에 이메일을 포함시킵니다)
  RETURN (auth.jwt() ->> 'email');
END;
$$;

-- 새 SELECT 정책: 자신의 프로젝트 또는 팀원인 팀 프로젝트 조회 가능
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id OR
    (
      is_team = TRUE AND
      public.get_user_email() = ANY(member_emails)
    )
  );

-- 새 UPDATE 정책: 자신의 프로젝트 또는 팀원인 팀 프로젝트 수정 가능
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (
    auth.uid() = user_id OR
    (
      is_team = TRUE AND
      public.get_user_email() = ANY(member_emails)
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    (
      is_team = TRUE AND
      public.get_user_email() = ANY(member_emails)
    )
  );

-- 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

