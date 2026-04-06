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

-- Part C ~ I: 013~019 테이블 RLS 정책은 023_rls_policies_remaining.sql로 이동
-- (테이블이 아직 생성되지 않은 시점에서 정책을 만들 수 없으므로 분리)
