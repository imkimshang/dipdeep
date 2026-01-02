-- 워크북 데이터 상태 확인 SQL 쿼리
-- Supabase SQL Editor에서 실행하여 데이터 존재 여부 확인

-- 1. 모든 프로젝트의 워크북 데이터 개수 확인
SELECT 
  p.id as project_id,
  p.title as project_title,
  p.type as project_type,
  COUNT(ps.id) as step_count,
  MAX(ps.updated_at) as last_updated
FROM projects p
LEFT JOIN project_steps ps ON p.id = ps.project_id
GROUP BY p.id, p.title, p.type
ORDER BY last_updated DESC NULLS LAST;

-- 2. 특정 프로젝트의 상세 데이터 확인 (project_id를 실제 ID로 변경)
-- SELECT 
--   step_number,
--   CASE 
--     WHEN step_data IS NULL THEN 'NULL'
--     WHEN step_data::text = '{}' THEN 'EMPTY OBJECT'
--     WHEN step_data::text = 'null' THEN 'NULL STRING'
--     ELSE 'HAS DATA'
--   END as data_status,
--   LENGTH(step_data::text) as data_size,
--   created_at,
--   updated_at
-- FROM project_steps
-- WHERE project_id = 'YOUR_PROJECT_ID_HERE'
-- ORDER BY step_number;

-- 3. 빈 데이터가 있는 프로젝트 확인
SELECT 
  ps.project_id,
  p.title,
  ps.step_number,
  ps.step_data
FROM project_steps ps
JOIN projects p ON ps.project_id = p.id
WHERE ps.step_data IS NULL 
   OR ps.step_data::text = '{}'
   OR ps.step_data::text = 'null'
ORDER BY ps.project_id, ps.step_number;

-- 4. RLS 정책 확인
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
WHERE tablename IN ('projects', 'project_steps')
ORDER BY tablename, policyname;

