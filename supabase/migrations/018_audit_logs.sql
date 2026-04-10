-- ============================================================
-- 018_audit_logs.sql
-- audit_logs 테이블 (DB-08)
-- ============================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_type, target_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
