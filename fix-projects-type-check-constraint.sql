-- projects 테이블의 type 컬럼 체크 제약 조건 수정
-- 'story'를 'event'로 변경하여 'webapp', 'event', 'product'만 허용

-- ============================================
-- 1. 현재 제약 조건 확인
-- ============================================
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.projects'::regclass
  AND contype = 'c'
  AND conname LIKE '%type%';

-- ============================================
-- 2. 기존 제약 조건 삭제
-- ============================================
-- 제약 조건 이름을 확인한 후 (위 쿼리 결과로 확인)
-- 일반적으로 'projects_type_check' 또는 유사한 이름일 수 있습니다
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_type_check;

-- 또는 다른 이름일 수 있으므로, 다음으로도 시도 가능:
-- ALTER TABLE public.projects 
-- DROP CONSTRAINT IF EXISTS projects_type_check_1;

-- 모든 type 관련 체크 제약 조건을 찾아서 삭제하는 방법:
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.projects'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%type%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- ============================================
-- 3. 새로운 제약 조건 생성 (webapp, event, product 허용)
-- ============================================
ALTER TABLE public.projects 
ADD CONSTRAINT projects_type_check 
CHECK (type IN ('webapp', 'event', 'product') OR type IS NULL);

-- ============================================
-- 4. 제약 조건 확인
-- ============================================
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.projects'::regclass
  AND contype = 'c'
  AND conname LIKE '%type%';

