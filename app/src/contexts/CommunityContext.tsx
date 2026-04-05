import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
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
import { getPollExpiresAt } from '../types/poll';
import { MOCK_POSTS, MOCK_COMMENTS, MOCK_POLLS, CURRENT_USER_ID } from '../data/mockCommunity';
import { KBO_TEAMS } from '../constants/teams';

const PAGE_SIZE = 20;

// ─── Trending Algorithm ─────────────────────────────────────
const TRENDING_WINDOW_MS = 48 * 60 * 60 * 1000; // 48시간
const TRENDING_THRESHOLD = 30;                    // 최소 점수
const MAX_TRENDING = 5;                           // 최대 트렌딩 수

function getTrendingScore(post: CommunityPostWithAuthor): number {
  const ageMs = Date.now() - new Date(post.created_at).getTime();
  if (ageMs > TRENDING_WINDOW_MS) return 0;
  // 최신일수록 가산점 (0~1 보너스 배수)
  const freshness = 1 + (1 - ageMs / TRENDING_WINDOW_MS);
  const raw = post.like_count * 2 + post.comment_count * 3 + post.view_count * 0.1;
  return raw * freshness;
}

// ─── Context Value ───────────────────────────────────────────
interface CommunityContextValue {
  // Posts
  posts: CommunityPostWithAuthor[];
  getPost: (id: string) => CommunityPostWithAuthor | undefined;
  getFilteredPosts: (teamId: string | null, sort: PostSortOrder, page: number) => CommunityPostWithAuthor[];
  createPost: (input: CreatePostInput, pollInput?: CreatePollInput) => CommunityPostWithAuthor;
  updatePost: (postId: string, input: UpdatePostInput) => void;
  deletePost: (postId: string) => void;
  searchPosts: (query: string) => CommunityPostWithAuthor[];
  refreshPosts: () => void;

  // Comments
  getComments: (postId: string) => CommunityCommentWithAuthor[];
  createComment: (input: CreateCommentInput) => CommunityCommentWithAuthor;
  updateComment: (commentId: string, content: string) => void;
  deleteComment: (commentId: string) => void;

  // Likes
  likedIds: Set<string>;
  toggleLike: (targetType: LikeTargetType, targetId: string) => void;
  isLiked: (targetId: string) => boolean;

  // Polls
  getPoll: (postId: string) => PollWithOptions | undefined;
  votePoll: (pollId: string, optionId: string) => void;
  votedPolls: Record<string, string[]>; // pollId -> optionIds

  // Reports
  reportTarget: (targetType: 'post' | 'comment', targetId: string, reason: ReportReason, detail?: string) => boolean;
  reportedIds: Set<string>;

  // Recent searches
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;

