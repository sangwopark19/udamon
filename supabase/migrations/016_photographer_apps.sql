-- ============================================================
-- 016_photographer_apps.sql
-- photographer_applications 테이블 (DB-06)
-- ============================================================

CREATE TABLE public.photographer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  portfolio_url TEXT,
  bio TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photographer_apps_user ON public.photographer_applications(user_id);
CREATE INDEX idx_photographer_apps_status ON public.photographer_applications(status) WHERE status = 'pending';

ALTER TABLE public.photographer_applications ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신
CREATE TRIGGER trg_photographer_apps_updated
  BEFORE UPDATE ON public.photographer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
