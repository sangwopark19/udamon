import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import type {
  Photographer,
  PhotoPost,
  Player,
  TimelineEvent,
  HomeFeedItem,
} from '../types/photographer';
import type { Cheerleader } from '../types/cheerleader';
import type { CommunityPostWithAuthor } from '../types/community';
import type { PhotographerApplication } from '../types/photographerApplication';
import * as photographerApi from '../services/photographerApi';
import { useAuth } from './AuthContext';
import { useLoginGate } from '../hooks/useLoginGate';

const PAGE_SIZE = 20;

// ─── Helpers ────────────────────────────────────────────────
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ─── Public Types (Context-defined domain shapes) ────────────
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

// ─── Context Value ──────────────────────────────────────────
interface PhotographerContextValue {
  // Loading
  loading: boolean;
  refreshData: () => Promise<void>;

  // Domain state
  photographers: Photographer[];
  photoPosts: PhotoPost[];
  players: Player[];
  cheerleaders: Cheerleader[];
  events: TimelineEvent[];
  collections: PgCollection[];
  comments: PhotoComment[];

  // Pagination (D-23)
  hasMorePhotoPosts: boolean;
  loadMorePhotoPosts: (teamSlug?: string) => Promise<void>;

  // Selectors — Photographers
  getPhotographer: (id: string) => Photographer | undefined;

  // Selectors — Photo posts
  getPhotoPost: (id: string) => PhotoPost | undefined;
  getPhotoPostsByTeam: (teamId: string) => PhotoPost[];
  getPhotoPostsByPhotographer: (pgId: string) => PhotoPost[];
  getPhotoPostsByPlayer: (playerId: string) => PhotoPost[];
  getPhotoPostsByCheerleader: (cheerleaderId: string) => PhotoPost[];
  getFeaturedPosts: () => PhotoPost[];
  searchPhotoPosts: (query: string) => PhotoPost[];

  // Selectors — Players
  getPlayer: (id: string) => Player | undefined;
  getPlayersByTeam: (teamId: string) => Player[];

  // Selectors — Cheerleaders
  getCheerleader: (id: string) => Cheerleader | undefined;
  getCheerleadersByTeam: (teamSlug: string) => Cheerleader[];

  // Selectors — Events
  getEvent: (id: string) => TimelineEvent | undefined;
  getEventsByType: (type: string) => TimelineEvent[];

  // Home feed (5 photo : 1 community)
  getHomeFeed: (communityPosts: CommunityPostWithAuthor[], page: number) => HomeFeedItem[];

  // Application (PHOT-02 — Context-as-store 통합, Plan 04-08 gap closure)
  myApplication: PhotographerApplication | null;
  applicationLoading: boolean;
  submitPhotographerApplication: (params: {
    user_id: string;
    team_slug: string | null;
    activity_links: string[];
    activity_plan: string;
    portfolio_url?: string | null;
    bio?: string;
  }) => Promise<{ data: PhotographerApplication | null; error: string | null }>;
  refreshMyApplication: () => Promise<void>;

  // Likes (optimistic + rollback) — D-22 fix
  photoLikedIds: Set<string>;
  togglePhotoLike: (postId: string) => Promise<void>;
  isPhotoLiked: (postId: string) => boolean;

  // Follow (optimistic + rollback) — D-22 fix
  followedPgIds: Set<string>;
  toggleFollow: (pgId: string) => Promise<void>;
  isFollowing: (pgId: string) => boolean;

  // Photo post mutations
  addPhotoPost: (post: PhotoPost) => void; // local prepend after upload
  deletePhotoPost: (postId: string) => Promise<void>;

  // Collection mutations (D-21 await transition)
  getCollectionsForPg: (pgId: string) => PgCollection[];
  getCollectionPosts: (collectionId: string) => Promise<PhotoPost[]>; // PHOT-08
  createCollection: (pgId: string, name: string, emoji: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  renameCollection: (collectionId: string, name: string) => Promise<void>;
  addPostToCollection: (collectionId: string, postId: string) => Promise<void>;
  removePostFromCollection: (collectionId: string, postId: string) => Promise<void>;

  // Comments
  addComment: (
    postId: string,
    text: string,
    userId: string,
    userName: string,
    parentId?: string,
  ) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  getCommentsForPost: (postId: string) => PhotoComment[];
}

const PhotographerContext = createContext<PhotographerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
export function PhotographerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const requireLogin = useLoginGate();
  const userId = user?.id ?? null;

