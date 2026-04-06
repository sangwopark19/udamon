-- ============================================================
-- 023_rls_policies_remaining.sql
-- 013~019 테이블에 대한 RLS 정책 (012에서 분리)
-- 012_rls_helpers.sql의 is_admin(), is_owner() 함수에 의존
-- ============================================================

-- ─── notifications RLS 정책 ───────────────────────────────

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

-- ─── announcements RLS 정책 ──────────────────────────────

-- 인증 사용자 전체 조회
CREATE POLICY "announcements_read_authenticated" ON public.announcements
  FOR SELECT TO authenticated
  USING (TRUE);

-- 어드민만 생성/수정/삭제
CREATE POLICY "announcements_admin_manage" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── inquiries RLS 정책 ──────────────────────────────────

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

-- ─── photographer_applications RLS 정책 ──────────────────

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

-- ─── cheerleaders RLS 정책 ───────────────────────────────

-- 인증 사용자 전체 조회
CREATE POLICY "cheerleaders_read_authenticated" ON public.cheerleaders
  FOR SELECT TO authenticated
  USING (TRUE);

-- 어드민만 관리
CREATE POLICY "cheerleaders_admin_manage" ON public.cheerleaders
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── audit_logs RLS 정책 ─────────────────────────────────

-- 어드민만 조회
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 어드민만 삽입
CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ─── site_settings RLS 정책 ──────────────────────────────

-- 인증 사용자 조회 가능
CREATE POLICY "site_settings_read_authenticated" ON public.site_settings
  FOR SELECT TO authenticated
  USING (TRUE);

-- 어드민만 수정
CREATE POLICY "site_settings_admin_manage" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_admin());
