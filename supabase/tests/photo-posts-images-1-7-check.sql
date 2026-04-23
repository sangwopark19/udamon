-- ============================================================
-- pgTAP: photo_posts.images CHECK 1~7 변경 검증 (Task 1, Plan 04-01)
-- 029_photo_posts_videos.sql 의 ALTER TABLE images CHECK 변경
-- ============================================================

BEGIN;
SELECT plan(2);

-- ── Setup ─────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES ('66666666-6666-6666-6666-666666666666', 'pi@e.com');
INSERT INTO public.photographers (id, user_id, display_name, team_id)
  VALUES (
    '66666666-6666-6666-6666-666666666600',
    '66666666-6666-6666-6666-666666666666',
    'PITest',
    (SELECT id FROM public.teams WHERE slug = 'ssg')
  );

SELECT lives_ok(
  $$INSERT INTO public.photo_posts (photographer_id, team_id, title, images)
    VALUES (
      '66666666-6666-6666-6666-666666666600',
      (SELECT id FROM public.teams WHERE slug='ssg'),
      'it1',
      ARRAY['u1','u2','u3','u4','u5','u6','u7']::TEXT[]
    )$$,
  'images 7장 허용'
);

SELECT throws_ok(
  $$INSERT INTO public.photo_posts (photographer_id, team_id, title, images)
    VALUES (
      '66666666-6666-6666-6666-666666666600',
      (SELECT id FROM public.teams WHERE slug='ssg'),
      'it2',
      ARRAY['u1','u2','u3','u4','u5','u6','u7','u8']::TEXT[]
    )$$,
  '23514',
  NULL,
  'images 8장 CHECK 실패'
);

SELECT * FROM finish();
ROLLBACK;
