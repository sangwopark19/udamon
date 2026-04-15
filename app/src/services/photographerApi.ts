import { supabase } from './supabase';
import type { Photographer, PhotoPost, Player, TimelineEvent } from '../types/photographer';
import type { Cheerleader } from '../types/cheerleader';
import type { PhotographerApplication, ApplicationStatus } from '../types/photographerApplication';
import type { PhotoComment, PgCollection } from '../contexts/PhotographerContext';
import { calculateGrade } from '../utils/photographerGrade';

// ─── Types ────────────────────────────────────────────────
interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Row interfaces (Supabase Row → App type 매핑 경로 — CLAUDE.md strict typing) ─
interface PhotographerRow {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  team_id: string | null;
  follower_count: number | null;
  post_count: number | null;
  is_verified: boolean | null;
  created_at: string;
}

interface PhotoPostRow {
  id: string;
  photographer_id: string;
  team_id: string;
  player_id: string | null;
  cheerleader_id: string | null;
  title: string;
  description: string | null;
  images: string[];
  videos: string[] | null;
  thumbnail_urls: string[] | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  is_featured: boolean | null;
  featured_week: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  photographer?: { display_name: string; avatar_url: string | null; is_verified: boolean } | null;
  team?: { name_ko: string } | null;
  player?: { name_ko: string; number: number | null } | null;
  cheerleader?: { name_ko: string } | null;
}

interface PlayerRow {
  id: string;
  team_id: string;
  name_ko: string;
  number: number | null;
  position: string;
  status: string;
}

interface TimelineEventTeamRow {
  team_id: string;
}

interface TimelineEventRow {
  id: string;
  title: string;
  event_type: TimelineEvent['event_type'];
  date: string;
  location: string | null;
  description: string | null;
  post_count: number | null;
  thumbnail_url: string | null;
  timeline_event_teams?: TimelineEventTeamRow[] | null;
}

interface PhotoCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  text: string;
  parent_id: string | null;
  like_count: number | null;
  is_deleted: boolean | null;
  created_at: string;
}

interface CollectionPostRow {
  post_id: string;
}

interface CollectionRow {
  id: string;
  photographer_id: string;
  name: string;
  emoji: string | null;
  photo_collection_posts?: CollectionPostRow[] | null;
}

interface CheerleaderRow {
  id: string;
  team_id: string;
  name_ko: string;
  name_en: string | null;
  position: 'leader' | 'member';
  status: 'active' | 'inactive';
  image_url: string | null;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  team_id: string | null;
  portfolio_url: string | null;
  bio: string | null;
  activity_links: string[] | null;
  activity_plan: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbTeam {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
}

// ─── Team Slug ↔ UUID mapping ─────────────────────────────
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
function mapPhotographer(row: PhotographerRow): Photographer {
  const postCount = row.post_count ?? 0;
  const followerCount = row.follower_count ?? 0;
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    bio: row.bio ?? '',
    avatar_url: row.avatar_url,
    cover_url: row.cover_url,
    team_id: teamUuidToSlug(row.team_id),
    follower_count: followerCount,
    post_count: postCount,
    is_verified: row.is_verified ?? false,
    grade: calculateGrade(postCount, followerCount),
    created_at: row.created_at,
  };
}

function mapPhotoPost(row: PhotoPostRow): PhotoPost {
  const pg = row.photographer;
  const team = row.team;
  const player = row.player;
  return {
    id: row.id,
    photographer_id: row.photographer_id,
    team_id: teamUuidToSlug(row.team_id) ?? row.team_id,
    player_id: row.player_id,
    cheerleader_id: row.cheerleader_id ?? null,
    title: row.title,
    description: row.description ?? '',
    images: row.images ?? [],
    videos: row.videos ?? [],                  // D-05
    thumbnail_urls: row.thumbnail_urls ?? [],  // D-12~D-15
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    view_count: row.view_count ?? 0,
    is_featured: row.is_featured ?? false,
    featured_week: row.featured_week,
    status: (row.status ?? 'approved') as PhotoPost['status'],
    rejection_reason: row.rejection_reason ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    photographer: pg
      ? { display_name: pg.display_name, avatar_url: pg.avatar_url, is_verified: pg.is_verified ?? false }
      : { display_name: '알 수 없음', avatar_url: null, is_verified: false },
    team: team ? { name_ko: team.name_ko } : { name_ko: '' },
    player: player ? { name_ko: player.name_ko, number: player.number ?? 0 } : null,
    cheerleader: row.cheerleader ? { name_ko: row.cheerleader.name_ko } : null,  // D-20
  };
}

