-- ============================================================
-- phase3-smoke.sql
-- Phase 3 커뮤니티 마이그레이션 검증 스모크 테스트
-- Usage: psql "$SUPABASE_DB_URL" -f supabase/tests/phase3-smoke.sql
--        또는 Supabase SQL Editor 에 붙여넣고 Run
-- Idempotent: 전체 테스트를 BEGIN...ROLLBACK 으로 감싸므로
--             실제 테이블 상태는 변경되지 않음 (Section 1 pre-flight 제외)
-- Covers: FK 방향(D-02), pg_cron(D-06), CHECK/UNIQUE/트리거(COMM-03~07),
--         increment_post_view RPC(D-11), update_trending_posts(D-06),
--         recent_searches trim(COMM-10)
-- ============================================================

BEGIN;

-- ─── Section 1: FK orphan pre-check (실제 상태 검증) ──────────
-- 024 마이그레이션 적용 이후에도 orphan 이 0 인지 확인한다.
-- ROLLBACK 되지만 DO 블록 자체가 실패하면 즉시 중단된다.
DO $$
DECLARE
  orphan_posts INT;
  orphan_comments INT;
  orphan_likes INT;
  orphan_reports INT;
  orphan_poll_votes INT;
BEGIN
  SELECT COUNT(*) INTO orphan_posts FROM community_posts cp
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cp.user_id);
  SELECT COUNT(*) INTO orphan_comments FROM community_comments cc
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cc.user_id);
  SELECT COUNT(*) INTO orphan_likes FROM community_likes cl
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cl.user_id);
  SELECT COUNT(*) INTO orphan_reports FROM community_reports cr
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cr.reporter_id);
  SELECT COUNT(*) INTO orphan_poll_votes FROM community_poll_votes cv
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cv.user_id);
  RAISE NOTICE 'orphan_posts=%, orphan_comments=%, orphan_likes=%, orphan_reports=%, orphan_poll_votes=%',
    orphan_posts, orphan_comments, orphan_likes, orphan_reports, orphan_poll_votes;
  IF orphan_posts > 0 OR orphan_comments > 0 OR orphan_likes > 0
     OR orphan_reports > 0 OR orphan_poll_votes > 0 THEN
    RAISE EXCEPTION 'ORPHAN ROWS FOUND -- FK repoint unsafe or migration broken';
  END IF;
END $$;

-- ─── Section 2: pg_cron 확장 및 스케줄 검증 ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron extension not enabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-trending-posts') THEN
    RAISE EXCEPTION 'update-trending-posts cron job not scheduled';
  END IF;
  RAISE NOTICE 'pg_cron OK (extension enabled, update-trending-posts scheduled)';
END $$;

-- ─── Section 3: FK 방향 검증 (community_posts → public.users) ─
DO $$
DECLARE
  target_schema TEXT;
BEGIN
  SELECT ccu.table_schema INTO target_schema
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_name = 'community_posts_user_id_fkey'
    AND ccu.table_name = 'users'
  LIMIT 1;
  IF target_schema IS NULL OR target_schema != 'public' THEN
    RAISE EXCEPTION 'community_posts.user_id FK does not point at public.users (found: %)',
      COALESCE(target_schema, 'NULL');
  END IF;
  RAISE NOTICE 'community_posts FK OK (→ public.users)';
END $$;

-- community_comments FK 방향 검증
DO $$
DECLARE
  target_schema TEXT;
BEGIN
  SELECT ccu.table_schema INTO target_schema
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_name = 'community_comments_user_id_fkey'
    AND ccu.table_name = 'users'
  LIMIT 1;
  IF target_schema IS NULL OR target_schema != 'public' THEN
    RAISE EXCEPTION 'community_comments.user_id FK does not point at public.users (found: %)',
      COALESCE(target_schema, 'NULL');
  END IF;
  RAISE NOTICE 'community_comments FK OK (→ public.users)';
END $$;

-- community_likes FK 방향 검증
DO $$
DECLARE
  target_schema TEXT;
