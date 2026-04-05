import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {featured.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            >
              <View style={styles.imageWrap}>
                <Image source={{ uri: post.images[0] }} style={styles.image} />
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
          ))}
        </View>

        {featured.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('pg_no_featured')}</Text>
          </View>
        )}
      </ScrollView>
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
