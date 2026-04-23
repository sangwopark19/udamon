-- ============================================================
-- pgTAP: photo_posts.thumbnail_urls 컬럼 검증 (Task 5, Plan 04-01)
-- 032_photo_posts_thumbnails.sql — thumbnail_urls TEXT[] NOT NULL DEFAULT '{}'
-- ============================================================

BEGIN;
SELECT plan(2);

SELECT has_column('public', 'photo_posts', 'thumbnail_urls', 'thumbnail_urls 컬럼 존재');

SELECT col_default_is(
  'public', 'photo_posts', 'thumbnail_urls', '{}'::TEXT[], 'DEFAULT {} 이어야 함'
);

SELECT * FROM finish();
ROLLBACK;
