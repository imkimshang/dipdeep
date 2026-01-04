-- 환영 크레딧 지급 로직 업데이트
-- 처음 50명: 500 크레딧, 이후: 100 크레딧
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

CREATE OR REPLACE FUNCTION give_welcome_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  credit_amount INTEGER;
  credit_description TEXT;
  user_created_at TIMESTAMPTZ;
BEGIN
  -- 현재 사용자의 created_at 가져오기 (auth.users에서)
  SELECT created_at INTO user_created_at
  FROM auth.users
  WHERE id = NEW.id;
  
  -- created_at이 없으면 NOW() 사용 (안전장치)
  IF user_created_at IS NULL THEN
    user_created_at := NOW();
  END IF;
  
  -- 기존 사용자 수 확인 (현재 사용자 포함)
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE created_at <= user_created_at;
  
  -- 처음 50명은 500 크레딧, 이후는 100 크레딧
  IF user_count <= 50 THEN
    credit_amount := 500;
    credit_description := '신규 가입 환영 크레딧 (초기 50명 특별 혜택)';
  ELSE
    credit_amount := 100;
    credit_description := '신규 가입 환영 크레딧';
  END IF;
  
  -- 신규 사용자에게 크레딧 지급
  UPDATE profiles 
  SET credit_balance = credit_amount 
  WHERE id = NEW.id AND credit_balance = 0;
  
  -- 거래 로그 기록 (에러 발생 시 무시)
  BEGIN
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (NEW.id, 'CHARGE', credit_amount, credit_description);
  EXCEPTION
    WHEN OTHERS THEN
      -- transactions 테이블이 없거나 오류 발생 시 무시
      RAISE NOTICE '거래 로그 기록 실패: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 모든 오류를 캐치하여 프로필 생성이 실패하지 않도록 함
    RAISE WARNING '환영 크레딧 지급 실패: %', SQLERRM;
    -- 기본값으로 100 크레딧 지급 시도
    BEGIN
      UPDATE profiles 
      SET credit_balance = 100 
      WHERE id = NEW.id AND credit_balance = 0;
    EXCEPTION
      WHEN OTHERS THEN
        -- 이것도 실패하면 그냥 넘어감
        NULL;
    END;
    RETURN NEW;
END;
$$;

-- 트리거는 이미 존재하므로 재생성 불필요
-- DROP TRIGGER IF EXISTS trigger_give_welcome_credits ON profiles;
-- CREATE TRIGGER trigger_give_welcome_credits
--   AFTER INSERT ON profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION give_welcome_credits();

-- 현재 사용자 수 확인
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN credit_balance >= 500 THEN 1 END) as users_with_500_credits,
  COUNT(CASE WHEN credit_balance = 100 THEN 1 END) as users_with_100_credits
FROM profiles;

