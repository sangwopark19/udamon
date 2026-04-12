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
  fetchPostById,
  fetchCommentsByPostId,
  fetchPostWithPoll,
  fetchUserCommunityLikes,
  fetchRecentSearches as apiFetchRecentSearches,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  createCommunityComment,
  updateCommunityComment,
  deleteCommunityComment,
  toggleCommunityLike,
  voteCommunityPoll,
  reportCommunityTarget,
  searchCommunityPosts,
  addRecentSearch as apiAddRecentSearch,
  removeRecentSearch as apiRemoveRecentSearch,
  clearRecentSearches as apiClearRecentSearches,
} from '../services/communityApi';
import { useAuth } from './AuthContext';
import { useBlock } from './BlockContext';
import { useToast } from './ToastContext';
import { useTranslation } from 'react-i18next';

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
  loadPostById: (postId: string) => Promise<CommunityPostWithAuthor | null>;

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
  const { showToast } = useToast();
  const { t } = useTranslation();
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
  // Posts — Mutations
  // ═══════════════════════════════════════════════════════════════
  const createPost = useCallback(
    async (
      input: CreatePostInput,
      pollInput?: CreatePollInput,
    ): Promise<CommunityPostWithAuthor | null> => {
      if (!userId) return null;
      const result = await createCommunityPost({
        userId,
        teamSlug: input.team_id,
        title: input.title,
        content: input.content,
        images: input.images ?? [],
        pollInput,
      });
      if (result.error || !result.data) {
        return null;
      }
      const created = result.data;
      setPosts((prev) => [created, ...prev]);
      return created;
    },
    [userId],
  );

  const updatePost = useCallback(
    async (postId: string, input: UpdatePostInput): Promise<boolean> => {
      const result = await updateCommunityPost(postId, {
        title: input.title,
        content: input.content,
        images: input.images,
      });
      if (result.error || !result.data) return false;
      const updated = result.data;
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      return true;
    },
    [],
  );

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    const result = await deleteCommunityPost(postId);
    if (result.error) return false;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setComments((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
    setPolls((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
    return true;
  }, []);

  const searchPosts = useCallback(
    async (query: string): Promise<CommunityPostWithAuthor[]> => {
      const result = await searchCommunityPosts(query);
      if (result.error || !result.data) return [];
      return result.data;
    },
    [],
  );

  const loadPostById = useCallback(
    async (postId: string): Promise<CommunityPostWithAuthor | null> => {
      const result = await fetchPostById(postId);
      if (result.error || !result.data) return null;
      const post = result.data;
      // Add to posts cache so getPost() finds it on subsequent calls
      setPosts((prev) => {
        if (prev.some((p) => p.id === post.id)) return prev;
        return [post, ...prev];
      });
      return post;
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
    async (input: CreateCommentInput): Promise<CommunityCommentWithAuthor | null> => {
      if (!userId) return null;
      const result = await createCommunityComment({
        postId: input.post_id,
        userId,
        content: input.content,
        parentCommentId: input.parent_comment_id,
      });
      if (result.error || !result.data) return null;
      const created = result.data;
      setComments((prev) => ({
        ...prev,
        [input.post_id]: [...(prev[input.post_id] ?? []), created],
      }));
      // Optimistic local increment — DB trigger is source of truth and will
      // align on the next refreshPosts() / re-fetch (T-03-02-03 accepted drift).
      setPosts((prev) =>
        prev.map((p) =>
          p.id === input.post_id ? { ...p, comment_count: p.comment_count + 1 } : p,
        ),
      );
      return created;
    },
    [userId],
  );

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      const result = await updateCommunityComment(commentId, content);
      if (result.error) return false;
      setComments((prev) => {
        const next: Record<string, CommunityCommentWithAuthor[]> = {};
        for (const [postId, list] of Object.entries(prev)) {
          next[postId] = list.map((c) =>
            c.id === commentId
              ? { ...c, content, is_edited: true, updated_at: new Date().toISOString() }
              : c,
          );
        }
        return next;
      });
      return true;
    },
    [],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      // Find the post the comment belongs to (for local count decrement)
      let owningPostId: string | null = null;
      for (const [postId, list] of Object.entries(comments)) {
        if (list.some((c) => c.id === commentId)) {
          owningPostId = postId;
          break;
        }
      }
      const result = await deleteCommunityComment(commentId);
      if (result.error) return false;
      setComments((prev) => {
        const next: Record<string, CommunityCommentWithAuthor[]> = {};
        for (const [postId, list] of Object.entries(prev)) {
          next[postId] = list.map((c) =>
            c.id === commentId
              ? { ...c, is_deleted: true, content: '', updated_at: new Date().toISOString() }
              : c,
          );
        }
        return next;
      });
      if (owningPostId) {
        const pid = owningPostId;
        setPosts((prev) =>
          prev.map((p) =>
            p.id === pid ? { ...p, comment_count: Math.max(p.comment_count - 1, 0) } : p,
          ),
        );
      }
      return true;
    },
    [comments],
  );

  // ═══════════════════════════════════════════════════════════════
  // Likes — Optimistic with rollback (D-10, COMM-12)
  // RESEARCH §Code Examples §4 verbatim
  // ═══════════════════════════════════════════════════════════════
  const toggleLike = useCallback(
    async (targetType: LikeTargetType, targetId: string): Promise<void> => {
      if (!userId) return;
      if (pendingLikeOps.current.has(targetId)) return;
      pendingLikeOps.current.add(targetId);

      const wasLiked = likedIds.has(targetId);
      const delta = wasLiked ? -1 : 1;

      // Optimistic: flip likedIds
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(targetId);
        else next.add(targetId);
        return next;
      });

      // Optimistic: adjust like_count on post or comment
      if (targetType === 'post') {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === targetId ? { ...p, like_count: Math.max(p.like_count + delta, 0) } : p,
          ),
        );
      } else {
        setComments((prev) => {
          const next: Record<string, CommunityCommentWithAuthor[]> = {};
          for (const [pid, list] of Object.entries(prev)) {
            next[pid] = list.map((c) =>
              c.id === targetId ? { ...c, like_count: Math.max(c.like_count + delta, 0) } : c,
            );
          }
          return next;
        });
      }

      const result = await toggleCommunityLike(userId, targetType, targetId);
      pendingLikeOps.current.delete(targetId);

      // Rollback on API error
      if (result.error) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
        if (targetType === 'post') {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === targetId ? { ...p, like_count: Math.max(p.like_count - delta, 0) } : p,
            ),
          );
        } else {
          setComments((prev) => {
            const next: Record<string, CommunityCommentWithAuthor[]> = {};
            for (const [pid, list] of Object.entries(prev)) {
              next[pid] = list.map((c) =>
                c.id === targetId ? { ...c, like_count: Math.max(c.like_count - delta, 0) } : c,
              );
            }
            return next;
          });
        }
        showToast(t('community_like_failed'), 'error');
      }
    },
    [userId, likedIds, showToast, t],
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
    async (pollId: string, optionId: string): Promise<void> => {
      if (!userId) return;

      const result = await voteCommunityPoll({ pollId, optionId, userId });
      if (result.error) {
        if (result.error === 'POLL_EXPIRED') {
          showToast(t('community_vote_expired'), 'error');
        } else if (result.error === 'POLL_ALREADY_VOTED') {
          showToast(t('community_vote_failed'), 'error');
        } else {
          showToast(t('community_vote_failed'), 'error');
        }
        return;
      }

      // Optimistically update votedPolls + poll option count + total_votes
      setVotedPolls((prev) => ({
        ...prev,
        [pollId]: [...(prev[pollId] ?? []), optionId],
      }));
      setPolls((prev) => {
        const next: Record<string, PollWithOptions> = {};
        for (const [postId, pl] of Object.entries(prev)) {
          if (pl.id === pollId) {
            next[postId] = {
              ...pl,
              total_votes: pl.total_votes + 1,
              options: pl.options.map((o) =>
                o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o,
              ),
            };
          } else {
            next[postId] = pl;
          }
        }
        return next;
      });
    },
    [userId, showToast, t],
  );

  // ═══════════════════════════════════════════════════════════════
  // Reports
  // ═══════════════════════════════════════════════════════════════
  const reportTarget = useCallback(
    async (
      targetType: 'post' | 'comment',
      targetId: string,
      reason: ReportReason,
      detail?: string,
    ): Promise<boolean> => {
      if (!userId) return false;
      if (reportedIds.has(targetId)) {
        showToast(t('community_already_reported'), 'error');
        return false;
      }
      const result = await reportCommunityTarget({
        reporterId: userId,
        targetType,
        targetId,
        reason,
        detail,
      });
      if (result.error) {
        if (result.error === 'ALREADY_REPORTED') {
          setReportedIds((prev) => new Set(prev).add(targetId));
          showToast(t('community_already_reported'), 'error');
        } else if (result.error === 'CANNOT_SELF_REPORT') {
          showToast(t('community_self_report'), 'error');
        } else {
          showToast(t('community_report_failed'), 'error');
        }
        return false;
      }
      setReportedIds((prev) => new Set(prev).add(targetId));
      showToast(t('toast_report_submitted'), 'success');
      return true;
    },
    [userId, reportedIds, showToast, t],
  );

  // ═══════════════════════════════════════════════════════════════
  // Recent Searches (DB-backed, trim handled by DB trigger)
  // ═══════════════════════════════════════════════════════════════
  const addRecentSearch = useCallback(
    async (query: string): Promise<void> => {
      if (!userId) return;
      const q = query.trim();
      if (!q) return;
      const result = await apiAddRecentSearch(userId, q);
      if (result.error) return;
      // Re-fetch to get the authoritative list (trigger may have trimmed to 10)
      const listResult = await apiFetchRecentSearches(userId);
      if (!listResult.error && listResult.data) {
        setRecentSearches(listResult.data);
      }
    },
    [userId],
  );

  const removeRecentSearch = useCallback(
    async (query: string): Promise<void> => {
      if (!userId) return;
      const result = await apiRemoveRecentSearch(userId, query);
      if (result.error) return;
      setRecentSearches((prev) => prev.filter((q) => q !== query));
    },
    [userId],
  );

  const clearRecentSearches = useCallback(async (): Promise<void> => {
    if (!userId) return;
    const result = await apiClearRecentSearches(userId);
    if (result.error) return;
    setRecentSearches([]);
  }, [userId]);

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
      loadPostById,
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
      loadPostById,
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
