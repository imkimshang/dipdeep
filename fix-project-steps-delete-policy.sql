-- project_steps 테이블에 DELETE 정책 추가
-- 프로젝트 삭제 시 project_steps도 삭제할 수 있도록 필요

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Users can delete own project steps" ON project_steps;

-- 새 정책 생성
CREATE POLICY "Users can delete own project steps"
  ON project_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );


