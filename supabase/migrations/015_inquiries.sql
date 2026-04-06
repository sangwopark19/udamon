-- ============================================================
-- 015_inquiries.sql
-- inquiries 테이블 (DB-05)
-- ============================================================

CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'account', 'report', 'other')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  answer TEXT,
  answered_by UUID REFERENCES public.users(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inquiries_user ON public.inquiries(user_id, created_at DESC);
CREATE INDEX idx_inquiries_status ON public.inquiries(status) WHERE status IN ('pending', 'in_progress');

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신
CREATE TRIGGER trg_inquiries_updated
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
