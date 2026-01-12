-- 회원탈퇴 시 모든 관련 데이터를 삭제하는 함수
-- 이 함수를 사용하면 더 안전하게 모든 데이터를 삭제할 수 있습니다.
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

CREATE OR REPLACE FUNCTION delete_user_data(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. project_steps 삭제 (projects를 통해)
  DELETE FROM project_steps
  WHERE project_id IN (
    SELECT id FROM projects WHERE user_id = user_id_to_delete
  );
  
  -- 2. projects 삭제
  DELETE FROM projects
  WHERE user_id = user_id_to_delete;
  
  -- 3. user_workbooks 삭제
  DELETE FROM user_workbooks
  WHERE user_id = user_id_to_delete;
  
  -- 4. transactions 삭제 (ON DELETE CASCADE로 자동 삭제되지만 명시적으로 삭제)
  DELETE FROM transactions
  WHERE user_id = user_id_to_delete;
  
  -- 5. purchased_items 삭제 (ON DELETE CASCADE로 자동 삭제되지만 명시적으로 삭제)
  DELETE FROM purchased_items
  WHERE user_id = user_id_to_delete;
  
  -- 6. profiles 삭제 (마지막)
  DELETE FROM profiles
  WHERE id = user_id_to_delete;
  
  -- 참고: auth.users는 Supabase Admin API로만 삭제 가능
  -- 또는 Supabase 대시보드에서 수동으로 삭제해야 합니다.
END;
$$;

-- 함수 사용 예시:
-- SELECT delete_user_data('사용자-UUID-여기');

-- 함수 삭제 (필요시):
-- DROP FUNCTION IF EXISTS delete_user_data(UUID);

