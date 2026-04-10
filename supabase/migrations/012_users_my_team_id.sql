-- ─── users 테이블에 my_team_id 컬럼 추가 ───
-- 기존에 user_my_team 조인 테이블이 있지만, 앱 코드에서
-- users.my_team_id를 직접 참조하므로 컬럼을 추가한다.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'my_team_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN my_team_id UUID REFERENCES teams(id);
  END IF;
END $$;
