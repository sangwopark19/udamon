-- ============================================================
-- 014_announcements.sql
-- announcements 테이블 (DB-04)
-- ============================================================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_pinned ON public.announcements(is_pinned, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신
CREATE TRIGGER trg_announcements_updated
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
