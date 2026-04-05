import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useToast } from '../../contexts/ToastContext';
import { KBO_TEAMS } from '../../constants/teams';
import type { RootStackParamList } from '../../types/navigation';
import type { PhotoPost, Player } from '../../types/photographer';
import type { Cheerleader } from '../../types/cheerleader';
import ImageEditorModal from '../../components/common/ImageEditorModal';
import * as photographerApi from '../../services/photographerApi';
import { optimizeImage } from '../../utils/image';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'UploadPost'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_PHOTOS = 10;
const MAX_VIDEOS = 3;

export default function UploadPostScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user, session } = useAuth();
  const { getPlayersByTeam, getCheerleadersByTeam, getPhotoPost, addPhotoPost, deletePhotoPost, getCollectionsForPg, addPostToCollection, isRemote, getPhotographer } = usePhotographer();
  const { showToast } = useToast();

  const isEditing = !!route.params?.postId;
  const existingPost = isEditing ? getPhotoPost(route.params!.postId!) : undefined;

  // Form State
  const [title, setTitle] = useState(existingPost?.title ?? '');
  const [description, setDescription] = useState(existingPost?.description ?? '');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(existingPost?.team_id ?? null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(existingPost?.player_id ?? null);
  const [selectedCheerleaderId, setSelectedCheerleaderId] = useState<string | null>(existingPost?.cheerleader_id ?? null);
  const [images, setImages] = useState<string[]>(existingPost?.images ?? []);
  const [videos, setVideos] = useState<string[]>([]);
  const [rightsConfirmed, setRightsConfirmed] = useState(isEditing);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const myCollections = useMemo(
    () => (user?.id ? getCollectionsForPg(user.id) : []),
    [user?.id, getCollectionsForPg],
  );

  const teamPlayers = useMemo(
    () => (selectedTeamId ? getPlayersByTeam(selectedTeamId) : []),
    [selectedTeamId, getPlayersByTeam],
  );

  const teamCheerleaders = useMemo(
    () => (selectedTeamId ? getCheerleadersByTeam(selectedTeamId) : []),
    [selectedTeamId, getCheerleadersByTeam],
  );

  const canPublish =
    title.trim().length > 0 &&
    selectedTeamId !== null &&
    images.length > 0 &&
    (isEditing || rightsConfirmed);

  const handleAddMedia = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert(t('upload_max_photos'), t('upload_max_photos_desc', { max: MAX_PHOTOS }));
      return;
    }

    const remaining = MAX_PHOTOS - images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_PHOTOS));
    }
  };

  const handleAddVideo = async () => {
    if (videos.length >= MAX_VIDEOS) {
      Alert.alert(t('upload_max_videos'), t('upload_max_videos_desc', { max: MAX_VIDEOS }));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setVideos((prev) => [...prev, result.assets[0].uri].slice(0, MAX_VIDEOS));
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveVideo = (idx: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditSave = (uri: string) => {
    if (editingImageIdx !== null) {
      setImages((prev) => prev.map((img, i) => (i === editingImageIdx ? uri : img)));
    }
    setEditingImageIdx(null);
  };

  const doPublish = async () => {
    const team = KBO_TEAMS.find((t) => t.id === selectedTeamId);
    const player = teamPlayers.find((p) => p.id === selectedPlayerId);
    const cheerleader = teamCheerleaders.find((c) => c.id === selectedCheerleaderId);
    const now = new Date().toISOString();

    if (isEditing && existingPost) {
      deletePhotoPost(existingPost.id);
      const updated: PhotoPost = {
        ...existingPost,
        title: title.trim(),
        description: description.trim(),
        team_id: selectedTeamId!,
        player_id: selectedPlayerId,
        cheerleader_id: selectedCheerleaderId,
        images,
        updated_at: now,
        team: { name_ko: team?.nameKo ?? '' },
        player: player ? { name_ko: player.name_ko, number: player.number } : null,
        cheerleader: cheerleader ? { name: cheerleader.name } : null,
      };
      addPhotoPost(updated);
      showToast(t('btn_done'));
      navigation.goBack();
      return;
    }

    // New post flow
    let finalImages = images;
    const userId = user?.id ?? '';
    const pg = getPhotographer(userId);

    // Upload images to Storage if remote
    if (isRemote && userId && session) {
      setUploading(true);
      try {
        // Optimize images before upload
        const optimized = await Promise.all(images.map(optimizeImage));
        const uploadResult = await photographerApi.uploadPostImages(userId, optimized);
        if (uploadResult.error || !uploadResult.data) {
          showToast(uploadResult.error ?? 'Upload failed');
          setUploading(false);
          return;
        }
        finalImages = uploadResult.data;

        // Create post in DB
        const postResult = await photographerApi.createPhotoPost({
          photographerId: pg?.id ?? userId,
          teamSlug: selectedTeamId!,
          playerId: selectedPlayerId,
          title: title.trim(),
          description: description.trim(),
          images: finalImages,
        });

        if (postResult.error || !postResult.data) {
          showToast(postResult.error ?? 'Post creation failed');
          setUploading(false);
          return;
        }

        // Add to local state for immediate display
        addPhotoPost(postResult.data);
        if (selectedCollectionId) {
          addPostToCollection(selectedCollectionId, postResult.data.id);
        }
      } catch {
        showToast('Upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    } else {
      // Local-only (mock mode)
      const newPost: PhotoPost = {
        id: `pp-${Date.now()}`,
        photographer_id: pg?.id ?? userId,
        team_id: selectedTeamId!,
        player_id: selectedPlayerId,
        cheerleader_id: selectedCheerleaderId,
        title: title.trim(),
        description: description.trim(),
        images: finalImages,
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        is_featured: false,
        status: 'pending' as const,
        created_at: now,
        updated_at: now,
        photographer: {
          display_name: user?.display_name ?? user?.username ?? 'Photographer',
          avatar_url: user?.avatar_url ?? null,
          is_verified: false,
        },
        team: { name_ko: team?.nameKo ?? '' },
        player: player ? { name_ko: player.name_ko, number: player.number } : null,
        cheerleader: cheerleader ? { name: cheerleader.name } : null,
      };
      addPhotoPost(newPost);
      if (selectedCollectionId) {
        addPostToCollection(selectedCollectionId, newPost.id);
      }
    }

    setShowReviewModal(true);
  };

  const handlePublish = () => {
    Alert.alert(
      isEditing ? t('upload_edit_title') : t('upload_confirm'),
      isEditing ? t('upload_confirm_edit') : t('upload_confirm_upload'),
      [
        { text: t('btn_cancel'), style: 'cancel' },
        { text: t('btn_confirm'), onPress: doPublish },
      ],
    );
  };

  const handleClose = () => {
    if (title || description || images.length > 0) {
      Alert.alert(t('upload_cancel'), t('upload_cancel_desc'), [
        { text: t('upload_cancel_continue'), style: 'cancel' },
        { text: t('upload_cancel_leave'), style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? t('upload_edit_title') : t('upload_title')}</Text>
        <TouchableOpacity
          style={[styles.publishBtn, (!canPublish || uploading) && styles.publishBtnDisabled]}
          onPress={handlePublish}
          activeOpacity={0.8}
          disabled={!canPublish || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Text style={[styles.publishBtnText, !canPublish && styles.publishBtnTextDisabled]}>
              {isEditing ? t('btn_edit') : t('upload_submit')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('upload_photo_label')}</Text>
          {images.length === 0 && !isEditing ? (
            <TouchableOpacity style={styles.mediaPlaceholder} onPress={handleAddMedia} activeOpacity={0.7}>
              <View style={styles.mediaIconWrap}>
                <Ionicons name="add-circle-outline" size={40} color={colors.textTertiary} />
              </View>
              <Text style={styles.mediaPlaceholderTitle}>{t('upload_add_photo_prompt')}</Text>
              <Text style={styles.mediaPlaceholderDesc}>{t('upload_add_photo_desc', { max: MAX_PHOTOS })}</Text>
            </TouchableOpacity>
          ) : (
            <View>
              {/* Main Preview */}
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                  <View style={styles.mainPreview}>
                    <Image source={{ uri: item }} style={styles.mainPreviewImage} />
                  </View>
                )}
              />
              {/* Thumbnails — tap to edit (new only), X to remove */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
                {images.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.thumbItem}
                    activeOpacity={0.8}
                    onPress={() => { if (!isEditing) setEditingImageIdx(i); }}
                  >
                    <Image source={{ uri }} style={styles.thumbImage} />
                    {!isEditing && (
                      <View style={styles.thumbEditBadge}>
                        <Ionicons name="create-outline" size={12} color="#fff" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => handleRemoveImage(i)}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                {!isEditing && images.length < MAX_PHOTOS && (
                  <TouchableOpacity style={styles.thumbAdd} onPress={handleAddMedia}>
                    <Ionicons name="add" size={24} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </ScrollView>
              <Text style={styles.mediaCount}>{t('upload_photo_count', { current: images.length, max: MAX_PHOTOS })}</Text>
            </View>
          )}

          {/* Upload Guidelines */}
          {!isEditing && (
            <View style={styles.guidelineBox}>
              <View style={styles.guidelineRow}>
                <Ionicons name="camera-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.guidelineText}>{t('upload_guide_own_photo')}</Text>
              </View>
              <View style={styles.guidelineRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.guidelineText}>{t('upload_guide_inappropriate')}</Text>
              </View>
            </View>
          )}

          {/* Video Section */}
          <View style={styles.videoSection}>
            <View style={styles.videoHeader}>
              <Ionicons name="videocam-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.videoLabel}>{t('upload_video_label')} ({videos.length}/{MAX_VIDEOS})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.videoRow}>
                {videos.map((uri, i) => (
                  <View key={i} style={styles.videoThumb}>
                    <View style={styles.videoPlaceholderInner}>
                      <Ionicons name="play-circle" size={24} color={colors.buttonPrimaryText} />
                    </View>
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => handleRemoveVideo(i)}>
                      <Ionicons name="close-circle" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {videos.length < MAX_VIDEOS && (
                  <TouchableOpacity style={styles.videoAddBtn} onPress={handleAddVideo}>
                    <Ionicons name="add" size={22} color={colors.textTertiary} />
                    <Text style={styles.videoAddText}>{t('upload_add_video')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Team Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('upload_team_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {KBO_TEAMS.map((team) => {
                const isSelected = selectedTeamId === team.id;
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.chip,
                      isSelected
                        ? { backgroundColor: team.color, borderColor: team.color }
                        : { backgroundColor: colors.surfaceElevated, borderColor: team.color },
                      isEditing && styles.chipDisabled,
                    ]}
                    onPress={() => {
                      if (isEditing) return;
                      setSelectedTeamId(isSelected ? null : team.id);
                      setSelectedPlayerId(null);
                      setSelectedCheerleaderId(null);
                    }}
                    activeOpacity={isEditing ? 1 : 0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? team.textColor : team.color },
                      ]}
                    >
                      {team.shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Player & Cheerleader Tag */}
        {selectedTeamId && (teamPlayers.length > 0 || teamCheerleaders.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('upload_tag_label')}</Text>
            <View style={styles.tagGuide}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.tagGuideText}>{t('upload_tag_guide')}</Text>
            </View>

            {teamPlayers.length > 0 && (
              <>
                <Text style={styles.tagSubLabel}>{t('upload_tag_player')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {teamPlayers.map((player) => {
                      const isSelected = selectedPlayerId === player.id;
                      return (
                        <TouchableOpacity
                          key={player.id}
                          style={[
                            styles.playerChip,
                            isSelected && styles.playerChipActive,
                            isEditing && styles.chipDisabled,
                          ]}
                          onPress={() => { if (!isEditing) setSelectedPlayerId(isSelected ? null : player.id); }}
                          activeOpacity={isEditing ? 1 : 0.7}
                        >
                          <Text style={[styles.playerChipText, isSelected && styles.playerChipTextActive]}>
                            #{player.number} {player.name_ko}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {teamCheerleaders.length > 0 && (
              <>
                <Text style={[styles.tagSubLabel, teamPlayers.length > 0 && { marginTop: 14 }]}>{t('upload_tag_cheerleader')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {teamCheerleaders.map((cl) => {
                      const isSelected = selectedCheerleaderId === cl.id;
                      return (
                        <TouchableOpacity
                          key={cl.id}
                          style={[
                            styles.playerChip,
                            isSelected && styles.playerChipActive,
                            isEditing && styles.chipDisabled,
                          ]}
                          onPress={() => { if (!isEditing) setSelectedCheerleaderId(isSelected ? null : cl.id); }}
                          activeOpacity={isEditing ? 1 : 0.7}
                        >
                          <Text style={[styles.playerChipText, isSelected && styles.playerChipTextActive]}>
                            {cl.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        )}

        {/* Collection Selection */}
        {!isEditing && myCollections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('upload_collection_label')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.collectionChip,
                    !selectedCollectionId && styles.collectionChipActive,
                  ]}
                  onPress={() => setSelectedCollectionId(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.collectionChipText, !selectedCollectionId && styles.collectionChipTextActive]}>
                    {t('upload_collection_none')}
                  </Text>
                </TouchableOpacity>
                {myCollections.map((col) => {
                  const isSelected = selectedCollectionId === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[styles.collectionChip, isSelected && styles.collectionChipActive]}
                      onPress={() => setSelectedCollectionId(isSelected ? null : col.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.collectionChipText, isSelected && styles.collectionChipTextActive]}>
                        {col.emoji} {col.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('upload_post_title')}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder={t('upload_title_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={40}
            />
          </View>
          <Text style={styles.charCount}>{title.length}/40</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('upload_desc_label')}</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              style={styles.textArea}
              placeholder={t('upload_desc_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Rights Confirmation */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.rightsRow}
            onPress={() => setRightsConfirmed(!rightsConfirmed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rightsConfirmed && styles.checkboxActive]}>
              {rightsConfirmed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.rightsText}>
              {t('upload_rights_confirm')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete (edit mode) */}
        {isEditing && (
          <TouchableOpacity
            style={styles.deleteBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(t('upload_delete'), t('upload_delete_confirm'), [
                { text: t('btn_cancel'), style: 'cancel' },
                { text: t('btn_delete'), style: 'destructive', onPress: () => { deletePhotoPost(existingPost!.id); showToast(t('post_deleted')); navigation.goBack(); } },
              ])
            }
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteBtnText}>{t('upload_delete')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Image Editor */}
      {editingImageIdx !== null && (
        <ImageEditorModal
          visible
          imageUri={images[editingImageIdx]}
          onClose={() => setEditingImageIdx(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Review Success Modal */}
      <Modal visible={showReviewModal} transparent animationType="fade">
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.reviewIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
            </View>
            <Text style={styles.reviewTitle}>{t('upload_review_title')}</Text>
            <Text style={styles.reviewDesc}>{t('upload_review_desc')}</Text>
            <TouchableOpacity
              style={styles.reviewBtn}
              activeOpacity={0.8}
              onPress={() => { setShowReviewModal(false); navigation.goBack(); }}
            >
              <Text style={styles.reviewBtnText}>{t('btn_confirm')}</Text>
            </TouchableOpacity>
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
  publishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  publishBtnDisabled: {
    opacity: 0.4,
  },
  publishBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
  publishBtnTextDisabled: {
    color: colors.buttonPrimaryText,
  },

  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Media Placeholder
  mediaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  mediaIconWrap: {
    marginBottom: 4,
  },
  mediaPlaceholderTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  mediaPlaceholderDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // Main Preview
  mainPreview: {
    width: SCREEN_WIDTH - 32,
    aspectRatio: 4 / 5,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  mainPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Thumbnails
  thumbStrip: {
    marginTop: 10,
  },
  thumbItem: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: 8,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbEditBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  thumbAdd: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaCount: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    marginTop: 8,
  },

  // Video
  videoSection: { marginTop: 16 },
  videoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  videoLabel: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textSecondary },
  videoRow: { flexDirection: 'row', gap: 8 },
  videoThumb: {
    width: 80, height: 80, borderRadius: radius.md,
    backgroundColor: colors.primary, overflow: 'hidden',
  },
  videoPlaceholderInner: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  videoAddBtn: {
    width: 80, height: 80, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  videoAddText: { fontSize: fontSize.tiny, color: colors.textTertiary },

  // Tag guide
  tagGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  tagGuideText: {
    flex: 1,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    lineHeight: 18,
  },
  tagSubLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
    marginBottom: 8,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.round,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
  },

  // Collection Chips
  collectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collectionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  collectionChipText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  collectionChipTextActive: {
    color: colors.buttonPrimaryText,
  },

  // Player Chips
  playerChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  playerChipText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  playerChipTextActive: {
    color: colors.buttonPrimaryText,
  },

  // Input
  inputWrap: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  charCount: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },

  // TextArea
  textAreaWrap: {
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // Rights
  rightsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rightsText: {
    flex: 1,
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Disabled chip (edit mode)
  chipDisabled: {
    opacity: 0.5,
  },

  // Upload guidelines
  guidelineBox: {
    marginTop: 12,
    gap: 6,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guidelineText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // Review success modal
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  reviewModal: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  reviewIconWrap: {
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  reviewDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  reviewBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  reviewBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },

  // Delete
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.error,
  },
});