function mapPlayer(row: PlayerRow): Player {
  const posMap: Record<string, string> = {
    pitcher: 'P', catcher: 'C', infielder: 'IF', outfielder: 'OF', designated_hitter: 'OF',
  };
  return {
    id: row.id,
    team_id: teamUuidToSlug(row.team_id) ?? row.team_id,
    name_ko: row.name_ko,
    number: row.number ?? 0,
    position: (posMap[row.position] ?? 'OF') as Player['position'],
    is_active: row.status === 'active',
  };
}

function mapEvent(row: TimelineEventRow): TimelineEvent {
  const teamIds = (row.timeline_event_teams ?? [])
    .map((et) => teamUuidToSlug(et.team_id))
    .filter((slug): slug is string => slug !== null);
  return {
    id: row.id,
    title: row.title,
    event_type: row.event_type,
    team_ids: teamIds,
    date: row.date,
    location: row.location ?? '',
    description: row.description ?? '',
    post_count: row.post_count ?? 0,
    thumbnail_url: row.thumbnail_url,
  };
}

function mapComment(row: PhotoCommentRow): PhotoComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    userName: row.user_name,
    text: row.text,
    parentId: row.parent_id,
    likeCount: row.like_count ?? 0,
    isDeleted: row.is_deleted ?? false,
    createdAt: row.created_at,
  };
}

function mapCollection(row: CollectionRow): PgCollection {
  const postIds = (row.photo_collection_posts ?? []).map((cp) => cp.post_id);
  return {
    id: row.id,
    photographerId: row.photographer_id,
    name: row.name,
    emoji: row.emoji ?? '📸',
    postIds,
  };
}

function mapCheerleader(row: CheerleaderRow): Cheerleader {
  return {
    id: row.id,
    team_id: teamUuidToSlug(row.team_id) ?? row.team_id,
    name_ko: row.name_ko,
    name_en: row.name_en,
    position: row.position,
    status: row.status,
    image_url: row.image_url,
  };
}

