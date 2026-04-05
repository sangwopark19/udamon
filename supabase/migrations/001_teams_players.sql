-- ============================================================
-- 001_teams_players.sql
-- 구단, 선수, 마이팀
-- ============================================================

-- 구단
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  logo_url TEXT,
  logo_text TEXT,
  city TEXT NOT NULL,
  stadium_name TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_sort ON teams(sort_order);

-- 선수
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  number INTEGER,
  position TEXT CHECK (position IN (
    'pitcher', 'catcher', 'infielder', 'outfielder', 'designated_hitter'
  )),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'traded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_team_status ON players(team_id, status);

-- 마이팀 (1인 1팀)
CREATE TABLE user_my_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_my_team_team ON user_my_team(team_id);
