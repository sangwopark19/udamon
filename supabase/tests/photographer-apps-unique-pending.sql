-- ============================================================
-- pgTAP: photographer_applications partial unique pending index 검증 (HI-03, 033)
-- ============================================================

BEGIN;
SELECT plan(3);

-- Index 존재 확인
SELECT has_index(
  'public',
  'photographer_applications',
  'photographer_apps_unique_pending',
  'photographer_apps_unique_pending index 존재'
);

-- Setup: user 생성 (public.users FK 는 handle_new_user 트리거로 자동 생성됨)
INSERT INTO auth.users (id, email) VALUES
  ('55555555-5555-5555-5555-555555555555', 'unique-pending@e.com');

-- 첫 번째 pending INSERT 는 성공
SELECT lives_ok(
  $$INSERT INTO public.photographer_applications (user_id, activity_links, activity_plan, status)
    VALUES ('55555555-5555-5555-5555-555555555555', ARRAY[]::TEXT[], 'plan A', 'pending')$$,
  '첫 번째 pending INSERT 허용'
);

-- 두 번째 pending INSERT 는 sqlstate 23505 unique_violation 으로 거부
SELECT throws_ok(
  $$INSERT INTO public.photographer_applications (user_id, activity_links, activity_plan, status)
    VALUES ('55555555-5555-5555-5555-555555555555', ARRAY[]::TEXT[], 'plan B', 'pending')$$,
  '23505',
  NULL,
  '두 번째 pending INSERT 는 unique_violation (23505)'
);

SELECT * FROM finish();
ROLLBACK;
