import React, { useRef, useState } from 'react';
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
import { formatCount } from '../../utils/time';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';
import VideoPlayer from '../../components/common/VideoPlayer';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;
const MAX_FEATURED = 10;

export default function FeaturedAllScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { getFeaturedPosts } = usePhotographer();

  const featured = getFeaturedPosts().slice(0, MAX_FEATURED);

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('home_featured_all_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={featured}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP, marginBottom: GRID_GAP }}
        contentContainerStyle={{
          paddingHorizontal: GRID_PADDING,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 20) + 20,
        }}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item: post }) => {
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
                    height={(CARD_WIDTH * 4) / 3}
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
                  locations={[0.4, 1]}
                  style={styles.gradient}
                />
                <View style={styles.tag}>
                  <Text style={styles.tagText}>📸 {t('home_featured_tag')}</Text>
                </View>
                <View style={styles.bottom}>
                  <Text style={styles.postTitle} numberOfLines={1}>{post.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.photographer}>@{post.photographer.display_name}</Text>
                    <View style={styles.likes}>
                      <Ionicons name="heart" size={10} color={colors.error} />
                      <Text style={styles.likesText}>{formatCount(post.like_count)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('pg_no_featured')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 16 },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(250, 204, 21, 0.25)',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoPlayOverlay: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  tag: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.2)', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.4)',
  },
  tagText: { fontSize: fontSize.badge, fontWeight: fontWeight.heading, color: colors.featuredAccent },
  bottom: { position: 'absolute', bottom: 10, left: 10, right: 10 },
  postTitle: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: '#FFF', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photographer: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: 'rgba(255,255,255,0.7)' },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likesText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: '#FFF' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: fontSize.body, fontWeight: fontWeight.body, color: colors.textTertiary },
});
