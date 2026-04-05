import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import type { Photographer, PhotoPost, Player, TimelineEvent, HomeFeedItem } from '../types/photographer';
import type { Cheerleader } from '../types/cheerleader';
import type { CommunityPostWithAuthor } from '../types/community';
import { MOCK_PHOTOGRAPHERS, MOCK_PHOTO_POSTS, MOCK_PLAYERS, MOCK_EVENTS } from '../data/mockPhotographers';
import { MOCK_CHEERLEADERS } from '../data/mockCheerleaders';
import { isSupabaseConfigured } from '../services/supabase';
import * as photographerApi from '../services/photographerApi';

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

const PAGE_SIZE = 20;

interface PhotographerContextValue {
  // Data loading state
  loading: boolean;
  isRemote: boolean;
  refreshData: () => Promise<void>;

  // Photographers
  photographers: Photographer[];
  getPhotographer: (id: string) => Photographer | undefined;

  // Photo posts
  photoPosts: PhotoPost[];
  getPhotoPost: (id: string) => PhotoPost | undefined;
  getPhotoPostsByTeam: (teamId: string) => PhotoPost[];
  getPhotoPostsByPhotographer: (pgId: string) => PhotoPost[];
  getPhotoPostsByPlayer: (playerId: string) => PhotoPost[];
  getFeaturedPosts: () => PhotoPost[];
  searchPhotoPosts: (query: string) => PhotoPost[];

  // Players
  players: Player[];
  getPlayer: (id: string) => Player | undefined;
  getPlayersByTeam: (teamId: string) => Player[];

  // Cheerleaders
  cheerleaders: Cheerleader[];
  getCheerleader: (id: string) => Cheerleader | undefined;
  getCheerleadersByTeam: (teamId: string) => Cheerleader[];
  getPhotoPostsByCheerleader: (cheerleaderId: string) => PhotoPost[];

  // Timeline events
  events: TimelineEvent[];
  getEvent: (id: string) => TimelineEvent | undefined;
  getEventsByType: (type: string) => TimelineEvent[];

  // Home feed
  getHomeFeed: (communityPosts: CommunityPostWithAuthor[], page: number) => HomeFeedItem[];

  // Photo likes
  photoLikedIds: Set<string>;
  togglePhotoLike: (postId: string) => void;
  isPhotoLiked: (postId: string) => boolean;

  // Follow
  followedPgIds: Set<string>;
  followerPgIds: Set<string>;
  toggleFollow: (pgId: string) => void;
  isFollowing: (pgId: string) => boolean;

  // Mutations
  registerPhotographer: (photographer: Photographer) => void;
  addPhotoPost: (post: PhotoPost) => void;
  deletePhotoPost: (postId: string) => void;
  updatePostStatus: (postId: string, status: 'approved' | 'rejected', reason?: string) => void;
  updatePhotographer: (pgId: string, updates: Partial<Pick<Photographer, 'display_name' | 'bio' | 'avatar_url' | 'cover_url'>>) => void;
  updatePhotographerVerification: (pgId: string, verified: boolean) => void;
  setFeaturedPost: (photographerId: string, postId: string) => void;

  // Collections
  collections: PgCollection[];
  getCollectionsForPg: (pgId: string) => PgCollection[];
  createCollection: (pgId: string, name: string, emoji: string) => void;
  deleteCollection: (collectionId: string) => void;
  renameCollection: (collectionId: string, name: string) => void;
  addPostToCollection: (collectionId: string, postId: string) => void;
  removePostFromCollection: (collectionId: string, postId: string) => void;

  // Comments
  comments: PhotoComment[];
  addComment: (postId: string, text: string, userId: string, userName: string, parentId?: string) => void;
  deleteComment: (commentId: string) => void;
  getCommentsForPost: (postId: string) => PhotoComment[];
  toggleCommentLike: (commentId: string) => void;
  isCommentLiked: (commentId: string) => boolean;
}

export interface PhotoComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
  parentId: string | null;
  likeCount: number;
  isDeleted: boolean;
  createdAt: string;
}

