import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Share,
  StyleSheet,
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
import { usePhotographer } from '../../contexts/PhotographerContext';
import type { PhotoPost } from '../../types/photographer';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TeamDetail'>;
type TabKey = 'photos' | 'players';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 2;
const BIG_SIZE = (SCREEN_W - 32 - GRID_GAP) * 0.6;
const SMALL_SIZE = (BIG_SIZE - GRID_GAP) / 2;
const LATEST_COLS = 2;
const LATEST_GAP = 8;
const LATEST_ITEM_W = (SCREEN_W - 32 - LATEST_GAP) / LATEST_COLS;
const PAGE_SIZE = 20;

type ViewAllMode = null | 'popular' | 'latest';

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent)));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function TeamDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { teamId } = route.params;

  const team = KBO_TEAMS.find((tm) => tm.id === teamId);
  const { getPlayersByTeam, getPhotoPostsByTeam } = usePhotographer();
  const players = getPlayersByTeam(teamId);
  const photoPosts = getPhotoPostsByTeam(teamId);

  const [activeTab, setActiveTab] = useState<TabKey>('photos');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [viewAllMode, setViewAllMode] = useState<ViewAllMode>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const popularPosts = useMemo(
    () => [...photoPosts].sort((a, b) => b.like_count - a.like_count),
    [photoPosts],
  );
  const latestPosts = useMemo(
    () => [...photoPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [photoPosts],
  );

  const popularPreview = useMemo(() => popularPosts.slice(0, 3), [popularPosts]);
  const latestPreview = useMemo(() => latestPosts.slice(0, 6), [latestPosts]);

  const totalLikes = useMemo(() => photoPosts.reduce((s, p) => s + p.like_count, 0), [photoPosts]);

  // Players with photo count, sorted by most photos
  const playersWithPhotoCount = useMemo(() => {
    return players.map((pl) => ({
      ...pl,
      photoCount: photoPosts.filter((pp) => pp.player_id === pl.id).length,
    }));
  }, [players, photoPosts]);

  // Highlight: players that have photos, sorted by photo count desc
  const highlightPlayers = useMemo(() => {
    return playersWithPhotoCount.filter((pl) => pl.photoCount > 0)
      .sort((a, b) => b.photoCount - a.photoCount);
  }, [playersWithPhotoCount]);

  // Position filter tabs
  const POS_FILTERS = useMemo(() => [
    { key: 'all', label: t('team_pos_all') },
    { key: 'P', label: t('team_pos_pitcher') },
    { key: 'C', label: t('team_pos_catcher') },
    { key: 'IF', label: t('team_pos_infield') },
    { key: 'OF', label: t('team_pos_outfield') },
  ], [t]);

  // Filtered players by position
  const filteredPlayers = useMemo(() => {
    const list = posFilter === 'all'
      ? playersWithPhotoCount
      : playersWithPhotoCount.filter((pl) => pl.position === posFilter);
    return list.sort((a, b) => b.photoCount - a.photoCount || a.number - b.number);
  }, [playersWithPhotoCount, posFilter]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleShare = useCallback(async () => {
    if (!team) return;
    await Share.share({
      message: `${team.nameKo} — udamon://team/${team.id}`,
    });
  }, [team]);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  const handleViewAll = useCallback((mode: 'popular' | 'latest') => {
    setViewAllMode(mode);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  const handlePlayerPress = useCallback((playerId: string) => {
    navigation.navigate('PlayerDetail', { playerId });
  }, [navigation]);

  if (!team) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('team_not_found')}</Text>
        </View>
      </View>
    );
  }

  const renderGridItem = (post: PhotoPost) => (
    <TouchableOpacity
      key={post.id}
      style={styles.gridItem}
      activeOpacity={0.8}
      onPress={() => handlePostPress(post.id)}
    >
      <Image source={{ uri: post.images[0] }} style={styles.gridItemImg} />
      <LinearGradient colors={['transparent', colors.overlay]} style={styles.gridItemOverlay}>
        <View style={styles.gridItemMeta}>
          <Ionicons name="heart" size={11} color={colors.buttonPrimaryText} />
          <Text style={styles.gridItemLikes}>{post.like_count}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderPopularGrid = () => {
    if (popularPreview.length === 0) return null;
    const [big, ...smalls] = popularPreview;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('team_popular_photos')}</Text>
          {popularPosts.length > 3 && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleViewAll('popular')}>
              <Text style={styles.viewAllLink}>{t('team_view_all')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.popularGrid}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => handlePostPress(big.id)}>
            <Image source={{ uri: big.images[0] }} style={styles.popularBig} />
            <LinearGradient colors={['transparent', colors.overlay]} style={styles.popularOverlay}>
              <View style={styles.popularMeta}>
                <Ionicons name="heart" size={12} color={colors.buttonPrimaryText} />
                <Text style={styles.popularMetaText}>{big.like_count}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          {smalls.length > 0 && (
            <View style={styles.popularSmallCol}>
              {smalls.map((p) => (
                <TouchableOpacity key={p.id} activeOpacity={0.8} onPress={() => handlePostPress(p.id)}>
                  <Image source={{ uri: p.images[0] }} style={styles.popularSmall} />
                  <LinearGradient colors={['transparent', colors.overlay]} style={styles.popularSmallOverlay}>
                    <View style={styles.popularMeta}>
                      <Ionicons name="heart" size={10} color={colors.buttonPrimaryText} />
                      <Text style={styles.popularMetaTextSm}>{p.like_count}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderLatestGrid = () => {
    if (latestPreview.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('team_latest_photos')}</Text>
          {latestPosts.length > 6 && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleViewAll('latest')}>
              <Text style={styles.viewAllLink}>{t('team_view_all')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.latestGrid}>
          {latestPreview.map(renderGridItem)}
        </View>
      </View>
    );
  };

  const renderViewAll = () => {
    const source = viewAllMode === 'popular' ? popularPosts : latestPosts;
    const visible = source.slice(0, visibleCount);
    const hasMore = visibleCount < source.length;
    const title = viewAllMode === 'popular' ? t('team_popular_photos') : t('team_latest_photos');

    return (
      <View style={{ paddingTop: insets.top }}>
        {/* View-All Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setViewAllMode(null)} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.viewAllTitle}>{title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <FlatList
          data={visible}
          numColumns={2}
          columnWrapperStyle={styles.viewAllRow}
          contentContainerStyle={styles.viewAllContent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderGridItem(item)}
          onEndReached={hasMore ? handleLoadMore : undefined}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const renderPhotosTab = () => (
    <>
      {photoPosts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t('team_photos_empty')}</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.emptyCtaText}>{t('team_photos_empty_cta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {renderPopularGrid()}
          {renderLatestGrid()}
        </>
      )}
    </>
  );

  const renderPlayersTab = () => (
    <>
      {players.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t('team_players_empty')}</Text>
        </View>
      ) : (
        <>
          {/* Highlight: players with photos */}
          {highlightPlayers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('team_players_highlight')}</Text>
              <FlatList
                data={highlightPlayers}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.highlightList}
                keyExtractor={(item) => item.id}
                renderItem={({ item: pl }) => {
                  const thumb = photoPosts.find((pp) => pp.player_id === pl.id);
                  return (
                    <TouchableOpacity
                      style={styles.highlightItem}
                      activeOpacity={0.7}
                      onPress={() => handlePlayerPress(pl.id)}
                    >
                      <View style={[styles.highlightAvatarRing, { borderColor: team.color }]}>
                        {thumb ? (
                          <Image source={{ uri: thumb.images[0] }} style={styles.highlightAvatar} />
                        ) : (
                          <View style={styles.highlightAvatarFallback}>
                            <Text style={[styles.highlightAvatarNum, { color: team.color }]}>{pl.number}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.highlightName} numberOfLines={1}>{pl.name_ko}</Text>
                      <View style={styles.highlightPhotoBadge}>
                        <Ionicons name="camera" size={9} color={colors.textSecondary} />
                        <Text style={styles.highlightPhotoCount}>{pl.photoCount}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Position filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.posFilterBar}
          >
            {POS_FILTERS.map((f) => {
              const active = posFilter === f.key;
              const count = f.key === 'all' ? players.length : players.filter((p) => p.position === f.key).length;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.posChip, active && { backgroundColor: team.color }]}
                  activeOpacity={0.7}
                  onPress={() => setPosFilter(f.key)}
                >
                  <Text style={[styles.posChipText, active && { color: team.textColor }]}>
                    {f.label} {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 2-column compact grid */}
          <View style={styles.playerGrid}>
            {filteredPlayers.map((pl) => (
              <TouchableOpacity
                key={pl.id}
                style={styles.playerGridCard}
                activeOpacity={0.7}
                onPress={() => handlePlayerPress(pl.id)}
              >
                <View style={[styles.playerGridNumBadge, { backgroundColor: team.color }]}>
                  <Text style={[styles.playerGridNumText, { color: team.textColor }]}>{pl.number}</Text>
                </View>
                <View style={styles.playerGridInfo}>
                  <Text style={styles.playerGridName} numberOfLines={1}>{pl.name_ko}</Text>
                  <Text style={styles.playerGridPos}>{pl.position}</Text>
                </View>
                {pl.photoCount > 0 && (
                  <View style={styles.playerGridPhotoTag}>
                    <Ionicons name="camera-outline" size={10} color={colors.primary} />
                    <Text style={styles.playerGridPhotoCount}>{pl.photoCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </>
  );

  if (viewAllMode) {
    return (
      <View style={styles.container}>
        {renderViewAll()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient
          colors={[team.color, shadeColor(team.color, -25)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top }]}
        >
          {/* Decorative circles */}
          <View style={[styles.heroCircle, styles.heroCircle1, { borderColor: `${team.textColor}15` }]} />
          <View style={[styles.heroCircle, styles.heroCircle2, { borderColor: `${team.textColor}10` }]} />

          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity onPress={handleBack} style={styles.heroBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={team.textColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.heroBtn} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={20} color={team.textColor} />
            </TouchableOpacity>
          </View>

          {/* Team info */}
          <View style={styles.heroContent}>
            <Text style={[styles.heroEnName, { color: `${team.textColor}60` }]}>{team.nameEn.toUpperCase()}</Text>
            <Text style={[styles.heroKoName, { color: team.textColor }]}>{team.nameKo}</Text>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location-outline" size={13} color={`${team.textColor}80`} />
              <Text style={[styles.heroLocation, { color: `${team.textColor}80` }]}>
                {team.stadium} · {team.city}
              </Text>
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: team.textColor }]}>{photoPosts.length}</Text>
              <Text style={[styles.statLabel, { color: `${team.textColor}80` }]}>{t('team_photos')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: `${team.textColor}20` }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: team.textColor }]}>{players.length}</Text>
              <Text style={[styles.statLabel, { color: `${team.textColor}80` }]}>{t('team_players')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: `${team.textColor}20` }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: team.textColor }]}>{totalLikes}</Text>
              <Text style={[styles.statLabel, { color: `${team.textColor}80` }]}>{t('team_total_likes')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tab switch */}
        <View style={styles.tabBar}>
          {(['photos', 'players'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'photos'
                  ? `${t('team_photos')} (${photoPosts.length})`
                  : `${t('team_players')} (${players.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'photos' ? renderPhotosTab() : renderPlayersTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: fontSize.body, color: colors.textTertiary },

  // Hero
  hero: { paddingBottom: 20, overflow: 'hidden' },
  heroCircle: {
    position: 'absolute', borderRadius: 9999, borderWidth: 1,
  },
  heroCircle1: { width: 200, height: 200, top: -40, right: -60 },
  heroCircle2: { width: 140, height: 140, bottom: -20, left: -30 },
  heroTopBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, height: 56,
  },
  heroBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  heroContent: { paddingHorizontal: 16, marginBottom: 16 },
  heroEnName: { fontSize: fontSize.micro, fontWeight: fontWeight.name, letterSpacing: 2, marginBottom: 2 },
  heroKoName: { fontSize: fontSize.display, fontWeight: fontWeight.heading, letterSpacing: -0.5 },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  heroLocation: { fontSize: fontSize.meta, fontWeight: fontWeight.body },
  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.sectionTitle, fontWeight: fontWeight.heading },
  statLabel: { fontSize: fontSize.micro, fontWeight: fontWeight.body, marginTop: 2 },
  statDivider: { width: 1, height: 28 },

  // Tabs
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textSecondary },
  tabTextActive: { color: colors.buttonPrimaryText },

  // Section
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  viewAllLink: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.primary,
  },
  viewAllTitle: {
    flex: 1, textAlign: 'center',
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary,
  },
  viewAllRow: {
    paddingHorizontal: 16,
    gap: LATEST_GAP,
    marginBottom: LATEST_GAP,
  },
  viewAllContent: {
    paddingBottom: 40,
  },

  // Popular grid
  popularGrid: { flexDirection: 'row', gap: GRID_GAP },
  popularBig: { width: BIG_SIZE, height: BIG_SIZE, borderRadius: radius.md, backgroundColor: colors.surface },
  popularOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.md,
    justifyContent: 'flex-end', padding: 8,
  },
  popularSmallCol: { flex: 1, gap: GRID_GAP },
  popularSmall: {
    width: '100%', height: SMALL_SIZE, borderRadius: radius.md, backgroundColor: colors.surface,
  },
  popularSmallOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.md,
    justifyContent: 'flex-end', padding: 6,
  },
  popularMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  popularMetaText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },
  popularMetaTextSm: { fontSize: fontSize.tiny, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },

  // Latest 2-col grid
  latestGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: LATEST_GAP,
  },
  gridItem: {
    width: LATEST_ITEM_W, height: LATEST_ITEM_W, borderRadius: radius.md,
    overflow: 'hidden', backgroundColor: colors.surface,
  },
  gridItemImg: {
    width: '100%', height: '100%',
  },
  gridItemOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', padding: 6,
  },
  gridItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridItemLikes: { fontSize: fontSize.tiny, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyText: { fontSize: fontSize.body, color: colors.textTertiary },
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

  // Players — Highlight scroll
  highlightList: { gap: 16 },
  highlightItem: { alignItems: 'center', width: 68 },
  highlightAvatarRing: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  highlightAvatar: { width: 52, height: 52, borderRadius: 26 },
  highlightAvatarFallback: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  highlightAvatarNum: { fontSize: fontSize.cardName, fontWeight: fontWeight.heading },
  highlightName: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.textPrimary },
  highlightPhotoBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  highlightPhotoCount: { fontSize: fontSize.tiny, fontWeight: fontWeight.body, color: colors.textSecondary },

  // Players — Position filter
  posFilterBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  posChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.round,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  posChipText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.textSecondary },

  // Players — 2-col grid
  playerGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, paddingBottom: 20,
  },
  playerGridCard: {
    width: (SCREEN_W - 32 - 8) / 2,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 10,
    backgroundColor: colors.surface, borderRadius: radius.md,
  },
  playerGridNumBadge: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  playerGridNumText: { fontSize: fontSize.micro, fontWeight: fontWeight.heading },
  playerGridInfo: { flex: 1 },
  playerGridName: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textPrimary },
  playerGridPos: { fontSize: fontSize.tiny, color: colors.textSecondary, marginTop: 1 },
  playerGridPhotoTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.primaryAlpha8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.sm,
  },
  playerGridPhotoCount: { fontSize: fontSize.tiny, fontWeight: fontWeight.name, color: colors.primary },
});
