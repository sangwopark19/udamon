-- ============================================================
-- 027_comment_soft_delete_trigger.sql
-- Soft delete (is_deleted FALSE → TRUE) 시 community_posts.comment_count 감소
--
-- 문제: 기존에는 INSERT/DELETE 트리거만 있어서 soft delete (UPDATE is_deleted=TRUE)
--   시 comment_count 가 감소하지 않음. 삭제 취소 (TRUE → FALSE) 시에도 증가하지
--   않음.
--
-- 해결: AFTER UPDATE 트리거를 추가하여 is_deleted 상태 전이를 감지해
--   comment_count 를 증감한다. TG_TABLE_NAME dispatch 로 community_comments /
--   photo_comments 모두 지원.
--
-- Idempotent via DROP IF EXISTS + CREATE OR REPLACE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_comment_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- FALSE → TRUE: comment_count 감소
  IF OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
    IF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE public.community_posts
        SET comment_count = GREATEST(comment_count - 1, 0)
        WHERE id = NEW.post_id;
    ELSIF TG_TABLE_NAME = 'photo_comments' THEN
      UPDATE public.photo_posts
        SET comment_count = GREATEST(comment_count - 1, 0)
        WHERE id = NEW.post_id;
    END IF;
  -- TRUE → FALSE: comment_count 복원 (undelete)
  ELSIF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
    IF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE public.community_posts
        SET comment_count = comment_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_TABLE_NAME = 'photo_comments' THEN
      UPDATE public.photo_posts
        SET comment_count = comment_count + 1
        WHERE id = NEW.post_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- community_comments 트리거
DROP TRIGGER IF EXISTS trg_comment_soft_delete ON public.community_comments;
CREATE TRIGGER trg_comment_soft_delete
  AFTER UPDATE OF is_deleted ON public.community_comments
  FOR EACH ROW
  WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
  EXECUTE FUNCTION public.handle_comment_soft_delete();

-- photo_comments 에도 같은 트리거 (존재 시)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'photo_comments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'photo_comments' AND column_name = 'is_deleted') THEN
      EXECUTE 'DROP TRIGGER IF EXISTS trg_photo_comment_soft_delete ON public.photo_comments';
      EXECUTE 'CREATE TRIGGER trg_photo_comment_soft_delete
        AFTER UPDATE OF is_deleted ON public.photo_comments
        FOR EACH ROW
        WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
        EXECUTE FUNCTION public.handle_comment_soft_delete()';
    END IF;
  END IF;
END $$;
