-- 특정 사용자에게 크레딧 지급
-- 이메일: imkimshang@gmail.com
-- 크레딧: 10,000,000

-- 1. 사용자 ID 확인
SELECT id, email 
FROM auth.users 
WHERE email = 'imkimshang@gmail.com';

-- 2. 크레딧 업데이트 및 거래 로그 기록
DO $$
DECLARE
  target_user_id UUID;
  current_balance INTEGER;
BEGIN
  -- 사용자 ID 가져오기
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'imkimshang@gmail.com';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '사용자를 찾을 수 없습니다: imkimshang@gmail.com';
  END IF;

  -- 현재 잔액 확인
  SELECT credit_balance INTO current_balance
  FROM profiles
  WHERE id = target_user_id;

  -- 크레딧 업데이트
  UPDATE profiles 
  SET credit_balance = 10000000
  WHERE id = target_user_id;

  -- 거래 로그 기록 (충전)
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    target_user_id,
    'CHARGE',
    10000000 - COALESCE(current_balance, 0),
    '관리자 크레딧 지급 (10,000,000)'
  );

  RAISE NOTICE '크레딧이 성공적으로 업데이트되었습니다. 사용자 ID: %, 크레딧: 10,000,000', target_user_id;
END $$;

-- 3. 확인
SELECT 
  u.email,
  p.credit_balance,
  p.username,
  p.full_name
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'imkimshang@gmail.com';

