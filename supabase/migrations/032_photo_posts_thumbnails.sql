-- ============================================================
-- 032_photo_posts_thumbnails.sql
-- photo_posts.thumbnail_urls 컬럼 추가 (D-12, D-15)
-- 기존 데이터는 '{}' 로 채워지고, Phase 4 신규 post 만 generate-thumbnails EF 로 채워짐.
-- 렌더 fallback: thumbnail_urls.length > 0 ? thumbnail_urls[0] : images[0]
-- ============================================================

ALTER TABLE public.photo_posts
  ADD COLUMN thumbnail_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.photo_posts.thumbnail_urls IS
  'generate-thumbnails Edge Function 이 채우는 400x400 JPEG 썸네일 URL 배열 (images 와 1:1 순서). 빈 배열 기본값 → feed 렌더 fallback: images[0] 사용';
