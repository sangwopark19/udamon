import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import PressableScale from '../../components/common/PressableScale';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useBlock } from '../../contexts/BlockContext';
import { KBO_TEAMS } from '../../constants/teams';
import { timeAgo, formatCount } from '../../utils/time';
import type { RootStackParamList, MainTabParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius, layout, spacing } from '../../styles/theme';
import FadeInView from '../../components/common/FadeInView';
import { HomeSkeleton } from '../../components/common/Skeleton';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.55;
const MAX_SPOTLIGHT = 6;
const MAX_FEATURED_VISIBLE = 4;

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { photoPosts, photographers, getFeaturedPosts } = usePhotographer();
  const { posts: communityPosts } = useCommunity();
  const { unreadCount: notifUnread } = useNotification();
  const { blockedUserIds } = useBlock();
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const myTeamId = user?.my_team_id ?? null;
  const myTeam = myTeamId ? KBO_TEAMS.find((t) => t.id === myTeamId) : null;
  const refreshColor = myTeam?.color ?? colors.primary;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Spotlight: teams with most photo content
  const spotlightTeams = useMemo(() => {
    const countMap: Record<string, number> = {};
    photoPosts.forEach((p) => { countMap[p.team_id] = (countMap[p.team_id] || 0) + 1; });
    return KBO_TEAMS
      .slice()
      .sort((a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0))
      .slice(0, MAX_SPOTLIGHT);
  }, [photoPosts]);

  // Featured posts (max 4 visible in home)
  const featured = getFeaturedPosts().slice(0, MAX_FEATURED_VISIBLE);

  // Trending posts (top 6 by likes, filter blocked)
  const trendingPosts = useMemo(() => {
    const source = myTeamId
      ? photoPosts.filter((p) => p.team_id === myTeamId && !blockedUserIds.has(p.photographer_id))
      : photoPosts.filter((p) => !blockedUserIds.has(p.photographer_id));
    return [...source]
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 6);
  }, [photoPosts, myTeamId, blockedUserIds]);

  // Community highlights (top 5 by engagement, filter blocked)
  const communityHighlights = useMemo(() => {
    const source = myTeamId
      ? communityPosts.filter((p) => p.team_id === myTeamId && !blockedUserIds.has(p.user_id))
      : communityPosts.filter((p) => !blockedUserIds.has(p.user_id));
    return [...source]
      .sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count))
      .slice(0, 5);
  }, [communityPosts, myTeamId, blockedUserIds]);

  // Popular photographers (top 5 by follower + post count)
  const popularPhotographers = useMemo(() => {
    return [...photographers]
      .sort((a, b) => (b.follower_count + b.post_count) - (a.follower_count + a.post_count))
      .slice(0, 5);
  }, [photographers]);

  if (!ready) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <HomeSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ─── Header Bar ─── */}
      <View style={styles.header}>
        <Text style={styles.brand}>우다몬.</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Search')} accessibilityLabel={t('a11y_search')}>
            <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Notifications')} accessibilityLabel={t('a11y_notifications')}>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={refreshColor}
            colors={[refreshColor]}
          />
        }
      >
        {/* ─── Spotlight ─── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="flash" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('home_spotlight')}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spotlightRow}
        >
          {spotlightTeams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[styles.spotlightChip, { borderColor: team.color }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
            >
              <Text style={[styles.spotlightName, { color: team.color }]}>{team.shortName}</Text>
              <Ionicons name="chevron-forward" size={12} color={team.color} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── Featured Gallery (이번 주 베스트 컷) ─── */}
        {featured.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sparkle}>✨</Text>
                <Text style={styles.sectionTitle}>{t('home_featured')}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('FeaturedAll')}>
                <Text style={styles.viewAll}>{t('home_view_all')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featured.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.featuredCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  <View style={styles.featuredImageWrap}>
                    <Image source={{ uri: post.images[0] }} style={styles.featuredImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      locations={[0.4, 1]}
                      style={styles.featuredGradient}
                    />
                    <View style={styles.featuredTag}>
                      <Text style={styles.featuredTagText}>📸 {t('home_featured_tag')}</Text>
                    </View>
                    <View style={styles.featuredBottom}>
                      <Text style={styles.featuredPostName} numberOfLines={1}>{post.title}</Text>
                      <View style={styles.featuredMetaRow}>
                        <Text style={styles.featuredPhotographer}>@{post.photographer.display_name}</Text>
                        <View style={styles.featuredLikes}>
                          <Ionicons name="heart" size={10} color={colors.primary} />
                          <Text style={styles.featuredLikesText}>{formatCount(post.like_count)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ─── Community Highlights ─── */}
        {communityHighlights.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="chatbubbles" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('community_title')}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Community')}>
                <Text style={styles.viewAll}>{t('home_view_all')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.communityScroll}
            >
              {communityHighlights.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.communityCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('CommunityPostDetail', { postId: post.id })}
                >
                  <View style={styles.communityCardTop}>
                    {post.team && (() => {
                      const teamData = KBO_TEAMS.find((t) => t.id === post.team_id);
                      return (
                        <View style={[styles.communityTeamBadge, teamData && { borderColor: teamData.color }]}>
                          <Text style={[styles.communityTeamText, teamData && { color: teamData.color }]}>
                            {teamData?.shortName ?? post.team.name_ko}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                  <Text style={styles.communityCardTitle} numberOfLines={2}>{post.title}</Text>
                  <Text style={styles.communityCardContent} numberOfLines={2}>{post.content}</Text>
                  <View style={styles.communityCardMeta}>
                    <View style={styles.communityCardStat}>
                      <Ionicons name="heart" size={11} color={colors.error} />
                      <Text style={styles.communityStatText}>{post.like_count}</Text>
                    </View>
                    <View style={styles.communityCardStat}>
                      <Ionicons name="chatbubble" size={11} color={colors.textTertiary} />
                      <Text style={styles.communityStatText}>{post.comment_count}</Text>
                    </View>
                    <Text style={styles.communityTimeText}>{timeAgo(post.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ─── Popular Photographers ─── */}
        {popularPhotographers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="camera" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('home_fan_photographers')}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('PopularPhotographers')}>
                <Text style={styles.viewAll}>{t('home_view_all')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pgScroll}
            >
              {popularPhotographers.map((pg) => {
                const pgTeam = pg.team_id ? KBO_TEAMS.find((tm) => tm.id === pg.team_id) : null;
                return (
                  <TouchableOpacity
                    key={pg.id}
                    style={styles.pgCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('PhotographerProfile', { photographerId: pg.id })}
                  >
                    <View style={[styles.pgAvatarWrap, pgTeam && { borderColor: pgTeam.color }]}>
                      {pg.avatar_url ? (
                        <Image source={{ uri: pg.avatar_url }} style={styles.pgAvatar} />
                      ) : (
                        <Ionicons name="person" size={24} color={colors.textTertiary} />
                      )}
                    </View>
                    <Text style={styles.pgName} numberOfLines={1}>{pg.display_name}</Text>
                    {pgTeam && (
                      <Text style={[styles.pgTeam, { color: pgTeam.color }]}>{pgTeam.shortName}</Text>
                    )}
                    <View style={styles.pgStats}>
                      <Ionicons name="heart" size={10} color={colors.textTertiary} />
                      <Text style={styles.pgStatText}>{formatCount(pg.follower_count)}</Text>
                      <Ionicons name="images-outline" size={10} color={colors.textTertiary} />
                      <Text style={styles.pgStatText}>{pg.post_count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ─── Trending Posts (2-col Grid) ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home_trending_posts')}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('AllPosts')}>
            <Text style={styles.viewAll}>{t('home_view_all')}</Text>
          </TouchableOpacity>
        </View>

        <FadeInView delay={100}>
        <View style={styles.postGrid}>
          {trendingPosts.map((post) => (
            <PressableScale
              key={post.id}
              style={styles.postCard}
              scaleTo={0.97}
              onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            >
              <View style={styles.postImageWrap}>
                <Image source={{ uri: post.images[0] }} style={styles.postImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  locations={[0.3, 1]}
                  style={styles.postImageOverlay}
                />
                <View style={styles.postTagRow}>
                  {(() => {
                    const td = KBO_TEAMS.find((t) => t.id === post.team_id);
                    return (
                      <View style={[styles.teamTag, td && { borderColor: td.color }]}>
                        <Text style={[styles.teamTagText, td && { color: td.color }]}>
                          {td?.shortName ?? post.team.name_ko}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                <View style={styles.postBottomInfo}>
                  <View style={styles.engagementRow}>
                    <Ionicons name="heart" size={10} color={colors.error} />
                    <Text style={styles.engagementText}>{formatCount(post.like_count)}</Text>
                    <Text style={styles.viewsText}>{t('home_views', { count: formatCount(post.view_count) })}</Text>
                  </View>
                  <Text style={styles.photographerName}>@{post.photographer.display_name}</Text>
                </View>
              </View>
              <View style={styles.postInfo}>
                <Text style={styles.postName} numberOfLines={2}>{post.title}</Text>
                <View style={styles.postFooter}>
                  {post.player && (
                    <View style={styles.playerBadge}>
                      <Text style={styles.playerBadgeText}>#{post.player.name_ko}</Text>
                    </View>
                  )}
                  <View style={styles.formatBadge}>
                    <Ionicons name="image" size={10} color={colors.textSecondary} />
                    <Text style={styles.formatText}>PHOTO</Text>
                  </View>
                </View>
              </View>
            </PressableScale>
          ))}
        </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  brand: { fontSize: fontSize.sectionTitle, fontWeight: fontWeight.heading, color: colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: fontSize.micro2, fontWeight: fontWeight.name, color: colors.buttonPrimaryText, lineHeight: 12 },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: layout.tabBarHeight + 20 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING, marginTop: 16, marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.sectionTitle, fontWeight: fontWeight.heading, color: colors.textPrimary, letterSpacing: -0.3 },
  sparkle: { fontSize: 16 },
  viewAll: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.primary },

  spotlightRow: { paddingHorizontal: GRID_PADDING, gap: spacing.sm },
  spotlightChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.round, borderWidth: 1.5, backgroundColor: colors.surfaceElevated,
  },
  spotlightName: { fontSize: fontSize.meta, fontWeight: fontWeight.heading },

  featuredScroll: { paddingHorizontal: GRID_PADDING, gap: spacing.md },
  featuredCard: { width: FEATURED_CARD_WIDTH, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.featuredAlpha25 },
  featuredImageWrap: { width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.surface },
  featuredImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  featuredTag: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: colors.featuredAlpha20, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.featuredAlpha40,
  },
  featuredTagText: { fontSize: fontSize.badge, fontWeight: fontWeight.heading, color: colors.featuredAccent, letterSpacing: 0.5 },
  featuredBottom: { position: 'absolute', bottom: spacing.md, left: spacing.md, right: spacing.md },
  featuredPostName: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.buttonPrimaryText, marginBottom: 4 },
  featuredMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featuredPhotographer: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.whiteAlpha70 },
  featuredLikes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  featuredLikesText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },

  communityScroll: { paddingHorizontal: GRID_PADDING, gap: 10 },
  communityCard: { width: SCREEN_WIDTH * 0.65, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  communityCardTop: { flexDirection: 'row', marginBottom: 8 },
  communityTeamBadge: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary },
  communityTeamText: { fontSize: fontSize.badge, fontWeight: fontWeight.name, color: colors.primary },
  communityCardTitle: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary, marginBottom: 4 },
  communityCardContent: { fontSize: fontSize.meta, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  communityCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  communityCardStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  communityStatText: { fontSize: fontSize.micro, color: colors.textTertiary },
  communityTimeText: { fontSize: fontSize.micro, color: colors.textTertiary },

  pgScroll: { paddingHorizontal: GRID_PADDING, gap: 12 },
  pgCard: {
    width: 90, alignItems: 'center', gap: 4,
  },
  pgAvatarWrap: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  pgAvatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  pgName: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textPrimary, textAlign: 'center' },
  pgTeam: { fontSize: fontSize.micro, fontWeight: fontWeight.name },
  pgStats: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pgStatText: { fontSize: fontSize.micro, color: colors.textTertiary },

  postGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_PADDING, gap: GRID_GAP },
  postCard: { width: CARD_WIDTH, backgroundColor: colors.surfaceElevated, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  postImageWrap: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surface, overflow: 'hidden' },
  postImage: { width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.9 },
  postImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  postTagRow: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row' },
  teamTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.whiteAlpha85 },
  teamTagText: { fontSize: fontSize.badge, fontWeight: fontWeight.heading, color: colors.primary, letterSpacing: 0.5 },
  postBottomInfo: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  engagementRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  engagementText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },
  viewsText: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.whiteAlpha60, marginLeft: 2 },
  photographerName: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.whiteAlpha70 },
  postInfo: { padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
  postName: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary, height: 38, marginBottom: 8 },
  postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerBadge: { backgroundColor: colors.primaryAlpha8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  playerBadgeText: { fontSize: fontSize.badge, fontWeight: fontWeight.name, color: colors.primary },
  formatBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  formatText: { fontSize: fontSize.badge, fontWeight: fontWeight.heading, color: colors.textSecondary, letterSpacing: 0.5 },
});
