import { supabase } from './supabase';
import type {
  CommunityPostWithAuthor,
  CommunityCommentWithAuthor,
  PostSortOrder,
  ReportReason,
  LikeTargetType,
} from '../types/community';
import type {
  PollOption,
  PollWithOptions,
  CreatePollInput,
} from '../types/poll';
import { getPollExpiresAt } from '../types/poll';

// ─── Types ────────────────────────────────────────────────
interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Team Slug ↔ UUID mapping ─────────────────────────────
// Mirrors photographerApi.ts — kept module-local so communityApi is
// independent of photographerApi (files are siblings, not dependents).
let _slugMap: Map<string, string> | null = null;
let _uuidToSlugMap: Map<string, string> | null = null;

async function ensureSlugMaps(): Promise<void> {
  if (_slugMap && _uuidToSlugMap) return;
  const { data } = await supabase.from('teams').select('id, slug');
  if (data) {
    _slugMap = new Map(data.map((t: { id: string; slug: string }) => [t.slug, t.id]));
    _uuidToSlugMap = new Map(data.map((t: { id: string; slug: string }) => [t.id, t.slug]));
  } else {
    _slugMap = new Map();
    _uuidToSlugMap = new Map();
  }
}

function teamUuidToSlug(uuid: string | null): string | null {
  if (!uuid || !_uuidToSlugMap) return null;
  return _uuidToSlugMap.get(uuid) ?? null;
}

function teamSlugToUuid(slug: string | null): string | null {
  if (!slug || !_slugMap) return null;
  return _slugMap.get(slug) ?? null;
}

// ─── Row → App type mappers ───────────────────────────────
interface AuthorRow {
  nickname?: string | null;
  avatar_url?: string | null;
  is_deleted?: boolean | null;
}

interface PostRow {
  id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  content: string;
  images: string[] | null;
  has_poll: boolean | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  is_edited: boolean | null;
  is_trending: boolean | null;
  is_blinded: boolean | null;
  created_at: string;
  updated_at: string;
  author?: AuthorRow | null;
  team?: { name_ko: string } | null;
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number | null;
  is_edited: boolean | null;
  is_deleted: boolean | null;
  created_at: string;
  updated_at: string;
  author?: AuthorRow | null;
}

interface PollRow {
  id: string;
  post_id: string;
  allow_multiple: boolean;
  expires_at: string;
  is_closed: boolean;
  total_votes: number | null;
  created_at: string;
  options?: PollOption[];
}

// Maps a community_posts row (with optional author + team joins) to the UI
// shape. Anon-read fallback per RESEARCH A4 — missing author does NOT throw;
// mapper returns empty nickname / null avatar. Plan 04 renders fallback UI.
function mapCommunityPost(row: PostRow): CommunityPostWithAuthor {
  return {
    id: row.id,
    user_id: row.user_id,
    team_id: teamUuidToSlug(row.team_id),
    title: row.title,
    content: row.content,
    images: row.images ?? [],
    has_poll: row.has_poll ?? false,
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    view_count: row.view_count ?? 0,
    is_edited: row.is_edited ?? false,
    is_trending: row.is_trending ?? false,
    is_blinded: row.is_blinded ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      nickname: row.author?.nickname ?? '',
      avatar_url: row.author?.avatar_url ?? null,
      is_deleted: row.author?.is_deleted ?? false,
    },
    team: row.team ? { name_ko: row.team.name_ko } : null,
  };
}

function mapCommunityComment(row: CommentRow): CommunityCommentWithAuthor {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    parent_comment_id: row.parent_comment_id,
    content: row.content,
    like_count: row.like_count ?? 0,
    is_edited: row.is_edited ?? false,
    is_deleted: row.is_deleted ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      nickname: row.author?.nickname ?? '',
      avatar_url: row.author?.avatar_url ?? null,
      is_deleted: row.author?.is_deleted ?? false,
    },
  };
}

function mapPoll(row: PollRow): PollWithOptions {
  return {
    id: row.id,
    post_id: row.post_id,
    allow_multiple: row.allow_multiple,
    expires_at: row.expires_at,
    is_closed: row.is_closed,
    total_votes: row.total_votes ?? 0,
    created_at: row.created_at,
    options: (row.options ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
  };
}

// ═══════════════════════════════════════════════════════════════
// Read operations
// ═══════════════════════════════════════════════════════════════

export async function fetchCommunityPosts(params: {
  teamSlug?: string;
  sort: PostSortOrder;
  page: number;
  pageSize: number;
}): Promise<ApiResult<CommunityPostWithAuthor[]>> {
  try {
    await ensureSlugMaps();
    const from = params.page * params.pageSize;
    const to = from + params.pageSize - 1;

    let query = supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .eq('is_blinded', false)
      .range(from, to);

    if (params.teamSlug && params.teamSlug !== 'all') {
      const teamUuid = teamSlugToUuid(params.teamSlug);
      if (teamUuid) query = query.eq('team_id', teamUuid);
    }

    switch (params.sort) {
      case 'latest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'likes':
        query = query
          .order('like_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'comments':
        query = query
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query
          .order('like_count', { ascending: false })
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []).map((row) => mapCommunityPost(row as unknown as PostRow)),
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function fetchTrendingPosts(): Promise<ApiResult<CommunityPostWithAuthor[]>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .eq('is_trending', true)
      .eq('is_blinded', false)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []).map((row) => mapCommunityPost(row as unknown as PostRow)),
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function fetchPostById(
  postId: string,
): Promise<ApiResult<CommunityPostWithAuthor | null>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .eq('id', postId)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };
    return { data: mapCommunityPost(data as unknown as PostRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function fetchCommentsByPostId(
  postId: string,
): Promise<ApiResult<CommunityCommentWithAuthor[]>> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []).map((row) => mapCommunityComment(row as unknown as CommentRow)),
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function fetchUserCommunityLikes(
  userId: string,
): Promise<ApiResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('community_likes')
      .select('target_id, target_type')
      .eq('user_id', userId);
    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []).map((r: { target_id: string }) => r.target_id),
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}