function mapApplication(row: ApplicationRow): PhotographerApplication {
  return {
    id: row.id,
    user_id: row.user_id,
    team_id: teamUuidToSlug(row.team_id),
    portfolio_url: row.portfolio_url,
    bio: row.bio ?? '',
    activity_links: row.activity_links ?? [],
    activity_plan: row.activity_plan ?? '',
    status: (row.status ?? 'pending') as ApplicationStatus,
    rejection_reason: row.rejection_reason,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ═══════════════════════════════════════════════════════════════
// API functions
// ═══════════════════════════════════════════════════════════════

export async function fetchPhotographers(): Promise<ApiResult<Photographer[]>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('photographers')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapPhotographer(r as PhotographerRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchPhotographers failed';
    return { data: null, error: msg };
  }
}

// D-23: { teamSlug?, page?, pageSize? } 파라미터로 페이지네이션 지원
export async function fetchPhotoPosts(params: {
  teamSlug?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ApiResult<PhotoPost[]>> {
  try {
    await ensureSlugMaps();
    const page = params.page ?? 0;
    const pageSize = params.pageSize ?? 20;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('photo_posts')
      .select(`
        *,
        photographer:photographers(display_name, avatar_url, is_verified),
        team:teams(name_ko),
        player:players(name_ko, number),
        cheerleader:cheerleaders(name_ko)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params.teamSlug && params.teamSlug !== 'all') {
      const teamUuid = teamSlugToUuid(params.teamSlug);
      if (teamUuid) query = query.eq('team_id', teamUuid);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapPhotoPost(r as unknown as PhotoPostRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchPhotoPosts failed';
    return { data: null, error: msg };
  }
}

export async function fetchPlayers(): Promise<ApiResult<Player[]>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('status', 'active')
      .order('number', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapPlayer(r as PlayerRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchPlayers failed';
    return { data: null, error: msg };
  }
}

export async function fetchEvents(): Promise<ApiResult<TimelineEvent[]>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('timeline_events')
      .select(`
        *,
        timeline_event_teams(team_id)
      `)
      .order('date', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapEvent(r as TimelineEventRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchEvents failed';
    return { data: null, error: msg };
  }
}

export async function fetchComments(postId: string): Promise<ApiResult<PhotoComment[]>> {
  try {
    const { data, error } = await supabase
      .from('photo_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapComment(r as PhotoCommentRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchComments failed';
    return { data: null, error: msg };
  }
}

export async function fetchAllComments(): Promise<ApiResult<PhotoComment[]>> {
  try {
    const { data, error } = await supabase
      .from('photo_comments')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapComment(r as PhotoCommentRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchAllComments failed';
    return { data: null, error: msg };
  }
}

export async function fetchCollections(): Promise<ApiResult<PgCollection[]>> {
  try {
    const { data, error } = await supabase
      .from('photo_collections')
      .select(`
        *,
        photo_collection_posts(post_id)
      `)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapCollection(r as CollectionRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchCollections failed';
    return { data: null, error: msg };
  }
}

// PHOT-08: 특정 컬렉션의 post 목록을 PhotoPost 매핑으로 반환 (D-21)
export async function fetchCollectionPosts(collectionId: string): Promise<ApiResult<PhotoPost[]>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('photo_collection_posts')
      .select(`
        post_id,
        post:photo_posts(
          *,
          photographer:photographers(display_name, avatar_url, is_verified),
          team:teams(name_ko),
          player:players(name_ko, number),
          cheerleader:cheerleaders(name_ko)
        )
      `)
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    const posts = (data ?? [])
      .map((r) => (r as unknown as { post: PhotoPostRow | null }).post)
      .filter((p): p is PhotoPostRow => p !== null)
      .map(mapPhotoPost);
    return { data: posts, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchCollectionPosts failed';
    return { data: null, error: msg };
  }
}

export async function fetchUserPhotoLikes(userId: string): Promise<ApiResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('photo_likes')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', 'post');
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r: { target_id: string }) => r.target_id), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchUserPhotoLikes failed';
    return { data: null, error: msg };
  }
}

export async function fetchUserFollows(userId: string): Promise<ApiResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('photographer_follows')
      .select('photographer_id')
      .eq('follower_id', userId);
    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []).map((r: { photographer_id: string }) => r.photographer_id),
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchUserFollows failed';
    return { data: null, error: msg };
  }
}

// D-20 / PHOT-07: 치어리더 목록 DB fetch (기존 mock 제거)
export async function fetchCheerleaders(): Promise<ApiResult<Cheerleader[]>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('cheerleaders')
      .select('*')
      .eq('status', 'active')
      .order('name_ko', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r) => mapCheerleader(r as CheerleaderRow)), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchCheerleaders failed';
    return { data: null, error: msg };
  }
}

// ─── Mutations ────────────────────────────────────────────

// D-05: videos / cheerleaderId 파라미터 추가
export async function createPhotoPost(params: {
  photographerId: string;
  teamSlug: string;
  playerId: string | null;
  cheerleaderId: string | null;
  title: string;
  description: string;
  images: string[];
  videos: string[];
}): Promise<ApiResult<PhotoPost>> {
  try {
    await ensureSlugMaps();
    const teamUuid = teamSlugToUuid(params.teamSlug);
    if (!teamUuid) return { data: null, error: 'Invalid team slug' };

    const { data, error } = await supabase
      .from('photo_posts')
      .insert({
        photographer_id: params.photographerId,
        team_id: teamUuid,
        player_id: params.playerId || null,
        cheerleader_id: params.cheerleaderId || null,
        title: params.title,
        description: params.description,
        images: params.images,
        videos: params.videos,
      })
      .select(`
        *,
        photographer:photographers(display_name, avatar_url, is_verified),
        team:teams(name_ko),
        player:players(name_ko, number),
        cheerleader:cheerleaders(name_ko)
      `)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapPhotoPost(data as unknown as PhotoPostRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'createPhotoPost failed';
    return { data: null, error: msg };
  }
}

export async function deletePhotoPost(postId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.from('photo_posts').delete().eq('id', postId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'deletePhotoPost failed';
    return { data: null, error: msg };
  }
}

export async function togglePhotoLike(userId: string, targetType: 'post' | 'comment', targetId: string): Promise<ApiResult<boolean>> {
  try {
    // Check if already liked
    const { data: existing } = await supabase
      .from('photo_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('photo_likes').delete().eq('id', existing.id);
      if (error) return { data: null, error: error.message };
      return { data: false, error: null }; // unliked
    } else {
      const { error } = await supabase.from('photo_likes').insert({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
      });
      if (error) return { data: null, error: error.message };
      return { data: true, error: null }; // liked
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'togglePhotoLike failed';
    return { data: null, error: msg };
  }
}

export async function toggleFollow(userId: string, photographerId: string): Promise<ApiResult<boolean>> {
  try {
    const { data: existing } = await supabase
      .from('photographer_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('photographer_id', photographerId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('photographer_follows').delete().eq('id', existing.id);
      if (error) return { data: null, error: error.message };
      return { data: false, error: null }; // unfollowed
    } else {
      const { error } = await supabase.from('photographer_follows').insert({
        follower_id: userId,
        photographer_id: photographerId,
      });
      if (error) return { data: null, error: error.message };
      return { data: true, error: null }; // followed
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'toggleFollow failed';
    return { data: null, error: msg };
  }
}

export async function createComment(params: {
  postId: string;
  userId: string;
  userName: string;
  text: string;
  parentId?: string;
}): Promise<ApiResult<PhotoComment>> {
  try {
    const { data, error } = await supabase
      .from('photo_comments')
      .insert({
        post_id: params.postId,
        user_id: params.userId,
        user_name: params.userName,
        text: params.text,
        parent_id: params.parentId || null,
      })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapComment(data as PhotoCommentRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'createComment failed';
    return { data: null, error: msg };
  }
}

export async function deleteComment(commentId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('photo_comments')
      .update({ is_deleted: true, text: '' })
      .eq('id', commentId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'deleteComment failed';
    return { data: null, error: msg };
  }
}

export async function createCollection(params: {
  photographerId: string;
  name: string;
  emoji: string;
}): Promise<ApiResult<PgCollection>> {
  try {
    const { data, error } = await supabase
      .from('photo_collections')
      .insert({
        photographer_id: params.photographerId,
        name: params.name,
        emoji: params.emoji,
      })
      .select(`
        *,
        photo_collection_posts(post_id)
      `)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapCollection(data as CollectionRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'createCollection failed';
    return { data: null, error: msg };
  }
}

export async function deleteCollection(collectionId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.from('photo_collections').delete().eq('id', collectionId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'deleteCollection failed';
    return { data: null, error: msg };
  }
}

export async function addPostToCollection(collectionId: string, postId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('photo_collection_posts')
      .insert({ collection_id: collectionId, post_id: postId });
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'addPostToCollection failed';
    return { data: null, error: msg };
  }
}

export async function removePostFromCollection(collectionId: string, postId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('photo_collection_posts')
      .delete()
      .eq('collection_id', collectionId)
      .eq('post_id', postId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'removePostFromCollection failed';
    return { data: null, error: msg };
  }
}

// ─── Photographer Applications (D-07, D-08, D-09, PHOT-02) ─────

// D-08: 포토그래퍼 심사 신청 — RLS: user_id = auth.uid() 만 INSERT 가능
export async function submitPhotographerApplication(params: {
  user_id: string;
  team_slug: string | null;
  activity_links: string[];
  activity_plan: string;
  portfolio_url?: string | null;
  bio?: string;
}): Promise<ApiResult<PhotographerApplication>> {
  try {
    await ensureSlugMaps();
    const teamUuid = params.team_slug ? teamSlugToUuid(params.team_slug) : null;

    const { data, error } = await supabase
      .from('photographer_applications')
      .insert({
        user_id: params.user_id,
        team_id: teamUuid,
        activity_links: params.activity_links,
        activity_plan: params.activity_plan,
        portfolio_url: params.portfolio_url ?? null,
        bio: params.bio ?? '',
      })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapApplication(data as ApplicationRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'submitPhotographerApplication failed';
    return { data: null, error: msg };
  }
}

// D-09: 내 심사 상태 조회 (pending/approved/rejected) — 최신 1건
export async function fetchMyPhotographerApplication(
  userId: string,
): Promise<ApiResult<PhotographerApplication | null>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('photographer_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };
    return { data: mapApplication(data as ApplicationRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchMyPhotographerApplication failed';
    return { data: null, error: msg };
  }
}

// ─── Image / Video Upload (Cloudflare R2) ────────────────────────
export { uploadPostImages, uploadPostVideos } from './r2Upload';

// ─── Photographer profile by user_id ──────────────────────
export async function fetchPhotographerByUserId(userId: string): Promise<ApiResult<Photographer>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('photographers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };
    return { data: mapPhotographer(data as PhotographerRow), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchPhotographerByUserId failed';
    return { data: null, error: msg };
  }
}

// ─── Helper: reset slug cache (for testing) ───────────────
export function resetSlugCache(): void {
  _slugMap = null;
  _uuidToSlugMap = null;
}

// ─── Re-export types for use elsewhere ────────────────────
export type { DbTeam };
