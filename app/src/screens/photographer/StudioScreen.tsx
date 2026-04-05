import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';
import { formatCount } from '../../utils/time';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type SortMode = 'popular' | 'latest' | 'likes' | 'comments';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PAD = 16;
const GRID_GAP = 12;
const GRID_COLS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PAD * 2 - GRID_GAP) / GRID_COLS;

export default function StudioScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Studio'>>();
  const { photographerId } = route.params;

  const { getPhotographer, getPhotoPostsByPhotographer, setFeaturedPost } = usePhotographer();

  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [showDropdown, setShowDropdown] = useState(false);

  const photographer = getPhotographer(photographerId);
  const rawPosts = useMemo(
    () => getPhotoPostsByPhotographer(photographerId),
    [photographerId, getPhotoPostsByPhotographer],
  );
  const posts = useMemo(() => {
    const copy = [...rawPosts];
    switch (sortMode) {
      case 'popular':
        return copy.sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count));
      case 'latest':
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'likes':
        return copy.sort((a, b) => b.like_count - a.like_count);
      case 'comments':
        return copy.sort((a, b) => b.comment_count - a.comment_count);
    }
  }, [rawPosts, sortMode]);
  const pendingCount = useMemo(() => rawPosts.filter((p) => p.status === 'pending').length, [rawPosts]);
  const SORT_LABELS: Record<SortMode, string> = {
    popular: t('home_sort_popular'),
    latest: t('home_sort_latest'),
    likes: t('home_sort_likes'),
    comments: t('home_sort_comments'),
  };

  if (!photographer) return null;

  const stats = [
    { label: t('studio_posts'), value: photographer.post_count, icon: 'grid-outline' as const },
    { label: t('studio_likes'), value: posts.reduce((s, p) => s + p.like_count, 0), icon: 'heart-outline' as const },
    { label: t('studio_views'), value: posts.reduce((s, p) => s + p.view_count, 0), icon: 'eye-outline' as const },
    { label: t('studio_followers'), value: photographer.follower_count, icon: 'people-outline' as const },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('studio_title')}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('UploadPost' as any)}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={colors.buttonPrimaryText} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Ionicons name="time-outline" size={16} color={colors.warning ?? '#F59E0B'} />
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
            <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {showDropdown && (
          <View style={styles.dropdown}>
            {(['popular', 'latest', 'likes', 'comments'] as SortMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.dropdownItem, sortMode === mode && styles.dropdownItemActive]}
                onPress={() => { setSortMode(mode); setShowDropdown(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownText, sortMode === mode && styles.dropdownTextActive]}>
                  {SORT_LABELS[mode]}
                </Text>
                {sortMode === mode && <Ionicons name="checkmark" size={14} color={colors.primary} />}
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
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                onLongPress={() => {
                  Alert.alert(
                    t('pg_featured_post'),
                    post.is_featured ? t('pg_featured_unset_confirm') : t('pg_featured_set_confirm'),
                    [
                      { text: t('btn_cancel'), style: 'cancel' },
                      { text: post.is_featured ? t('pg_featured_unset') : t('pg_featured_set'), onPress: () => setFeaturedPost(photographerId, post.id) },
                    ],
                  );
                }}
              >
                <View style={styles.postImageWrap}>
                  <Image source={{ uri: post.images[0] }} style={styles.postCardImage} />
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
                  <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
                  <View style={styles.postMeta}>
                    <Ionicons name="chatbubble-outline" size={10} color={colors.textTertiary} />
                    <Text style={styles.postMetaText}>{post.comment_count}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
    width: 36, height: 36, borderRadius: radius.button, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: 16 },

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
    color: '#F59E0B',
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
  dropdownText: { fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textPrimary },
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
    left: 6,
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
