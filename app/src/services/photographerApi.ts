import { supabase, isSupabaseConfigured } from './supabase';
import type { Photographer, PhotoPost, Player, TimelineEvent } from '../types/photographer';
import type { PhotoComment, PgCollection } from '../contexts/PhotographerContext';

// ─── Types ────────────────────────────────────────────────
interface ApiResult<T> {
  data: T | null;
  error: string | null;
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
function mapPhotographer(row: any): Photographer {
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    bio: row.bio ?? '',
    avatar_url: row.avatar_url,
    cover_url: row.cover_url,
    team_id: teamUuidToSlug(row.team_id),
    follower_count: row.follower_count ?? 0,
    post_count: row.post_count ?? 0,
    is_verified: row.is_verified ?? false,
    created_at: row.created_at,
  };
}

function mapPhotoPost(row: any): PhotoPost {
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
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    view_count: row.view_count ?? 0,
    is_featured: row.is_featured ?? false,
    featured_week: row.featured_week,
    status: row.status ?? 'approved',
    rejection_reason: row.rejection_reason ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    photographer: pg ? {
      display_name: pg.display_name,
      avatar_url: pg.avatar_url,
      is_verified: pg.is_verified ?? false,
    } : { display_name: '알 수 없음', avatar_url: null, is_verified: false },
    team: team ? { name_ko: team.name_ko } : { name_ko: '' },
    player: player ? { name_ko: player.name_ko, number: player.number ?? 0 } : null,
    cheerleader: row.cheerleader ? { name: row.cheerleader.name } : null,
  };
}

function mapPlayer(row: any): Player {
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

function mapEvent(row: any): TimelineEvent {
  const teamIds = (row.timeline_event_teams ?? [])
    .map((et: any) => teamUuidToSlug(et.team_id))
    .filter(Boolean) as string[];
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

function mapComment(row: any): PhotoComment {
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

function mapCollection(row: any): PgCollection {
  const postIds = (row.photo_collection_posts ?? []).map((cp: any) => cp.post_id as string);
  return {
    id: row.id,
    photographerId: row.photographer_id,
    name: row.name,
    emoji: row.emoji ?? '📸',
    postIds,
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
    return { data: (data ?? []).map(mapPhotographer), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function fetchPhotoPosts(): Promise<ApiResult<PhotoPost[]>> {
  try {
    await ensureSlugMaps();
    const { data, error } = await supabase
      .from('photo_posts')
      .select(`
        *,
        photographer:photographers(display_name, avatar_url, is_verified),
        team:teams(name_ko),
        player:players(name_ko, number)
      `)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map(mapPhotoPost), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
    return { data: (data ?? []).map(mapPlayer), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
    return { data: (data ?? []).map(mapEvent), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
    return { data: (data ?? []).map(mapComment), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function fetchAllComments(): Promise<ApiResult<PhotoComment[]>> {
  try {
    const { data, error } = await supabase
      .from('photo_comments')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map(mapComment), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
    return { data: (data ?? []).map(mapCollection), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
    return { data: (data ?? []).map((r: any) => r.target_id), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function fetchUserFollows(userId: string): Promise<ApiResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('photographer_follows')
      .select('photographer_id')
      .eq('follower_id', userId);
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r: any) => r.photographer_id), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

// ─── Mutations ────────────────────────────────────────────

export async function createPhotoPost(params: {
  photographerId: string;
  teamSlug: string;
  playerId: string | null;
  title: string;
  description: string;
  images: string[];
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
        title: params.title,
        description: params.description,
        images: params.images,
      })
      .select(`
        *,
        photographer:photographers(display_name, avatar_url, is_verified),
        team:teams(name_ko),
        player:players(name_ko, number)
      `)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapPhotoPost(data), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function deletePhotoPost(postId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.from('photo_posts').delete().eq('id', postId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
  } catch (e: any) {
    return { data: null, error: e.message };
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
  } catch (e: any) {
    return { data: null, error: e.message };
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
    return { data: mapComment(data), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
  } catch (e: any) {
    return { data: null, error: e.message };
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
    return { data: mapCollection(data), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function deleteCollection(collectionId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.from('photo_collections').delete().eq('id', collectionId);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function addPostToCollection(collectionId: string, postId: string): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase
      .from('photo_collection_posts')
      .insert({ collection_id: collectionId, post_id: postId });
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

// ─── Image Upload ─────────────────────────────────────────
export async function uploadPostImages(userId: string, localUris: string[]): Promise<ApiResult<string[]>> {
  try {
    const publicUrls: string[] = [];
    for (const uri of localUris) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      const filePath = `${userId}/${timestamp}_${random}.jpg`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('photo-posts')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) return { data: null, error: uploadError.message };

      const { data: urlData } = supabase.storage
        .from('photo-posts')
        .getPublicUrl(filePath);

      publicUrls.push(urlData.publicUrl);
    }
    return { data: publicUrls, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

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
    return { data: mapPhotographer(data), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

// ─── Helper: reset slug cache (for testing) ───────────────
export function resetSlugCache(): void {
  _slugMap = null;
  _uuidToSlugMap = null;
}
