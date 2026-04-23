import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { useArchive } from '../../contexts/ArchiveContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius, layout, spacing } from '../../styles/theme';
import VideoPlayer from '../../components/common/VideoPlayer';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ArchiveTab = 'all' | 'folders';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_COLS = 3;
const GRID_ITEM = Math.floor((SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
const FOLDER_GAP = 10;
const FOLDER_COLS = 2;
const FOLDER_CARD_W = (SCREEN_WIDTH - 32 - FOLDER_GAP) / FOLDER_COLS;

export default function ArchiveScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const archive = useArchive();
  const { getPhotoPost } = usePhotographer();

  const [activeTab, setActiveTab] = useState<ArchiveTab>('all');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

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

  // Create folder modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Post action modal (long-press on grid item)
  const [actionPostId, setActionPostId] = useState<string | null>(null);

  // Folder picker modal
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [folderPickerPostId, setFolderPickerPostId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Rename folder modal (cross-platform, since Alert.prompt is iOS-only)
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderText, setRenameFolderText] = useState('');
  const [newFolderForPost, setNewFolderForPost] = useState('');

  // Derived data
  const savedPosts = useMemo(
    () => archive.savedPostIds.map((id) => getPhotoPost(id)).filter(Boolean),
    [archive.savedPostIds, getPhotoPost],
  );

  const openFolder = useMemo(
    () => archive.folders.find((f) => f.id === openFolderId) ?? null,
    [archive.folders, openFolderId],
  );

  const openFolderPosts = useMemo(
    () => (openFolder?.postIds.map((id) => getPhotoPost(id)).filter(Boolean) ?? []),
    [openFolder, getPhotoPost],
  );

  const actionPost = useMemo(
    () => (actionPostId ? getPhotoPost(actionPostId) : null),
    [actionPostId, getPhotoPost],
  );

  // ── Handlers ──

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    archive.createFolder(name);
    setNewFolderName('');
    setCreateModalVisible(false);
  };

  const handleRenameFolder = () => {
    if (!renameFolderId || !renameFolderText.trim()) return;
    archive.renameFolder(renameFolderId, renameFolderText.trim());
    setRenameFolderId(null);
    setRenameFolderText('');
  };

  const handleFolderLongPress = (folder: { id: string; name: string }) => {
    Alert.alert(
      folder.name,
      '',
      [
        {
          text: t('archive_folder_rename'),
          onPress: () => {
            setRenameFolderText(folder.name);
            setRenameFolderId(folder.id);
          },
        },
        {
          text: t('archive_folder_delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('archive_folder_delete'), t('archive_folder_delete_confirm'), [
              { text: t('btn_cancel'), style: 'cancel' },
              { text: t('btn_delete'), style: 'destructive', onPress: () => archive.deleteFolder(folder.id) },
            ]);
          },
        },
        { text: t('btn_cancel'), style: 'cancel' },
      ],
    );
  };

  const handlePostLongPress = (postId: string) => {
    setActionPostId(postId);
  };

  const handleMoveToFolder = () => {
    setFolderPickerPostId(actionPostId);
    setActionPostId(null);
    setFolderPickerVisible(true);
  };

  const handleRemoveFromArchive = () => {
    if (actionPostId) archive.purgePost(actionPostId);
    setActionPostId(null);
  };

  const handleSelectFolder = (folderId: string) => {
    if (!folderPickerPostId) return;
    const folder = archive.folders.find((f) => f.id === folderId);
    if (folder?.postIds.includes(folderPickerPostId)) {
      Alert.alert(t('archive_already_in_folder'));
      return;
    }
    archive.addPostToFolder(folderId, folderPickerPostId);
    setFolderPickerVisible(false);
    setFolderPickerPostId(null);
    setShowNewFolderInput(false);
    setNewFolderForPost('');
  };

  const handleCreateFolderAndAdd = () => {
    const name = newFolderForPost.trim();
    if (!name || !folderPickerPostId) return;
    const newId = archive.createFolder(name);
    archive.addPostToFolder(newId, folderPickerPostId);
    setFolderPickerVisible(false);
    setFolderPickerPostId(null);
    setShowNewFolderInput(false);
    setNewFolderForPost('');
  };

  // ── Render helpers ──

  const renderPhotoGrid = (posts: ReturnType<typeof getPhotoPost>[], allowLongPress = true) => {
    const valid = posts.filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined);
    return (
      <FlatList
        data={valid}
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLS}
        scrollEnabled={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={{ gap: GRID_GAP }}
        renderItem={({ item: post }) => {
          const previewUri = post.thumbnail_urls?.[0] ?? post.images[0];
          const hasVideo = (post.videos?.length ?? 0) > 0;
          const videoUri = post.videos?.[0];
          const isVisible = visibleIds.has(post.id);
          return (
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
              onLongPress={allowLongPress ? () => handlePostLongPress(post.id) : undefined}
            >
              {/* Plan 04-10 Sub-issue B: video-first — 혼합/영상-only 포스트는 VideoPlayer(feed) 로 viewport autoplay */}
              {hasVideo && videoUri ? (
                <VideoPlayer
                  uri={videoUri}
                  mode="feed"
                  width={GRID_ITEM}
                  height={GRID_ITEM}
                  isVisible={isVisible}
                />
              ) : previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.gridImage} />
              ) : (
                <View style={[styles.gridImage, { backgroundColor: colors.surface }]} />
              )}
              {/* videoPlayOverlay 제거 — VideoPlayer 가 시각적 재생 표현 담당 */}
              {post.images.length > 1 && !hasVideo && (
                <View style={styles.gridMediaBadge}>
                  <Ionicons name="copy-outline" size={10} color="#FFF" />
                  <Text style={styles.gridMediaText}>{post.images.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  // ── Folder detail view ──
  if (openFolder) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setOpenFolderId(null)} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.folderHeaderInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{openFolder.name}</Text>
            <Text style={styles.folderHeaderCount}>
              {t('archive_photos_count', { count: openFolder.postIds.length })}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {openFolderPosts.length > 0
            ? renderPhotoGrid(openFolderPosts, false)
            : (
              <View style={styles.emptyWrap}>
                <Ionicons name="images-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>{t('archive_saved_empty')}</Text>
              </View>
            )
          }
        </ScrollView>
      </View>
    );
  }

  // ── Main screen ──
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('tab_archive')}</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Ionicons name={activeTab === 'all' ? 'grid' : 'grid-outline'} size={16} color={activeTab === 'all' ? colors.textPrimary : colors.textSecondary} />
          <Text style={[styles.tabLabel, activeTab === 'all' && styles.tabLabelActive]}>{t('archive_all')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'folders' && styles.tabItemActive]}
          onPress={() => setActiveTab('folders')}
          activeOpacity={0.7}
        >
          <Ionicons name={activeTab === 'folders' ? 'folder' : 'folder-outline'} size={16} color={activeTab === 'folders' ? colors.textPrimary : colors.textSecondary} />
          <Text style={[styles.tabLabel, activeTab === 'folders' && styles.tabLabelActive]}>{t('archive_folders')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── ALL tab ── */}
        {activeTab === 'all' && (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statsChip}>
                <Ionicons name="bookmark" size={14} color={colors.primary} />
                <Text style={styles.statsText}>{savedPosts.length}</Text>
              </View>
            </View>

            {savedPosts.length > 0 ? (
              renderPhotoGrid(savedPosts)
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="bookmark-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>{t('archive_saved_empty')}</Text>
                <Text style={styles.emptyDesc}>{t('archive_saved_empty_desc')}</Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'Explore' })}
                >
                  <Text style={styles.emptyCtaText}>{t('archive_saved_cta')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── FOLDERS tab ── */}
        {activeTab === 'folders' && (
          <>
            {/* New Folder button */}
            <TouchableOpacity style={styles.newFolderBtn} activeOpacity={0.7} onPress={() => setCreateModalVisible(true)}>
              <View style={styles.newFolderIcon}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </View>
              <Text style={styles.newFolderText}>{t('archive_new_folder')}</Text>
            </TouchableOpacity>

            {archive.folders.length > 0 ? (
              <View style={styles.folderGrid}>
                {archive.folders.map((folder) => {
                  const coverPost = folder.postIds.length > 0 ? getPhotoPost(folder.postIds[0]) : null;
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      style={styles.folderCard}
                      activeOpacity={0.8}
                      onPress={() => setOpenFolderId(folder.id)}
                      onLongPress={() => handleFolderLongPress(folder)}
                    >
                      <View style={styles.folderCover}>
                        {coverPost ? (
                          <Image source={{ uri: coverPost.images[0] }} style={styles.folderCoverImage} />
                        ) : (
                          <View style={styles.folderCoverEmpty}>
                            <Ionicons name="folder-outline" size={32} color={colors.textTertiary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.folderInfo}>
                        <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                        <Text style={styles.folderCount}>
                          {t('archive_photos_count', { count: folder.postIds.length })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="folder-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>{t('archive_folders_empty')}</Text>
                <Text style={styles.emptyDesc}>{t('archive_folders_empty_desc')}</Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  activeOpacity={0.7}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <Ionicons name="add" size={18} color={colors.buttonPrimaryText} />
                  <Text style={styles.emptyCtaText}>{t('archive_folders_cta')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Create Folder Modal ── */}
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCreateModalVisible(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('archive_create_folder')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('archive_folder_name_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              maxLength={30}
            />
            <TouchableOpacity
              style={[styles.modalBtn, !newFolderName.trim() && styles.modalBtnDisabled]}
              activeOpacity={0.8}
              onPress={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              <Text style={styles.modalBtnText}>{t('archive_create_folder')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Rename Folder Modal ── */}
      <Modal visible={!!renameFolderId} transparent animationType="slide" onRequestClose={() => setRenameFolderId(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRenameFolderId(null)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('archive_folder_rename')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('archive_folder_name_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={renameFolderText}
              onChangeText={setRenameFolderText}
              autoFocus
              maxLength={30}
            />
            <TouchableOpacity
              style={[styles.modalBtn, !renameFolderText.trim() && styles.modalBtnDisabled]}
              activeOpacity={0.8}
              onPress={handleRenameFolder}
              disabled={!renameFolderText.trim()}
            >
              <Text style={styles.modalBtnText}>{t('btn_confirm')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Post Action Modal ── */}
      <Modal visible={!!actionPostId} transparent animationType="slide" onRequestClose={() => setActionPostId(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionPostId(null)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            {actionPost && (
              <Text style={styles.modalTitle} numberOfLines={1}>{actionPost.title}</Text>
            )}
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={handleMoveToFolder}>
              <Ionicons name="folder-outline" size={20} color={colors.primary} />
              <Text style={styles.actionText}>{t('archive_add_to_folder')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={handleRemoveFromArchive}>
              <Ionicons name="bookmark-outline" size={20} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>{t('archive_remove_from_archive')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Folder Picker Modal ── */}
      <Modal visible={folderPickerVisible} transparent animationType="slide" onRequestClose={() => { setFolderPickerVisible(false); setShowNewFolderInput(false); setNewFolderForPost(''); }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setFolderPickerVisible(false); setShowNewFolderInput(false); setNewFolderForPost(''); }}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('archive_choose_folder')}</Text>

            {archive.folders.map((folder) => {
              const alreadyIn = folderPickerPostId ? folder.postIds.includes(folderPickerPostId) : false;
              return (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.pickerRow, alreadyIn && { opacity: 0.4 }]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectFolder(folder.id)}
                  disabled={alreadyIn}
                >
                  <Ionicons name="folder" size={20} color={colors.primary} />
                  <Text style={styles.pickerRowText}>{folder.name}</Text>
                  {alreadyIn && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                </TouchableOpacity>
              );
            })}

            {/* Create new folder inline */}
            {showNewFolderInput ? (
              <View style={styles.pickerNewRow}>
                <TextInput
                  style={styles.pickerNewInput}
                  placeholder={t('archive_folder_name_placeholder')}
                  placeholderTextColor={colors.textTertiary}
                  value={newFolderForPost}
                  onChangeText={setNewFolderForPost}
                  autoFocus
                  maxLength={30}
                />
                <TouchableOpacity
                  onPress={handleCreateFolderAndAdd}
                  disabled={!newFolderForPost.trim()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={28} color={newFolderForPost.trim() ? colors.primary : colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickerRow} activeOpacity={0.7} onPress={() => setShowNewFolderInput(true)}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.pickerRowText, { color: colors.primary }]}>{t('archive_new_folder')}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderHeaderInfo: {
    flex: 1,
  },
  folderHeaderCount: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: layout.tabBarHeight + 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryAlpha8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.round,
  },
  statsText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },

  // Image Grid
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: GRID_ITEM,
    height: GRID_ITEM,
    backgroundColor: colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridMediaBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.overlayHeavy,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoPlayOverlay: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  gridMediaText: {
    fontSize: fontSize.micro2,
    fontWeight: fontWeight.name,
    color: '#FFFFFF',
  },

  // Empty
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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

  // New Folder button
  newFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newFolderIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryAlpha8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newFolderText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },

  // Folder Grid
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: FOLDER_GAP,
    marginTop: 12,
  },
  folderCard: {
    width: FOLDER_CARD_W,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  folderCover: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
  },
  folderCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  folderCoverEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderInfo: {
    padding: 12,
    gap: 2,
  },
  folderName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  folderCount: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  modalBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnDisabled: {
    opacity: 0.4,
  },
  modalBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },

  // Action rows (post action modal)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },

  // Picker rows (folder picker modal)
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerRowText: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  pickerNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  pickerNewInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
});