export interface PgCollection {
  id: string;
  photographerId: string;
  name: string;
  emoji: string;
  postIds: string[];
}

const MOCK_COLLECTIONS: PgCollection[] = [
  { id: 'col1', photographerId: 'pg1', name: '명장면 모음', emoji: '\uD83D\uDD25', postIds: ['pp1', 'pp2'] },
  { id: 'col2', photographerId: 'pg1', name: '경기장 풍경', emoji: '\uD83C\uDFDF', postIds: ['pp3'] },
  { id: 'col3', photographerId: 'pg2', name: '선수 포커스', emoji: '\uD83D\uDCF8', postIds: ['pp4', 'pp5', 'pp6'] },
  { id: 'col4', photographerId: 'test-user-002', name: '잠실 모음', emoji: '\u26BE', postIds: ['pp-t1', 'pp-t2'] },
];

// ─── Mock Comments ───────────────────────────────────────────
const MOCK_PHOTO_COMMENTS: PhotoComment[] = [
  { id: 'pc1', postId: 'pp1', userId: 'u1', userName: '야구팬92', text: '역투 멋지네요! 사진 퀄리티 최고', parentId: null, likeCount: 5, isDeleted: false, createdAt: '2026-03-27T14:30:00Z' },
  { id: 'pc2', postId: 'pp1', userId: 'u2', userName: '랜더스사랑', text: '광현이형 화이팅!', parentId: null, likeCount: 3, isDeleted: false, createdAt: '2026-03-27T15:10:00Z' },
  { id: 'pc3', postId: 'pp1', userId: 'u3', userName: 'SSG직관러', text: '저도 이날 직관했는데 정말 대단했어요', parentId: 'pc1', likeCount: 1, isDeleted: false, createdAt: '2026-03-27T15:45:00Z' },
  { id: 'pc4', postId: 'pp2', userId: 'u4', userName: '최정레전드', text: '400호 홈런 역사적인 순간을 이렇게 담다니', parentId: null, likeCount: 12, isDeleted: false, createdAt: '2026-03-27T10:00:00Z' },
  { id: 'pc5', postId: 'pp2', userId: 'u5', userName: '야구사진가', text: '타격 순간 포착이 완벽해요', parentId: null, likeCount: 8, isDeleted: false, createdAt: '2026-03-27T11:20:00Z' },
  { id: 'pc6', postId: 'pp2', userId: 'u1', userName: '야구팬92', text: '진짜 소름돋았어요 그날', parentId: 'pc4', likeCount: 2, isDeleted: false, createdAt: '2026-03-27T12:00:00Z' },
  { id: 'pc7', postId: 'pp3', userId: 'u6', userName: '석양헌터', text: '랜더스필드 석양은 진짜 예술이죠', parentId: null, likeCount: 4, isDeleted: false, createdAt: '2026-03-26T18:00:00Z' },
  { id: 'pc8', postId: 'pp4', userId: 'u7', userName: '타이거즈팬', text: '양현종 선수 폼 진짜 좋아보여요', parentId: null, likeCount: 6, isDeleted: false, createdAt: '2026-03-27T09:00:00Z' },
  { id: 'pc9', postId: 'pp5', userId: 'u8', userName: 'KIA팬클럽', text: '포수 프레이밍 사진 처음 봐요 대박', parentId: null, likeCount: 3, isDeleted: false, createdAt: '2026-03-26T20:00:00Z' },
  { id: 'pc10', postId: 'pp6', userId: 'u9', userName: '두산베어스', text: '구장 분위기 살아있네요!', parentId: null, likeCount: 7, isDeleted: false, createdAt: '2026-03-27T16:00:00Z' },
];

const PhotographerContext = createContext<PhotographerContextValue | null>(null);

