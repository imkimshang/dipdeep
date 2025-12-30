-- 프로젝트 삭제 문제 해결을 위한 RLS 정책 확인 및 수정 스크립트

-- ============================================
-- 1. 현재 projects 테이블의 DELETE 정책 확인
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
WHERE tablename = 'projects' 
  AND cmd = 'DELETE';

-- ============================================
-- 2. 기존 DELETE 정책 삭제 및 재생성
-- ============================================

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- 새 정책 생성 (명확하게 USING 절 사용)
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. 정책이 제대로 생성되었는지 확인
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
WHERE tablename = 'projects' 
  AND cmd = 'DELETE';

-- ============================================
-- 4. project_steps DELETE 정책도 확인 (참고용)
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
WHERE tablename = 'project_steps' 
  AND cmd = 'DELETE';

