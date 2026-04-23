import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import { KBO_TEAMS } from '../../constants/teams';
import { formatCount } from '../../utils/time';
import type { PhotoPost } from '../../types/photographer';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';
import VideoPlayer from '../../components/common/VideoPlayer';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortMode = 'popular' | 'latest' | 'likes' | 'comments';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function AllPostsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { photoPosts } = usePhotographer();
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [showDropdown, setShowDropdown] = useState(false);

  // Plan 04-10 Sub-issue B: viewport-aware VideoPlayer autoplay (HomeScreen trending 패턴 재사용, itemVisiblePercentThreshold=60)
  // WR-05: id 기반 tracking 으로 통일. useRef(handler).current 는 FlatList 제약.
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const ids = new Set<string>();
    viewableItems.forEach((vt) => {
      if (vt.item && typeof (vt.item as { id?: string }).id === 'string') {
        ids.add((vt.item as { id: string }).id);
      }
    });
    setVisibleIds(ids);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const sortedPosts = useMemo(() => {
    const copy = [...photoPosts];
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
  }, [photoPosts, sortMode]);

  const renderPost = ({ item: post }: { item: PhotoPost; index: number }) => {
    const td = KBO_TEAMS.find((t) => t.id === post.team_id);
    const previewUri = post.thumbnail_urls?.[0] ?? post.images[0];
    const hasVideo = (post.videos?.length ?? 0) > 0;
    const videoUri = post.videos?.[0];
    const isVisible = visibleIds.has(post.id);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
      >
        <View style={styles.imageWrap}>
          {/* Plan 04-10 Sub-issue B: video-first — 혼합/영상-only 포스트는 VideoPlayer(feed) 로 viewport autoplay */}
          {hasVideo && videoUri ? (
            <VideoPlayer
              uri={videoUri}
              mode="feed"
              width={CARD_WIDTH}
              height={(CARD_WIDTH * 5) / 4}
              isVisible={isVisible}
            />
          ) : previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.surface }]} />
          )}
          {/* videoPlayOverlay 제거 — VideoPlayer 가 시각적 재생 표현 담당 */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            locations={[0.3, 1]}
            style={styles.gradient}
          />
          <View style={styles.tagRow}>
            {td && (
              <View style={[styles.teamTag, { borderColor: td.color }]}>
                <Text style={[styles.teamTagText, { color: td.color }]}>{td.shortName}</Text>
              </View>
            )}
          </View>
          <View style={styles.bottomInfo}>
            <View style={styles.engRow}>
              <Ionicons name="heart" size={10} color={colors.error} />
              <Text style={styles.engText}>{formatCount(post.like_count)}</Text>
            </View>
            <Text style={styles.pgName}>@{post.photographer.display_name}</Text>
          </View>
        </View>
        <View style={styles.infoWrap}>
          <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
          {post.player && (
            <View style={styles.playerBadge}>
              <Text style={styles.playerBadgeText}>#{post.player.name_ko}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const SORT_LABELS: Record<SortMode, string> = {
    popular: t('home_sort_popular'),
    latest: t('home_sort_latest'),
    likes: t('home_sort_likes'),
    comments: t('home_sort_comments'),
  };
  const sortLabel = SORT_LABELS[sortMode];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('home_all_posts_title')}</Text>

        {/* Sort Dropdown */}
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.7}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.sortBtnText}>{sortLabel}</Text>
          <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Dropdown */}
      {showDropdown && (
        <View style={[styles.dropdown, { top: insets.top + 56 }]}>
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
              {sortMode === mode && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={sortedPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  sortBtnText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.primary,
  },

  dropdown: {
    position: 'absolute', right: 16, zIndex: 100,
    backgroundColor: colors.surfaceElevated, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
    elevation: 6, marginTop: 4,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, minWidth: 140,
  },
  dropdownItemActive: { backgroundColor: colors.primaryAlpha8 },
  dropdownText: { fontSize: fontSize.body, fontWeight: fontWeight.body, color: colors.textPrimary },
  dropdownTextActive: { fontWeight: fontWeight.heading, color: colors.primary },

  listContent: { paddingTop: 12, paddingHorizontal: GRID_PADDING },
  row: { gap: GRID_GAP, marginBottom: 12 },

  card: {
    width: CARD_WIDTH, backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  imageWrap: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surface, overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.9 },
  videoPlayOverlay: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  tagRow: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row' },
  teamTag: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm,
    borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.85)',
  },
  teamTagText: { fontSize: fontSize.badge, fontWeight: fontWeight.heading, letterSpacing: 0.5 },
  bottomInfo: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  engRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  engText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: '#FFF' },
  pgName: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: 'rgba(255,255,255,0.7)' },
  infoWrap: { padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
  postTitle: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary, marginBottom: 6 },
  playerBadge: { alignSelf: 'flex-start', backgroundColor: colors.primaryAlpha8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  playerBadgeText: { fontSize: fontSize.badge, fontWeight: fontWeight.name, color: colors.primary },
});
