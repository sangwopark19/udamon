import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import * as photographerApi from '../../services/photographerApi';
import GradeBadge from '../../components/photographer/GradeBadge';
import VideoPlayer from '../../components/common/VideoPlayer';
import type { RootStackParamList } from '../../types/navigation';
import type { Photographer, PhotoPost } from '../../types/photographer';
import type { PhotographerApplication } from '../../types/photographerApplication';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';
import { formatCount } from '../../utils/time';
import { determineStudioState, type StudioState } from './studioState';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type StudioRoute = RouteProp<RootStackParamList, 'Studio'>;

type SortMode = 'popular' | 'latest' | 'likes' | 'comments';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PAD = 16;
const GRID_GAP = 12;
const GRID_COLS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PAD * 2 - GRID_GAP) / GRID_COLS;

// ─── Screen ─────────────────────────────────────────────────────
export default function StudioScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<StudioRoute>();
  const { user } = useAuth();
  const {
    getPhotographer,
    getPhotoPostsByPhotographer,
    myApplication,
    applicationLoading,
    refreshMyApplication,
  } = usePhotographer();

  // route.params.photographerId — 다른 포토그래퍼의 스튜디오를 조회할 때 사용 (옵셔널)
  const overridePhotographerId = route.params?.photographerId;

  const [state, setState] = useState<StudioState>({ kind: 'loading' });

  // refreshMyApplication 은 후속 pull-to-refresh 등에서 사용 예정 — 현재 경로에서는 호출 안함.
  // 읽기만 해두면 unused warning 없이 향후 확장 가능.
  void refreshMyApplication;

  // override 경로: 다른 포토그래퍼의 스튜디오를 조회할 때 state machine 우회
  useEffect(() => {
    if (!overridePhotographerId) return;
    const pg = getPhotographer(overridePhotographerId);
    setState(pg ? { kind: 'approved', photographer: pg } : { kind: 'no_application' });
  }, [overridePhotographerId, getPhotographer]);

  // 본인 스튜디오 경로: Context 의 myApplication 구독 (중복 fetch 제거)
  useEffect(() => {
    if (overridePhotographerId) return;
    if (!user?.id) {
      setState({ kind: 'no_application' });
      return;
    }
    if (applicationLoading) {
      setState({ kind: 'loading' });
      return;
    }

    let cancelled = false;
    (async () => {
      // approved 상태만 photographer row 조회 필요 (Context 에 없는 추가 데이터)
      const photographerResult =
        myApplication?.status === 'approved'
          ? await photographerApi.fetchPhotographerByUserId(user.id)
          : null;
      if (cancelled) return;
      setState(
        determineStudioState({
          appResult: { data: myApplication, error: null },
          photographerResult,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // WR-03: myApplication 은 refresh 시마다 새 참조로 교체되므로 원시 status 만 구독.
    // approved 분기에 필요한 단일 정보는 status 이며, 동일한 status 값 재방출에서는
    // 불필요한 fetchPhotographerByUserId 호출이 발생하지 않도록 한다.
  }, [user?.id, overridePhotographerId, myApplication?.status, applicationLoading]);

  const handleSignupCta = useCallback(() => {
    navigation.navigate('PhotographerRegister');
  }, [navigation]);

  if (state.kind === 'loading') {
    return <StudioLoading insets={insets} />;
  }
  if (state.kind === 'no_application') {
    return (
      <StudioEmptyHero
        insets={insets}
        iconName="camera-outline"
        iconColor={colors.textTertiary}
        iconSize={48}
        title={t('studio_signup_desc')}
        desc={t('studio_signup_desc')}
        ctaLabel={t('studio_signup_cta')}
        onCta={handleSignupCta}
      />
    );
  }
  if (state.kind === 'pending') {
    return (
      <StudioEmptyHero
        insets={insets}
        iconName="time-outline"
        iconColor={colors.warning}
        iconSize={64}
        title={t('studio_pending_title')}
        desc={t('studio_pending_desc')}
        infoHint={t('studio_pending_notification_hint')}
      />
    );
  }
  if (state.kind === 'rejected') {
    return (
      <StudioRejectedHero
        insets={insets}
        application={state.application}
        onReapply={handleSignupCta}
      />
    );
  }
  // approved
  return (
    <StudioApprovedLayout
      insets={insets}
      photographer={state.photographer}
      getPhotoPostsByPhotographer={getPhotoPostsByPhotographer}
      navigation={navigation}
    />
  );
}

// ─── Loading ────────────────────────────────────────────────────
interface LoadingProps {
  insets: EdgeInsets;
}
function StudioLoading({ insets }: LoadingProps) {
  return (
    <View style={[styles.screen, styles.centerFlex, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

// ─── Empty Hero (no_application / pending) ─────────────────────
interface EmptyHeroProps {
  insets: EdgeInsets;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconSize: number;
  title: string;
  desc: string;
  ctaLabel?: string;
  onCta?: () => void;
  infoHint?: string;
}
function StudioEmptyHero({
  insets,
  iconName,
  iconColor,
  iconSize,
  title,
  desc,
  ctaLabel,
  onCta,
  infoHint,
}: EmptyHeroProps) {
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.heroContent}>
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroDesc}>{desc}</Text>
        {infoHint && (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.hintText}>{infoHint}</Text>
          </View>
        )}
        {ctaLabel && onCta && (
          <TouchableOpacity style={styles.primaryCta} activeOpacity={0.7} onPress={onCta}>
            <Text style={styles.primaryCtaLabel}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Rejected Hero ─────────────────────────────────────────────
interface RejectedHeroProps {
  insets: EdgeInsets;
  application: PhotographerApplication;
  onReapply: () => void;
}
function StudioRejectedHero({ insets, application, onReapply }: RejectedHeroProps) {
  const { t } = useTranslation();
  const reason = application.rejection_reason ?? t('studio_rejected_default_reason');
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.heroContent}>
        <Ionicons name="close-circle" size={64} color={colors.error} />
        <Text style={styles.heroTitle}>{t('studio_rejected_title')}</Text>
        <View style={styles.rejectionCard}>
          <Text style={styles.rejectionLabel}>{t('studio_rejected_reason_label')}</Text>
          <Text style={styles.rejectionBody}>{reason}</Text>
        </View>
        <TouchableOpacity style={styles.primaryCta} activeOpacity={0.7} onPress={onReapply}>
          <Text style={styles.primaryCtaLabel}>{t('pg_register_reapply')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Approved Layout (existing Studio UI + GradeBadge) ────────
interface ApprovedProps {
  insets: EdgeInsets;
  photographer: Photographer;
  getPhotoPostsByPhotographer: (pgId: string) => PhotoPost[];
  navigation: Nav;
}
function StudioApprovedLayout({
  insets,
  photographer,
  getPhotoPostsByPhotographer,
  navigation,
}: ApprovedProps) {
  const { t } = useTranslation();
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [showDropdown, setShowDropdown] = useState(false);

  const rawPosts = useMemo(
    () => getPhotoPostsByPhotographer(photographer.id),
    [photographer.id, getPhotoPostsByPhotographer],
  );
  const posts = useMemo(() => {
    const copy = [...rawPosts];
    switch (sortMode) {
      case 'popular':
        return copy.sort(
          (a, b) => b.like_count + b.comment_count - (a.like_count + a.comment_count),
        );
      case 'latest':
        return copy.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      case 'likes':
        return copy.sort((a, b) => b.like_count - a.like_count);
      case 'comments':
        return copy.sort((a, b) => b.comment_count - a.comment_count);
    }
  }, [rawPosts, sortMode]);
  const pendingCount = useMemo(
    () => rawPosts.filter((p) => p.status === 'pending').length,
    [rawPosts],
  );

  const SORT_LABELS: Record<SortMode, string> = {
    popular: t('home_sort_popular'),
    latest: t('home_sort_latest'),
    likes: t('home_sort_likes'),
    comments: t('home_sort_comments'),
  };

  const stats = [
    { label: t('studio_posts'), value: photographer.post_count, icon: 'grid-outline' as const },
    {
      label: t('studio_likes'),
      value: posts.reduce((s, p) => s + p.like_count, 0),
      icon: 'heart-outline' as const,
    },
    {
      label: t('studio_views'),
      value: posts.reduce((s, p) => s + p.view_count, 0),
      icon: 'eye-outline' as const,
    },
    {
      label: t('studio_followers'),
      value: photographer.follower_count,
      icon: 'people-outline' as const,
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backBtn}
          accessibilityLabel={t('a11y_back')}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('studio_title')}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('UploadPost')}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={colors.buttonPrimaryText} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Grade strip (UI-SPEC §State C) */}
        <View style={styles.topStrip}>
          <GradeBadge grade={photographer.grade} variant="icon-label" size="sm" />
          <Text style={styles.stripDisplayName} numberOfLines={1}>
            {photographer.display_name}
          </Text>
          {photographer.is_verified && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.verified}
              style={{ marginLeft: spacing.sm }}
            />
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={colors.primary} />
              <Text style={styles.statValue}>{formatCount(s.value)}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Pending badge */}
        {pendingCount > 0 && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={styles.pendingBannerText}>
              {t('post_status_pending')} {pendingCount}건
            </Text>
          </View>
        )}

        {/* All Posts Grid */}
        <View style={styles.allPostsHeader}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {t('studio_all_posts', { count: posts.length })}
          </Text>
          <TouchableOpacity
            style={styles.sortBtn}
            activeOpacity={0.7}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.sortBtnText}>{SORT_LABELS[sortMode]}</Text>
            <Ionicons
              name={showDropdown ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
        {showDropdown && (
          <View style={styles.dropdown}>
            {(['popular', 'latest', 'likes', 'comments'] as SortMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.dropdownItem, sortMode === mode && styles.dropdownItemActive]}
                onPress={() => {
                  setSortMode(mode);
                  setShowDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.dropdownText, sortMode === mode && styles.dropdownTextActive]}
                >
                  {SORT_LABELS[mode]}
                </Text>
                {sortMode === mode && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        {posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('empty_no_posts')}</Text>
          </View>
        ) : (
          <View style={styles.postGrid}>
            {posts.map((post) => {
              const previewUrl = post.thumbnail_urls?.[0] ?? post.images[0];
              const hasVideo = (post.videos?.length ?? 0) > 0;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  <View style={styles.postImageWrap}>
                    {previewUrl ? (
                      <Image source={{ uri: previewUrl }} style={styles.postCardImage} />
                    ) : hasVideo && post.videos[0] ? (
                      // Plan 04-10 Sub-issue B: 영상-only 포스트 fallback — expo-video native poster (첫 프레임). studio mode = autoplay 없음, nativeControls 없음.
                      <VideoPlayer
                        uri={post.videos[0]}
                        mode="studio"
                        width={CARD_WIDTH}
                        height={(CARD_WIDTH * 5) / 4}
                      />
                    ) : (
                      <View style={[styles.postCardImage, { backgroundColor: colors.surface }]} />
                    )}
                    {hasVideo && (
                      <View style={styles.videoPlayOverlay}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                      </View>
                    )}
                    {post.is_featured && (
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>✨</Text>
                      </View>
                    )}
                    {post.status === 'pending' && (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time-outline" size={10} color="#fff" />
                        <Text style={styles.pendingBadgeText}>{t('post_status_pending')}</Text>
                      </View>
                    )}
                    <View style={styles.postOverlay}>
                      <View style={styles.postLikeRow}>
                        <Ionicons name="heart" size={10} color={colors.error} />
                        <Text style={styles.postLikeText}>{formatCount(post.like_count)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.postInfo}>
                    <Text style={styles.postTitle} numberOfLines={2}>
                      {post.title}
                    </Text>
                    <View style={styles.postMeta}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={10}
                        color={colors.textTertiary}
                      />
                      <Text style={styles.postMetaText}>{post.comment_count}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerFlex: { justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 16 },

  // Top strip (approved state — GradeBadge + display_name + verified)
  topStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stripDisplayName: {
    marginLeft: spacing.sm,
    flex: 1,
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },

  // Hero layout (no_application / pending / rejected)
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: spacing.xxl,
    gap: 16,
  },
  heroTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  heroDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginTop: -4,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: spacing.md,
  },
  hintText: {
    flex: 1,
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  primaryCta: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  primaryCtaLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.buttonPrimaryText,
  },

  // Rejected card
  rejectionCard: {
    width: '100%',
    backgroundColor: colors.errorAlpha10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
    gap: 8,
    marginTop: spacing.md,
  },
  rejectionLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.error,
  },
  rejectionBody: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    gap: 4,
  },
  statValue: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },

  // Section
  sectionTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 12,
  },

  // All Posts Header + Sort
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  pendingBannerText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.warning,
  },
  allPostsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortBtnText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  dropdown: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemActive: { backgroundColor: colors.primaryAlpha8 },
  dropdownText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
  },
  dropdownTextActive: { fontWeight: fontWeight.heading, color: colors.primary },

  // Post Grid (2xN)
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  postCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  postImageWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  postCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  postLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  postLikeText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: '#FFF',
  },
  postInfo: {
    padding: 10,
  },
  postTitle: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postMetaText: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  featuredBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadgeText: {
    fontSize: 12,
  },
  pendingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,158,11,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.name,
    color: '#fff',
  },
  videoPlayOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
});
