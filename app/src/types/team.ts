// DB: teams
export interface Team {
  id: string;
  name_ko: string;
  name_en: string;
  logo_url: string | null;
  logo_text: string | null;
  city: string;
  stadium_name: string | null;
  sort_order: number;
  created_at: string;
}

// DB: players
export type PlayerPosition =
  | 'pitcher'
  | 'catcher'
  | 'infielder'
  | 'outfielder'
  | 'designated_hitter';

export type PlayerStatus = 'active' | 'inactive' | 'traded';

export interface Player {
  id: string;
  team_id: string;
  name_ko: string;
  name_en: string | null;
  number: number | null;
  position: PlayerPosition | null;
  status: PlayerStatus;
  created_at: string;
}

// DB: user_my_team
export interface UserMyTeam {
  id: string;
  user_id: string;
  team_id: string;
  created_at: string;
  updated_at: string;
}
