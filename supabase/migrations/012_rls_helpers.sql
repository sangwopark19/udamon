-- ============================================================
-- 012_rls_helpers.sql
-- RLS 헬퍼 함수 (is_admin, is_owner) + 신규 테이블 RLS 정책
-- ============================================================
-- D-10: 어드민 권한은 public.users.role = 'admin' 직접 확인
-- D-11: 비인증 사용자 완전 차단 -- 모든 정책에 TO authenticated
-- D-14: 어드민 RLS를 중앙화된 is_admin() 함수로 관리

-- ─── Part A: RLS 헬퍼 함수 ─────────────────────────────────

-- is_admin: 관리자 여부 확인
-- SECURITY DEFINER로 실행하여 RLS 우회 방지
-- search_path = '' 로 schema injection 방지
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
    AND is_deleted = FALSE
  );
END;
$$;

-- is_owner: 리소스 소유자 여부 확인
CREATE OR REPLACE FUNCTION public.is_owner(resource_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT auth.uid()) = resource_user_id;
END;
$$;

-- ─── Part B: public.users RLS 정책 ────────────────────────

-- 인증 사용자만 조회 (삭제된 사용자 제외)
CREATE POLICY "users_read_authenticated" ON public.users
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

-- 본인만 수정
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id);

-- 어드민은 전체 관리
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── Part C: notifications RLS 정책 ───────────────────────

-- 본인 알림만 조회
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 본인 알림만 수정 (읽음 처리)
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 본인 알림만 삭제
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 어드민만 알림 생성
CREATE POLICY "notifications_admin_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ─── Part D: announcements RLS 정책 ──────────────────────

-- 인증 사용자 전체 조회
CREATE POLICY "announcements_read_authenticated" ON public.announcements
  FOR SELECT TO authenticated
  USING (TRUE);

-- 어드민만 생성/수정/삭제
CREATE POLICY "announcements_admin_manage" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── Part E: inquiries RLS 정책 ──────────────────────────

-- 본인 문의 조회 또는 어드민 전체 조회
CREATE POLICY "inquiries_read_own" ON public.inquiries
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

-- 본인만 문의 생성
CREATE POLICY "inquiries_insert_own" ON public.inquiries
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 어드민만 문의 수정 (답변 작성)
CREATE POLICY "inquiries_update_admin" ON public.inquiries
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ─── Part F: photographer_applications RLS 정책 ──────────

-- 본인 신청 조회 또는 어드민 전체 조회
CREATE POLICY "photographer_apps_read" ON public.photographer_applications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

-- 본인만 신청 생성
CREATE POLICY "photographer_apps_insert_own" ON public.photographer_applications
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 어드민만 신청 수정 (승인/거절)
CREATE POLICY "photographer_apps_update_admin" ON public.photographer_applications
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ─── Part G: cheerleaders RLS 정책 ───────────────────────

-- 인증 사용자 전체 조회
CREATE POLICY "cheerleaders_read_authenticated" ON public.cheerleaders
  FOR SELECT TO authenticated
  USING (TRUE);

-- 어드민만 관리
CREATE POLICY "cheerleaders_admin_manage" ON public.cheerleaders
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── Part H: audit_logs RLS 정책 ─────────────────────────

-- 어드민만 조회
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 어드민만 삽입
CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ─── Part I: site_settings RLS 정책 ──────────────────────

-- 인증 사용자 조회 가능
CREATE POLICY "site_settings_read_authenticated" ON public.site_settings
  FOR SELECT TO authenticated
  USING (TRUE);

-- 어드민만 수정
CREATE POLICY "site_settings_admin_manage" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_admin());
