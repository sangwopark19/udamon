-- ============================================================
-- 031_photographer_apps_extend.sql
-- photographer_applications 컬럼 추가 (D-07)
-- - team_id: 신청자 대표 팀 (우선 승인 트리거 가 사용)
-- - activity_links: 외부 활동 URL 최대 3개
-- - activity_plan: 활동 계획 자유 텍스트
-- ============================================================

ALTER TABLE public.photographer_applications
  ADD COLUMN team_id UUID REFERENCES public.teams(id),
  ADD COLUMN activity_links TEXT[] NOT NULL DEFAULT '{}'
    CHECK (array_length(activity_links, 1) IS NULL OR array_length(activity_links, 1) <= 3),
  ADD COLUMN activity_plan TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_photographer_apps_team ON public.photographer_applications(team_id)
  WHERE team_id IS NOT NULL;

COMMENT ON COLUMN public.photographer_applications.team_id IS
  '신청자가 대표 팀으로 지정한 팀 UUID (optional, 승인 트리거에서 photographers.team_id fallback 기준)';
COMMENT ON COLUMN public.photographer_applications.activity_links IS
  '외부 활동 URL 배열 (Instagram/X/YouTube 등), 최대 3개';
COMMENT ON COLUMN public.photographer_applications.activity_plan IS
  '신청자의 활동 계획 자유 텍스트';
