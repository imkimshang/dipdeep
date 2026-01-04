-- ============================================
-- D.I.P Deep 크레딧 과금 시스템 스키마
-- ============================================

-- 1. profiles 테이블에 credit_balance 컬럼 추가 (이미 존재하는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'credit_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credit_balance INTEGER DEFAULT 0 NOT NULL;
    COMMENT ON COLUMN profiles.credit_balance IS '현재 크레딧 잔액 (기본값: 0)';
  END IF;
END $$;

-- 2. transactions 테이블 생성 (거래 내역)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CHARGE', 'SPEND', 'REFUND')),
  amount INTEGER NOT NULL, -- 양수: 충전, 음수: 사용
  item_type TEXT CHECK (item_type IN ('WORKBOOK', 'PROMPT', 'PROPOSAL', 'PROPOSAL_CREATE')),
  item_id TEXT, -- 예: 'session1', 'proposal_prompt' 등
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

COMMENT ON TABLE transactions IS '크레딧 거래 내역 (불변 로그)';
COMMENT ON COLUMN transactions.type IS '거래 유형: CHARGE(충전), SPEND(사용), REFUND(환불)';
COMMENT ON COLUMN transactions.amount IS '거래 금액 (양수: 충전, 음수: 사용)';

-- 3. purchased_items 테이블 생성 (구매 목록)
CREATE TABLE IF NOT EXISTS purchased_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL, -- 예: 'session1', 'session2' 등
  item_type TEXT NOT NULL CHECK (item_type IN ('WORKBOOK', 'PROMPT', 'PROPOSAL', 'PROPOSAL_CREATE')),
  purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, item_id, item_type) -- 중복 구매 방지
);

CREATE INDEX IF NOT EXISTS idx_purchased_items_user_id ON purchased_items(user_id);
CREATE INDEX IF NOT EXISTS idx_purchased_items_item ON purchased_items(user_id, item_id, item_type);

COMMENT ON TABLE purchased_items IS '사용자 구매(해금) 목록';
COMMENT ON COLUMN purchased_items.item_id IS '항목 ID (예: session1, session2, proposal_prompt 등)';

-- 4. user_workbooks 테이블 생성 (워크북 데이터 - 기존 project_steps와 별도로 관리)
-- 참고: 기존 project_steps 테이블이 있으므로 이 테이블은 선택사항입니다.
-- 필요시 기존 project_steps를 사용하거나, 별도로 관리할 수 있습니다.
CREATE TABLE IF NOT EXISTS user_workbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL CHECK (session_number >= 1 AND session_number <= 12),
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, project_id, session_number)
);

CREATE INDEX IF NOT EXISTS idx_user_workbooks_user_project ON user_workbooks(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_user_workbooks_session ON user_workbooks(user_id, project_id, session_number);

COMMENT ON TABLE user_workbooks IS '사용자 워크북 세션별 데이터';

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- profiles 테이블 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- transactions 테이블 RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE는 RPC 함수로만 처리 (클라이언트에서 직접 불가)
-- RPC 함수는 security definer로 실행되므로 RLS를 우회합니다.

-- purchased_items 테이블 RLS
ALTER TABLE purchased_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchases" ON purchased_items;
CREATE POLICY "Users can view own purchases"
  ON purchased_items FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT는 RPC 함수로만 처리

-- user_workbooks 테이블 RLS
ALTER TABLE user_workbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own workbooks" ON user_workbooks;
CREATE POLICY "Users can manage own workbooks"
  ON user_workbooks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RPC 함수: 크레딧 구매 및 차감
-- ============================================

-- 구매 함수 (워크북 해금, 프롬프트 등)
CREATE OR REPLACE FUNCTION purchase_item(
  item_id_input TEXT,
  item_type_input TEXT,
  cost INTEGER,
  description_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- 관리자 권한으로 실행 (RLS 우회)
AS $$
DECLARE
  current_balance INTEGER;
  user_id_val UUID;
  purchase_description TEXT;
BEGIN
  -- 현재 사용자 ID 가져오기
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다.';
  END IF;

  -- 1. 잔액 확인
  SELECT credit_balance INTO current_balance 
  FROM profiles 
  WHERE id = user_id_val;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION '프로필을 찾을 수 없습니다.';
  END IF;
  
  IF current_balance < cost THEN
    RAISE EXCEPTION '잔액이 부족합니다. (현재: %, 필요: %)', current_balance, cost;
  END IF;

  -- 2. 이미 구매했는지 확인 (워크북의 경우만)
  IF item_type_input = 'WORKBOOK' THEN
    IF EXISTS (
      SELECT 1 FROM purchased_items 
      WHERE user_id = user_id_val 
        AND item_id = item_id_input 
        AND item_type = item_type_input
    ) THEN
      RAISE EXCEPTION '이미 구매한 항목입니다.';
    END IF;
  END IF;

  -- 3. 잔액 차감
  UPDATE profiles 
  SET credit_balance = credit_balance - cost 
  WHERE id = user_id_val;

  -- 4. 구매 기록 (워크북의 경우만)
  IF item_type_input = 'WORKBOOK' THEN
    INSERT INTO purchased_items (user_id, item_id, item_type)
    VALUES (user_id_val, item_id_input, item_type_input)
    ON CONFLICT (user_id, item_id, item_type) DO NOTHING;
  END IF;

  -- 5. 거래 로그 기록
  purchase_description := COALESCE(description_input, 
    CASE item_type_input
      WHEN 'WORKBOOK' THEN '워크북 해금: ' || item_id_input
      WHEN 'PROMPT' THEN '제안서 프롬프트 생성'
      WHEN 'PROPOSAL_CREATE' THEN '제안서 자동 제작'
      ELSE '항목 구매: ' || item_id_input
    END
  );
  
  INSERT INTO transactions (user_id, type, amount, item_type, item_id, description)
  VALUES (user_id_val, 'SPEND', -cost, item_type_input, item_id_input, purchase_description);

  -- 6. 업데이트된 잔액 반환
  SELECT credit_balance INTO current_balance 
  FROM profiles 
  WHERE id = user_id_val;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', current_balance,
    'message', '구매가 완료되었습니다.'
  );
END;
$$;

COMMENT ON FUNCTION purchase_item IS '크레딧을 사용하여 항목을 구매하는 함수';

-- 크레딧 충전 함수 (관리자용 또는 결제 시스템 연동용)
CREATE OR REPLACE FUNCTION charge_credits(
  user_id_input UUID,
  amount INTEGER,
  description_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  IF amount <= 0 THEN
    RAISE EXCEPTION '충전 금액은 0보다 커야 합니다.';
  END IF;

  -- 잔액 증가
  UPDATE profiles 
  SET credit_balance = credit_balance + amount 
  WHERE id = user_id_input
  RETURNING credit_balance INTO current_balance;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION '사용자를 찾을 수 없습니다.';
  END IF;

  -- 거래 로그 기록
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    user_id_input, 
    'CHARGE', 
    amount, 
    COALESCE(description_input, '크레딧 충전')
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', current_balance,
    'message', '충전이 완료되었습니다.'
  );
END;
$$;

COMMENT ON FUNCTION charge_credits IS '크레딧을 충전하는 함수 (관리자 또는 결제 시스템용)';

-- ============================================
-- 초기 데이터 설정 (선택사항)
-- ============================================

-- 신규 사용자에게 기본 크레딧 지급 (100 크레딧)
-- 이 함수는 profiles 테이블에 INSERT 트리거로 자동 실행되도록 설정할 수 있습니다.

CREATE OR REPLACE FUNCTION give_welcome_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 신규 사용자에게 100 크레딧 지급
  UPDATE profiles 
  SET credit_balance = 100 
  WHERE id = NEW.id AND credit_balance = 0;
  
  -- 거래 로그 기록
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (NEW.id, 'CHARGE', 100, '신규 가입 환영 크레딧');
  
  RETURN NEW;
END;
$$;

-- 트리거 생성 (profiles 테이블에 새 사용자 추가 시 자동 실행)
DROP TRIGGER IF EXISTS trigger_give_welcome_credits ON profiles;
CREATE TRIGGER trigger_give_welcome_credits
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION give_welcome_credits();

