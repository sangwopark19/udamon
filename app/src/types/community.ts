// DB: community_posts
export interface CommunityPost {
  id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  content: string;
  images: string[];
  has_poll: boolean;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_edited: boolean;
  is_trending: boolean;
  is_blinded: boolean;
  created_at: string;
  updated_at: string;
}

// Post with joined author/team data (for list/detail views)
export interface CommunityPostWithAuthor extends CommunityPost {
  user: {
    nickname: string;
    avatar_url: string | null;
    is_deleted?: boolean;
  };
  team: {
    name_ko: string;
  } | null;
}

// DB: community_comments
export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Comment with joined author data
export interface CommunityCommentWithAuthor extends CommunityComment {
  user: {
    nickname: string;
    avatar_url: string | null;
    is_deleted?: boolean;
  };
}

// DB: community_likes
export type LikeTargetType = 'post' | 'comment';

export interface CommunityLike {
  id: string;
  user_id: string;
  target_type: LikeTargetType;
  target_id: string;
  created_at: string;
}

// DB: community_reports
export type ReportTargetType = 'post' | 'comment';

export type ReportReason =
  | 'spam'
  | 'profanity'
  | 'harassment'
  | 'misinformation'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface CommunityReport {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  created_at: string;
}

// ─── Input types (for creating/updating) ──────────────────

export interface CreatePostInput {
  team_id?: string;
  title: string;
  content: string;
  images?: string[];
  has_poll?: boolean;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  images?: string[];
  is_edited: true;
}

export interface CreateCommentInput {
  post_id: string;
  parent_comment_id?: string;
  content: string;
}

// ─── Sort & filter ────────────────────────────────────────

export type PostSortOrder = 'popular' | 'latest' | 'likes' | 'comments';
