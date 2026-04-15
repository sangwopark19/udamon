-- ============================================================
-- 030_photographer_approval_trigger.sql
-- photographer_applications 승인/거절 트리거 (D-06, D-11, ADJ-01)
--
-- ADJ-01: users.role CHECK 는 ('user','admin') 만 허용됨 (011_users.sql:14).
--         users.role UPDATE 금지 — is_photographer BOOLEAN 컬럼 사용.
--
-- Related threats:
--   T-4-03: 트리거 ROLLBACK → 승인 영구 차단 → SECURITY DEFINER + pgTAP 전수 검증
--   T-4-07: pending 사용자 photo_posts INSERT 차단 (008 RLS posts_insert_own EXISTS 자동)
-- ============================================================

-- ─── [Deviation Rule 3] notifications.type CHECK 확장 ───────
-- 013_notifications.sql 의 type CHECK 는 ('like','comment','follow','announcement','system')
-- 만 허용 — 'photographer_approved' / 'photographer_rejected' 로 INSERT 시 실패.
-- 트리거 함수 정의 전에 CHECK 제약을 확장해야 한다.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'like',
    'comment',
    'follow',
    'announcement',
    'system',
    'photographer_approved',
    'photographer_rejected'
  ));

-- ─── 트리거 함수 ─────────────────────────────────────────
-- SECURITY DEFINER + SET search_path = '' (Phase 1 handle_new_user 패턴):
--   - notifications RLS (notifications_admin_insert: WITH CHECK is_admin()) 우회
--   - Supabase Security Advisor 요구사항

CREATE OR REPLACE FUNCTION public.handle_photographer_application_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_team_id UUID;
  v_display_name TEXT;
BEGIN
  -- 거절 처리: photographers 행 미생성, 알림만 INSERT
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'photographer_rejected',
      '포토그래퍼 신청이 거절되었습니다',
      COALESCE(NEW.rejection_reason, '제출된 자료가 요구사항을 충족하지 못했습니다. 내용을 보완해 재신청해 주세요.'),
      jsonb_build_object('application_id', NEW.id)
    );
    RETURN NEW;
  END IF;

  -- 승인 처리: photographers INSERT + users.is_photographer UPDATE + 알림
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- 1) team_id / display_name 결정: application.team_id 우선, fallback users.my_team_id
    SELECT
      COALESCE(NEW.team_id, u.my_team_id),
      COALESCE(NULLIF(u.nickname, ''), 'Photographer')
    INTO v_team_id, v_display_name
    FROM public.users u
    WHERE u.id = NEW.user_id;

    -- 2) photographers 행 자동 생성 (ON CONFLICT DO NOTHING: 재신청 후 재승인 안전)
    INSERT INTO public.photographers (
      user_id, display_name, team_id, is_verified, bio, follower_count, post_count
    ) VALUES (
      NEW.user_id,
      v_display_name,
      v_team_id,
      FALSE,
      COALESCE(NEW.bio, ''),
      0,
      0
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- 3) users.is_photographer = TRUE (ADJ-01: role UPDATE 금지)
    UPDATE public.users
       SET is_photographer = TRUE
     WHERE id = NEW.user_id;

    -- 4) 승인 알림
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'photographer_approved',
      '포토그래퍼 신청이 승인되었습니다',
      '지금부터 사진과 영상을 업로드할 수 있어요.',
      jsonb_build_object('application_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 함수 소유권을 postgres 로 (SECURITY DEFINER 기본 동작 확인)
ALTER FUNCTION public.handle_photographer_application_decision() OWNER TO postgres;

-- ─── 트리거 등록 ─────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_photographer_application_decision ON public.photographer_applications;

CREATE TRIGGER trg_photographer_application_decision
  AFTER UPDATE OF status ON public.photographer_applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_photographer_application_decision();
