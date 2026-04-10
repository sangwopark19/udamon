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
  CommunityPostWithAuthor,
  CommunityCommentWithAuthor,
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  PostSortOrder,
  ReportReason,
  LikeTargetType,
} from '../types/community';
import type { PollWithOptions, CreatePollInput } from '../types/poll';
import {
  fetchCommunityPosts,
  fetchTrendingPosts,
  fetchCommentsByPostId,
  fetchPostWithPoll,
  fetchUserCommunityLikes,
  fetchRecentSearches as apiFetchRecentSearches,
} from '../services/communityApi';
import { useAuth } from './AuthContext';
import { useBlock } from './BlockContext';

const PAGE_SIZE = 20;

// ─── Context Value ──────────────────────────────────────────
interface CommunityContextValue {
  // Posts
  posts: CommunityPostWithAuthor[];
  trendingPosts: CommunityPostWithAuthor[];
  getPost: (id: string) => CommunityPostWithAuthor | undefined;
  getFilteredPosts: (
    teamId: string | null,
    sort: PostSortOrder,
    page: number,
  ) => CommunityPostWithAuthor[];
  createPost: (
    input: CreatePostInput,
    pollInput?: CreatePollInput,
  ) => Promise<CommunityPostWithAuthor | null>;
  updatePost: (postId: string, input: UpdatePostInput) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  searchPosts: (query: string) => Promise<CommunityPostWithAuthor[]>;
  refreshPosts: () => Promise<void>;
  loadMorePosts: () => Promise<void>;

  // Comments
  getComments: (postId: string) => CommunityCommentWithAuthor[];
  loadCommentsForPost: (postId: string) => Promise<void>;
  createComment: (
    input: CreateCommentInput,
  ) => Promise<CommunityCommentWithAuthor | null>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;

  // Likes
  likedIds: Set<string>;
  toggleLike: (targetType: LikeTargetType, targetId: string) => Promise<void>;
  isLiked: (targetId: string) => boolean;

  // Polls
  getPoll: (postId: string) => PollWithOptions | undefined;
  loadPollForPost: (postId: string) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  votedPolls: Record<string, string[]>; // pollId -> optionIds

  // Reports
  reportTarget: (
    targetType: 'post' | 'comment',
    targetId: string,
    reason: ReportReason,
    detail?: string,
  ) => Promise<boolean>;
  reportedIds: Set<string>;

  // Recent searches
  recentSearches: string[];
  addRecentSearch: (query: string) => Promise<void>;
  removeRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;

  // Loading / pagination / errors
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { blockedUsersVersion } = useBlock();
  const userId = user?.id ?? null;

