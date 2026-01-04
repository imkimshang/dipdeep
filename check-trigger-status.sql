-- 회원가입 에러 디버깅을 위한 스크립트
-- 이 파일을 Supabase SQL Editor에서 실행하여 트리거와 함수 상태를 확인하세요.

-- 1. 프로필 생성 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name = 'trigger_give_welcome_credits';

-- 2. give_welcome_credits 함수 확인
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'give_welcome_credits'
  AND routine_schema = 'public';

-- 3. 함수 문법 오류 확인 (함수를 다시 컴파일)
DO $$
BEGIN
  -- 함수가 정상적으로 컴파일되는지 확인
  PERFORM give_welcome_credits();
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '함수 실행 오류: %', SQLERRM;
END $$;

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
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. profiles 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

