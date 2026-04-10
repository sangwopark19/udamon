-- ============================================================
-- 024_community_phase3.sql
-- Phase 3 커뮤니티 Supabase 전환 -- 단일 통합 마이그레이션 (Wave 0)
--
-- Parts:
--   0. Pre-flight orphan check (5 tables)
--   1. FK repoint: auth.users → public.users
--   2. pg_cron 확장 활성화
--   3. RPC: increment_post_view (D-11)
--   4. 함수: update_trending_posts (D-06)
--   5. pg_cron job 스케줄 (10분 주기)
--   6. anon SELECT 정책 복원 (D-19) -- community_* + players 전용
--   7. PostgREST 스키마 캐시 리로드
--
-- Idempotent: DROP CONSTRAINT IF EXISTS, CREATE OR REPLACE FUNCTION,
--             DROP POLICY IF EXISTS, cron.unschedule IF EXISTS 를 사용하여
--             재실행 시에도 안전함.
-- ============================================================

-- ─── Part 0: Orphan pre-check (5 tables) ─────────────────────
-- community_*.user_id / reporter_id 중 public.users 에 매칭되지 않는
-- 행이 하나라도 있으면 FK repoint 가 실패한다. 이 경우 migration 을
-- 중단시켜 데이터 손실을 방지한다.
-- Phase 1 의 on_auth_user_created 트리거가 auth.users → public.users 1:1
-- 관계를 보장하므로 일반적으로 orphan 은 0 이어야 한다.
DO $$
DECLARE
  op INT;
  oc INT;
  ol INT;
  oreport INT;
  opv INT;
BEGIN
  SELECT COUNT(*) INTO op FROM community_posts cp
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cp.user_id);
  SELECT COUNT(*) INTO oc FROM community_comments cc
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cc.user_id);
  SELECT COUNT(*) INTO ol FROM community_likes cl
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cl.user_id);
  SELECT COUNT(*) INTO oreport FROM community_reports cr
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cr.reporter_id);
  SELECT COUNT(*) INTO opv FROM community_poll_votes cv
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cv.user_id);
  IF op > 0 OR oc > 0 OR ol > 0 OR oreport > 0 OR opv > 0 THEN
    RAISE EXCEPTION 'FK repoint blocked -- orphans found: posts=%, comments=%, likes=%, reports=%, poll_votes=%',
      op, oc, ol, oreport, opv;
  END IF;
  RAISE NOTICE 'Part 0: orphan pre-check OK (all 0)';
END $$;

-- ─── Part 1: FK repoint → public.users ───────────────────────
-- 기존 community_* 테이블의 user_id / reporter_id 가 auth.users 를
-- 가리키고 있어 PostgREST 의 embedded select (`author:users!user_id(...)`)
-- 가 public.users 를 찾지 못한다 (D-02). 아래 5개 테이블의 FK 를
-- public.users 로 재지정한다.

-- community_posts
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_user_id_fkey;
ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- community_comments
ALTER TABLE community_comments DROP CONSTRAINT IF EXISTS community_comments_user_id_fkey;
ALTER TABLE community_comments
  ADD CONSTRAINT community_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- community_likes (원래부터 ON DELETE CASCADE 였음 -- 그대로 유지)
ALTER TABLE community_likes DROP CONSTRAINT IF EXISTS community_likes_user_id_fkey;
ALTER TABLE community_likes
  ADD CONSTRAINT community_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- community_reports
ALTER TABLE community_reports DROP CONSTRAINT IF EXISTS community_reports_reporter_id_fkey;
ALTER TABLE community_reports
  ADD CONSTRAINT community_reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- community_poll_votes
ALTER TABLE community_poll_votes DROP CONSTRAINT IF EXISTS community_poll_votes_user_id_fkey;
ALTER TABLE community_poll_votes
  ADD CONSTRAINT community_poll_votes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ─── Part 2: pg_cron 확장 활성화 ──────────────────────────────
-- Supabase Cloud 프로젝트에서 pg_cron 을 활성화한다.
-- postgres 역할이 cron 스키마를 사용할 수 있도록 GRANT 한다.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;

