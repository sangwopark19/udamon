import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import EmptyState from '../../components/common/EmptyState';
import type { RootStackParamList } from '../../types/navigation';
import type { PhotoPost } from '../../types/photographer';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CollectionDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLS = 3;
const GRID_GAP = 2;
const THUMB_SIZE = Math.floor((SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

export default function CollectionDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { collectionId } = route.params;

  const { collections, getCollectionPosts } = usePhotographer();

  const collection = useMemo(
    () => collections.find((c) => c.id === collectionId),
    [collections, collectionId],
  );

  const [posts, setPosts] = useState<PhotoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCollectionPosts(collectionId);
      setPosts(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [collectionId, getCollectionPosts]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!collection) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('pg_collections')}</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {collection.emoji} {collection.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {t('pg_collection_photos', { count: posts.length })}
        </Text>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <EmptyState
          variant="generic"
          title={t('pg_feed_loading_failed')}
          description={error}
          actionLabel={t('pg_feed_loading_retry')}
          onAction={load}
        />
      ) : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t('pg_collection_empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLS}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
          columnWrapperStyle={{ gap: GRID_GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
          renderItem={({ item }) => {
            const previewUrl = item.thumbnail_urls?.[0] ?? item.images[0];
            const hasVideo = (item.videos?.length ?? 0) > 0;
            return (
              <TouchableOpacity
                style={styles.gridItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              >
                <Image source={{ uri: previewUrl }} style={styles.gridImage} />
                {hasVideo && (
                  <View style={styles.videoPlayOverlay}>
                    <Ionicons name="play" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
  countBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  gridItem: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlayOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
