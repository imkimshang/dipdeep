-- profiles 테이블에 deleted_at 컬럼 추가
-- 회원탈퇴 시 소프트 삭제를 위해 사용
-- 이 파일을 Supabase SQL Editor에서 실행하세요.

-- 1. deleted_at 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. 인덱스 추가 (삭제된 계정 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. 삭제된 계정은 조회되지 않도록 RLS 정책 확인
-- 기존 SELECT 정책이 deleted_at IS NULL 조건을 포함하도록 수정 필요

-- 4. 현재 스키마 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'deleted_at';

