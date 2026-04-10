-- ============================================================
-- 017_cheerleaders.sql
-- cheerleaders 테이블 (DB-07)
-- ============================================================

CREATE TABLE public.cheerleaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  position TEXT DEFAULT 'member' CHECK (position IN ('leader', 'member')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cheerleaders_team ON public.cheerleaders(team_id);

ALTER TABLE public.cheerleaders ENABLE ROW LEVEL SECURITY;
