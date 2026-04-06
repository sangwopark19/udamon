-- ============================================================
-- 011_users.sql
-- public.users 테이블, auth.users INSERT 트리거, 인덱스
-- ============================================================

-- ─── Part A: public.users 테이블 ──────────────────────────────

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  my_team_id UUID REFERENCES public.teams(id),
  push_token TEXT,
  blocked_users UUID[] DEFAULT '{}',
  nickname_changed_at TIMESTAMPTZ,
  is_photographer BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ─── Part B: 인덱스 ──────────────────────────────────────────

-- 닉네임 유니크 (삭제되지 않은 사용자, 빈 문자열 제외)
CREATE UNIQUE INDEX idx_users_nickname ON public.users(nickname)
  WHERE is_deleted = FALSE AND nickname != '';

-- 어드민 조회 최적화
CREATE INDEX idx_users_role ON public.users(role) WHERE role = 'admin';

-- 마이팀 조회
CREATE INDEX idx_users_team ON public.users(my_team_id);

-- ─── Part C: handle_new_user 트리거 함수 ─────────────────────
-- auth.users INSERT 시 public.users에 자동으로 행 생성
-- SECURITY DEFINER SET search_path = '' 필수 (Supabase Security Advisor)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    nickname,
    avatar_url,
    role
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'username', 'user_' || LEFT(new.id::text, 8)),
    new.raw_user_meta_data ->> 'avatar_url',
    'user'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── Part D: updated_at 자동 갱신 트리거 ─────────────────────
-- update_updated_at() 함수는 007_photographer.sql에서 이미 정의됨

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
