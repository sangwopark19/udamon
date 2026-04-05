// DB: community_polls
export interface Poll {
  id: string;
  post_id: string;
  allow_multiple: boolean;
  expires_at: string;
  is_closed: boolean;
  total_votes: number;
  created_at: string;
}

// DB: community_poll_options
export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  vote_count: number;
  sort_order: number;
}

// DB: community_poll_votes
export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

// Poll with options (for display)
export interface PollWithOptions extends Poll {
  options: PollOption[];
}

// ─── Input types ────────────────────────────────────────────

export type PollDuration = '24h' | '3d' | '7d';

export interface CreatePollInput {
  allow_multiple: boolean;
  duration: PollDuration;
  options: string[];                // 2~6개 선택지 텍스트
}

// ─── Helpers ────────────────────────────────────────────────

export function isPollExpired(poll: Poll): boolean {
  return new Date(poll.expires_at) < new Date();
}

export function isPollActive(poll: Poll): boolean {
  return !poll.is_closed && !isPollExpired(poll);
}

export function getPollExpiresAt(duration: PollDuration): string {
  const now = new Date();
  switch (duration) {
    case '24h': now.setHours(now.getHours() + 24); break;
    case '3d':  now.setDate(now.getDate() + 3); break;
    case '7d':  now.setDate(now.getDate() + 7); break;
  }
  return now.toISOString();
}
