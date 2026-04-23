import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
  LayoutAnimation,
  UIManager,
  Dimensions,
  Share,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useTranslation } from 'react-i18next';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useArchive } from '../../contexts/ArchiveContext';
import { useLoginGate } from '../../hooks/useLoginGate';
import { KBO_TEAMS } from '../../constants/teams';
import { timeAgo, formatCount } from '../../utils/time';
import type { RootStackParamList } from '../../types/navigation';
import { useToast } from '../../contexts/ToastContext';
import { useReport } from '../../contexts/ReportContext';
import ReportSheet from '../../components/common/ReportSheet';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

import { hapticMedium } from '../../utils/haptics';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import VideoPlayer from '../../components/common/VideoPlayer';

type HeroMediaItem =
  | { kind: 'image'; uri: string }
  | { kind: 'video'; uri: string };

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_SIZE = 72;
const PADDING = 16;

function SpecItem({ value, icon }: { value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.specItem}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'PostDetail'>>();
  const { postId } = route.params;
  const {
    getPhotoPost, getPhotographer, isPhotoLiked, togglePhotoLike,
    getCommentsForPost, addComment, deleteComment,
    deletePhotoPost,
  } = usePhotographer();

  // Plan 04 hand-off: toggleCommentLike / isCommentLiked 가 PhotographerContext 에서 제거됨 (Plan 03 D-22).
  // Plan 05 에서 photo_likes target_type='comment' DB 트리거 검증 후 context 재추가 예정.
  // 현재는 로컬 state stub — 재렌더 시 초기화되나 UI 동작은 유지.
  const [localLikedComments, setLocalLikedComments] = useState<Set<string>>(new Set());
  const isCommentLiked = (commentId: string) => localLikedComments.has(commentId);
  const toggleCommentLike = (commentId: string) => {
    setLocalLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };
  const { user } = useAuth();
  const { isPostSaved, toggleSavePost } = useArchive();
  const requireLogin = useLoginGate();
  const { showToast } = useToast();
  const { hasReported } = useReport();

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; userName: string } | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  type CommentSortMode = 'popular' | 'latest' | 'likes' | 'comments';
  const [commentSort, setCommentSort] = useState<CommentSortMode>('latest');
  const [showCommentSortDropdown, setShowCommentSortDropdown] = useState(false);
  const COMMENT_SORT_LABELS: Record<CommentSortMode, string> = {
    popular: t('comment_sort_popular'),
    latest: t('comment_sort_latest'),
    likes: t('comment_sort_likes'),
    comments: t('comment_sort_comments'),
  };

  const [showReportSheet, setShowReportSheet] = useState(false);

  // #16 Reaction popup
  const REACTIONS = ['❤️', '🔥', '👏', '😍', '⚾'] as const;
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const reactionScales = useRef(REACTIONS.map(() => new Animated.Value(0))).current;

  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const heroListRef = useRef<FlatList>(null);
  const likeScale = useRef(new Animated.Value(1)).current;
  const heartFloat = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  // #8 Entrance transition (simulated shared-element)
  const enterScale = useRef(new Animated.Value(0.92)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(enterScale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.timing(enterOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  // #13 Swipe-down to dismiss
  const panY = useRef(new Animated.Value(0)).current;
  const panOpacity = useRef(new Animated.Value(1)).current;
  const dismissPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 15 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          panY.setValue(g.dy);
          panOpacity.setValue(1 - g.dy / 500);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          Animated.parallel([
            Animated.timing(panY, { toValue: 600, duration: 200, useNativeDriver: true }),
            Animated.timing(panOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => navigation.goBack());
        } else {
          Animated.spring(panY, { toValue: 0, friction: 6, useNativeDriver: true }).start();
          Animated.timing(panOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  // Double-tap like
  const lastTapRef = useRef(0);
  const bigHeartScale = useRef(new Animated.Value(0)).current;
  const bigHeartOpacity = useRef(new Animated.Value(0)).current;

  const onHeroScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIdx(idx);
  }, []);

  const scrollToIdx = useCallback((idx: number) => {
    setActiveIdx(idx);
    heroListRef.current?.scrollToOffset({ offset: idx * SCREEN_WIDTH, animated: true });
  }, []);

  const post = getPhotoPost(postId);
  const postComments = getCommentsForPost(postId);
  if (!post) return null;

  const photographer = getPhotographer(post.photographer_id);
  const team = KBO_TEAMS.find((t) => t.id === post.team_id);
  // Plan 04-09 gap closure — images + videos 통합 media 배열 렌더
  const gallery: HeroMediaItem[] = useMemo(
    () => [
      ...post.images.map<HeroMediaItem>((uri) => ({ kind: 'image', uri })),
      ...post.videos.map<HeroMediaItem>((uri) => ({ kind: 'video', uri })),
    ],
    [post.images, post.videos],
  );
  const liked = isPhotoLiked(postId);
  const saved = isPostSaved(postId);
  const isOwner = user?.id === post.photographer_id;

  const handleSendComment = () => {
    if (!requireLogin() || !commentText.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    addComment(postId, commentText.trim(), user!.id, user!.display_name ?? user!.username ?? 'User', replyTo?.id);
    setCommentText('');
    setReplyTo(null);
    showToast(t('toast_comment_sent'), 'success');
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(t('post_comment_delete'), t('post_comment_delete_confirm'), [
      { text: t('btn_cancel'), style: 'cancel' },
      { text: t('btn_delete'), style: 'destructive', onPress: () => deleteComment(commentId) },
    ]);
  };

  const handleOwnerMenu = () => {
    Alert.alert(t('post_owner_menu'), undefined, [
      { text: t('post_edit'), onPress: () => navigation.navigate('UploadPost', { postId }) },
      {
        text: t('post_delete'), style: 'destructive',
        onPress: () => Alert.alert(t('post_delete'), t('post_delete_confirm'), [
          { text: t('btn_cancel'), style: 'cancel' },
          { text: t('btn_delete'), style: 'destructive', onPress: () => { deletePhotoPost(postId); navigation.goBack(); } },
        ]),
      },
      { text: t('btn_cancel'), style: 'cancel' },
    ]);
  };

  const handleReportMenu = () => {
    if (!requireLogin()) return;
    if (hasReported(postId, 'post')) {
      showToast(t('post_already_reported'), 'info');
      return;
    }
    setShowReportSheet(true);
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (!requireLogin()) return;
      if (!isPhotoLiked(postId)) {
        hapticMedium();
        togglePhotoLike(postId);
      }
      // Big heart animation
      bigHeartScale.setValue(0);
      bigHeartOpacity.setValue(1);
      Animated.parallel([
        Animated.spring(bigHeartScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(bigHeartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    }
    lastTapRef.current = now;
  }, [postId, requireLogin, isPhotoLiked, togglePhotoLike, bigHeartScale, bigHeartOpacity]);

  const handleLike = useCallback(() => {
    if (!requireLogin()) return;
    hapticMedium();
    togglePhotoLike(postId);
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    heartFloat.setValue(0);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(heartFloat, { toValue: -60, duration: 600, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [postId, togglePhotoLike, likeScale, heartFloat, heartOpacity]);

  const handleShare = useCallback(() => {
    const playerName = post.player ? ` - ${post.player.name_ko}` : '';
    Share.share({
      title: post.title,
      message: `${post.title}\nby @${post.photographer.display_name}\n${post.team.name_ko}${playerName}\n\nhttps://udamonfan.com/post/${post.id}`,
    });
  }, [post]);

  const handleSave = useCallback(() => {
    if (!requireLogin()) return;
    const wasSaved = isPostSaved(postId);
    toggleSavePost(postId);
    showToast(t(wasSaved ? 'toast_unsaved' : 'toast_saved'), wasSaved ? 'info' : 'success');
  }, [postId, toggleSavePost, requireLogin, isPostSaved, showToast, t]);

  // #16 Reaction long-press
  const openReactions = useCallback(() => {
    if (!requireLogin()) return;
    hapticMedium();
    setShowReactions(true);
    reactionScales.forEach((s, i) => {
      s.setValue(0);
      Animated.spring(s, { toValue: 1, friction: 4, tension: 200, delay: i * 40, useNativeDriver: true }).start();
    });
  }, [requireLogin, reactionScales]);

  const pickReaction = useCallback((emoji: string) => {
    hapticMedium();
    setSelectedReaction(emoji);
    setShowReactions(false);
    if (!liked) togglePhotoLike(postId);
    showToast(emoji, 'success');
  }, [liked, togglePhotoLike, postId, showToast]);

  return (
    <Animated.View
      style={[styles.screen, { opacity: panOpacity, transform: [{ translateY: panY }, { scale: enterScale }] }]}
      {...dismissPan.panHandlers}
    >
      {/* Entrance fade */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: enterOpacity }]}>

      {/* ─── Floating Header ─── */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7} accessibilityLabel={t('a11y_back')}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} onPress={handleSave} accessibilityLabel={t('a11y_bookmark')}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? colors.primary : '#FFF'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} onPress={handleShare} accessibilityLabel={t('a11y_share')}>
          <Ionicons name="share-outline" size={20} color="#FFF" />
        </TouchableOpacity>
        {isOwner ? (
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} onPress={handleOwnerMenu}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} onPress={handleReportMenu}>
            <Ionicons name="flag-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Content ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {gallery.length > 0 && (
          <View style={styles.heroWrap}>
            <FlatList
              ref={heroListRef}
              data={gallery}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onHeroScroll}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              renderItem={({ item }) => (
                item.kind === 'video' ? (
                  <View style={styles.heroSlide}>
                    <VideoPlayer
                      uri={item.uri}
                      mode="detail"
                      width={SCREEN_WIDTH}
                      height={(SCREEN_WIDTH * 4) / 3}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      handleDoubleTap();
                      // Single-tap fullscreen handled after double-tap window
                      setTimeout(() => {
                        if (Date.now() - lastTapRef.current >= 300) {
                          setFullscreenVisible(true);
                        }
                      }, 310);
                    }}
                    style={styles.heroSlide}
                  >
                    {/* #14 Inline pinch zoom */}
                    <ScrollView
                      maximumZoomScale={2.5}
                      minimumZoomScale={1}
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                      bouncesZoom
                      centerContent
                      contentContainerStyle={{ flex: 1 }}
                    >
                      <Image source={{ uri: item.uri }} style={styles.heroImage} />
                    </ScrollView>
                  </TouchableOpacity>
                )
              )}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', colors.background]}
              locations={[0.5, 0.8, 1]}
              style={styles.heroGradient}
              pointerEvents="none"
            />
            {/* Double-tap heart overlay */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bigHeartOverlay,
                {
                  opacity: bigHeartOpacity,
                  transform: [{ scale: bigHeartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={80} color="#FFF" />
            </Animated.View>
          </View>
        )}

        {/* Gallery Counter */}
        {gallery.length > 1 && (
          <View style={styles.galleryCounter}>
            <Text style={styles.galleryCounterText}>
              {activeIdx + 1} / {gallery.length}
            </Text>
          </View>
        )}

        {/* Thumbnails */}
        {gallery.length > 1 && (
          <View style={styles.thumbnailRow}>
            {gallery.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.thumbnail, idx === activeIdx && styles.thumbnailActive]}
                onPress={() => scrollToIdx(idx)}
                activeOpacity={0.8}
                accessibilityLabel={item.kind === 'video' ? t('a11y_video_preview') : undefined}
              >
                <Image
                  source={{ uri: item.kind === 'video' ? (post.thumbnail_urls?.[0] ?? item.uri) : item.uri }}
                  style={styles.thumbnailImage}
                />
                {item.kind === 'video' && (
                  <View style={styles.thumbVideoOverlay}>
                    <Ionicons name="play" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Engagement Stats */}
        <View style={styles.engagementRow}>
          <View style={styles.engagementItem}>
            <Ionicons name="heart" size={14} color={colors.error} />
            <AnimatedCounter value={post.like_count} style={styles.engagementText} formatter={formatCount} />
          </View>
          <View style={styles.engagementItem}>
            <Ionicons name="eye" size={14} color={colors.textTertiary} />
            <Text style={styles.engagementText}>{formatCount(post.view_count)}</Text>
          </View>
          <Text style={styles.engagementDate}>{timeAgo(post.created_at)}</Text>
        </View>

        {/* ─── Unified Content Area ─── */}
        <View style={styles.contentArea}>
          {/* Post Info */}
          <Text style={styles.postTitle}>{post.title}</Text>

          {/* Description */}
          {post.description.length > 0 && (
            <Text style={styles.descriptionText}>{post.description}</Text>
          )}

          {/* Team / Player / Cheerleader Chips */}
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.teamChip, team && { borderColor: team.color }]}
              activeOpacity={0.7}
              onPress={() => team && navigation.navigate('TeamDetail', { teamId: team.id })}
            >
              <Ionicons name="baseball-outline" size={12} color={team?.color ?? colors.primary} />
              <Text style={[styles.teamChipText, team && { color: team.color }]}>{team?.shortName ?? post.team.name_ko}</Text>
            </TouchableOpacity>
            {post.player && (
              <TouchableOpacity
                style={styles.playerChip}
                activeOpacity={0.7}
                onPress={() => post.player && navigation.navigate('PlayerDetail', { playerId: post.player_id! })}
              >
                <View style={styles.playerDot} />
                <Text style={styles.playerChipText}>{post.player.name_ko}</Text>
              </TouchableOpacity>
            )}
            {post.cheerleader && post.cheerleader_id && (
              <TouchableOpacity
                style={styles.playerChip}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CheerleaderProfile', { cheerleaderId: post.cheerleader_id! })}
              >
                <Ionicons name="heart" size={10} color={colors.error} />
                <Text style={styles.playerChipText}>{post.cheerleader.name_ko}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Photographer Row */}
          <TouchableOpacity
            style={styles.photographerRow}
            activeOpacity={0.7}
            onPress={() => photographer && navigation.navigate('PhotographerProfile', { photographerId: photographer.id })}
          >
            <View style={styles.photographerAvatar}>
              {photographer?.avatar_url ? (
                <Image source={{ uri: photographer.avatar_url }} style={styles.photographerAvatarImg} />
              ) : (
                <Ionicons name="camera" size={14} color={colors.primary} />
              )}
            </View>
            <View style={styles.photographerInfo}>
              <View style={styles.photographerNameRow}>
                <Text style={styles.photographerName}>@{post.photographer.display_name}</Text>
                {post.photographer.is_verified && (
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                )}
              </View>
              <Text style={styles.photographerSubtext}>{t('post_fan_photographer')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Specs Grid */}
          <View style={styles.specsGrid}>
            <SpecItem value={t('post_type_photo')} icon="image" />
            <SpecItem value={`${gallery.length}`} icon="grid" />
            <SpecItem value={String(post.comment_count)} icon="chatbubble-outline" />
          </View>

          {/* Comments */}
          <View style={styles.commentDividerThick} />
          <View style={styles.commentSortHeader}>
            <Text style={styles.commentSectionTitle}>
              {t('post_comments_count', { count: postComments.filter((c) => !c.isDeleted).length })}
            </Text>
            <TouchableOpacity
              style={styles.commentSortBtn}
              activeOpacity={0.7}
              onPress={() => setShowCommentSortDropdown(!showCommentSortDropdown)}
            >
              <Text style={styles.commentSortBtnText}>{COMMENT_SORT_LABELS[commentSort]}</Text>
              <Ionicons name={showCommentSortDropdown ? 'chevron-up' : 'chevron-down'} size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {showCommentSortDropdown && (
            <View style={styles.commentSortDropdown}>
              {(['popular', 'latest', 'likes', 'comments'] as CommentSortMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.commentSortDropdownItem, commentSort === mode && styles.commentSortDropdownItemActive]}
                  onPress={() => { setCommentSort(mode); setShowCommentSortDropdown(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.commentSortDropdownText, commentSort === mode && styles.commentSortDropdownTextActive]}>
                    {COMMENT_SORT_LABELS[mode]}
                  </Text>
                  {commentSort === mode && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {postComments.length === 0 ? (
            <View style={styles.commentEmpty}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.commentEmptyTitle}>{t('post_no_comments')}</Text>
              <Text style={styles.commentEmptyDesc}>{t('post_no_comments_desc')}</Text>
            </View>
          ) : (
            (() => {
              const PREVIEW_COUNT = 3;
              const REPLY_PREVIEW = 2;
              const rootCommentsUnsorted = postComments.filter((c) => !c.parentId);
              const rootComments = [...rootCommentsUnsorted].sort((a, b) => {
                const aReplies = postComments.filter((r) => r.parentId === a.id).length;
                const bReplies = postComments.filter((r) => r.parentId === b.id).length;
                switch (commentSort) {
                  case 'popular':
                    return (b.likeCount + bReplies) - (a.likeCount + aReplies);
                  case 'latest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  case 'likes':
                    return b.likeCount - a.likeCount;
                  case 'comments':
                    return bReplies - aReplies;
                }
              });
              const visibleRoots = commentsExpanded ? rootComments : rootComments.slice(0, PREVIEW_COUNT);
              const hiddenCount = rootComments.length - PREVIEW_COUNT;
              return (
                <>
                  {visibleRoots.map((c) => {
                    const replies = postComments.filter((r) => r.parentId === c.id);
                    const repliesExpanded = expandedReplies.has(c.id);
                    const visibleReplies = repliesExpanded ? replies : replies.slice(0, REPLY_PREVIEW);
                    const hiddenReplies = replies.length - REPLY_PREVIEW;
                    const cLiked = isCommentLiked(c.id);
                    const isOwn = user?.id === c.userId;
                    return (
                      <View key={c.id}>
                        <View style={styles.commentItem}>
                          <View style={styles.commentAvatar}>
                            <Ionicons name="person" size={14} color={colors.textSecondary} />
                          </View>
                          <View style={styles.commentContent}>
                            {c.isDeleted ? (
                              <Text style={styles.commentDeletedText}>{t('post_comment_deleted')}</Text>
                            ) : (
                              <>
                                <View style={styles.commentHeader}>
                                  <Text style={styles.commentUserName}>{c.userName}</Text>
                                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                                </View>
                                <Text style={styles.commentText}>{c.text}</Text>
                                <View style={styles.commentActions}>
                                  <TouchableOpacity
                                    style={styles.commentActionBtn}
                                    activeOpacity={0.7}
                                    onPress={() => { if (requireLogin()) { hapticMedium(); toggleCommentLike(c.id); } }}
                                  >
                                    <Ionicons name={cLiked ? 'heart' : 'heart-outline'} size={13} color={cLiked ? colors.error : colors.textTertiary} />
                                    {c.likeCount > 0 && <Text style={[styles.commentActionText, cLiked && { color: colors.error }]}>{c.likeCount}</Text>}
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.commentActionBtn}
                                    activeOpacity={0.7}
                                    onPress={() => setReplyTo({ id: c.id, userName: c.userName })}
                                  >
                                    <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
                                    <Text style={styles.commentActionText}>{t('post_reply')}</Text>
                                  </TouchableOpacity>
                                  {isOwn && (
                                    <TouchableOpacity
                                      style={styles.commentActionBtn}
                                      activeOpacity={0.7}
                                      onPress={() => handleDeleteComment(c.id)}
                                    >
                                      <Ionicons name="trash-outline" size={13} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </>
                            )}
                          </View>
                        </View>
                        {/* Replies */}
                        {visibleReplies.map((r) => {
                          const rLiked = isCommentLiked(r.id);
                          const rIsOwn = user?.id === r.userId;
                          return (
                            <View key={r.id} style={styles.replyItem}>
                              <View style={styles.commentAvatarSmall}>
                                <Ionicons name="person" size={11} color={colors.textTertiary} />
                              </View>
                              <View style={styles.commentContent}>
                                {r.isDeleted ? (
                                  <Text style={styles.commentDeletedText}>{t('post_comment_deleted')}</Text>
                                ) : (
                                  <>
                                    <View style={styles.commentHeader}>
                                      <Text style={styles.commentUserName}>{r.userName}</Text>
                                      <Text style={styles.commentTime}>{timeAgo(r.createdAt)}</Text>
                                    </View>
                                    <Text style={styles.commentText}>{r.text}</Text>
                                    <View style={styles.commentActions}>
                                      <TouchableOpacity
                                        style={styles.commentActionBtn}
                                        activeOpacity={0.7}
                                        onPress={() => { if (requireLogin()) { hapticMedium(); toggleCommentLike(r.id); } }}
                                      >
                                        <Ionicons name={rLiked ? 'heart' : 'heart-outline'} size={13} color={rLiked ? colors.error : colors.textTertiary} />
                                        {r.likeCount > 0 && <Text style={[styles.commentActionText, rLiked && { color: colors.error }]}>{r.likeCount}</Text>}
                                      </TouchableOpacity>
                                      {rIsOwn && (
                                        <TouchableOpacity
                                          style={styles.commentActionBtn}
                                          activeOpacity={0.7}
                                          onPress={() => handleDeleteComment(r.id)}
                                        >
                                          <Ionicons name="trash-outline" size={13} color={colors.textTertiary} />
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  </>
                                )}
                              </View>
                            </View>
                          );
                        })}
                        {/* Show more replies */}
                        {!repliesExpanded && hiddenReplies > 0 && (
                          <TouchableOpacity
                            style={styles.showMoreRepliesBtn}
                            activeOpacity={0.7}
                            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedReplies((prev) => new Set(prev).add(c.id)); }}
                          >
                            <View style={styles.showMoreRepliesLine} />
                            <Text style={styles.showMoreText}>
                              {t('post_show_more_replies', { count: hiddenReplies })}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  {/* Show all comments button */}
                  {!commentsExpanded && hiddenCount > 0 && (
                    <TouchableOpacity
                      style={styles.showAllCommentsBtn}
                      activeOpacity={0.7}
                      onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCommentsExpanded(true); }}
                    >
                      <Text style={styles.showAllCommentsText}>
                        {t('post_show_all_comments', { count: rootComments.length })}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              );
            })()
          )}
        </View>
      </ScrollView>

      {/* Reaction dismiss overlay */}
      {showReactions && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setShowReactions(false)}
        />
      )}

      {/* ─── Bottom Bar: Actions + Comment Input ─── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.bottomBarWrap}
      >
        {replyTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              {t('post_replying_to', { name: replyTo.userName })}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {/* Like + Reaction popup */}
          <View style={{ position: 'relative' }}>
            {/* Reaction popup */}
            {showReactions && (
              <View style={styles.reactionPopup}>
                {REACTIONS.map((emoji, i) => (
                  <Animated.View key={emoji} style={{ transform: [{ scale: reactionScales[i] }] }}>
                    <TouchableOpacity
                      onPress={() => pickReaction(emoji)}
                      style={styles.reactionBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute', top: -10, left: 0, right: 0,
                alignItems: 'center', zIndex: 10,
                transform: [{ translateY: heartFloat }],
                opacity: heartOpacity,
              }}
            >
              <Ionicons name="heart" size={22} color={colors.error} />
            </Animated.View>
            <TouchableOpacity
              style={[styles.actionBtn, liked && styles.actionBtnActive]}
              activeOpacity={0.85}
              onPress={handleLike}
              onLongPress={openReactions}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#FFF' : colors.primary} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Comment Input */}
          <TextInput
            style={styles.commentInput}
            placeholder={replyTo ? t('post_reply_placeholder') : t('post_comment_placeholder')}
            placeholderTextColor={colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity
            style={[styles.commentSendBtn, !commentText.trim() && { opacity: 0.4 }]}
            activeOpacity={0.7}
            onPress={handleSendComment}
            disabled={!commentText.trim()}
          >
            <Ionicons name="send" size={16} color={colors.buttonPrimaryText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ─── Report Sheet ─── */}
      <ReportSheet
        visible={showReportSheet}
        targetId={postId}
        targetType="post"
        onClose={() => setShowReportSheet(false)}
      />

      {/* ─── Fullscreen Modal ─── */}
      <Modal
        visible={fullscreenVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <View style={styles.fullscreenBackdrop}>
          <TouchableOpacity style={[styles.fullscreenClose, { top: insets.top + 12 }]} onPress={() => setFullscreenVisible(false)} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <FlatList
            data={gallery}
            keyExtractor={(_, i) => `fs-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={activeIdx}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              scrollToIdx(idx);
            }}
            renderItem={({ item }) => (
              <View style={styles.fullscreenSlide}>
                {item.kind === 'video' ? (
                  <VideoPlayer uri={item.uri} mode="detail" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
                ) : (
                  <ScrollView
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.zoomContainer}
                    bouncesZoom
                  >
                    <Image source={{ uri: item.uri }} style={styles.fullscreenImage} />
                  </ScrollView>
                )}
              </View>
            )}
          />
          {gallery.length > 1 && (
            <View style={styles.fullscreenCounter}>
              <Text style={styles.fullscreenCounterText}>
                {activeIdx + 1} / {gallery.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },

  // ─── Floating Header ───
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: radius.xl,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 2,
  },

  // ─── Hero Image ───
  heroWrap: {
    width: SCREEN_WIDTH,
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
  },
  heroSlide: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  heroImage: {
    width: '100%', height: '100%', resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
  },
  bigHeartOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── Gallery Counter ───
  galleryCounter: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.round,
    marginTop: -12,
    marginBottom: 12,
  },
  galleryCounterText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // ─── Thumbnails ───
  thumbnailRow: {
    flexDirection: 'row',
    paddingHorizontal: PADDING,
    gap: 10,
    marginBottom: 16,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%', height: '100%', resizeMode: 'cover',
  },
  thumbVideoOverlay: {
    position: 'absolute', bottom: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── Engagement Stats ───
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  engagementText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  engagementDate: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body,
    color: colors.textTertiary,
    marginLeft: 'auto',
  },

  // ─── Content Area (unified) ───
  contentArea: {
    paddingHorizontal: PADDING,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  postTitle: {
    fontSize: fontSize.sectionTitle, fontWeight: fontWeight.heading,
    color: colors.textPrimary, marginBottom: 6, lineHeight: 26,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 10,
  },
  teamChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.round,
  },
  teamChipText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name,
    color: colors.primary,
  },
  playerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.round,
  },
  playerDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.primary,
  },
  playerChipText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },

  // Photographer row
  photographerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photographerAvatar: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.primaryAlpha8,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  photographerAvatarImg: {
    width: 36, height: 36, borderRadius: radius.button,
  },
  photographerInfo: {
    flex: 1, gap: 2,
  },
  photographerNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  photographerName: {
    fontSize: fontSize.body, fontWeight: fontWeight.name,
    color: colors.primary,
  },
  photographerSubtext: {
    fontSize: fontSize.micro, fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },

  // Specs
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  specItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    paddingVertical: 10,
    gap: 6,
  },
  specValue: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },

  // Description
  descriptionText: {
    fontSize: fontSize.body, fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },

  // ─── Bottom Bar (actions + comment input) ───
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: PADDING,
    paddingTop: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: 'transparent',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // ─── Fullscreen Modal ───
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'contain',
  },
  zoomContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.round,
  },
  fullscreenCounterText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // ─── Comments ───
  commentDividerThick: {
    height: 6,
    backgroundColor: colors.surface,
    marginHorizontal: -PADDING,
    marginTop: 16,
    marginBottom: 16,
  },
  commentSortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  commentSectionTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  commentSortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  commentSortBtnText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  commentSortDropdown: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  commentSortDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentSortDropdownItemActive: {
    backgroundColor: colors.primaryAlpha8,
  },
  commentSortDropdownText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
  },
  commentSortDropdownTextActive: {
    fontWeight: fontWeight.heading,
    color: colors.primary,
  },
  commentEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  commentEmptyTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  commentEmptyDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryAlpha8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  commentUserName: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  commentText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  commentDeletedText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  commentActionText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  replyItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginLeft: 42,
  },
  commentAvatarSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingVertical: 8,
    backgroundColor: colors.primaryAlpha3,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyIndicatorText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },

  // ─── Show More ───
  showMoreRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 52,
    paddingVertical: 8,
    gap: 8,
  },
  showMoreRepliesLine: {
    width: 24,
    height: 1,
    backgroundColor: colors.textTertiary,
  },
  showMoreText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  showAllCommentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  showAllCommentsText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },

  // ─── Comment Input ───
  commentInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    paddingHorizontal: 14,
    fontSize: fontSize.meta,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Reaction Popup (#16) ───
  reactionPopup: {
    position: 'absolute',
    bottom: 50,
    left: -20,
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.round,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  reactionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 20,
  },
});