  // Accumulated page state
  const [posts, setPosts] = useState<CommunityPostWithAuthor[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<CommunityPostWithAuthor[]>([]);
  const [comments, setComments] = useState<Record<string, CommunityCommentWithAuthor[]>>({});
  const [polls, setPolls] = useState<Record<string, PollWithOptions>>({});
  const [votedPolls, setVotedPolls] = useState<Record<string, string[]>>({});

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state — internal to context, drives all post fetches
  const [currentTeam, setCurrentTeam] = useState<string>('all');
  const [currentSort, setCurrentSort] = useState<PostSortOrder>('latest');
  const [currentPage, setCurrentPage] = useState(0);

  // Likes + reports (session memory + initial load from DB)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  // Recent searches (DB-backed cache)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Pending debounce for likes (Pitfall 9 — prevent double-tap races)
  const pendingLikeOps = useRef<Set<string>>(new Set());

  // ─── Initial load + refresh on user/block change ──────────
  // Re-runs whenever:
  //  - userId changes (login/logout)
  //  - blockedUsersVersion increments (user just blocked/unblocked someone; re-fetch
  //    so RLS filters blocked authors out — D-15 cross-context invalidation)
  //  - currentTeam / currentSort changes (filter changed via getFilteredPosts)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentPage(0);
      setHasMore(true);

      const [postsResult, trendingResult] = await Promise.all([
        fetchCommunityPosts({
          teamSlug: currentTeam === 'all' ? undefined : currentTeam,
          sort: currentSort,
          page: 0,
          pageSize: PAGE_SIZE,
        }),
        fetchTrendingPosts(),
      ]);

      if (cancelled) return;

      if (postsResult.error) {
        setError(postsResult.error);
        setPosts([]);
        setHasMore(false);
      } else {
        const rows = postsResult.data ?? [];
        setPosts(rows);
        setHasMore(rows.length >= PAGE_SIZE);
      }

      if (!trendingResult.error && trendingResult.data) {
        setTrendingPosts(trendingResult.data);
      }

      setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, blockedUsersVersion, currentTeam, currentSort]);

  // ─── Liked posts preload (only when logged in) ────────────
  useEffect(() => {
    if (!userId) {
      setLikedIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await fetchUserCommunityLikes(userId);
      if (cancelled || result.error || !result.data) return;
      setLikedIds(new Set(result.data));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ─── Recent searches preload ──────────────────────────────
  useEffect(() => {
    if (!userId) {
      setRecentSearches([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await apiFetchRecentSearches(userId);
      if (cancelled || result.error || !result.data) return;
      setRecentSearches(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ═══════════════════════════════════════════════════════════════
  // Posts — Pure selectors + pagination
  // ═══════════════════════════════════════════════════════════════
  const getPost = useCallback(
    (id: string) => {
      return posts.find((p) => p.id === id) ?? trendingPosts.find((p) => p.id === id);
    },
    [posts, trendingPosts],
  );

  const getFilteredPosts = useCallback(
    (teamId: string | null, sort: PostSortOrder, _page: number) => {
      // Trigger a re-fetch if the filter changed; the useEffect above owns
      // the actual loading. Plan 04 will handle the UI transition.
      const resolvedTeam = teamId ?? 'all';
      if (resolvedTeam !== currentTeam) {
        setCurrentTeam(resolvedTeam);
      }
      if (sort !== currentSort) {
        setCurrentSort(sort);
      }
      return posts;
    },
    [posts, currentTeam, currentSort],
  );

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const result = await fetchCommunityPosts({
      teamSlug: currentTeam === 'all' ? undefined : currentTeam,
      sort: currentSort,
      page: nextPage,
      pageSize: PAGE_SIZE,
    });
    if (result.error || !result.data) {
      setIsLoadingMore(false);
      setError(result.error);
      return;
    }
    const rows = result.data;
    setPosts((prev) => {
      // Dedupe by id in case a row was added by another path (e.g., optimistic createPost)
      const seen = new Set(prev.map((p) => p.id));
      const additions = rows.filter((r) => !seen.has(r.id));
      return [...prev, ...additions];
    });
    setCurrentPage(nextPage);
    setHasMore(rows.length >= PAGE_SIZE);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, isLoading, currentPage, currentTeam, currentSort]);

  const refreshPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(0);
    setHasMore(true);
    const [postsResult, trendingResult] = await Promise.all([
      fetchCommunityPosts({
        teamSlug: currentTeam === 'all' ? undefined : currentTeam,
        sort: currentSort,
        page: 0,
        pageSize: PAGE_SIZE,
      }),
      fetchTrendingPosts(),
    ]);
    if (postsResult.error) {
      setError(postsResult.error);
      setHasMore(false);
    } else {
      const rows = postsResult.data ?? [];
      setPosts(rows);
      setHasMore(rows.length >= PAGE_SIZE);
    }
    if (!trendingResult.error && trendingResult.data) {
      setTrendingPosts(trendingResult.data);
    }
    setIsLoading(false);
  }, [currentTeam, currentSort]);

  // ═══════════════════════════════════════════════════════════════
  // Posts — Mutations (STUBS — implemented in Task 2)
  // ═══════════════════════════════════════════════════════════════
  const createPost = useCallback(
    async (
      _input: CreatePostInput,
      _pollInput?: CreatePollInput,
    ): Promise<CommunityPostWithAuthor | null> => {
      // IMPLEMENTED IN TASK 2
      return null;
    },
    [],
  );

  const updatePost = useCallback(
    async (_postId: string, _input: UpdatePostInput): Promise<boolean> => {
      // IMPLEMENTED IN TASK 2
      return false;
    },
    [],
  );

  const deletePost = useCallback(async (_postId: string): Promise<boolean> => {
    // IMPLEMENTED IN TASK 2
    return false;
  }, []);

  const searchPosts = useCallback(
    async (_query: string): Promise<CommunityPostWithAuthor[]> => {
      // IMPLEMENTED IN TASK 2
      return [];
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════════
  // Comments
  // ═══════════════════════════════════════════════════════════════
  const getComments = useCallback(
    (postId: string): CommunityCommentWithAuthor[] => {
      return comments[postId] ?? [];
    },
    [comments],
  );

  const loadCommentsForPost = useCallback(async (postId: string): Promise<void> => {
    const result = await fetchCommentsByPostId(postId);
    if (result.error || !result.data) {
      // Leave existing (possibly stale) comments in place; screen decides what to do
      return;
    }
    const rows = result.data;
    setComments((prev) => ({ ...prev, [postId]: rows }));
  }, []);

  const createComment = useCallback(
    async (_input: CreateCommentInput): Promise<CommunityCommentWithAuthor | null> => {
      // IMPLEMENTED IN TASK 2
      return null;
    },
    [],
  );

  const updateComment = useCallback(
    async (_commentId: string, _content: string): Promise<boolean> => {
      // IMPLEMENTED IN TASK 2
      return false;
    },
    [],
  );

  const deleteComment = useCallback(async (_commentId: string): Promise<boolean> => {
    // IMPLEMENTED IN TASK 2
    return false;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Likes (STUB — implemented in Task 2 with optimistic + rollback)
  // ═══════════════════════════════════════════════════════════════
  const toggleLike = useCallback(
    async (_targetType: LikeTargetType, _targetId: string): Promise<void> => {
      // IMPLEMENTED IN TASK 2
      // Shell exists so useMemo value has a stable reference.
      return;
    },
    [],
  );

  const isLiked = useCallback(
    (targetId: string): boolean => {
      return likedIds.has(targetId);
    },
    [likedIds],
  );

  // ═══════════════════════════════════════════════════════════════
  // Polls
  // ═══════════════════════════════════════════════════════════════
  const getPoll = useCallback(
    (postId: string): PollWithOptions | undefined => {
      return polls[postId];
    },
    [polls],
  );

  const loadPollForPost = useCallback(
    async (postId: string): Promise<void> => {
      const result = await fetchPostWithPoll(postId, userId);
      if (result.error || !result.data) return;
      const { poll, myVotes } = result.data;
      if (poll) {
        setPolls((prev) => ({ ...prev, [postId]: poll }));
        setVotedPolls((prev) => ({ ...prev, [poll.id]: myVotes }));
      }
    },
    [userId],
  );

  const votePoll = useCallback(
    async (_pollId: string, _optionId: string): Promise<void> => {
      // IMPLEMENTED IN TASK 2
      return;
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════════
  // Reports
  // ═══════════════════════════════════════════════════════════════
  const reportTarget = useCallback(
    async (
      _targetType: 'post' | 'comment',
      _targetId: string,
      _reason: ReportReason,
      _detail?: string,
    ): Promise<boolean> => {
      // IMPLEMENTED IN TASK 2
      return false;
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════════
  // Recent Searches (STUBS — implemented in Task 2)
  // ═══════════════════════════════════════════════════════════════
  const addRecentSearch = useCallback(async (_query: string): Promise<void> => {
    // IMPLEMENTED IN TASK 2
    return;
  }, []);

  const removeRecentSearch = useCallback(async (_query: string): Promise<void> => {
    // IMPLEMENTED IN TASK 2
    return;
  }, []);

  const clearRecentSearches = useCallback(async (): Promise<void> => {
    // IMPLEMENTED IN TASK 2
    return;
  }, []);

  // ─── Value ──────────────────────────────────────────────────
  const value = useMemo<CommunityContextValue>(
    () => ({
      posts,
      trendingPosts,
      getPost,
      getFilteredPosts,
      createPost,
      updatePost,
      deletePost,
      searchPosts,
      refreshPosts,
      loadMorePosts,
      getComments,
      loadCommentsForPost,
      createComment,
      updateComment,
      deleteComment,
      likedIds,
      toggleLike,
      isLiked,
      getPoll,
      loadPollForPost,
      votePoll,
      votedPolls,
      reportTarget,
      reportedIds,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
      isLoading,
      isLoadingMore,
      hasMore,
      error,
    }),
    [
      posts,
      trendingPosts,
      getPost,
      getFilteredPosts,
      createPost,
      updatePost,
      deletePost,
      searchPosts,
      refreshPosts,
      loadMorePosts,
      getComments,
      loadCommentsForPost,
      createComment,
      updateComment,
      deleteComment,
      likedIds,
      toggleLike,
      isLiked,
      getPoll,
      loadPollForPost,
      votePoll,
      votedPolls,
      reportTarget,
      reportedIds,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
      isLoading,
      isLoadingMore,
      hasMore,
      error,
    ],
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within CommunityProvider');
  return ctx;
}
