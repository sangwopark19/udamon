-- ============================================================
-- 019_site_settings.sql
-- site_settings 테이블 (DB-09)
-- ============================================================

CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
