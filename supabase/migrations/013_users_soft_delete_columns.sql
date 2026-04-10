-- ─── public.users 소프트 삭제 및 닉네임 변경 추적 컬럼 추가 ───

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_deleted') THEN
    ALTER TABLE public.users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='deleted_at') THEN
    ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='nickname_changed_at') THEN
    ALTER TABLE public.users ADD COLUMN nickname_changed_at TIMESTAMPTZ;
  END IF;
END $$;