  // Loading
  isLoading: boolean;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<CommunityPostWithAuthor[]>(MOCK_POSTS);
  const [comments, setComments] = useState<CommunityCommentWithAuthor[]>(MOCK_COMMENTS);
  const [polls, setPolls] = useState<Record<string, PollWithOptions>>(MOCK_POLLS);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [votedPolls, setVotedPolls] = useState<Record<string, string[]>>({});
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading] = useState(false);

  // ─── Trending auto-calculation ─────────────────────────────
  const trendingUpdated = useRef(false);

  useEffect(() => {
    // Skip if this render was triggered by our own trending update
    if (trendingUpdated.current) {
      trendingUpdated.current = false;
      return;
    }

    const scored = posts
      .filter((p) => !p.is_blinded)
      .map((p) => ({ id: p.id, score: getTrendingScore(p) }))
      .filter((s) => s.score >= TRENDING_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_TRENDING);

    const trendingIds = new Set(scored.map((s) => s.id));

    let changed = false;
    const updated = posts.map((p) => {
      const shouldBeTrending = trendingIds.has(p.id);
      if (p.is_trending !== shouldBeTrending) {
        changed = true;
        return { ...p, is_trending: shouldBeTrending };
      }
      return p;
    });

    if (changed) {
      trendingUpdated.current = true;
      setPosts(updated);
    }
  }, [posts]);

  // ─── Posts ──────────────────────────────────────────────────
  const getPost = useCallback((id: string) => {
    return posts.find((p) => p.id === id);
  }, [posts]);

  const getFilteredPosts = useCallback((teamId: string | null, sort: PostSortOrder, page: number) => {
    let filtered = posts.filter((p) => !p.is_blinded);

    // Team filter
    if (teamId && teamId !== 'all') {
      filtered = filtered.filter((p) => p.team_id === teamId);
    }

    // Sort
    switch (sort) {
      case 'popular':
        filtered.sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count));
        break;
      case 'latest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'likes':
        filtered.sort((a, b) => b.like_count - a.like_count);
        break;
      case 'comments':
        filtered.sort((a, b) => b.comment_count - a.comment_count);
        break;
    }

    // Pagination
    return filtered.slice(0, (page + 1) * PAGE_SIZE);
  }, [posts]);

  const createPost = useCallback((input: CreatePostInput, pollInput?: CreatePollInput): CommunityPostWithAuthor => {
    const now = new Date().toISOString();
    const teamInfo = input.team_id ? KBO_TEAMS.find((t) => t.id === input.team_id) : null;
    const newPost: CommunityPostWithAuthor = {
      id: `cp_${Date.now()}`,
      user_id: CURRENT_USER_ID,
      team_id: input.team_id ?? null,
      title: input.title,
      content: input.content,
      images: input.images ?? [],
      has_poll: !!pollInput,
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      is_edited: false,
      is_trending: false,
      is_blinded: false,
      created_at: now,
      updated_at: now,
      user: { nickname: '야구좋아', avatar_url: null },
      team: teamInfo ? { name_ko: teamInfo.nameKo } : null,
    };

    setPosts((prev) => [newPost, ...prev]);

    // Create poll if provided
    if (pollInput) {
      const pollId = `poll_${Date.now()}`;
      const newPoll: PollWithOptions = {
        id: pollId,
        post_id: newPost.id,
        allow_multiple: pollInput.allow_multiple,
        expires_at: getPollExpiresAt(pollInput.duration),
        is_closed: false,
        total_votes: 0,
        created_at: now,
        options: pollInput.options.map((text, i) => ({
          id: `po_${Date.now()}_${i}`,
          poll_id: pollId,
          text,
          vote_count: 0,
          sort_order: i,
        })),
      };
      setPolls((prev) => ({ ...prev, [newPost.id]: newPoll }));
    }

    return newPost;
  }, []);

  const updatePost = useCallback((postId: string, input: UpdatePostInput) => {
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, ...input, is_edited: true, updated_at: new Date().toISOString() }
        : p
    ));
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setComments((prev) => prev.filter((c) => c.post_id !== postId));
    setPolls((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  }, []);

  const searchPosts = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return posts.filter(
      (p) => !p.is_blinded && (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      )
    );
  }, [posts]);

  const refreshPosts = useCallback(() => {
    // TODO: Supabase 연결 시 서버에서 새로고침
    // 현재 mock에서는 no-op
  }, []);

  // ─── Comments ───────────────────────────────────────────────
  const getComments = useCallback((postId: string) => {
    return comments.filter((c) => c.post_id === postId);
  }, [comments]);

  const createComment = useCallback((input: CreateCommentInput): CommunityCommentWithAuthor => {
    const now = new Date().toISOString();
    const newComment: CommunityCommentWithAuthor = {
      id: `cc_${Date.now()}`,
      post_id: input.post_id,
      user_id: CURRENT_USER_ID,
      parent_comment_id: input.parent_comment_id ?? null,
      content: input.content,
      like_count: 0,
      is_edited: false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      user: { nickname: '야구좋아', avatar_url: null },
    };

    setComments((prev) => [...prev, newComment]);

    // Increment comment count
    setPosts((prev) => prev.map((p) =>
      p.id === input.post_id
        ? { ...p, comment_count: p.comment_count + 1 }
        : p
    ));

    return newComment;
  }, []);

  const updateComment = useCallback((commentId: string, content: string) => {
    setComments((prev) => prev.map((c) =>
      c.id === commentId
        ? { ...c, content, is_edited: true, updated_at: new Date().toISOString() }
        : c
    ));
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    // Soft delete
    setComments((prev) => prev.map((c) =>
      c.id === commentId
        ? { ...c, content: '', is_deleted: true, updated_at: new Date().toISOString() }
        : c
    ));

    setPosts((prev) => prev.map((p) =>
      p.id === comment.post_id
        ? { ...p, comment_count: Math.max(p.comment_count - 1, 0) }
        : p
    ));
  }, [comments]);

  // ─── Likes ──────────────────────────────────────────────────
  const toggleLike = useCallback((targetType: LikeTargetType, targetId: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      const wasLiked = next.has(targetId);
      if (wasLiked) next.delete(targetId);
      else next.add(targetId);

      // Update count
      const delta = wasLiked ? -1 : 1;
      if (targetType === 'post') {
        setPosts((pp) => pp.map((p) =>
          p.id === targetId ? { ...p, like_count: Math.max(p.like_count + delta, 0) } : p
        ));
      } else {
        setComments((cc) => cc.map((c) =>
          c.id === targetId ? { ...c, like_count: Math.max(c.like_count + delta, 0) } : c
        ));
      }

      return next;
    });
  }, []);

  const isLiked = useCallback((targetId: string) => {
    return likedIds.has(targetId);
  }, [likedIds]);

  // ─── Polls ──────────────────────────────────────────────────
  const getPoll = useCallback((postId: string) => {
    return polls[postId];
  }, [polls]);

  const votePoll = useCallback((pollId: string, optionId: string) => {
    // Find which postId this poll belongs to
    const postId = Object.keys(polls).find((k) => polls[k].id === pollId);
    if (!postId) return;

    const poll = polls[postId];
    const alreadyVoted = votedPolls[pollId] ?? [];

    // Single choice: can't vote again
    if (!poll.allow_multiple && alreadyVoted.length > 0) return;
    // Multiple choice: can't vote same option twice
    if (alreadyVoted.includes(optionId)) return;

    setPolls((prev) => {
      const updatedPoll = { ...prev[postId] };
      updatedPoll.options = updatedPoll.options.map((o) =>
        o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
      );
      updatedPoll.total_votes = updatedPoll.total_votes + 1;
      return { ...prev, [postId]: updatedPoll };
    });

    setVotedPolls((prev) => ({
      ...prev,
      [pollId]: [...alreadyVoted, optionId],
    }));
  }, [polls, votedPolls]);

  // ─── Reports ────────────────────────────────────────────────
  const reportTarget = useCallback((
    targetType: 'post' | 'comment',
    targetId: string,
    _reason: ReportReason,
    _detail?: string,
  ): boolean => {
    // Self-report check
    if (targetType === 'post') {
      const post = posts.find((p) => p.id === targetId);
      if (post?.user_id === CURRENT_USER_ID) return false;
    } else {
      const comment = comments.find((c) => c.id === targetId);
      if (comment?.user_id === CURRENT_USER_ID) return false;
    }

    // Duplicate check
    if (reportedIds.has(targetId)) return false;

    setReportedIds((prev) => new Set(prev).add(targetId));
    // TODO: Supabase insert
    return true;
  }, [posts, comments, reportedIds]);

  // ─── Recent Searches ───────────────────────────────────────
  const addRecentSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== q);
      return [q, ...filtered].slice(0, 10);
    });
  }, []);

  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== query));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  // ─── Value ──────────────────────────────────────────────────
  const value = useMemo<CommunityContextValue>(() => ({
    posts,
    getPost,
    getFilteredPosts,
    createPost,
    updatePost,
    deletePost,
    searchPosts,
    refreshPosts,
    getComments,
    createComment,
    updateComment,
    deleteComment,
    likedIds,
    toggleLike,
    isLiked,
    getPoll,
    votePoll,
    votedPolls,
    reportTarget,
    reportedIds,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    isLoading,
  }), [
    posts, getPost, getFilteredPosts, createPost, updatePost, deletePost, searchPosts, refreshPosts,
    getComments, createComment, updateComment, deleteComment,
    likedIds, toggleLike, isLiked,
    getPoll, votePoll, votedPolls,
    reportTarget, reportedIds,
    recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches,
    isLoading,
  ]);

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within CommunityProvider');
  return ctx;
}
