-- ============================================================
-- 026_fix_count_triggers_security.sql
-- count 트리거 함수에 SECURITY DEFINER 추가 + comment_count dispatch 수정
--
-- 문제 1: update_like_count() / update_post_comment_count() 는
--   SECURITY DEFINER 가 아니어서 트리거 내부의
--   `UPDATE community_posts SET like_count = ...` 가 caller 의 RLS
--   를 거친다. `posts_update_own` 정책은 `auth.uid() = user_id` 로
--   본인 글만 UPDATE 할 수 있게 제한하므로, 다른 사람이 like/comment
--   를 달 때 트리거의 UPDATE 가 silently 실패한다. INSERT 는 성공
--   하지만 like_count / comment_count 는 0 으로 남는다.
--
-- 해결: SECURITY DEFINER + SET search_path = '' 를 추가해 postgres
--   권한(BYPASSRLS)으로 UPDATE 를 실행하게 한다. 함수 본문이 단순
--   counter 증감이라 injection 벡터가 없으므로 안전하다.
--
-- 문제 2: update_post_comment_count() 는 007_photographer.sql 에서
--   photo_posts 만 업데이트하도록 clobber 됐다 (update_like_count 와
--   동일한 패턴). TG_TABLE_NAME 으로 dispatch 해 community_comments →
--   community_posts, photo_comments → photo_posts 로 분기한다.
--
-- Idempotent via CREATE OR REPLACE FUNCTION.
-- ============================================================

-- ─── update_like_count: SECURITY DEFINER 추가 ─────────────
CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- ─── update_post_comment_count: dispatch + SECURITY DEFINER ─
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delta INTEGER;
  pid UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := 1;
    pid := NEW.post_id;
  ELSE
    delta := -1;
    pid := OLD.post_id;
  END IF;

  -- Dispatch by TG_TABLE_NAME: community_comments → community_posts, photo_comments → photo_posts
  IF TG_TABLE_NAME = 'community_comments' THEN
    UPDATE public.community_posts
      SET comment_count = GREATEST(comment_count + delta, 0)
      WHERE id = pid;
  ELSIF TG_TABLE_NAME = 'photo_comments' THEN
    UPDATE public.photo_posts
      SET comment_count = GREATEST(comment_count + delta, 0)
      WHERE id = pid;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── Backfill: 기존 orphan rows 의 count 를 다시 계산 ────────
-- 앞선 마이그레이션들이 적용되기 전이나 RLS 로 막혀있던 시기에 insert 된
-- community_likes / community_comments 는 count 가 0 으로 남아있다.
-- 실제 row count 와 맞추기 위해 재동기화한다.

UPDATE public.community_posts cp
  SET like_count = (
    SELECT COUNT(*) FROM public.community_likes
    WHERE target_type = 'post' AND target_id = cp.id
  );

UPDATE public.community_comments cc
  SET like_count = (
    SELECT COUNT(*) FROM public.community_likes
    WHERE target_type = 'comment' AND target_id = cc.id
  );

UPDATE public.community_posts cp
  SET comment_count = (
    SELECT COUNT(*) FROM public.community_comments
    WHERE post_id = cp.id AND is_deleted = FALSE
  );