BEGIN
  SELECT ccu.table_schema INTO target_schema
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_name = 'community_likes_user_id_fkey'
    AND ccu.table_name = 'users'
  LIMIT 1;
  IF target_schema IS NULL OR target_schema != 'public' THEN
    RAISE EXCEPTION 'community_likes.user_id FK does not point at public.users (found: %)',
      COALESCE(target_schema, 'NULL');
  END IF;
  RAISE NOTICE 'community_likes FK OK (→ public.users)';
END $$;

-- community_reports FK 방향 검증
DO $$
DECLARE
  target_schema TEXT;
BEGIN
  SELECT ccu.table_schema INTO target_schema
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_name = 'community_reports_reporter_id_fkey'
    AND ccu.table_name = 'users'
  LIMIT 1;
  IF target_schema IS NULL OR target_schema != 'public' THEN
    RAISE EXCEPTION 'community_reports.reporter_id FK does not point at public.users (found: %)',
      COALESCE(target_schema, 'NULL');
  END IF;
  RAISE NOTICE 'community_reports FK OK (→ public.users)';
END $$;

-- community_poll_votes FK 방향 검증
DO $$
DECLARE
  target_schema TEXT;
BEGIN
  SELECT ccu.table_schema INTO target_schema
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_name = 'community_poll_votes_user_id_fkey'
    AND ccu.table_name = 'users'
  LIMIT 1;
  IF target_schema IS NULL OR target_schema != 'public' THEN
    RAISE EXCEPTION 'community_poll_votes.user_id FK does not point at public.users (found: %)',
      COALESCE(target_schema, 'NULL');
  END IF;
  RAISE NOTICE 'community_poll_votes FK OK (→ public.users)';
END $$;

-- ─── Section 4+5+6+7: 시드 + CHECK/UNIQUE/트리거/RPC 검증 ─────
-- 단일 대형 DO 블록 — 변수 스코프 공유 필요
-- auth.users 에 직접 INSERT 하면 on_auth_user_created 트리거가
-- public.users 행을 자동으로 만들어준다. 이후 nickname 만 업데이트한다.
-- 전체는 BEGIN...ROLLBACK 으로 감싸여 있으므로 실 데이터에 영향 없음.
DO $$
DECLARE
  u1 UUID := gen_random_uuid();
  u2 UUID := gen_random_uuid();
  p1 UUID;
  p2 UUID;
  pl1 UUID;
  po1 UUID;
  po2 UUID;
  team_uuid UUID;
  expected_fail BOOLEAN;
  before_view INT;
  after_view INT;
  trending_count INT;
  search_count INT;