  // ─── Core state (initial = empty + loading=true, D-19) ────
  const [loading, setLoading] = useState(true);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [photoPosts, setPhotoPosts] = useState<PhotoPost[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [cheerleaders, setCheerleaders] = useState<Cheerleader[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [collections, setCollections] = useState<PgCollection[]>([]);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [photoLikedIds, setPhotoLikedIds] = useState<Set<string>>(new Set());
  const [followedPgIds, setFollowedPgIds] = useState<Set<string>>(new Set());

  // Application (Plan 04-08 gap closure — Context-as-store 통합)
  const [myApplication, setMyApplication] = useState<PhotographerApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);

  // ─── Pagination state (D-23) ──────────────────────────────
  const [currentTeamSlug, setCurrentTeamSlug] = useState<string | undefined>(undefined);
  const [photoPostsPage, setPhotoPostsPage] = useState(0);
  const [hasMorePhotoPosts, setHasMorePhotoPosts] = useState(true);
  const loadingMoreRef = useRef(false);

  // Pending-op guards (prevent double-tap races on like/follow)
  const pendingLikeOps = useRef<Set<string>>(new Set());
  const pendingFollowOps = useRef<Set<string>>(new Set());

  // ─── Initial fetch / refresh ──────────────────────────────
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        photographersRes,
        postsRes,
        playersRes,
        cheerleadersRes,
        eventsRes,
        collectionsRes,
        commentsRes,
      ] = await Promise.all([
        photographerApi.fetchPhotographers(),
        photographerApi.fetchPhotoPosts({ page: 0, pageSize: PAGE_SIZE }),
        photographerApi.fetchPlayers(),
        photographerApi.fetchCheerleaders(),
        photographerApi.fetchEvents(),
        photographerApi.fetchCollections(),
        photographerApi.fetchAllComments(),
      ]);

