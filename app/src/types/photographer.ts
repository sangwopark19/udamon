// ─── Photographer Profile ────────────────────────────────────
export interface Photographer {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  team_id: string | null;        // primary team
  follower_count: number;
  post_count: number;
  is_verified: boolean;
  grade: number;                 // D-17: post_count + floor(follower_count / 10) — mapPhotographer 가 계산
  created_at: string;
}

// ─── Photo Post (photographer content) ──────────────────────
export interface PhotoPost {
  id: string;
  photographer_id: string;
  team_id: string;
  player_id: string | null;
  cheerleader_id: string | null;
  title: string;
  description: string;
  images: string[];
  videos: string[];              // D-01 / D-05: R2 public URL 배열, max 3
  thumbnail_urls: string[];      // D-12~D-15: generate-thumbnails EF 가 채움. 빈 경우 images[0] fallback
  like_count: number;
  comment_count: number;
  view_count: number;
  is_featured: boolean;
  featured_week?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  photographer: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  team: {
    name_ko: string;
  };
  player?: {
    name_ko: string;
    number: number;
  } | null;
  // D-20: DB schema 기준 name_ko 로 재정의 (기존 name 제거)
  cheerleader?: {
    name_ko: string;
  } | null;
}

// ─── Player ─────────────────────────────────────────────────
export type PlayerPosition = 'P' | 'C' | 'IF' | 'OF';

export interface Player {
  id: string;
  team_id: string;
  name_ko: string;
  number: number;
  position: PlayerPosition;
  is_active: boolean;
}

// ─── Timeline Event ─────────────────────────────────────────
export type EventType =
  | 'regular_season'
  | 'postseason'
  | 'allstar'
  | 'spring_camp'
  | 'fan_meeting'
  | 'first_pitch'
  | 'other';

export interface TimelineEvent {
  id: string;
  title: string;
  event_type: EventType;
  team_ids: string[];            // related teams
  date: string;
  location: string;
  description: string;
  post_count: number;
  thumbnail_url: string | null;
}

// ─── Home Feed Item ─────────────────────────────────────────
export type HomeFeedItem =
  | { type: 'photo'; data: PhotoPost }
  | { type: 'community'; data: import('./community').CommunityPostWithAuthor };