BEGIN
  -- 어떤 팀이든 하나 가져오기 (seed 가 존재해야 함)
  SELECT id INTO team_uuid FROM teams LIMIT 1;
  IF team_uuid IS NULL THEN
    RAISE EXCEPTION 'teams seed missing — cannot run smoke test';
  END IF;

  -- ─── Section 4: auth.users + public.users 부트스트랩 ───────
  -- auth.users 에 최소 컬럼으로 INSERT → on_auth_user_created 트리거가
  -- public.users 행을 만든다. 그 후 nickname 을 업데이트한다.
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  VALUES
    (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke1_' || u1::text || '@test.udamon', '', '{"username":"smoke_u1"}'::jsonb, NOW(), NOW()),
    (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke2_' || u2::text || '@test.udamon', '', '{"username":"smoke_u2"}'::jsonb, NOW(), NOW());

  -- handle_new_user 가 이미 public.users 행을 만들었는지 확인
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = u1) THEN
    RAISE EXCEPTION 'handle_new_user trigger did not create public.users row for u1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = u2) THEN
    RAISE EXCEPTION 'handle_new_user trigger did not create public.users row for u2';
  END IF;
  RAISE NOTICE 'Section 4: auth.users → public.users bootstrap OK';

  -- 2개의 정상 게시글 삽입
  INSERT INTO community_posts (user_id, team_id, title, content)
    VALUES (u1, team_uuid, 'smoke title 1', 'smoke content 1')
    RETURNING id INTO p1;
  INSERT INTO community_posts (user_id, team_id, title, content)
    VALUES (u2, team_uuid, 'smoke title 2', 'smoke content 2')
    RETURNING id INTO p2;
  RAISE NOTICE 'Section 4: seed posts OK (p1=%, p2=%)', p1, p2;

  -- ─── Section 5a: title 길이 CHECK 위반 (23514) ─────────────
  expected_fail := FALSE;
  BEGIN
    INSERT INTO community_posts (user_id, team_id, title, content)
      VALUES (u1, team_uuid, '', 'valid content');
  EXCEPTION WHEN check_violation THEN
    expected_fail := TRUE;
  END;
  IF NOT expected_fail THEN
    RAISE EXCEPTION 'title length CHECK did not fire (23514)';
  END IF;
  RAISE NOTICE 'Section 5a: title CHECK violation OK';

  -- ─── Section 5b: content 길이 CHECK 위반 (23514) ───────────
  expected_fail := FALSE;
  BEGIN
    INSERT INTO community_posts (user_id, team_id, title, content)
      VALUES (u1, team_uuid, 'valid title', repeat('x', 1001));
  EXCEPTION WHEN check_violation THEN
    expected_fail := TRUE;
  END;
  IF NOT expected_fail THEN
    RAISE EXCEPTION 'content length CHECK did not fire (23514)';
  END IF;
  RAISE NOTICE 'Section 5b: content CHECK violation OK';

  -- ─── Section 5c: images > 10 CHECK 위반 (23514) ────────────
  expected_fail := FALSE;
  BEGIN
    INSERT INTO community_posts (user_id, team_id, title, content, images)
      VALUES (u1, team_uuid, 'valid title', 'valid content',
              ARRAY(SELECT 'http://x/' || g FROM generate_series(1, 11) g));
  EXCEPTION WHEN check_violation THEN
    expected_fail := TRUE;
  END;
  IF NOT expected_fail THEN
    RAISE EXCEPTION 'chk_images_max_10 did not fire (23514)';
  END IF;
  RAISE NOTICE 'Section 5c: images max 10 CHECK OK';

  -- ─── Section 5d: 중복 like UNIQUE 위반 (23505) ─────────────
  INSERT INTO community_likes (user_id, target_type, target_id)
    VALUES (u1, 'post', p1);
  expected_fail := FALSE;
  BEGIN
    INSERT INTO community_likes (user_id, target_type, target_id)
      VALUES (u1, 'post', p1);
  EXCEPTION WHEN unique_violation THEN
    expected_fail := TRUE;
  END;
  IF NOT expected_fail THEN
    RAISE EXCEPTION 'duplicate like UNIQUE did not fire (23505)';
  END IF;
  RAISE NOTICE 'Section 5d: duplicate like UNIQUE OK';

  -- ─── Section 5e: like_count 트리거 검증 ────────────────────
  DECLARE
    lc INT;
  BEGIN
    SELECT like_count INTO lc FROM community_posts WHERE id = p1;
    IF lc != 1 THEN
      RAISE EXCEPTION 'like_count trigger did not fire (expected 1, got %)', lc;
    END IF;
  END;
  RAISE NOTICE 'Section 5e: like_count trigger OK';

  -- ─── Section 5f: 본인 신고 차단 트리거 (P0001) ─────────────
  expected_fail := FALSE;
  BEGIN
    INSERT INTO community_reports (reporter_id, target_type, target_id, reason)
      VALUES (u1, 'post', p1, 'spam');
  EXCEPTION WHEN raise_exception THEN
    -- Pgsql RAISE EXCEPTION 은 기본 SQLSTATE P0001 (raise_exception)
    expected_fail := TRUE;
  END;
  IF NOT expected_fail THEN
    RAISE EXCEPTION 'self-report trigger did not fire (P0001)';
  END IF;
  RAISE NOTICE 'Section 5f: self-report trigger OK';

  -- ─── Section 5g: 정상 신고 성공 + 중복 신고 차단 (23505) ──
  INSERT INTO community_reports (reporter_id, target_type, target_id, reason)
    VALUES (u2, 'post', p1, 'spam');
  expected_fail := FALSE;
  BEGIN
    INSERT INTO community_reports (reporter_id, target_type, target_id, reason)
      VALUES (u2, 'post', p1, 'spam');
  EXCEPTION WHEN unique_violation THEN
    expected_fail := TRUE;
  END;
  IF NOT expected_fail THEN
    RAISE EXCEPTION 'duplicate report UNIQUE did not fire (23505)';
  END IF;
  RAISE NOTICE 'Section 5g: duplicate report UNIQUE OK';

  -- ─── Section 5h: 단일선택 투표 중복 차단 트리거 (P0001) ───
  -- poll 생성 (만료시간을 미래로)
  INSERT INTO community_polls (post_id, allow_multiple, expires_at)
    VALUES (p2, FALSE, NOW() + INTERVAL '7 days')
    RETURNING id INTO pl1;
  INSERT INTO community_poll_options (poll_id, text, sort_order)
    VALUES (pl1, '선택지 A', 0) RETURNING id INTO po1;
  INSERT INTO community_poll_options (poll_id, text, sort_order)
    VALUES (pl1, '선택지 B', 1) RETURNING id INTO po2;

  -- 첫 투표 성공
  INSERT INTO community_poll_votes (poll_id, option_id, user_id)
    VALUES (pl1, po1, u1);

  -- 같은 user 가 다른 option 에 투표 시도 → P0001 'Already voted (single choice poll)'
  expected_fail := FALSE;
  BEGIN
    INSERT INTO community_poll_votes (poll_id, option_id, user_id)
      VALUES (pl1, po2, u1);
  EXCEPTION WHEN raise_exception THEN
    expected_fail := TRUE;
  END;
  IF NOT expected_fail THEN
    RAISE EXCEPTION 'single-choice poll duplicate vote trigger did not fire (P0001)';
  END IF;
  RAISE NOTICE 'Section 5h: single-choice poll dup vote trigger OK';

  -- ─── Section 5i: recent_searches 10건 유지 트리거 ─────────
  -- 11건 삽입 → limit_recent_searches 가 가장 오래된 1건 삭제
  FOR i IN 1..11 LOOP
    INSERT INTO recent_searches (user_id, query, search_type)
      VALUES (u1, 'smoke query ' || i, 'community');
  END LOOP;
  SELECT COUNT(*) INTO search_count
    FROM recent_searches
    WHERE user_id = u1 AND search_type = 'community';
  IF search_count != 10 THEN
    RAISE EXCEPTION 'limit_recent_searches trigger did not trim to 10 (got %)', search_count;
  END IF;
  RAISE NOTICE 'Section 5i: limit_recent_searches trigger OK (count=%)', search_count;

  -- ─── Section 6: increment_post_view RPC ──────────────────
  SELECT view_count INTO before_view FROM community_posts WHERE id = p1;
  PERFORM public.increment_post_view(p1);
  SELECT view_count INTO after_view FROM community_posts WHERE id = p1;
  IF after_view != before_view + 1 THEN
    RAISE EXCEPTION 'increment_post_view did not increment (before=%, after=%)', before_view, after_view;
  END IF;
  RAISE NOTICE 'Section 6: view_count RPC OK (% → %)', before_view, after_view;

  -- ─── Section 7: update_trending_posts() 실행 ─────────────
  PERFORM public.update_trending_posts();
  SELECT COUNT(*) INTO trending_count FROM community_posts WHERE is_trending = TRUE;
  IF trending_count > 5 THEN
    RAISE EXCEPTION 'update_trending_posts flagged more than 5 rows: %', trending_count;
  END IF;
  RAISE NOTICE 'Section 7: update_trending_posts OK (flagged %)', trending_count;

  RAISE NOTICE 'ALL SMOKE TESTS PASSED';
END $$;

ROLLBACK;
-- phase3 smoke test 완료 — 모든 테스트 통과 시 ROLLBACK 에 도달하며 실 데이터는 변하지 않는다.
