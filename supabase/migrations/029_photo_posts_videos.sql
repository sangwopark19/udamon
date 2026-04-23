-- ============================================================
-- 029_photo_posts_videos.sql
-- photo_posts: videos TEXT[] 컬럼 추가 + images CHECK 1~7 로 변경 (D-01)
-- ============================================================
-- Related: Phase 4 Wave 0 - 영상 업로드 지원 스키마
-- Threat:  T-4-02 (영상 array 최대 3개 DB 수준 강제)
-- ============================================================

-- 방어: 기존 데이터가 7장 초과인지 확인 (RESEARCH.md §Runtime State Inventory)
-- 초과 row 가 있으면 이 마이그레이션은 ALTER 실패 — 수동 정리 필요.
DO $$
DECLARE
  v_max_images INTEGER;
BEGIN
  SELECT COALESCE(MAX(array_length(images, 1)), 0) INTO v_max_images FROM public.photo_posts;
  IF v_max_images > 7 THEN
    RAISE EXCEPTION 'photo_posts 에 images 8장 이상 row 존재 (max=%). 1~7 CHECK 변경 전에 수동 정리 필요.', v_max_images;
  END IF;
END $$;

-- images CHECK 제약 변경: 1~10 → 1~7
ALTER TABLE public.photo_posts DROP CONSTRAINT photo_posts_images_check;
ALTER TABLE public.photo_posts
  ADD CONSTRAINT photo_posts_images_check
  CHECK (array_length(images, 1) BETWEEN 1 AND 7);

-- videos TEXT[] 컬럼 추가: NULL 허용 x, DEFAULT '{}', 1~3 CHECK
-- array_length(ARRAY[]::TEXT[], 1) 은 NULL 이므로 빈 배열 허용을 위한 NULL 체크 필요.
ALTER TABLE public.photo_posts
  ADD COLUMN videos TEXT[] NOT NULL DEFAULT '{}'
  CHECK (array_length(videos, 1) IS NULL OR array_length(videos, 1) BETWEEN 1 AND 3);

-- 인덱스: videos 가 있는 post 만 필터링 가능하도록 partial index
CREATE INDEX idx_photo_posts_has_videos ON public.photo_posts((array_length(videos, 1) > 0))
  WHERE array_length(videos, 1) > 0;