      if (photographersRes.data) setPhotographers(photographersRes.data);
      if (postsRes.data) {
        setPhotoPosts(postsRes.data);
        setHasMorePhotoPosts(postsRes.data.length >= PAGE_SIZE);
        setPhotoPostsPage(0);
        setCurrentTeamSlug(undefined);
      }
      if (playersRes.data) setPlayers(playersRes.data);
      if (cheerleadersRes.data) setCheerleaders(cheerleadersRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (collectionsRes.data) setCollections(collectionsRes.data);
      if (commentsRes.data) setComments(commentsRes.data);

      // 로그인 사용자의 좋아요/팔로우 복원 (D-22)
      if (userId) {
        const [likesRes, followsRes] = await Promise.all([
          photographerApi.fetchUserPhotoLikes(userId),
          photographerApi.fetchUserFollows(userId),
        ]);
        if (likesRes.data) setPhotoLikedIds(new Set(likesRes.data));
        if (followsRes.data) setFollowedPgIds(new Set(followsRes.data));
      } else {
        setPhotoLikedIds(new Set());
        setFollowedPgIds(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // ─── Application (PHOT-02 — Plan 04-08 gap closure) ───────
  const refreshMyApplication = useCallback(async () => {
    if (!userId) {
      setMyApplication(null);
      return;
    }
    setApplicationLoading(true);
    try {
      const res = await photographerApi.fetchMyPhotographerApplication(userId);
      if (res.error) {
        console.warn('[PhotographerContext] refreshMyApplication error', res.error);
        // error 시 기존 state 유지 (network blip 대응). 명시적 fail-closed 는 하지 않음.
        return;
      }
      setMyApplication(res.data);
    } finally {
      setApplicationLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshMyApplication();
  }, [refreshMyApplication]);

  const submitApplication = useCallback(
    async (params: {
      user_id: string;
      team_slug: string | null;
      activity_links: string[];
      activity_plan: string;
      portfolio_url?: string | null;
      bio?: string;
    }) => {
      const res = await photographerApi.submitPhotographerApplication(params);
      if (res.data) {
        // 성공 — Context state 즉시 업데이트 → 구독 중인 MainTabNavigator / StudioScreen 자동 리렌더
        setMyApplication(res.data);
      }
      return res;
    },
    [],
  );

  // ─── Pagination (D-23) ────────────────────────────────────
  const loadMorePhotoPosts = useCallback(
    async (teamSlug?: string) => {
      if (loadingMoreRef.current) return;
      // Detect filter switch — reset pagination first, fetch page 0
      const filterChanged = teamSlug !== currentTeamSlug;
      if (!filterChanged && !hasMorePhotoPosts) return;

      loadingMoreRef.current = true;
      try {
        const nextPage = filterChanged ? 0 : photoPostsPage + 1;
        const res = await photographerApi.fetchPhotoPosts({
          teamSlug,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        if (res.data) {
          if (nextPage === 0) {
            setPhotoPosts(res.data);
          } else {
            // Dedupe by id (defensive)
            setPhotoPosts((prev) => {
              const seen = new Set(prev.map((p) => p.id));
              const additions = res.data!.filter((r) => !seen.has(r.id));
              return [...prev, ...additions];
            });
          }
          setHasMorePhotoPosts(res.data.length >= PAGE_SIZE);
          setPhotoPostsPage(nextPage);
          setCurrentTeamSlug(teamSlug);
        }
      } finally {
        loadingMoreRef.current = false;
      }
    },
    [currentTeamSlug, photoPostsPage, hasMorePhotoPosts],
  );

  // ─── Likes — Optimistic + rollback (D-22 bug fix) ─────────
  const togglePhotoLike = useCallback(
    async (postId: string) => {
      if (!requireLogin()) return;
      if (!userId) return;
      if (pendingLikeOps.current.has(postId)) return;
      pendingLikeOps.current.add(postId);

      const wasLiked = photoLikedIds.has(postId);
      const delta = wasLiked ? -1 : 1;

      // Optimistic flip
      setPhotoLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(postId);
        else next.add(postId);
        return next;
      });
      setPhotoPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, like_count: Math.max(p.like_count + delta, 0) } : p,
        ),
      );

      const res = await photographerApi.togglePhotoLike(userId, 'post', postId);
      pendingLikeOps.current.delete(postId);

      if (res.error) {
        // Rollback
        setPhotoLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(postId);
          else next.delete(postId);
          return next;
        });
        setPhotoPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, like_count: Math.max(p.like_count - delta, 0) } : p,
          ),
        );
      }
    },
    [userId, photoLikedIds, requireLogin],
  );

  const isPhotoLiked = useCallback(
    (postId: string) => photoLikedIds.has(postId),
    [photoLikedIds],
  );

  // ─── Follow — Optimistic + rollback (D-22 bug fix) ────────
  const toggleFollow = useCallback(
    async (pgId: string) => {
      if (!requireLogin()) return;
      if (!userId) return;
      if (pendingFollowOps.current.has(pgId)) return;
      pendingFollowOps.current.add(pgId);

      const wasFollowing = followedPgIds.has(pgId);

      setFollowedPgIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.delete(pgId);
        else next.add(pgId);
        return next;
      });

      const res = await photographerApi.toggleFollow(userId, pgId);
      pendingFollowOps.current.delete(pgId);

      if (res.error) {
        setFollowedPgIds((prev) => {
          const next = new Set(prev);
          if (wasFollowing) next.add(pgId);
          else next.delete(pgId);
          return next;
        });
      }
      // follower_count는 DB 트리거가 처리 — 다음 refreshData에서 동기화
    },
    [userId, followedPgIds, requireLogin],
  );

  const isFollowing = useCallback(
    (pgId: string) => followedPgIds.has(pgId),
    [followedPgIds],
  );

  // ─── Collections — await transition (D-21) ────────────────
  const createCollection = useCallback(
    async (pgId: string, name: string, emoji: string) => {
      if (!requireLogin()) return;
      const res = await photographerApi.createCollection({
        photographerId: pgId,
        name,
        emoji,
      });
      if (res.data) {
        const created = res.data;
        setCollections((prev) => [...prev, created]);
      }
    },
    [requireLogin],
  );

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      if (!requireLogin()) return;
      const res = await photographerApi.deleteCollection(collectionId);
      if (!res.error) {
        setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      }
    },
    [requireLogin],
  );

  // NOTE: photographerApi 에 updateCollection 미구현 — 현재는 local 만 수정.
  // 실제 서버 반영은 후속 plan 에서 updateCollection RPC 추가 시점에 await 전환.
  const renameCollection = useCallback(
    async (collectionId: string, name: string) => {
      if (!requireLogin()) return;
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? { ...c, name } : c)),
      );
    },
    [requireLogin],
  );

  const addPostToCollection = useCallback(
    async (collectionId: string, postId: string) => {
      if (!requireLogin()) return;
      const res = await photographerApi.addPostToCollection(collectionId, postId);
      if (!res.error) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId && !c.postIds.includes(postId)
              ? { ...c, postIds: [...c.postIds, postId] }
              : c,
          ),
        );
      }
    },
    [requireLogin],
  );

  const removePostFromCollection = useCallback(
    async (collectionId: string, postId: string) => {
      if (!requireLogin()) return;
      const res = await photographerApi.removePostFromCollection(collectionId, postId);
      if (!res.error) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, postIds: c.postIds.filter((pid) => pid !== postId) }
              : c,
          ),
        );
      }
    },
    [requireLogin],
  );

  // PHOT-08: 컬렉션의 실제 photo posts 조회 (CollectionDetailScreen 용)
  const getCollectionPosts = useCallback(
    async (collectionId: string): Promise<PhotoPost[]> => {
      const res = await photographerApi.fetchCollectionPosts(collectionId);
      return res.data ?? [];
    },
    [],
  );

  // ─── Comments (await) ─────────────────────────────────────
  const addComment = useCallback(
    async (
      postId: string,
      text: string,
      callerUserId: string,
      callerUserName: string,
      parentId?: string,
    ) => {
      const res = await photographerApi.createComment({
        postId,
        userId: callerUserId,
        userName: callerUserName,
        text,
        parentId,
      });
      if (res.data) {
        const created = res.data;
        setComments((prev) => [...prev, created]);
        setPhotoPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p,
          ),
        );
      }
    },
    [],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const target = comments.find((c) => c.id === commentId);
      const res = await photographerApi.deleteComment(commentId);
      if (!res.error) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, isDeleted: true, text: '' } : c,
          ),
        );
        if (target) {
          setPhotoPosts((prev) =>
            prev.map((p) =>
              p.id === target.postId
                ? { ...p, comment_count: Math.max(p.comment_count - 1, 0) }
                : p,
            ),
          );
        }
      }
    },
    [comments],
  );

  const getCommentsForPost = useCallback(
    (postId: string) =>
      comments
        .filter((c) => c.postId === postId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [comments],
  );

  // ─── Photo post mutations ─────────────────────────────────
  // 신규 업로드 직후 local prepend (Plan 04 UploadScreen 호출)
  const addPhotoPost = useCallback((post: PhotoPost) => {
    setPhotoPosts((prev) => [post, ...prev]);
  }, []);

  const deletePhotoPost = useCallback(async (postId: string) => {
    const res = await photographerApi.deletePhotoPost(postId);
    if (!res.error) {
      setPhotoPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }, []);

  // ─── Selectors — Photographers ────────────────────────────
  const getPhotographer = useCallback(
    (id: string) => photographers.find((p) => p.id === id || p.user_id === id),
    [photographers],
  );

  // ─── Selectors — Photo posts ──────────────────────────────
  const approvedPosts = useMemo(
    () => photoPosts.filter((p) => p.status === 'approved'),
    [photoPosts],
  );

  const getPhotoPost = useCallback(
    (id: string) => photoPosts.find((p) => p.id === id),
    [photoPosts],
  );

  const getPhotoPostsByTeam = useCallback(
    (teamId: string) =>
      teamId === 'all'
        ? approvedPosts
        : approvedPosts
            .filter((p) => p.team_id === teamId)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
    [approvedPosts],
  );

  const getPhotoPostsByPhotographer = useCallback(
    (pgId: string) =>
      photoPosts
        .filter((p) => p.photographer_id === pgId)
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [photoPosts],
  );

  const getPhotoPostsByPlayer = useCallback(
    (playerId: string) =>
      approvedPosts
        .filter((p) => p.player_id === playerId)
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [approvedPosts],
  );

  const getPhotoPostsByCheerleader = useCallback(
    (cheerleaderId: string) =>
      approvedPosts
        .filter((p) => p.cheerleader_id === cheerleaderId)
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [approvedPosts],
  );

  const getFeaturedPosts = useCallback(() => {
    const currentWeek = getISOWeek(new Date());
    return approvedPosts
      .filter(
        (p) => p.is_featured && (!p.featured_week || p.featured_week === currentWeek),
      )
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [approvedPosts]);

  const searchPhotoPosts = useCallback(
    (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      return approvedPosts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.photographer?.display_name ?? '').toLowerCase().includes(q),
      );
    },
    [approvedPosts],
  );

  // ─── Selectors — Players ──────────────────────────────────
  const getPlayer = useCallback(
    (id: string) => players.find((p) => p.id === id),
    [players],
  );

  const getPlayersByTeam = useCallback(
    (teamId: string) => players.filter((p) => p.team_id === teamId),
    [players],
  );

  // ─── Selectors — Cheerleaders ─────────────────────────────
  const getCheerleader = useCallback(
    (id: string) => cheerleaders.find((c) => c.id === id),
    [cheerleaders],
  );

  const getCheerleadersByTeam = useCallback(
    (teamSlug: string) => cheerleaders.filter((c) => c.team_id === teamSlug),
    [cheerleaders],
  );

  // ─── Selectors — Events ───────────────────────────────────
  const getEvent = useCallback(
    (id: string) => events.find((e) => e.id === id),
    [events],
  );

  const getEventsByType = useCallback(
    (type: string) => {
      if (type === 'all') return events;
      return events.filter((e) => e.event_type === type);
    },
    [events],
  );

  // ─── Home feed (5 photo : 1 community) ────────────────────
  const getHomeFeed = useCallback(
    (communityPosts: CommunityPostWithAuthor[], page: number): HomeFeedItem[] => {
      const sortedPhotos = [...approvedPosts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const communityPopular = [...communityPosts]
        .filter((p) => !p.is_blinded)
        .sort(
          (a, b) =>
            b.like_count + b.comment_count - (a.like_count + a.comment_count),
        );

      const feed: HomeFeedItem[] = [];
      let photoIdx = 0;
      let communityIdx = 0;
      const total = (page + 1) * PAGE_SIZE;

      while (feed.length < total) {
        for (
          let i = 0;
          i < 5 && photoIdx < sortedPhotos.length && feed.length < total;
          i++
        ) {
          feed.push({ type: 'photo', data: sortedPhotos[photoIdx++] });
        }
        if (communityIdx < communityPopular.length && feed.length < total) {
          feed.push({ type: 'community', data: communityPopular[communityIdx++] });
        }
        if (photoIdx >= sortedPhotos.length && communityIdx >= communityPopular.length) {
          break;
        }
      }
      return feed;
    },
    [approvedPosts],
  );

  // ─── Selectors — Collections ──────────────────────────────
  const getCollectionsForPg = useCallback(
    (pgId: string) => collections.filter((c) => c.photographerId === pgId),
    [collections],
  );

  // ─── Value ─────────────────────────────────────────────────
  const value = useMemo<PhotographerContextValue>(
    () => ({
      loading,
      refreshData,
      photographers,
      photoPosts,
      players,
      cheerleaders,
      events,
      collections,
      comments,
      hasMorePhotoPosts,
      loadMorePhotoPosts,
      getPhotographer,
      getPhotoPost,
      getPhotoPostsByTeam,
      getPhotoPostsByPhotographer,
      getPhotoPostsByPlayer,
      getPhotoPostsByCheerleader,
      getFeaturedPosts,
      searchPhotoPosts,
      getPlayer,
      getPlayersByTeam,
      getCheerleader,
      getCheerleadersByTeam,
      getEvent,
      getEventsByType,
      getHomeFeed,
      myApplication,
      applicationLoading,
      submitPhotographerApplication: submitApplication,
      refreshMyApplication,
      photoLikedIds,
      togglePhotoLike,
      isPhotoLiked,
      followedPgIds,
      toggleFollow,
      isFollowing,
      addPhotoPost,
      deletePhotoPost,
      getCollectionsForPg,
      getCollectionPosts,
      createCollection,
      deleteCollection,
      renameCollection,
      addPostToCollection,
      removePostFromCollection,
      addComment,
      deleteComment,
      getCommentsForPost,
    }),
    [
      loading,
      refreshData,
      photographers,
      photoPosts,
      players,
      cheerleaders,
      events,
      collections,
      comments,
      hasMorePhotoPosts,
      loadMorePhotoPosts,
      getPhotographer,
      getPhotoPost,
      getPhotoPostsByTeam,
      getPhotoPostsByPhotographer,
      getPhotoPostsByPlayer,
      getPhotoPostsByCheerleader,
      getFeaturedPosts,
      searchPhotoPosts,
      getPlayer,
      getPlayersByTeam,
      getCheerleader,
      getCheerleadersByTeam,
      getEvent,
      getEventsByType,
      getHomeFeed,
      myApplication,
      applicationLoading,
      submitApplication,
      refreshMyApplication,
      photoLikedIds,
      togglePhotoLike,
      isPhotoLiked,
      followedPgIds,
      toggleFollow,
      isFollowing,
      addPhotoPost,
      deletePhotoPost,
      getCollectionsForPg,
      getCollectionPosts,
      createCollection,
      deleteCollection,
      renameCollection,
      addPostToCollection,
      removePostFromCollection,
      addComment,
      deleteComment,
      getCommentsForPost,
    ],
  );

  return (
    <PhotographerContext.Provider value={value}>{children}</PhotographerContext.Provider>
  );
}

export function usePhotographer(): PhotographerContextValue {
  const ctx = useContext(PhotographerContext);
  if (!ctx) throw new Error('usePhotographer must be used within PhotographerProvider');
  return ctx;
}
