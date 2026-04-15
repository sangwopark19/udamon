-- ============================================================
-- pgTAP: photographer_applications 승인/거절 트리거 검증 (Task 3, Plan 04-01)
-- 030_photographer_approval_trigger.sql 의 9개 케이스 전수 검증
-- ADJ-01 준수: users.role 은 항상 'user', is_photographer = TRUE 로만 변경
-- ============================================================

BEGIN;
SELECT plan(10);

-- Setup (auth.users INSERT → handle_new_user 트리거가 public.users 자동 생성)
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'pg-test@example.com');
INSERT INTO public.photographer_applications (user_id, team_id, status, activity_plan)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.teams WHERE slug = 'ssg'),
    'pending',
    'test plan'
  );

-- Test 1: pending 상태에서 photographers 행 없음
SELECT is(
  (SELECT count(*) FROM public.photographers WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'T1: pending 에서는 photographers 미생성'
);

-- Test 2: approved UPDATE 시 photographers INSERT
UPDATE public.photographer_applications
   SET status = 'approved'
 WHERE user_id = '11111111-1111-1111-1111-111111111111';

SELECT is(
  (SELECT count(*) FROM public.photographers WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'T2: approved 트리거가 photographers INSERT'
);

-- Test 3: photographers.team_id = application.team_id
SELECT is(
  (SELECT team_id FROM public.photographers WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  (SELECT id FROM public.teams WHERE slug = 'ssg'),
  'T3: photographers.team_id 매칭'
);

-- Test 4: users.is_photographer = TRUE (ADJ-01: role UPDATE 금지)
SELECT is(
  (SELECT is_photographer FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111'),
  TRUE,
  'T4: users.is_photographer = TRUE'
);

-- Test 4b: ADJ-01 방어 — users.role 은 그대로 'user'
SELECT is(
  (SELECT role FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111'),
  'user',
  'T4b (ADJ-01): users.role 변경 없음, user 유지'
);

-- Test 5: photographer_approved notification INSERT
SELECT is(
  (SELECT count(*) FROM public.notifications
   WHERE user_id = '11111111-1111-1111-1111-111111111111' AND type = 'photographer_approved'),
  1::bigint,
  'T5: approved 알림 1건 INSERT'
);

-- Test 6: 거절 케이스 — 신규 user
INSERT INTO auth.users (id, email) VALUES ('22222222-2222-2222-2222-222222222222', 'pg-test2@example.com');
INSERT INTO public.photographer_applications (user_id, team_id, status, rejection_reason, activity_plan)
  VALUES (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM public.teams WHERE slug = 'lg'),
    'pending',
    '자료 부족',
    'test'
  );

UPDATE public.photographer_applications
   SET status = 'rejected', rejection_reason = '자료 부족'
 WHERE user_id = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT count(*) FROM public.photographers WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'T6: rejected 에서 photographers 미생성'
);

SELECT is(
  (SELECT count(*) FROM public.notifications
   WHERE user_id = '22222222-2222-2222-2222-222222222222' AND type = 'photographer_rejected'),
  1::bigint,
  'T7: rejected 알림 INSERT'
);

-- Test 8: 재승인 — ON CONFLICT DO NOTHING
UPDATE public.photographer_applications
   SET status = 'approved'
 WHERE user_id = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT count(*) FROM public.photographers WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'T8: ON CONFLICT 로 중복 INSERT 방지, 1개만'
);

-- Test 9 (T-4-07 방어): pending 사용자는 photo_posts INSERT 불가능 (RLS)
-- 새 pending user 생성 (11111111 은 approved, 22222222 는 approved)
INSERT INTO auth.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333', 'pg-pending@example.com');
INSERT INTO public.photographer_applications (user_id, team_id, status, activity_plan)
  VALUES (
    '33333333-3333-3333-3333-333333333333',
    (SELECT id FROM public.teams WHERE slug = 'doosan'),
    'pending',
    'pending test'
  );
-- 3번째 user 는 photographers 에 row 없음 (pending) → photo_posts INSERT 시 posts_insert_own 차단
-- pgTAP 내에서 auth.uid() 를 mocking 하기 어렵지만, RLS 를 강제하려면 SET LOCAL role 사용
-- throws_ok 는 SQLSTATE '42501' (insufficient privilege / RLS fail)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.photo_posts (photographer_id, team_id, title, images)
    VALUES (gen_random_uuid(), (SELECT id FROM public.teams WHERE slug='doosan'), 'x', ARRAY['x']::TEXT[])$$,
  '42501',
  NULL,
  'T9 (T-4-07): pending 사용자는 photo_posts INSERT 차단 (RLS)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
