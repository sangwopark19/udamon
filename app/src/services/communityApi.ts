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

// ═══════════════════════════════════════════════════════════════
// Mutations — Posts
// ═══════════════════════════════════════════════════════════════

export async function createCommunityPost(params: {
  userId: string;
  teamSlug?: string;
  title: string;
  content: string;
  images: string[];
  pollInput?: CreatePollInput;
}): Promise<ApiResult<CommunityPostWithAuthor>> {
  try {
    await ensureSlugMaps();
    const teamUuid = params.teamSlug ? teamSlugToUuid(params.teamSlug) : null;

    const { data: inserted, error: insertErr } = await supabase
      .from('community_posts')
      .insert({
        user_id: params.userId,
        team_id: teamUuid,
        title: params.title,
        content: params.content,
        images: params.images,
        has_poll: !!params.pollInput,
      })
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .single();

    if (insertErr) return { data: null, error: insertErr.message };
    if (!inserted) return { data: null, error: 'Insert returned no row' };

    const postRow = inserted as unknown as PostRow;

    // If a poll is attached, create poll + options. Failures log but do not
    // rollback the post — per D-09 orphan acceptance (v2 cleanup cron TBD).
    if (params.pollInput) {
      const { data: poll, error: pollErr } = await supabase
        .from('community_polls')
        .insert({
          post_id: postRow.id,
          allow_multiple: params.pollInput.allow_multiple,
          expires_at: getPollExpiresAt(params.pollInput.duration),
        })
        .select('*')
        .single();
      if (pollErr || !poll) {
        console.warn('[Community] poll insert failed:', pollErr?.message);
      } else {
        const pollId = (poll as { id: string }).id;
        const optionRows = params.pollInput.options.map((text, i) => ({
          poll_id: pollId,
          text,
          sort_order: i,
        }));
        const { error: optErr } = await supabase
          .from('community_poll_options')
          .insert(optionRows);
        if (optErr) {
          console.warn('[Community] poll options insert failed:', optErr.message);
        }
      }
    }

    return { data: mapCommunityPost(postRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function updateCommunityPost(
  postId: string,
  input: {
    title?: string;
    content?: string;
    images?: string[];
  },
): Promise<ApiResult<CommunityPostWithAuthor>> {
  try {
    await ensureSlugMaps();
    const payload: Record<string, unknown> = { is_edited: true };
    if (input.title !== undefined) payload.title = input.title;
    if (input.content !== undefined) payload.content = input.content;
    if (input.images !== undefined) payload.images = input.images;

    const { data, error } = await supabase
      .from('community_posts')
      .update(payload)
      .eq('id', postId)
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .single();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'Update returned no row' };
    return { data: mapCommunityPost(data as unknown as PostRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function deleteCommunityPost(postId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.from('community_posts').delete().eq('id', postId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// Mutations — Comments
// ═══════════════════════════════════════════════════════════════

export async function createCommunityComment(params: {
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
}): Promise<ApiResult<CommunityCommentWithAuthor>> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: params.postId,
        user_id: params.userId,
        content: params.content,
        parent_comment_id: params.parentCommentId ?? null,
      })
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted)
      `)
      .single();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'Insert returned no row' };
    return { data: mapCommunityComment(data as unknown as CommentRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function updateCommunityComment(
  commentId: string,
  content: string,
): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('community_comments')
      .update({ content, is_edited: true })
      .eq('id', commentId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function deleteCommunityComment(
  commentId: string,
): Promise<ApiResult<void>> {
  try {
    // Soft delete — only flip is_deleted = true.
    // Do NOT set content = '' because community_comments has a
    // CHECK (char_length(content) >= 1) constraint which would fail
    // with SQLSTATE 23514. The UI renders the "삭제된 댓글입니다"
    // placeholder based on is_deleted alone.
    const { error } = await supabase
      .from('community_comments')
      .update({ is_deleted: true })
      .eq('id', commentId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// Mutations — Likes
// ═══════════════════════════════════════════════════════════════

export async function toggleCommunityLike(
  userId: string,
  targetType: LikeTargetType,
  targetId: string,
): Promise<ApiResult<boolean>> {
  try {
    const { data: existing } = await supabase
      .from('community_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (existing) {
      const existingRow = existing as { id: string };
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('id', existingRow.id);
      if (error) return { data: null, error: error.message };
      return { data: false, error: null };
    } else {
      const { error } = await supabase
        .from('community_likes')
        .insert({ user_id: userId, target_type: targetType, target_id: targetId });
      if (error) {
        // 23505 = duplicate from race condition — treat as already liked
        if (error.code === '23505') return { data: true, error: null };
        return { data: null, error: error.message };
      }
      return { data: true, error: null };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// Mutations — Polls (vote)
// ═══════════════════════════════════════════════════════════════

export async function voteCommunityPoll(params: {
  pollId: string;
  optionId: string;
  userId: string;
}): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('community_poll_votes')
      .insert({
        poll_id: params.pollId,
        option_id: params.optionId,
        user_id: params.userId,
      });
    if (error) {
      // P0001 from check_poll_vote trigger:
      //   - 'Poll is closed or expired' → POLL_EXPIRED
      //   - 'Already voted (single choice poll)' → POLL_ALREADY_VOTED
      if (error.code === 'P0001') {
        if (/closed|expired/i.test(error.message)) {
          return { data: null, error: 'POLL_EXPIRED' };
        }
        if (/already voted/i.test(error.message)) {
          return { data: null, error: 'POLL_ALREADY_VOTED' };
        }
        return { data: null, error: error.message };
      }
      // 23505 from UNIQUE(poll_id, option_id, user_id) — duplicate click
      if (error.code === '23505') {
        return { data: null, error: 'POLL_ALREADY_VOTED' };
      }
      return { data: null, error: error.message };
    }
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// Fetch post with poll (2-query pattern — D-12 revised per Pitfall 6)
// ═══════════════════════════════════════════════════════════════
//
// WHY 2 queries instead of embedding the current user's votes inside the
// first post SELECT? An embedded left join on the vote rows returns ALL
// vote rows for everyone — RLS applies per-row and the nested embed joins
// all rows then tries to filter, which leaks other users' votes. The
// 2-query pattern keeps votes scoped to the current user via an explicit
// `.eq('user_id', currentUserId)` filter in the second query.

export async function fetchPostWithPoll(
  postId: string,
  currentUserId: string | null,
): Promise<
  ApiResult<{
    post: CommunityPostWithAuthor;
    poll: PollWithOptions | null;
    myVotes: string[];
  }>
> {
  try {
    await ensureSlugMaps();

    // Query 1: post + poll + options
    const { data: postRow, error: postErr } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko),
        poll:community_polls (
          *,
          options:community_poll_options (*)
        )
      `)
      .eq('id', postId)
      .maybeSingle();

    if (postErr) return { data: null, error: postErr.message };
    if (!postRow) return { data: null, error: 'NOT_FOUND' };

    const row = postRow as unknown as PostRow & { poll?: PollRow | null };
    const poll = row.poll ? mapPoll(row.poll) : null;

    // Query 2: user's votes for this poll (only if logged-in AND poll exists)
    let myVotes: string[] = [];
    if (currentUserId && poll) {
      const { data: votes, error: votesErr } = await supabase
        .from('community_poll_votes')
        .select('option_id')
        .eq('poll_id', poll.id)
        .eq('user_id', currentUserId);
      if (!votesErr && votes) {
        myVotes = votes.map((v: { option_id: string }) => v.option_id);
      }
    }

    return {
      data: {
        post: mapCommunityPost(row),
        poll,
        myVotes,
      },
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// RPC — increment view count (D-11)
// ═══════════════════════════════════════════════════════════════

export async function incrementPostView(postId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.rpc('increment_post_view', { post_id: postId });
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// Mutations — Reports (D-14 error narrowing, Pitfall 7)
// ═══════════════════════════════════════════════════════════════

export async function reportCommunityTarget(params: {
  reporterId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: ReportReason;
  detail?: string;
}): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.from('community_reports').insert({
      reporter_id: params.reporterId,
      target_type: params.targetType,
      target_id: params.targetId,
      reason: params.reason,
      detail: params.detail ?? null,
    });

    if (error) {
      // 23505: UNIQUE(reporter_id, target_type, target_id) — duplicate report
      if (error.code === '23505') {
        return { data: null, error: 'ALREADY_REPORTED' };
      }
      // P0001: `check_self_report` trigger raised — or fallback regex on
      // message in case trigger uses a different SQLSTATE
      if (error.code === 'P0001' || /self|own content/i.test(error.message)) {
        return { data: null, error: 'CANNOT_SELF_REPORT' };
      }
      return { data: null, error: error.message };
    }
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// Search (D-07: ILIKE + player pivot, sanitized per Pitfall 8)
// ═══════════════════════════════════════════════════════════════
//
// WHY sanitize with replace(/[%,]/g, '')?
// PostgREST `.or('title.ilike.%q%,content.ilike.%q%')` concatenates the
// query string into a PostgREST filter expression — it is NOT parameterized.
// Stripping `%` and `,` prevents a malicious query from injecting extra
// filter clauses. Length cap (50) limits DoS surface.

export async function searchCommunityPosts(
  query: string,
): Promise<ApiResult<CommunityPostWithAuthor[]>> {
  try {
    // Pitfall 8: strip %, comma — .or() is NOT parameterized
    const safeQ = query.replace(/[%,]/g, '').trim().slice(0, 50);
    if (!safeQ) return { data: [], error: null };

    await ensureSlugMaps();

    // Query 1: posts where title or content matches
    const { data: byText, error: err1 } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .or(`title.ilike.%${safeQ}%,content.ilike.%${safeQ}%`)
      .eq('is_blinded', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (err1) return { data: null, error: err1.message };

    // Query 2: player name match → pivot to posts in those teams
    const { data: matchedPlayers } = await supabase
      .from('players')
      .select('team_id')
      .ilike('name_ko', `%${safeQ}%`);

    let byPlayerTeam: PostRow[] = [];
    if (matchedPlayers && matchedPlayers.length > 0) {
      const teamIds = Array.from(
        new Set(
          (matchedPlayers as { team_id: string | null }[])
            .map((p) => p.team_id)
            .filter((id): id is string => !!id),
        ),
      );
      if (teamIds.length > 0) {
        const { data: postsFromTeams } = await supabase
          .from('community_posts')
          .select(`
            *,
            author:users!user_id (nickname, avatar_url, is_deleted),
            team:teams (name_ko)
          `)
          .in('team_id', teamIds)
          .eq('is_blinded', false)
          .order('created_at', { ascending: false })
          .limit(20);
        byPlayerTeam = (postsFromTeams ?? []) as unknown as PostRow[];
      }
    }

    // Merge + dedupe by id, sort by created_at DESC
    const seen = new Set<string>();
    const merged: PostRow[] = [];
    const combined: PostRow[] = [
      ...((byText ?? []) as unknown as PostRow[]),
      ...byPlayerTeam,
    ];
    for (const p of combined) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return { data: merged.map(mapCommunityPost), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════
// Recent searches (D-08 — DB-backed via Phase 1 recent_searches table)
// ═══════════════════════════════════════════════════════════════

export async function fetchRecentSearches(
  userId: string,
): Promise<ApiResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('recent_searches')
      .select('query')
      .eq('user_id', userId)
      .eq('search_type', 'community')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []).map((r: { query: string }) => r.query),
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function addRecentSearch(
  userId: string,
  query: string,
): Promise<ApiResult<void>> {
  try {
    const q = query.trim();
    if (!q) return { data: undefined, error: null };

    // Dedupe: delete any existing row with same user+query+type, then insert
    // (keeps the new timestamp at the top and lets trg_limit_recent_searches
    // trim to 10). DB trigger auto-trims per RESEARCH §Architecture Pattern §5.
    await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', userId)
      .eq('search_type', 'community')
      .eq('query', q);

    const { error } = await supabase
      .from('recent_searches')
      .insert({ user_id: userId, query: q, search_type: 'community' });
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function removeRecentSearch(
  userId: string,
  query: string,
): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', userId)
      .eq('search_type', 'community')
      .eq('query', query);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function clearRecentSearches(userId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', userId)
      .eq('search_type', 'community');
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// ─── Helper: reset slug cache (for testing) ───────────────
export function resetSlugCache(): void {
  _slugMap = null;
  _uuidToSlugMap = null;
}
