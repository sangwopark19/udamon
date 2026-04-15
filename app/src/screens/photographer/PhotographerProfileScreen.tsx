import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginGate } from '../../hooks/useLoginGate';
import { useRank } from '../../contexts/RankContext';
import RankBadge from '../../components/common/RankBadge';
import RankProgressBar from '../../components/common/RankProgressBar';
import AwardsList from '../../components/photographer/AwardsList';
import GradeBadge from '../../components/photographer/GradeBadge';
import ThankYouWall from '../../components/photographer/ThankYouWall';
import { KBO_TEAMS } from '../../constants/teams';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';
import { formatCount } from '../../utils/time';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PhotographerProfile'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_COLS = 3;
const THUMB_SIZE = Math.floor((SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
const COLLECTION_WIDTH = 150;

const COLLECTION_EMOJIS = ['\uD83D\uDD25', '\uD83C\uDFDF', '\uD83D\uDCF8', '\u26BE', '\uD83C\uDFC6', '\uD83C\uDF1F', '\uD83C\uDF89', '\uD83D\uDCAA'];

export default function PhotographerProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { photographerId } = route.params;

  const {
    getPhotographer, getPhotoPostsByPhotographer, isFollowing, toggleFollow,
    getCollectionsForPg, createCollection, deleteCollection,
  } = usePhotographer();
  // TODO (Phase 5 admin): Plan 03 Context 에서 updatePhotographer 제거됨.
  // Phase 5 에서 photographerApi.updatePhotographer RPC 추가 후 await 전환 예정.
  const updatePhotographer = (_photographerId: string, _patch: { display_name?: string; bio?: string }): void => {
    console.warn('[PhotographerProfile] updatePhotographer 미구현 — Phase 5 photographerApi 이관 대상');
  };
  const { user } = useAuth();
  const requireLogin = useLoginGate();

  const photographer = getPhotographer(photographerId);
  const posts = useMemo(
    () => getPhotoPostsByPhotographer(photographerId),
    [photographerId, getPhotoPostsByPhotographer],
  );

  const [visibleCount, setVisibleCount] = useState(12);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColEmoji, setNewColEmoji] = useState(COLLECTION_EMOJIS[0]);
  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  const pgCollections = useMemo(() => getCollectionsForPg(photographerId), [photographerId, getCollectionsForPg]);

  // Profile edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const handleOpenEdit = useCallback(() => {
    if (!photographer) return;
    setEditName(photographer.display_name);
    setEditBio(photographer.bio ?? '');
    setShowEditModal(true);
  }, [photographer]);
  const handleSaveEdit = useCallback(() => {
    const trimName = editName.trim();
    if (!trimName) return;
    updatePhotographer(photographerId, { display_name: trimName, bio: editBio.trim() });
    setShowEditModal(false);
  }, [photographerId, editName, editBio, updatePhotographer]);

  const handleCreateCollection = () => {
    if (!newColName.trim()) return;
    createCollection(photographerId, newColName.trim(), newColEmoji);
    setNewColName('');
    setNewColEmoji(COLLECTION_EMOJIS[0]);
    setShowCreateCollection(false);
  };

  const handleLongPressCollection = (colId: string, colName: string) => {
    Alert.alert(colName, '', [
      { text: t('btn_cancel'), style: 'cancel' },
      { text: t('archive_folder_delete'), style: 'destructive', onPress: () => deleteCollection(colId) },
    ]);
  };

  const team = photographer?.team_id
    ? KBO_TEAMS.find((t) => t.id === photographer.team_id)
    : null;
  const following = isFollowing(photographerId);
  const isOwnProfile = user?.id === photographer?.user_id;
  const scrollY = useRef(new Animated.Value(0)).current;
  const followScale = useRef(new Animated.Value(1)).current;
  const handleFollow = useCallback(() => {
    if (!requireLogin()) return;
    toggleFollow(photographerId);
    Animated.sequence([
      Animated.timing(followScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.spring(followScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
  }, [photographerId, requireLogin, toggleFollow, followScale]);
  const { getRankForPhotographer, getRankProgress } = useRank();
  const rankTier = getRankForPhotographer(photographerId);
  const rankProgress = getRankProgress(photographerId);

  const totalLikes = useMemo(
    () => posts.reduce((sum, p) => sum + p.like_count, 0),
    [posts],
  );

  const featuredPost = useMemo(
    () =>
      posts.find((p) => p.is_featured) ??
      (posts.length > 0
        ? posts.reduce((best, p) => (p.like_count > best.like_count ? p : best))
        : null),
    [posts],
  );

  if (!photographer) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyCenter}>
          <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t('pg_not_found')}</Text>
        </View>
      </View>
    );
  }

  const teamColor = team?.color ?? colors.primary;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7} accessibilityLabel={t('a11y_back')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{photographer.display_name}</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} accessibilityLabel={t('a11y_more')}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {/* Cover with team gradient + parallax */}
        <Animated.View style={[styles.coverWrap, {
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [-100, 0, 180],
              outputRange: [-50, 0, 60],
              extrapolate: 'clamp',
            }),
          }, {
            scale: scrollY.interpolate({
              inputRange: [-100, 0],
              outputRange: [1.5, 1],
              extrapolateRight: 'clamp',
            }),
          }],
        }]}>
          {photographer.cover_url ? (
            <Image source={{ uri: photographer.cover_url }} style={styles.coverImage} />
          ) : (
            <LinearGradient
              colors={[teamColor, `${teamColor}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.coverGradient}
          />
          {/* Team badge on cover */}
          {team && (
            <TouchableOpacity
              style={[styles.coverTeamBadge, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
              onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.coverTeamText}>{team.shortName}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={[styles.avatarWrap, { borderColor: teamColor }]}>
            {photographer.avatar_url ? (
              <Image source={{ uri: photographer.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                <Ionicons name="person" size={32} color={colors.textTertiary} />
              </View>
            )}
          </View>

          {/* Name + Badge */}
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{photographer.display_name}</Text>
            <View style={styles.gradeBadgeWrap}>
              <GradeBadge grade={photographer.grade} variant="icon-label" size="md" />
            </View>
            {photographer.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.verified}
                style={{ marginLeft: 8 }}
              />
            )}
            <RankBadge tier={rankTier} progress={rankProgress} />
          </View>

          {/* Bio */}
          {photographer.bio ? (
            <Text style={styles.bio}>{photographer.bio}</Text>
          ) : null}

          {/* Award Badges (inline) */}
          <AwardsList photographerId={photographerId} />

          {/* Stats: posts | followers | total likes */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(photographer.post_count)}</Text>
              <Text style={styles.statLabel}>{t('pg_posts')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(photographer.follower_count)}</Text>
              <Text style={styles.statLabel}>{t('pg_followers')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(totalLikes)}</Text>
              <Text style={styles.statLabel}>{t('pg_total_likes')}</Text>
            </View>
          </View>

          {/* Rank Progress (own profile) */}
          {isOwnProfile && (
            <View style={styles.rankProgressWrap}>
              <RankProgressBar progress={rankProgress} />
            </View>
          )}

          {/* Own Profile Actions */}
          {isOwnProfile && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.outlineBtn}
                activeOpacity={0.7}
                onPress={handleOpenEdit}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={styles.outlineBtnText}>{t('pg_edit_profile')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Studio', { photographerId })}
              >
                <Ionicons name="grid-outline" size={16} color={colors.primary} />
                <Text style={styles.outlineBtnText}>{t('studio_title')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filledBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('UploadPost' as any)}
              >
                <Ionicons name="add" size={16} color={colors.buttonPrimaryText} />
                <Text style={styles.filledBtnText}>{t('upload_title')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Button: Follow */}
          {!isOwnProfile && (
            <View style={styles.actionRow}>
              <Animated.View style={{ flex: 1, transform: [{ scale: followScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.filledBtn,
                    following && { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={handleFollow}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={following ? 'checkmark' : 'add'}
                    size={16}
                    color={following ? colors.textPrimary : colors.buttonPrimaryText}
                  />
                  <Text style={[styles.filledBtnText, following && { color: colors.textPrimary }]}>
                    {following ? t('btn_following') : t('btn_follow')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </View>

        {/* Featured Post */}
        {featuredPost && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>
              {'\uD83D\uDCCC'} {t('pg_featured_post')}
            </Text>
            <TouchableOpacity
              style={styles.featuredCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PostDetail', { postId: featuredPost.id })}
            >
              <Image source={{ uri: featuredPost.images[0] }} style={styles.featuredImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.featuredGradient}
              />
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle} numberOfLines={1}>{featuredPost.title}</Text>
                {featuredPost.description ? (
                  <Text style={styles.featuredDesc} numberOfLines={2}>{featuredPost.description}</Text>
                ) : null}
                <View style={styles.featuredMeta}>
                  <View style={styles.featuredMetaItem}>
                    <Ionicons name="heart" size={12} color="#FF6B6B" />
                    <Text style={styles.featuredMetaText}>{formatCount(featuredPost.like_count)}</Text>
                  </View>
                  <View style={styles.featuredMetaItem}>
                    <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.featuredMetaText}>{formatCount(featuredPost.view_count)}</Text>
                  </View>
                  <Text style={styles.featuredDate}>
                    {featuredPost.created_at.slice(0, 10).replace(/-/g, '.')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Collections — hide when photographer has none and not own profile */}
        {(isOwnProfile || pgCollections.length > 0) && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>
              {'\uD83D\uDCC1'} {t('pg_collections')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionsScroll}
            >
              {isOwnProfile && (
                <TouchableOpacity
                  style={[styles.collectionCard, styles.collectionAddCard]}
                  activeOpacity={0.7}
                  onPress={() => setShowCreateCollection(true)}
                >
                  <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
                  <Text style={styles.collectionAddText}>{t('archive_new_folder')}</Text>
                </TouchableOpacity>
              )}
              {pgCollections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={styles.collectionCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CollectionDetail', { collectionId: col.id })}
                  onLongPress={isOwnProfile ? () => handleLongPressCollection(col.id, col.name) : undefined}
                >
                  <LinearGradient
                    colors={[teamColor, `${teamColor}99`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.collectionGradient}
                  >
                    <Text style={styles.collectionEmoji}>{col.emoji}</Text>
                    <Text style={styles.collectionName}>{col.name}</Text>
                    <Text style={styles.collectionCount}>
                      {t('pg_collection_photos', { count: col.postIds.length })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Thank You Wall */}
        <ThankYouWall photographerId={photographerId} />

        {/* All Posts Header */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>
            {'\uD83D\uDCCB'} {t('pg_all_posts_count', { count: posts.length })}
          </Text>
        </View>

        {/* Post Grid */}
        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyPostsText}>{t('empty_no_posts')}</Text>
          </View>
        ) : (
          <View style={styles.postGrid}>
            {visiblePosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postThumb}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
              >
                <Image source={{ uri: post.images[0] }} style={styles.postThumbImage} />
                {post.images.length > 1 && (
                  <View style={styles.multiIcon}>
                    <Ionicons name="copy-outline" size={12} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.thumbOverlay}>
                  <View style={styles.thumbStat}>
                    <Ionicons name="heart" size={10} color="#FFFFFF" />
                    <Text style={styles.thumbStatText}>{formatCount(post.like_count)}</Text>
                  </View>
                  {post.player && (
                    <Text style={styles.thumbPlayerTag} numberOfLines={1}>
                      #{post.player.name_ko}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            activeOpacity={0.8}
            onPress={() => setVisibleCount((p) => p + 12)}
          >
            <Text style={styles.loadMoreText}>
              {t('explore_view_more')} ({t('explore_remaining', { count: posts.length - visibleCount })})
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </Animated.ScrollView>

      {/* Create Collection Modal */}
      <Modal visible={showCreateCollection} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('archive_new_folder')}</Text>
            <View style={styles.emojiRow}>
              {COLLECTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, newColEmoji === emoji && styles.emojiBtnActive]}
                  onPress={() => setNewColEmoji(emoji)}
                >
                  <Text style={styles.emojiBtnText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder={t('archive_folder_name_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={newColName}
              onChangeText={setNewColName}
              maxLength={20}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowCreateCollection(false); setNewColName(''); }}
              >
                <Text style={styles.modalCancelText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !newColName.trim() && { opacity: 0.4 }]}
                onPress={handleCreateCollection}
                disabled={!newColName.trim()}
              >
                <Text style={styles.modalConfirmText}>{t('btn_confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editModalTitle}>{t('pg_edit_profile')}</Text>

            <Text style={styles.editLabel}>{t('pg_edit_name')}</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              maxLength={20}
              placeholder={t('pg_edit_name')}
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.editCharCount}>{editName.length}/20</Text>

            <Text style={styles.editLabel}>{t('pg_edit_bio')}</Text>
            <TextInput
              style={[styles.editInput, styles.editBioInput]}
              value={editBio}
              onChangeText={setEditBio}
              maxLength={150}
              multiline
              placeholder={t('pg_edit_bio_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.editCharCount}>{editBio.length}/150</Text>

            <View style={styles.editBtnRow}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.editCancelText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, !editName.trim() && { opacity: 0.4 }]}
                onPress={handleSaveEdit}
                disabled={!editName.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.editSaveText}>{t('btn_save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
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
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Cover
  coverWrap: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  coverTeamBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.round,
  },
  coverTeamText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.round,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  displayName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  gradeBadgeWrap: {
    marginLeft: 8,
  },
  bio: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  rankProgressWrap: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // Action Buttons (equal width)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  filledBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filledBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  outlineBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  supportEmoji: {
    fontSize: fontSize.tabLabel,
  },

  // Section
  sectionWrap: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 12,
  },

  // Featured Post Card
  featuredCard: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  featuredTitle: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.heading,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredDesc: {
    fontSize: fontSize.micro,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredMetaText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: 'rgba(255,255,255,0.85)',
  },
  featuredDate: {
    fontSize: fontSize.micro,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 'auto',
  },

  // Collections
  collectionsScroll: {
    gap: 10,
  },
  collectionCard: {
    width: COLLECTION_WIDTH,
    height: 100,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  collectionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  collectionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  collectionName: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
    marginBottom: 2,
  },
  collectionCount: {
    fontSize: fontSize.micro,
    color: 'rgba(255,255,255,0.8)',
  },
  collectionAddCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.lg,
  },
  collectionAddText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },

  // Collection Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnActive: {
    backgroundColor: colors.primaryAlpha8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiBtnText: {
    fontSize: 20,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },

  // Post Grid
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  postThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  postThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  multiIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  thumbStatText: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.body,
    color: '#FFFFFF',
  },
  thumbPlayerTag: {
    fontSize: fontSize.micro2,
    fontWeight: fontWeight.name,
    color: 'rgba(255,255,255,0.85)',
    maxWidth: 60,
  },

  // Load More
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 12,
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

  // Empty States
  emptyCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyPostsText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // Edit modal
  editModal: {
    width: '85%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: 20,
  },
  editModalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  editLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  editBioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editCharCount: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  editSaveText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
