import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useTranslation } from 'react-i18next';

import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBlock } from '../../contexts/BlockContext';
import { useLoginGate } from '../../hooks/useLoginGate';
import { timeAgo } from '../../utils/time';
import type { CommunityCommentWithAuthor } from '../../types/community';
import type { RootStackParamList } from '../../types/navigation';
import { isPollActive } from '../../types/poll';
import { incrementPostView } from '../../services/communityApi';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';
import { hapticMedium } from '../../utils/haptics';
import { useToast } from '../../contexts/ToastContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CommunityPostDetail'>;

const COMMENT_MAX = 300;

export default function CommunityPostDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { postId } = route.params;
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const requireLogin = useLoginGate();
  const { showToast } = useToast();
  const { blockUser } = useBlock();

  const {
    getPost,
    deletePost,
    getComments,
    loadCommentsForPost,
    createComment,
    deleteComment,
    toggleLike,
    isLiked,
    getPoll,
    loadPollForPost,
    votePoll,
    votedPolls,
    reportTarget,
    reportedIds,
    error,
  } = useCommunity();

  const post = getPost(postId);
  const comments = getComments(postId);
  const poll = post?.has_poll ? getPoll(postId) : undefined;

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // D-11: view_count 증가 RPC + D-04: 상세 진입 시 댓글/투표 로드
  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    const load = async () => {
      // Fire-and-forget view_count RPC (D-11) — atomic UPDATE, no race
      void incrementPostView(postId).then(({ error: rpcErr }) => {
        if (rpcErr) console.warn('[Community] view_count RPC failed:', rpcErr);
      });

      // Comments load (D-04)
      try {
        await loadCommentsForPost(postId);
      } catch (e) {
        if (!cancelled) {
          console.warn('[Community] loadCommentsForPost failed:', e);
        }
      }

      // Poll load (D-12) — safe to call; returns silently when post has no poll
      const currentPost = getPost(postId);
      if (currentPost?.has_poll) {
        try {
          await loadPollForPost(postId);
        } catch (e) {
          if (!cancelled) {
            console.warn('[Community] loadPollForPost failed:', e);
          }
        }
      }

      if (!cancelled) setInitialLoadDone(true);
    };

    void load();
    return () => { cancelled = true; };
  }, [postId, loadCommentsForPost, loadPollForPost, getPost]);

  // Build comment tree: top-level + replies grouped
  const commentTree = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parent_comment_id);
    const grouped: { parent: CommunityCommentWithAuthor; replies: CommunityCommentWithAuthor[] }[] = [];
    for (const parent of topLevel) {
      const replies = comments.filter((c) => c.parent_comment_id === parent.id);
      grouped.push({ parent, replies });
    }
    return grouped;
  }, [comments]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleLikePost = useCallback(() => {
    if (!requireLogin()) return;
    if (!post) return;
    hapticMedium();
    // toggleLike is async + internally optimistic; fire-and-forget from the screen
    void toggleLike('post', post.id);
  }, [post, toggleLike, requireLogin]);

  const handleDeletePost = useCallback(() => {
    Alert.alert(t('community_post_delete'), t('community_post_delete_confirm'), [
      { text: t('btn_cancel'), style: 'cancel' },
      {
        text: t('btn_delete'),
        style: 'destructive',
        onPress: async () => {
          const ok = await deletePost(postId);
          if (ok) {
            showToast(t('toast_post_deleted'), 'success');
            navigation.goBack();
          } else {
            showToast(t('community_post_create_failed_title'), 'error');
          }
        },
      },
    ]);
  }, [postId, deletePost, navigation, showToast, t]);

  const handleReportPost = useCallback(() => {
    if (reportedIds.has(postId)) {
      Alert.alert(t('community_already_reported'));
      return;
    }
    Alert.alert(t('community_report_post'), t('community_report_post_confirm'), [
      { text: t('btn_cancel'), style: 'cancel' },
      {
        text: t('btn_report'),
        style: 'destructive',
        onPress: async () => {
          // reportTarget shows its own toasts (success + error narrowing) inside the context
          await reportTarget('post', postId, 'spam');
        },
      },
    ]);
  }, [postId, reportTarget, reportedIds, t]);

  const handleBlockUser = useCallback((targetUserId: string) => {
    Alert.alert(
      t('block_confirm_title'),
      t('block_confirm_message'),
      [
        { text: t('btn_cancel'), style: 'cancel' },
        {
          text: t('block_confirm_btn'),
          style: 'destructive',
          onPress: () => blockUser(targetUserId),
        },
      ],
    );
  }, [blockUser, t]);

  const handlePostAction = useCallback(() => {
    if (!post) return;
    const isOwner = post.user_id === currentUserId;
    const buttons = isOwner
      ? [
          { text: t('btn_delete'), style: 'destructive' as const, onPress: handleDeletePost },
          { text: t('btn_cancel'), style: 'cancel' as const },
        ]
      : [
          { text: t('btn_report'), style: 'destructive' as const, onPress: handleReportPost },
          {
            text: t('block_user_btn'),
            onPress: () => handleBlockUser(post.user_id),
          },
          { text: t('btn_cancel'), style: 'cancel' as const },
        ];
    Alert.alert(
      t('community_post_action_title'),
      t('community_post_action_message'),
      buttons,
    );
  }, [post, currentUserId, handleDeletePost, handleReportPost, handleBlockUser, t]);

  const handleSubmitComment = useCallback(async () => {
    if (!requireLogin()) return;
    const text = commentText.trim();
    if (!text) return;

    const created = await createComment({
      post_id: postId,
      parent_comment_id: replyTo ?? undefined,
      content: text,
    });
    if (created) {
      setCommentText('');
      setReplyTo(null);
      showToast(t('toast_comment_sent'), 'success');
    } else {
      showToast(t('community_comment_create_failed'), 'error');
    }
  }, [commentText, postId, replyTo, createComment, showToast, t, requireLogin]);

  const handleReply = useCallback((commentId: string) => {
    setReplyTo(commentId);
    inputRef.current?.focus();
  }, []);

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert(t('community_comment_delete'), t('community_comment_delete_confirm'), [
      { text: t('btn_cancel'), style: 'cancel' },
      {
        text: t('btn_delete'),
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteComment(commentId);
          if (ok) {
            showToast(t('toast_comment_deleted'), 'success');
          } else {
            showToast(t('community_comment_delete_failed'), 'error');
          }
        },
      },
    ]);
  }, [deleteComment, showToast, t]);

  const handleLikeComment = useCallback((commentId: string) => {
    if (!requireLogin()) return;
    hapticMedium();
    void toggleLike('comment', commentId);
  }, [toggleLike, requireLogin]);

  const handleVote = useCallback((optionId: string) => {
    if (!requireLogin()) return;
    if (!poll) return;
    void votePoll(poll.id, optionId);
  }, [poll, votePoll, requireLogin]);

  // ─── Loading (first mount, before post + comments land) ───
  if (!post && !initialLoadDone) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ─── Not found / error retry ─────────────────────────────
  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>
            {error ? t('community_post_load_error') : t('community_post_not_found')}
          </Text>
          {error && (
            <TouchableOpacity
              onPress={() => { void loadCommentsForPost(postId); }}
              style={styles.retryButton}
              accessibilityLabel={t('a11y_retry_load')}
            >
              <Text style={styles.retryButtonText}>{t('btn_retry')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const postLiked = isLiked(post.id);
  const myVotes = poll ? (votedPolls[poll.id] ?? []) : [];
  const hasVoted = myVotes.length > 0;
  const pollActive = poll ? isPollActive(poll) : false;
  const pollExpired = poll ? !pollActive : false;
  const winningOptionId = pollExpired && poll && poll.options.length > 0
    ? poll.options.reduce((best, o) => (o.vote_count > best.vote_count ? o : best), poll.options[0]).id
    : null;

  // D-03: 탈퇴/anon 작성자 표시 치환
  const isPostAuthorDeleted = post.user.is_deleted === true || !post.user.nickname;
  const displayAuthor = isPostAuthorDeleted ? t('deleted_user') : post.user.nickname;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.headerBtn} accessibilityLabel={t('a11y_back')}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePostAction} activeOpacity={0.7} style={styles.headerBtn} accessibilityLabel={t('a11y_more')}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Post Content */}
          <View style={styles.postSection}>
            {/* Author row */}
            <TouchableOpacity
              style={styles.authorRow}
              activeOpacity={0.7}
              onPress={() => {
                // D-03: 탈퇴 사용자는 차단 불가 (ghost)
                if (post.user_id !== currentUserId && !isPostAuthorDeleted) {
                  handleBlockUser(post.user_id);
                }
              }}
              disabled={post.user_id === currentUserId || isPostAuthorDeleted}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color={colors.textTertiary} />
              </View>
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{displayAuthor}</Text>
                <View style={styles.metaRow}>
                  {post.team && (
                    <Text style={styles.teamBadge}>{post.team.name_ko}</Text>
                  )}
                  <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
                  {post.is_edited && <Text style={styles.editedText}>({t('community_comment_edited')})</Text>}
                </View>
              </View>
            </TouchableOpacity>

            {/* Title & Content */}
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postContent}>{post.content}</Text>

            {/* Images */}
            {post.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageScroll}
                contentContainerStyle={styles.imageScrollContent}
              >
                {post.images.map((uri, i) => (
                  <Image key={`img-${i}`} source={{ uri }} style={styles.postImage} />
                ))}
              </ScrollView>
            )}

            {/* Poll */}
            {poll && (
              <View style={styles.pollContainer}>
                <View style={styles.pollHeader}>
                  <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                  <Text style={styles.pollLabel}>
                    {poll.allow_multiple ? t('community_poll_multiple') : t('community_poll_single')} · {t('community_poll_votes', { count: poll.total_votes })}
                  </Text>
                  {!pollActive && <Text style={styles.pollClosed}>{t('community_poll_closed')}</Text>}
                </View>

                {poll.options.map((opt) => {
                  const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
                  const voted = myVotes.includes(opt.id);
                  const showResults = hasVoted || pollExpired;
                  // D-13: 만료된 투표는 winner를 primary로 강조
                  const isWinner = pollExpired && opt.id === winningOptionId;

                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.pollOption}
                      onPress={() => {
                        if (pollExpired) return;
                        if (showResults) return;
                        handleVote(opt.id);
                      }}
                      activeOpacity={pollExpired || showResults ? 1 : 0.7}
                      disabled={pollExpired || showResults}
                      accessibilityState={{ disabled: pollExpired }}
                      accessibilityLabel={
                        pollExpired
                          ? t('a11y_poll_option_disabled', { label: opt.text })
                          : opt.text
                      }
                    >
                      {showResults && (
                        <View style={[styles.pollBar, { width: `${pct}%` }]} />
                      )}
                      <Text
                        style={[
                          styles.pollOptionText,
                          (voted || isWinner) && styles.pollOptionVoted,
                        ]}
                      >
                        {opt.text}
                      </Text>
                      {showResults && (
                        <Text style={styles.pollPct}>{pct}%</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Like & stats row */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.likeBtn} onPress={handleLikePost} activeOpacity={0.7}>
                <Ionicons
                  name={postLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={postLiked ? colors.error : colors.textTertiary}
                />
                <Text style={[styles.statText, postLiked && { color: colors.error }]}>
                  {post.like_count}
                </Text>
              </TouchableOpacity>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
                <Text style={styles.statText}>{post.comment_count}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={18} color={colors.textTertiary} />
                <Text style={styles.statText}>{post.view_count}</Text>
              </View>
            </View>
          </View>

          {/* Comments */}
          <View style={styles.commentSection}>
            <Text style={styles.commentSectionTitle}>
              {t('post_comments')} {post.comment_count}
            </Text>

            {commentTree.length === 0 && (
              <Text style={styles.noComments}>{t('community_no_comments')}</Text>
            )}

            {commentTree.map(({ parent, replies }) => (
              <View key={parent.id}>
                <CommentItem
                  comment={parent}
                  currentUserId={currentUserId}
                  isLiked={isLiked(parent.id)}
                  onLike={() => handleLikeComment(parent.id)}
                  onReply={() => handleReply(parent.id)}
                  onDelete={() => handleDeleteComment(parent.id)}
                  onBlock={() => handleBlockUser(parent.user_id)}
                />
                {replies.map((reply) => (
                  <View key={reply.id} style={styles.replyIndent}>
                    <CommentItem
                      comment={reply}
                      currentUserId={currentUserId}
                      isLiked={isLiked(reply.id)}
                      onLike={() => handleLikeComment(reply.id)}
                      onReply={() => handleReply(parent.id)}
                      onDelete={() => handleDeleteComment(reply.id)}
                      onBlock={() => handleBlockUser(reply.user_id)}
                      isReply
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Comment Input */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {replyTo && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>{t('community_replying')}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.commentInput}
              placeholder={t('post_comment_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={commentText}
              onChangeText={(text) => setCommentText(text.slice(0, COMMENT_MAX))}
              maxLength={COMMENT_MAX}
              multiline
            />
            <TouchableOpacity
              onPress={handleSubmitComment}
              activeOpacity={0.7}
              disabled={!commentText.trim()}
            >
              <Ionicons
                name="send"
                size={22}
                color={commentText.trim() ? colors.primary : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Comment Item Component ───────────────────────────────────
interface CommentItemProps {
  comment: CommunityCommentWithAuthor;
  currentUserId: string;
  isLiked: boolean;
  onLike: () => void;
  onReply: () => void;
  onDelete: () => void;
  onBlock: () => void;
  isReply?: boolean;
}

function CommentItem({ comment, currentUserId, isLiked: liked, onLike, onReply, onDelete, onBlock, isReply }: CommentItemProps) {
  const { t } = useTranslation();
  const isOwner = comment.user_id === currentUserId;

  // D-03: 소프트 삭제된 댓글은 "삭제된 댓글입니다" 우선 (작성자 탈퇴보다 우선)
  if (comment.is_deleted) {
    return (
      <View style={styles.commentItem}>
        <Text style={styles.deletedComment}>{t('community_comment_deleted')}</Text>
      </View>
    );
  }

  // D-03: 살아있는 댓글이지만 작성자가 탈퇴/anon인 경우
  const commentAuthorDeleted = comment.user.is_deleted === true || !comment.user.nickname;
  const commentDisplayAuthor = commentAuthorDeleted ? t('deleted_user') : comment.user.nickname;

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Ionicons name="person" size={14} color={colors.textTertiary} />
        </View>
        <Text style={styles.commentAuthor}>{commentDisplayAuthor}</Text>
        <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
        {comment.is_edited && <Text style={styles.commentEdited}>({t('community_comment_edited')})</Text>}
      </View>
      <Text style={styles.commentText}>{comment.content}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity style={styles.commentAction} onPress={onLike} activeOpacity={0.7}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={14}
            color={liked ? colors.error : colors.textTertiary}
          />
          {comment.like_count > 0 && (
            <Text style={[styles.commentActionText, liked && { color: colors.error }]}>
              {comment.like_count}
            </Text>
          )}
        </TouchableOpacity>
        {!isReply && (
          <TouchableOpacity style={styles.commentAction} onPress={onReply} activeOpacity={0.7}>
            <Text style={styles.commentActionText}>{t('post_reply')}</Text>
          </TouchableOpacity>
        )}
        {isOwner && (
          <TouchableOpacity style={styles.commentAction} onPress={onDelete} activeOpacity={0.7}>
            <Text style={[styles.commentActionText, { color: colors.error }]}>{t('btn_delete')}</Text>
          </TouchableOpacity>
        )}
        {!isOwner && (
          <TouchableOpacity
            style={styles.commentAction}
            onPress={onBlock}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Not found
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
  loadingBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.round,
  },
  retryButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
  },

  // Post section
  postSection: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  teamBadge: {
    fontSize: fontSize.micro,
    color: colors.primary,
    fontWeight: fontWeight.body,
  },
  timeText: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  editedText: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  postTitle: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  postContent: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // Images
  imageScroll: {
    marginTop: 14,
  },
  imageScrollContent: {
    gap: 8,
  },
  postImage: {
    width: 280,
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  // Poll
  pollContainer: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pollLabel: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    flex: 1,
  },
  pollClosed: {
    fontSize: fontSize.micro,
    color: colors.error,
    fontWeight: fontWeight.body,
  },
  pollOption: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  pollBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primaryAlpha8,
    borderRadius: radius.sm,
  },
  pollOptionText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    zIndex: 1,
  },
  pollOptionVoted: {
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  pollPct: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    fontWeight: fontWeight.body,
    zIndex: 1,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: fontSize.meta,
    color: colors.textTertiary,
  },

  // Comments section
  commentSection: {
    padding: 16,
  },
  commentSectionTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  noComments: {
    fontSize: fontSize.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  replyIndent: {
    paddingLeft: 36,
  },
  commentItem: {
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  commentEdited: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  commentText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 20,
    marginLeft: 30,
  },
  deletedComment: {
    fontSize: fontSize.body,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginLeft: 30,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 30,
    marginTop: 6,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  commentActionText: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },

  // Bottom input bar
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  replyIndicatorText: {
    fontSize: fontSize.micro,
    color: colors.primary,
    fontWeight: fontWeight.body,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
});