export function PhotographerProvider({ children }: { children: ReactNode }) {
  const [photographers, setPhotographers] = useState<Photographer[]>(MOCK_PHOTOGRAPHERS);
  const [photoPosts, setPhotoPosts] = useState<PhotoPost[]>(MOCK_PHOTO_POSTS);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [events, setEvents] = useState<TimelineEvent[]>(MOCK_EVENTS);
  const [photoLikedIds, setPhotoLikedIds] = useState<Set<string>>(new Set());
  const [followedPgIds, setFollowedPgIds] = useState<Set<string>>(new Set());
  const [followerPgIds] = useState<Set<string>>(() => {
    const ids = MOCK_PHOTOGRAPHERS.slice(0, 5).map((p) => p.id);
    return new Set(ids);
  });
  const [collections, setCollections] = useState<PgCollection[]>(MOCK_COLLECTIONS);
  const [comments, setComments] = useState<PhotoComment[]>(MOCK_PHOTO_COMMENTS);
  const [commentLikedIds, setCommentLikedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [isRemote, setIsRemote] = useState(false);
  const isRemoteRef = useRef(false);

  // ─── Supabase data fetch ──────────────────────────────────
  const loadRemoteData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const [pgResult, postsResult, playersResult, eventsResult, commentsResult, collectionsResult] = await Promise.all([
        photographerApi.fetchPhotographers(),
        photographerApi.fetchPhotoPosts(),
        photographerApi.fetchPlayers(),
        photographerApi.fetchEvents(),
        photographerApi.fetchAllComments(),
        photographerApi.fetchCollections(),
      ]);

      if (pgResult.data && pgResult.data.length > 0) {
        // Merge: keep ALL mock photographers that aren't in remote data
        const remoteIds = new Set(pgResult.data.map((p: Photographer) => p.id));
        const localOnly = MOCK_PHOTOGRAPHERS.filter((p) => !remoteIds.has(p.id));
        setPhotographers([...pgResult.data, ...localOnly]);
        setIsRemote(true);
        isRemoteRef.current = true;
      }
      if (postsResult.data && postsResult.data.length > 0) {
        // Merge: keep ALL mock photo posts that aren't in remote data
        const remotePostIds = new Set(postsResult.data.map((p: PhotoPost) => p.id));
        const localOnlyPosts = MOCK_PHOTO_POSTS.filter((p) => !remotePostIds.has(p.id));
        setPhotoPosts([...postsResult.data, ...localOnlyPosts]);
      }
      if (playersResult.data && playersResult.data.length > 0) {
        setPlayers(playersResult.data);
      }
      if (eventsResult.data && eventsResult.data.length > 0) {
        setEvents(eventsResult.data);
      }
      if (commentsResult.data) {
        setComments(commentsResult.data.length > 0 ? commentsResult.data : MOCK_PHOTO_COMMENTS);
      }
      if (collectionsResult.data) {
        setCollections(collectionsResult.data.length > 0 ? collectionsResult.data : MOCK_COLLECTIONS);
      }
    } catch {
      // Supabase fetch failed — keep mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRemoteData();
  }, [loadRemoteData]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await loadRemoteData();
  }, [loadRemoteData]);

  // ─── Photographers ────────────────────────────────────────
  const getPhotographer = useCallback((id: string) => {
    return photographers.find((p) => p.id === id || p.user_id === id);
  }, [photographers]);

  // ─── Photo Posts ──────────────────────────────────────────
  const getPhotoPost = useCallback((id: string) => {
    return photoPosts.find((p) => p.id === id);
  }, [photoPosts]);

  // Only show approved posts in public feeds
  const approvedPosts = useMemo(() => photoPosts.filter((p) => p.status === 'approved'), [photoPosts]);

  const getPhotoPostsByTeam = useCallback((teamId: string) => {
    return approvedPosts.filter((p) => p.team_id === teamId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [approvedPosts]);

  const getPhotoPostsByPhotographer = useCallback((pgId: string) => {
    return photoPosts.filter((p) => p.photographer_id === pgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [photoPosts]);

  const getPhotoPostsByPlayer = useCallback((playerId: string) => {
    return approvedPosts.filter((p) => p.player_id === playerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [approvedPosts]);

  const getFeaturedPosts = useCallback(() => {
    const currentWeek = getISOWeek(new Date());
    return approvedPosts
      .filter((p) => p.is_featured && (!p.featured_week || p.featured_week === currentWeek))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [approvedPosts]);

  const searchPhotoPosts = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return approvedPosts.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.photographer?.display_name ?? '').toLowerCase().includes(q)
    );
  }, [approvedPosts]);

  // ─── Players ──────────────────────────────────────────────
  const getPlayer = useCallback((id: string) => {
    return players.find((p) => p.id === id);
  }, [players]);

  const getPlayersByTeam = useCallback((teamId: string) => {
    return players.filter((p) => p.team_id === teamId);
  }, [players]);

  // ─── Cheerleaders ────────────────────────────────────────
  const cheerleaders = MOCK_CHEERLEADERS;

  const getCheerleader = useCallback((id: string) => {
    return cheerleaders.find((c) => c.id === id);
  }, [cheerleaders]);

  const getCheerleadersByTeam = useCallback((teamId: string) => {
    return cheerleaders.filter((c) => c.team_id === teamId);
  }, [cheerleaders]);

  const getPhotoPostsByCheerleader = useCallback((cheerleaderId: string) => {
    return approvedPosts.filter((p) => p.cheerleader_id === cheerleaderId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [approvedPosts]);

  // ─── Events ───────────────────────────────────────────────
  const getEvent = useCallback((id: string) => {
    return events.find((e) => e.id === id);
  }, [events]);

  const getEventsByType = useCallback((type: string) => {
    if (type === 'all') return events;
    return events.filter((e) => e.event_type === type);
  }, [events]);

  // ─── Home Feed (5 photo : 1 community) ────────────────────
  const getHomeFeed = useCallback((communityPosts: CommunityPostWithAuthor[], page: number): HomeFeedItem[] => {
    const sortedPhotos = [...approvedPosts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const communityPopular = [...communityPosts]
      .filter((p) => !p.is_blinded)
      .sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count));

    const feed: HomeFeedItem[] = [];
    let photoIdx = 0;
    let communityIdx = 0;
    const total = (page + 1) * PAGE_SIZE;

    while (feed.length < total) {
      for (let i = 0; i < 5 && photoIdx < sortedPhotos.length && feed.length < total; i++) {
        feed.push({ type: 'photo', data: sortedPhotos[photoIdx++] });
      }
      if (communityIdx < communityPopular.length && feed.length < total) {
        feed.push({ type: 'community', data: communityPopular[communityIdx++] });
      }
      if (photoIdx >= sortedPhotos.length && communityIdx >= communityPopular.length) break;
    }

    return feed;
  }, [approvedPosts]);

  // ─── Photo Likes (optimistic + remote) ──────────────────────
  const togglePhotoLike = useCallback((postId: string) => {
    setPhotoLikedIds((prev) => {
      const next = new Set(prev);
      const wasLiked = next.has(postId);
      if (wasLiked) next.delete(postId);
      else next.add(postId);

      const delta = wasLiked ? -1 : 1;
      setPhotoPosts((pp) => pp.map((p) =>
        p.id === postId ? { ...p, like_count: Math.max(p.like_count + delta, 0) } : p
      ));

      // Fire-and-forget remote call
      if (isRemoteRef.current) {
        photographerApi.togglePhotoLike('', 'post', postId).catch(() => {});
      }

      return next;
    });
  }, []);

  const isPhotoLiked = useCallback((postId: string) => {
    return photoLikedIds.has(postId);
  }, [photoLikedIds]);

  // ─── Follow (optimistic + remote) ──────────────────────────
  const toggleFollow = useCallback((pgId: string) => {
    setFollowedPgIds((prev) => {
      const next = new Set(prev);
      if (next.has(pgId)) next.delete(pgId);
      else next.add(pgId);

      if (isRemoteRef.current) {
        photographerApi.toggleFollow('', pgId).catch(() => {});
      }

      return next;
    });
  }, []);

  const isFollowing = useCallback((pgId: string) => {
    return followedPgIds.has(pgId);
  }, [followedPgIds]);

  // ─── Collections (optimistic + remote) ────────────────────
  const getCollectionsForPg = useCallback((pgId: string) => {
    return collections.filter((c) => c.photographerId === pgId);
  }, [collections]);

  const createCollection = useCallback((pgId: string, name: string, emoji: string) => {
    const col: PgCollection = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      photographerId: pgId,
      name,
      emoji,
      postIds: [],
    };
    setCollections((prev) => [...prev, col]);

    if (isRemoteRef.current) {
      photographerApi.createCollection({ photographerId: pgId, name, emoji }).catch(() => {});
    }
  }, []);

  const deleteCollection = useCallback((collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));

    if (isRemoteRef.current) {
      photographerApi.deleteCollection(collectionId).catch(() => {});
    }
  }, []);

  const renameCollection = useCallback((collectionId: string, name: string) => {
    setCollections((prev) => prev.map((c) => c.id === collectionId ? { ...c, name } : c));
  }, []);

  const addPostToCollection = useCallback((collectionId: string, postId: string) => {
    setCollections((prev) => prev.map((c) =>
      c.id === collectionId && !c.postIds.includes(postId)
        ? { ...c, postIds: [...c.postIds, postId] }
        : c
    ));

    if (isRemoteRef.current) {
      photographerApi.addPostToCollection(collectionId, postId).catch(() => {});
    }
  }, []);

  const removePostFromCollection = useCallback((collectionId: string, postId: string) => {
    setCollections((prev) => prev.map((c) =>
      c.id === collectionId ? { ...c, postIds: c.postIds.filter((id) => id !== postId) } : c
    ));

    if (isRemoteRef.current) {
      photographerApi.removePostFromCollection(collectionId, postId).catch(() => {});
    }
  }, []);

  // ─── Register Photographer ──────────────────────────────────
  const registerPhotographer = useCallback((photographer: Photographer) => {
    setPhotographers((prev) => {
      // Avoid duplicates
      if (prev.some((p) => p.id === photographer.id || p.user_id === photographer.user_id)) return prev;
      return [...prev, photographer];
    });
  }, []);

  // ─── Mutations (optimistic + remote) ──────────────────────
  const addPhotoPost = useCallback((post: PhotoPost) => {
    setPhotoPosts((prev) => [post, ...prev]);
  }, []);

  const deletePhotoPost = useCallback((postId: string) => {
    setPhotoPosts((prev) => prev.filter((p) => p.id !== postId));

    if (isRemoteRef.current) {
      photographerApi.deletePhotoPost(postId).catch(() => {});
    }
  }, []);

  const updatePostStatus = useCallback((postId: string, status: 'approved' | 'rejected', reason?: string) => {
    setPhotoPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, status, rejection_reason: reason ?? null } : p,
    ));
  }, []);

  const updatePhotographer = useCallback((pgId: string, updates: Partial<Pick<Photographer, 'display_name' | 'bio' | 'avatar_url' | 'cover_url'>>) => {
    setPhotographers((prev) => prev.map((p) =>
      p.id === pgId ? { ...p, ...updates } : p,
    ));
  }, []);

  const updatePhotographerVerification = useCallback((pgId: string, verified: boolean) => {
    setPhotographers((prev) => prev.map((p) =>
      p.id === pgId ? { ...p, is_verified: verified } : p,
    ));
  }, []);

  const setFeaturedPost = useCallback((photographerId: string, postId: string) => {
    setPhotoPosts((prev) => prev.map((p) => {
      if (p.photographer_id !== photographerId) return p;
      if (p.id === postId) return { ...p, is_featured: !p.is_featured };
      if (p.is_featured) return { ...p, is_featured: false };
      return p;
    }));
  }, []);

  // ─── Comments (optimistic + remote) ───────────────────────
  const addComment = useCallback((postId: string, text: string, userId: string, userName: string, parentId?: string) => {
    const newComment: PhotoComment = {
      id: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      postId,
      userId,
      userName,
      text,
      parentId: parentId ?? null,
      likeCount: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);
    setPhotoPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
    ));

    if (isRemoteRef.current) {
      photographerApi.createComment({ postId, userId, userName, text, parentId }).catch(() => {});
    }
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    setComments((prev) => prev.map((c) =>
      c.id === commentId ? { ...c, isDeleted: true, text: '' } : c
    ));
    setPhotoPosts((prev) => prev.map((p) =>
      p.id === comment.postId ? { ...p, comment_count: Math.max(p.comment_count - 1, 0) } : p
    ));

    if (isRemoteRef.current) {
      photographerApi.deleteComment(commentId).catch(() => {});
    }
  }, [comments]);

  const getCommentsForPost = useCallback((postId: string) => {
    return comments.filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments]);

  const toggleCommentLike = useCallback((commentId: string) => {
    setCommentLikedIds((prev) => {
      const next = new Set(prev);
      const wasLiked = next.has(commentId);
      if (wasLiked) next.delete(commentId);
      else next.add(commentId);
      const delta = wasLiked ? -1 : 1;
      setComments((cc) => cc.map((c) =>
        c.id === commentId ? { ...c, likeCount: Math.max(c.likeCount + delta, 0) } : c
      ));

      if (isRemoteRef.current) {
        photographerApi.togglePhotoLike('', 'comment', commentId).catch(() => {});
      }

      return next;
    });
  }, []);

  const isCommentLiked = useCallback((commentId: string) => {
    return commentLikedIds.has(commentId);
  }, [commentLikedIds]);

  // ─── Value ────────────────────────────────────────────────
  const value = useMemo<PhotographerContextValue>(() => ({
    loading,
    isRemote,
    refreshData,
    photographers,
    getPhotographer,
    photoPosts,
    getPhotoPost,
    getPhotoPostsByTeam,
    getPhotoPostsByPhotographer,
    getPhotoPostsByPlayer,
    getFeaturedPosts,
    searchPhotoPosts,
    players,
    getPlayer,
    getPlayersByTeam,
    cheerleaders,
    getCheerleader,
    getCheerleadersByTeam,
    getPhotoPostsByCheerleader,
    events,
    getEvent,
    getEventsByType,
    getHomeFeed,
    photoLikedIds,
    togglePhotoLike,
    isPhotoLiked,
    followedPgIds,
    followerPgIds,
    toggleFollow,
    isFollowing,
    registerPhotographer,
    addPhotoPost,
    deletePhotoPost,
    updatePostStatus,
    updatePhotographer,
    updatePhotographerVerification,
    setFeaturedPost,
    collections,
    getCollectionsForPg,
    createCollection,
    deleteCollection,
    renameCollection,
    addPostToCollection,
    removePostFromCollection,
    comments,
    addComment,
    deleteComment,
    getCommentsForPost,
    toggleCommentLike,
    isCommentLiked,
  }), [
    loading, isRemote, refreshData,
    photographers, getPhotographer, photoPosts, getPhotoPost, getPhotoPostsByTeam,
    getPhotoPostsByPhotographer, getPhotoPostsByPlayer, getFeaturedPosts, searchPhotoPosts,
    players, getPlayer, getPlayersByTeam,
    cheerleaders, getCheerleader, getCheerleadersByTeam, getPhotoPostsByCheerleader,
    events, getEvent, getEventsByType, getHomeFeed,
    photoLikedIds, togglePhotoLike, isPhotoLiked,
    followedPgIds, followerPgIds, toggleFollow, isFollowing,
    registerPhotographer, addPhotoPost, deletePhotoPost, updatePostStatus, updatePhotographer, updatePhotographerVerification, setFeaturedPost,
    collections, getCollectionsForPg, createCollection, deleteCollection, renameCollection,
    addPostToCollection, removePostFromCollection,
    comments, addComment, deleteComment, getCommentsForPost,
    toggleCommentLike, isCommentLiked,
  ]);

  return (
    <PhotographerContext.Provider value={value}>
      {children}
    </PhotographerContext.Provider>
  );
}

export function usePhotographer(): PhotographerContextValue {
  const ctx = useContext(PhotographerContext);
  if (!ctx) throw new Error('usePhotographer must be used within PhotographerProvider');
  return ctx;
}
