-- ============================================================
-- 025_fix_like_count_trigger.sql
-- update_like_count() 함수 dispatch 수정 (TG_TABLE_NAME 기반)
--
-- 문제:
--   007_photographer.sql 에서 update_like_count()를 덮어쓰면서
--   photo_posts / photo_comments 만 업데이트하도록 바뀜.
--   그 결과 community_likes 트리거가 발동해도 community_posts.like_count
--   가 증감되지 않음 (Phase 3 smoke test Section 5e 실패 원인).
--
-- 해결:
--   TG_TABLE_NAME 으로 dispatch 하여 community_likes → community_*,
--   photo_likes → photo_* 로 분기.
--   두 트리거 모두 이 함수를 계속 공유한다.
--
-- Idempotent via CREATE OR REPLACE FUNCTION.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  delta INTEGER;
  tid UUID;
  ttype TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := 1;
    tid := NEW.target_id;
    ttype := NEW.target_type;
  ELSE
    delta := -1;
    tid := OLD.target_id;
    ttype := OLD.target_type;
  END IF;

  -- Dispatch by TG_TABLE_NAME: community_likes → community_*, photo_likes → photo_*
  IF TG_TABLE_NAME = 'community_likes' THEN
    IF ttype = 'post' THEN
      UPDATE public.community_posts
        SET like_count = GREATEST(like_count + delta, 0)
        WHERE id = tid;
    ELSIF ttype = 'comment' THEN
      UPDATE public.community_comments
        SET like_count = GREATEST(like_count + delta, 0)
        WHERE id = tid;
    END IF;
  ELSIF TG_TABLE_NAME = 'photo_likes' THEN
    IF ttype = 'post' THEN
      UPDATE public.photo_posts
        SET like_count = GREATEST(like_count + delta, 0)
        WHERE id = tid;
    ELSIF ttype = 'comment' THEN
      UPDATE public.photo_comments
        SET like_count = GREATEST(like_count + delta, 0)
        WHERE id = tid;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
