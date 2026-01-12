-- profiles 테이블에 관심분야 필드 추가 및 경력 필드 유지 (기존 데이터 호환성)
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- 1. interest_fields 컬럼 추가 (TEXT 배열 타입)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS interest_fields TEXT[];

-- 2. 기존 experience 데이터가 있으면 interest_fields에 마이그레이션 (선택사항)
-- UPDATE profiles 
-- SET interest_fields = ARRAY[experience]
-- WHERE experience IS NOT NULL AND experience != '' AND interest_fields IS NULL;

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_interest_fields ON profiles USING GIN(interest_fields);

-- 4. 현재 스키마 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('experience', 'interest_fields')
ORDER BY column_name;

