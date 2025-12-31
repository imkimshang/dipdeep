-- 팀 프로젝트 접근을 위한 RLS 정책 수정 (대안 방법)
-- JWT 함수가 작동하지 않는 경우 이 방법을 사용하세요.
-- 
-- 이 방법은 RLS 정책을 더 단순하게 만들고, 실제 검증은 애플리케이션 레벨에서 수행합니다.

-- 기존 정책 확인 및 삭제
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can read team projects they are members of" ON projects;
DROP POLICY IF EXISTS "Users can update team projects they are members of" ON projects;

-- 임시: 모든 팀 프로젝트 조회 허용 (보안상 위험하므로 나중에 제한 필요)
-- 실제로는 서버 사이드 API에서 검증을 수행하므로, RLS는 기본적인 보호만 제공
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_team = TRUE  -- 팀 프로젝트는 모두 조회 가능 (애플리케이션 레벨에서 검증)
  );

-- 업데이트는 작성자만 가능
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (
    auth.uid() = user_id  -- 작성자만 수정 가능
  )
  WITH CHECK (
    auth.uid() = user_id
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

-- 주의: 이 방법은 보안이 약하므로, 반드시 애플리케이션 레벨(API Route)에서
-- member_emails 검증을 수행해야 합니다.

