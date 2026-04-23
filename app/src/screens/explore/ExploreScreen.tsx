import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { KBO_TEAMS } from '../../constants/teams';
import { useAuth } from '../../contexts/AuthContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCount } from '../../utils/time';
import TeamFilterBar from '../../components/common/TeamFilterBar';
import VideoPlayer from '../../components/common/VideoPlayer';
import type { PhotoPost } from '../../types/photographer';
import type { RootStackParamList, MainTabParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius, layout, shadow, spacing } from '../../styles/theme';
import { ExploreSkeleton } from '../../components/common/Skeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const HOT_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

type CategoryTab = 'hot' | 'today' | 'best' | 'review';

const CATEGORY_TABS: { id: CategoryTab; emoji: string; labelKey: string }[] = [
  { id: 'hot', emoji: '\uD83D\uDD25', labelKey: 'explore_hot_play' },
  { id: 'today', emoji: '\uD83D\uDCF7', labelKey: 'explore_today_photo' },
  { id: 'best', emoji: '\uD83C\uDFC6', labelKey: 'explore_best_scenes' },
  { id: 'review', emoji: '\uD83C\uDFDF\uFE0F', labelKey: 'explore_game_review' },
];

export default function ExploreScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MainTabParamList, 'Explore'>>();
  const { user } = useAuth();
  const { photoPosts, players, cheerleaders } = usePhotographer();
  const { unreadCount: notifUnread } = useNotification();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    route.params?.teamId ?? null,
  );
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('hot');
  const [visibleCount, setVisibleCount] = useState(20);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  /* ── Filtered & sorted posts ── */
  const allFilteredPosts = useMemo(() => {
    let filtered = selectedTeamId
      ? photoPosts.filter((p) => p.team_id === selectedTeamId)
      : photoPosts;

    // Category-based sorting: hot/best → popular, today/review → latest
    if (activeCategory === 'hot' || activeCategory === 'best') {
      filtered = [...filtered].sort((a, b) => b.like_count - a.like_count);
    } else {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return filtered;
  }, [activeCategory, selectedTeamId, photoPosts]);

  const hotPosts = allFilteredPosts.slice(0, 2);
  const listPosts = allFilteredPosts.slice(2, visibleCount);
  const hasMore = visibleCount < allFilteredPosts.length;

  /* ── Trending players (top 5 by post likes) ── */
  const trendingPlayers = useMemo(() => {
    const playerLikes: Record<string, number> = {};
    photoPosts.forEach((p) => {
      if (p.player_id) {
        playerLikes[p.player_id] = (playerLikes[p.player_id] ?? 0) + p.like_count;
      }
    });
    return Object.entries(playerLikes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([playerId, likes], idx) => {
        const player = players.find((pl) => pl.id === playerId);
        const team = player ? KBO_TEAMS.find((t) => t.id === player.team_id) : null;
        const trendPct = [12, 8, 6, 5, 3][idx] ?? 3;
        return { player, team, likes, trendPct };
      })
      .filter((item) => item.player != null);
  }, [photoPosts, players]);

  const handleSelectTeam = useCallback((teamId: string | null) => {
    setSelectedTeamId(teamId);
    setVisibleCount(20);
  }, []);

  /* ── Render: HOT card (2-col) ── */
  const renderHotCard = (post: PhotoPost) => {
    const td = KBO_TEAMS.find((t) => t.id === post.team_id);
    // IN-09: video-first fallback — thumbnail → images[0] → studio-mode VideoPlayer (first frame) → grey placeholder.
    // ExploreScreen 은 FlatList 가 아니라 ScrollView 기반이라 viewport autoplay 없음 (studio mode).
    const previewUri = post.thumbnail_urls?.[0] ?? post.images[0];
    const hasVideo = (post.videos?.length ?? 0) > 0;
    const videoUri = post.videos?.[0];
    return (
      <TouchableOpacity
        key={post.id}
        style={styles.hotCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
      >
        <View style={styles.hotImageWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.hotImage} />
          ) : hasVideo && videoUri ? (
            <VideoPlayer
              uri={videoUri}
              mode="studio"
              width={HOT_CARD_WIDTH}
              height={(HOT_CARD_WIDTH * 4) / 3}
            />
          ) : (
            <View style={[styles.hotImage, { backgroundColor: colors.surface }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            locations={[0.3, 1]}
            style={styles.hotGradient}
          />
          {/* Team badge */}
          {td && (
            <View style={[styles.teamBadge, { backgroundColor: td.color }]}>
              <Text style={styles.teamBadgeText}>{td.shortName}</Text>
            </View>
          )}
          {/* HOT badge */}
          <View style={styles.hotBadge}>
            <Text style={styles.hotBadgeEmoji}>{'\uD83D\uDD25'}</Text>
            <Text style={styles.hotBadgeText}>HOT</Text>
          </View>
          {hasVideo && (
            <View style={styles.hotVideoBadge}>
              <Ionicons name="play" size={12} color="#FFFFFF" />
            </View>
          )}
          {/* Bottom info */}
          <View style={styles.hotBottomInfo}>
            <Text style={styles.hotPhotographer} numberOfLines={1}>
              @{post.photographer.display_name}
              {post.player ? ` \u00B7 #${post.player.name_ko}` : ''}
            </Text>
            <Text style={styles.hotTitle} numberOfLines={1}>{post.title}</Text>
            <View style={styles.hotMeta}>
              <Ionicons name="heart" size={12} color={colors.error} />
              <Text style={styles.hotMetaText}>{formatCount(post.like_count)}</Text>
              <Ionicons name="eye" size={12} color="rgba(255,255,255,0.6)" style={{ marginLeft: 8 }} />
              <Text style={styles.hotMetaText}>{formatCount(post.view_count)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ── Render: List item ── */
  const renderListItem = (post: PhotoPost) => {
    const td = KBO_TEAMS.find((t) => t.id === post.team_id);
    // IN-09: video-first fallback for list thumbnail — ScrollView 내부 (no viewport autoplay).
    const previewUri = post.thumbnail_urls?.[0] ?? post.images[0];
    const hasVideo = (post.videos?.length ?? 0) > 0;
    const videoUri = post.videos?.[0];
    return (
      <TouchableOpacity
        key={post.id}
        style={styles.listItem}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
      >
        <View style={styles.listThumbWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.listThumb} />
          ) : hasVideo && videoUri ? (
            <VideoPlayer
              uri={videoUri}
              mode="studio"
              width={100}
              height={80}
            />
          ) : (
            <View style={[styles.listThumb, { backgroundColor: colors.surface }]} />
          )}
          {td && (
            <View style={[styles.listTeamBadge, { backgroundColor: td.color }]}>
              <Text style={styles.listTeamBadgeText}>{td.shortName}</Text>
            </View>
          )}
          {hasVideo && (
            <View style={styles.listVideoBadge}>
              <Ionicons name="play" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listSubtext} numberOfLines={1}>
            @{post.photographer.display_name}
            {post.player ? ` \u00B7 #${post.player.name_ko}` : ''}
          </Text>
          <Text style={styles.listTitle} numberOfLines={1}>{post.title}</Text>
          <View style={styles.listMeta}>
            <Ionicons name="heart" size={12} color={colors.error} />
            <Text style={styles.listMetaText}>{formatCount(post.like_count)}</Text>
            <Ionicons name="eye" size={12} color={colors.textTertiary} style={{ marginLeft: 8 }} />
            <Text style={styles.listMetaText}>{formatCount(post.view_count)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!ready) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ExploreSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('explore_title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            {notifUnread > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifUnread > 99 ? '99+' : notifUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Team Filter ─── */}
        <View style={styles.filterSection}>
          <TeamFilterBar
            selectedTeamId={selectedTeamId}
            onSelect={handleSelectTeam}
            showAll
            myTeamId={user?.my_team_id}
          />
        </View>

        {/* ─── Category Tabs ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.categoryTab, active && styles.categoryTabActive]}
                onPress={() => { setActiveCategory(tab.id); setVisibleCount(20); }}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryEmoji}>{tab.emoji}</Text>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Trending Players ─── */}
        {trendingPlayers.length > 0 && (
          <View style={styles.trendingSection}>
            <View style={styles.trendingHeader}>
              <Text style={styles.trendingTitle}>
                {'\uD83D\uDD25'} {t('explore_trending_players')}
              </Text>
              <Text style={styles.trendingRealtime}>{t('explore_realtime')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingScroll}
            >
              {trendingPlayers.map((item) => (
                <TouchableOpacity
                  key={item.player!.id}
                  style={styles.trendingCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PlayerDetail', { playerId: item.player!.id })}
                >
                  <View style={[styles.trendingTeamCircle, { backgroundColor: item.team?.color ?? colors.primary }]}>
                    <Text style={styles.trendingTeamText}>
                      {item.team?.shortName ?? ''}
                    </Text>
                  </View>
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingPlayerName}>{item.player!.name_ko}</Text>
                    <Text style={styles.trendingPct}>
                      {'\uD83D\uDCC8'} +{item.trendPct}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Cheerleaders ─── */}
        <View style={styles.cheerSection}>
          <View style={styles.cheerHeader}>
            <Text style={styles.cheerSectionTitle}>💃 {t('cheerleader_title')}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('CheerleadersAll')}>
              <Text style={styles.cheerViewAll}>{t('home_view_all')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cheerScroll}
          >
            {cheerleaders.map((cl) => {
              const team = KBO_TEAMS.find((t) => t.id === cl.team_id);
              return (
                <TouchableOpacity
                  key={cl.id}
                  style={styles.cheerCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CheerleaderProfile', { cheerleaderId: cl.id })}
                >
                  <View style={styles.cheerInfo}>
                    <Text style={styles.cheerName} numberOfLines={1}>{cl.name_ko}</Text>
                    {team && (
                      <View style={[styles.cheerTeamBadge, { borderColor: team.color }]}>
                        <Text style={[styles.cheerTeamText, { color: team.color }]}>{team.shortName}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Content ─── */}
        {allFilteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={40} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>{t('explore_empty')}</Text>
            <Text style={styles.emptyDesc}>{t('explore_empty_desc')}</Text>
            {selectedTeamId && (
              <TouchableOpacity
                style={styles.emptyCta}
                activeOpacity={0.7}
                onPress={() => handleSelectTeam(null)}
              >
                <Text style={styles.emptyCtaText}>{t('explore_empty_cta')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* HOT cards (top 2) */}
            <View style={styles.hotGrid}>
              {hotPosts.map(renderHotCard)}
            </View>

            {/* List items (remaining) */}
            <View style={styles.listSection}>
              {listPosts.map(renderListItem)}
            </View>

            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                activeOpacity={0.8}
                onPress={() => setVisibleCount((prev) => prev + 20)}
              >
                <Text style={styles.loadMoreText}>
                  {t('explore_load_more')} ({t('explore_remaining', { count: allFilteredPosts.length - visibleCount })})
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ─── Header ───
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: fontSize.micro2, fontWeight: fontWeight.name, color: colors.buttonPrimaryText, lineHeight: 12 },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: layout.tabBarHeight + 20 },

  // ─── Team Filter ───
  filterSection: {
  },

  // ─── Category Tabs ───
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  categoryTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  categoryTabActive: {
    backgroundColor: colors.activeLight,
    borderColor: colors.activeBorder,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  categoryLabelActive: {
    color: colors.textPrimary,
  },

  // ─── Trending Players ───
  trendingSection: {
    paddingBottom: spacing.lg,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: 10,
  },
  trendingTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  trendingRealtime: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  trendingScroll: {
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  trendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 150,
    ...shadow.card,
  },
  trendingTeamCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingTeamText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.heading,
    color: '#FFFFFF',
  },
  trendingInfo: {
    gap: 2,
  },
  trendingPlayerName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  trendingPct: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.error,
  },

  // ─── Cheerleaders ───
  cheerSection: {
    paddingBottom: spacing.lg,
  },
  cheerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 10,
  },
  cheerViewAll: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.primary,
  },
  cheerSectionTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  cheerScroll: {
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  cheerCard: {
    width: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cheerInfo: {
    padding: 10,
    gap: 3,
  },
  cheerName: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  cheerDesc: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cheerTeamBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  cheerTeamText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
  },

  // ─── HOT Cards (2-col) ───
  hotGrid: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
    marginBottom: spacing.sm,
  },
  hotCard: {
    width: HOT_CARD_WIDTH,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.elevated,
  },
  hotImageWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
  },
  hotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  hotGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  teamBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  teamBadgeText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.heading,
    color: '#FFFFFF',
  },
  hotBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,100,50,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  hotBadgeEmoji: {
    fontSize: 10,
  },
  hotBadgeText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.heading,
    color: '#FFFFFF',
  },
  hotVideoBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotBottomInfo: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    right: 10,
  },
  hotPhotographer: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 2,
  },
  hotTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  hotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hotMetaText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: 'rgba(255,255,255,0.8)',
  },

  // ─── List Items ───
  listSection: {
    paddingHorizontal: GRID_PADDING,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 14,
  },
  listThumbWrap: {
    width: 100,
    height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  listThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listTeamBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listTeamBadgeText: {
    fontSize: fontSize.micro2,
    fontWeight: fontWeight.heading,
    color: '#FFFFFF',
  },
  listVideoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
    gap: 3,
  },
  listSubtext: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  listTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  listMetaText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.error,
  },

  // ─── Empty State ───
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  emptyCta: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
  },
  emptyCtaText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },

  // ─── Load More ───
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginHorizontal: GRID_PADDING,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
});
