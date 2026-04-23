-- ============================================================
-- pgTAP: photo_posts.videos CHECK 제약 검증 (Task 1, Plan 04-01)
-- 029_photo_posts_videos.sql 의 videos TEXT[] 1~3 CHECK
-- ============================================================

BEGIN;
SELECT plan(3);

-- ── Setup: auth.users + photographer (INSERT 에 필수) ─────
INSERT INTO auth.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555', 'pv@e.com');
INSERT INTO public.photographers (id, user_id, display_name, team_id)
  VALUES (
    '55555555-5555-5555-5555-555555555500',
    '55555555-5555-5555-5555-555555555555',
    'PVTest',
    (SELECT id FROM public.teams WHERE slug = 'ssg')
  );

-- videos 0개 (DEFAULT '{}') INSERT 허용
SELECT lives_ok(
  $$INSERT INTO public.photo_posts (photographer_id, team_id, title, images)
    VALUES (
      '55555555-5555-5555-5555-555555555500',
      (SELECT id FROM public.teams WHERE slug='ssg'),
      'vt1',
      ARRAY['u']::TEXT[]
    )$$,
  'videos DEFAULT {} INSERT 허용'
);

-- videos 3개 CHECK 허용
SELECT lives_ok(
  $$INSERT INTO public.photo_posts (photographer_id, team_id, title, images, videos)
    VALUES (
      '55555555-5555-5555-5555-555555555500',
      (SELECT id FROM public.teams WHERE slug='ssg'),
      'vt2',
      ARRAY['u']::TEXT[],
      ARRAY['v1','v2','v3']::TEXT[]
    )$$,
  'videos 3개 허용'
);

-- videos 4개 CHECK 실패
SELECT throws_ok(
  $$INSERT INTO public.photo_posts (photographer_id, team_id, title, images, videos)
    VALUES (
      '55555555-5555-5555-5555-555555555500',
      (SELECT id FROM public.teams WHERE slug='ssg'),
      'vt3',
      ARRAY['u']::TEXT[],
      ARRAY['v1','v2','v3','v4']::TEXT[]
    )$$,
  '23514',
  NULL,
  'videos 4개 CHECK 실패'
);

SELECT * FROM finish();
ROLLBACK;
