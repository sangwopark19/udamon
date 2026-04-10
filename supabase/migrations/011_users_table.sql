-- ─── public.users 테이블 보완 ───
-- 테이블은 이미 존재하므로 누락 컬럼 추가 + trigger 재연결 + 기존 유저 소급

-- 1) 앱에서 필요한 누락 컬럼 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='username') THEN
    ALTER TABLE public.users ADD COLUMN username TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='display_name') THEN
    ALTER TABLE public.users ADD COLUMN display_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_admin') THEN
    ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='admin_role') THEN
    ALTER TABLE public.users ADD COLUMN admin_role TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='ticket_balance') THEN
    ALTER TABLE public.users ADD COLUMN ticket_balance INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2) trigger 함수 재정의 — 누락 컬럼 포함
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname, username, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_username', NEW.raw_user_meta_data->>'user_name', 'user_' || REPLACE(NEW.id::text, '-', '')),
    COALESCE(NEW.raw_user_meta_data->>'preferred_username', NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) trigger 재연결 (이미 있으면 drop 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4) 기존 auth.users 중 public.users에 row가 없는 유저 소급 생성
INSERT INTO public.users (id, email, nickname, username, display_name, avatar_url, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'preferred_username', raw_user_meta_data->>'user_name', 'user_' || REPLACE(id::text, '-', '')),
  COALESCE(raw_user_meta_data->>'preferred_username', raw_user_meta_data->>'user_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url',
  'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 5) INSERT RLS 정책 추가 — 인증된 사용자가 자신의 프로필 행을 생성할 수 있도록
-- handle_new_user 트리거와 클라이언트 ensureUserProfile 간의 race condition 해결
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());
