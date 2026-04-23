-- ============================================================
-- pgTAP: photographer_applications 확장 컬럼 검증 (Task 4, Plan 04-01)
-- 031_photographer_apps_extend.sql — team_id/activity_links/activity_plan
-- ============================================================

BEGIN;
SELECT plan(5);

SELECT has_column('public', 'photographer_applications', 'team_id', 'team_id 컬럼 존재');
SELECT has_column('public', 'photographer_applications', 'activity_links', 'activity_links 컬럼 존재');
SELECT has_column('public', 'photographer_applications', 'activity_plan', 'activity_plan 컬럼 존재');

-- ── Setup: user 생성 (public.users FK 필요) ────────────────
INSERT INTO auth.users (id, email) VALUES ('44444444-4444-4444-4444-444444444444', 'apps@e.com');

-- activity_links CHECK ≤ 3
SELECT lives_ok(
  $$INSERT INTO public.photographer_applications (user_id, activity_links, activity_plan)
    VALUES ('44444444-4444-4444-4444-444444444444', ARRAY['a','b','c']::TEXT[], 'plan')$$,
  'activity_links 3개 허용'
);

SELECT throws_ok(
  $$INSERT INTO public.photographer_applications (user_id, activity_links, activity_plan)
    VALUES ('44444444-4444-4444-4444-444444444444', ARRAY['a','b','c','d']::TEXT[], 'plan')$$,
  '23514',
  NULL,
  'activity_links 4개 CHECK 실패'
);

SELECT * FROM finish();
ROLLBACK;
