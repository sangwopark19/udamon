import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
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
import { useAuth } from '../../contexts/AuthContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CheerleaderProfile'>;
type TabKey = 'popular' | 'latest' | 'likes' | 'comments';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_COLS = 2;
const GRID_GAP = 8;
const CARD_W = (SCREEN_W - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const CARD_IMG_H = CARD_W * 1.1;

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent)));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const TABS: { key: TabKey; icon: string; labelKey: string }[] = [
  { key: 'popular', icon: 'flame', labelKey: 'home_sort_popular' },
  { key: 'latest', icon: 'time-outline', labelKey: 'home_sort_latest' },
  { key: 'likes', icon: 'heart-outline', labelKey: 'home_sort_likes' },
  { key: 'comments', icon: 'chatbubble-outline', labelKey: 'home_sort_comments' },
];

export default function CheerleaderProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { cheerleaderId } = route.params;

  const { isPhotographer } = useAuth();
  const { getCheerleader, getPhotoPostsByCheerleader } = usePhotographer();
  const cheerleader = getCheerleader(cheerleaderId);
  const photoPosts = getPhotoPostsByCheerleader(cheerleaderId);
  const team = cheerleader ? KBO_TEAMS.find((tm) => tm.id === cheerleader.team_id) : null;
  const teamColor = team?.color ?? colors.primary;
  const teamTextColor = team?.textColor ?? colors.buttonPrimaryText;

  const [activeTab, setActiveTab] = useState<TabKey>('popular');

  const totalLikes = useMemo(() => photoPosts.reduce((s, p) => s + p.like_count, 0), [photoPosts]);

  const displayPosts = useMemo(() => {
    const copy = [...photoPosts];
    switch (activeTab) {
      case 'popular':
        return copy.sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count));
      case 'latest':
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'likes':
        return copy.sort((a, b) => b.like_count - a.like_count);
      case 'comments':
        return copy.sort((a, b) => b.comment_count - a.comment_count);
    }
  }, [photoPosts, activeTab]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleShare = useCallback(async () => {
    if (!cheerleader) return;
    await Share.share({
      message: `${cheerleader.name} — udamon://cheerleader/${cheerleader.id}`,
    });
  }, [cheerleader]);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  const handleTeamPress = useCallback(() => {
    if (team) navigation.navigate('TeamDetail', { teamId: team.id });
  }, [navigation, team]);

  if (!cheerleader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.fallbackHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('cheerleader_empty')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient
          colors={[teamColor, shadeColor(teamColor, -30)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top }]}
        >
          <View style={[styles.heroCircle, styles.heroCircle1, { borderColor: `${teamTextColor}12` }]} />
          <View style={[styles.heroCircle, styles.heroCircle2, { borderColor: `${teamTextColor}08` }]} />

          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity onPress={handleBack} style={styles.heroBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={teamTextColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.heroBtn} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={20} color={teamTextColor} />
            </TouchableOpacity>
          </View>

          {/* Profile info */}
          <View style={styles.heroContent}>
            {cheerleader.image_url ? (
              <Image source={{ uri: cheerleader.image_url }} style={styles.heroAvatar} />
            ) : (
              <View style={styles.heroAvatarPlaceholder}>
                <Ionicons name="person" size={28} color={`${teamTextColor}60`} />
              </View>
            )}
            <View style={styles.heroTextCol}>
              <Text style={[styles.heroName, { color: teamTextColor }]}>{cheerleader.name}</Text>
              <Text style={[styles.heroDesc, { color: `${teamTextColor}80` }]} numberOfLines={2}>
                {cheerleader.description}
              </Text>
              {team && (
                <TouchableOpacity
                  style={[styles.teamBadge, { backgroundColor: `${teamTextColor}15` }]}
                  activeOpacity={0.7}
                  onPress={handleTeamPress}
                >
                  <Text style={[styles.teamBadgeText, { color: teamTextColor }]}>{team.shortName}</Text>
                  <Ionicons name="chevron-forward" size={11} color={`${teamTextColor}80`} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: teamTextColor }]}>{photoPosts.length}</Text>
              <Text style={[styles.statLabel, { color: `${teamTextColor}80` }]}>{t('cheerleader_stat_photos')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: `${teamTextColor}20` }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: teamTextColor }]}>{totalLikes}</Text>
              <Text style={[styles.statLabel, { color: `${teamTextColor}80` }]}>{t('cheerleader_stat_likes')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && { backgroundColor: teamColor }]}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={active ? teamTextColor : colors.textSecondary}
                />
                <Text style={[styles.tabText, active && { color: teamTextColor }]}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photo Grid */}
        {displayPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={44} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('cheerleader_empty')}</Text>
            <Text style={styles.emptySubtext}>
              {t('cheerleader_empty_encourage', { name: cheerleader.name })}
            </Text>
            {isPhotographer && (
              <TouchableOpacity
                style={[styles.emptyUploadBtn, { backgroundColor: teamColor }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('UploadPost' as any)}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={teamTextColor} />
                <Text style={[styles.emptyUploadText, { color: teamTextColor }]}>
                  {t('cheerleader_empty_upload')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.postGrid}>
            {displayPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                activeOpacity={0.85}
                onPress={() => handlePostPress(post.id)}
              >
                <View style={styles.postImageWrap}>
                  <Image source={{ uri: post.images[0] }} style={styles.postImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    locations={[0.4, 1]}
                    style={styles.postGradient}
                  />
                  <View style={styles.postOverlay}>
                    <View style={styles.postLikeRow}>
                      <Ionicons name="heart" size={10} color={colors.error} />
                      <Text style={styles.postLikeText}>{post.like_count}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.postInfo}>
                  <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
                  <Text style={styles.postPhotographer} numberOfLines={1}>
                    @{post.photographer.display_name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fallbackHeader: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  headerBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: fontSize.body, color: colors.textTertiary },

  // Hero
  hero: { paddingBottom: 20, overflow: 'hidden' },
  heroCircle: { position: 'absolute', borderRadius: 9999, borderWidth: 1 },
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
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginBottom: 16 },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  heroAvatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTextCol: { flex: 1, gap: 4 },
  heroName: { fontSize: fontSize.sectionTitle, fontWeight: fontWeight.heading },
  heroDesc: { fontSize: fontSize.meta, fontWeight: fontWeight.body },
  teamBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.round, marginTop: 4,
  },
  teamBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.name },

  // Stats
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
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 4,
  },
  tabText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.textSecondary },

  // Grid
  postGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 12, gap: GRID_GAP,
  },
  postCard: {
    width: CARD_W, backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  postImageWrap: {
    width: '100%', height: CARD_IMG_H, backgroundColor: colors.surface, overflow: 'hidden',
  },
  postImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  postGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  postOverlay: { position: 'absolute', bottom: 6, left: 6 },
  postLikeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
  },
  postLikeText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: '#FFF' },
  postInfo: { padding: 10 },
  postTitle: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textPrimary, marginBottom: 4 },
  postPhotographer: { fontSize: fontSize.micro, color: colors.textTertiary },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyText: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textSecondary, marginTop: 4 },
  emptySubtext: { fontSize: fontSize.meta, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  emptyUploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.round, marginTop: 12,
  },
  emptyUploadText: { fontSize: fontSize.meta, fontWeight: fontWeight.heading },
});