-- ─── Part 3: increment_post_view RPC (D-11) ───────────────────
-- 게시글 상세 진입 시 view_count 를 원자적으로 1 증가시킨다.
-- anon 게스트도 호출 가능해야 하므로 SECURITY DEFINER 로 owner-only
-- UPDATE RLS 를 우회한다. 함수 본문이 PK by UPDATE 한 문장이므로
-- 무기화 위험이 없다 (T-03-00-03 mitigation).
-- SET search_path = '' 로 schema injection 방지 (Supabase 보안 권고).
CREATE OR REPLACE FUNCTION public.increment_post_view(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.community_posts
    SET view_count = view_count + 1
    WHERE id = post_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_post_view(UUID) TO authenticated, anon;

-- ─── Part 4: update_trending_posts() (D-06) ───────────────────
-- 24시간 윈도우 내 트렌딩 상위 5개 게시글에 is_trending=TRUE 를 부여.
-- CRITICAL: SECURITY DEFINER 를 사용하지 않는다. pg_cron 은 postgres
--           역할로 실행되며 BYPASSRLS 를 이미 갖고 있다. 또한 이 함수는
--           authenticated / anon 에 EXECUTE 권한을 부여하지 않아
--           cron 컨텍스트에서만 호출된다 (T-03-00-04 mitigation).
-- 점수 공식: (like*2 + comment*3 + view*0.1) * freshness_boost
-- freshness_boost: 1.0 ~ 2.0 구간 (생성 0시간 → 2.0, 24시간 → 1.0)
CREATE OR REPLACE FUNCTION public.update_trending_posts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
BEGIN
  -- Step 1: 기존 trending 플래그 초기화
  UPDATE public.community_posts
    SET is_trending = FALSE
    WHERE is_trending = TRUE;

  -- Step 2: 24시간 윈도우 내 상위 5개 계산
  WITH scored AS (
    SELECT
      id,
      (like_count * 2 + comment_count * 3 + view_count * 0.1) *
        (1 + GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)) AS score
    FROM public.community_posts
    WHERE created_at >= v_cutoff
      AND is_blinded = FALSE
    ORDER BY score DESC
    LIMIT 5
  )
  UPDATE public.community_posts
    SET is_trending = TRUE
    WHERE id IN (SELECT id FROM scored);
END;
$$;

-- ─── Part 5: pg_cron job 스케줄 ───────────────────────────────
-- 재실행 대비: 기존 job 이 있으면 먼저 unschedule 한다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-trending-posts') THEN
    PERFORM cron.unschedule('update-trending-posts');
  END IF;
END $$;

-- 10분마다 update_trending_posts() 를 실행한다.
SELECT cron.schedule('update-trending-posts', '*/10 * * * *', $cron$ SELECT public.update_trending_posts(); $cron$);

-- ─── Part 6: anon SELECT 복원 (D-19) ─────────────────────────
-- 021_drop_spam_and_cleanup.sql 에서 anon 정책을 전부 DROP 했던 것을
-- community_* 테이블과 players 에 한해 복원한다.
-- public.users, recent_searches, notifications, inquiries, user_restrictions,
-- user_blocks, photographer_applications, site_settings, audit_logs 등
-- 민감 테이블은 authenticated 전용으로 유지한다 (T-03-00-02 accept).

DROP POLICY IF EXISTS "posts_anon_read" ON community_posts;
CREATE POLICY "posts_anon_read" ON community_posts
  FOR SELECT TO anon
  USING (is_blinded = FALSE);

DROP POLICY IF EXISTS "comments_anon_read" ON community_comments;
CREATE POLICY "comments_anon_read" ON community_comments
  FOR SELECT TO anon
  USING (TRUE);

DROP POLICY IF EXISTS "polls_anon_read" ON community_polls;
CREATE POLICY "polls_anon_read" ON community_polls
  FOR SELECT TO anon
  USING (TRUE);

DROP POLICY IF EXISTS "poll_options_anon_read" ON community_poll_options;
CREATE POLICY "poll_options_anon_read" ON community_poll_options
  FOR SELECT TO anon
  USING (TRUE);

DROP POLICY IF EXISTS "poll_votes_anon_read" ON community_poll_votes;
CREATE POLICY "poll_votes_anon_read" ON community_poll_votes
  FOR SELECT TO anon
  USING (TRUE);

DROP POLICY IF EXISTS "players_anon_read" ON players;
CREATE POLICY "players_anon_read" ON players
  FOR SELECT TO anon
  USING (TRUE);

-- ─── Part 7: PostgREST 스키마 캐시 리로드 ─────────────────────
-- 새 FK 방향과 정책이 PostgREST 에 즉시 반영되도록 강제 reload.
-- (Supabase 는 이를 자동으로 감지하지만, 명시적 NOTIFY 로 안전망 확보)
NOTIFY pgrst, 'reload schema';
