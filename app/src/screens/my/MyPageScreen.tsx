import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useArchive } from '../../contexts/ArchiveContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useBlock } from '../../contexts/BlockContext';
import { useToast } from '../../contexts/ToastContext';
import { KBO_TEAMS } from '../../constants/teams';
import TeamSelectSheet from '../../components/common/TeamSelectSheet';
import type { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fontWeight, radius, layout, shadow } from '../../styles/theme';
import { formatCount } from '../../utils/time';
import { useComingSoonModal } from '../../contexts/ComingSoonContext';
import { MESSAGE_FEATURE_ENABLED } from '../../constants/config';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GRID_PADDING = 16;
const APP_VERSION = '1.0.0';

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { user, isGuest, isPhotographer, photographerId, logout, updateUserProfile } = useAuth();
  const { posts } = useCommunity();
  const { savedPostIds } = useArchive();
  const { followedPgIds } = usePhotographer();
  const { showToast } = useToast();
  const { blockedUserIds, blockUser, isUserBlocked } = useBlock();
  const { showComingSoon } = useComingSoonModal();

  const [showTeamSheet, setShowTeamSheet] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editNickname, setEditNickname] = useState(user?.display_name ?? '');
  const [editBio, setEditBio] = useState(user?.bio ?? '');

  const nickname = user?.display_name ?? user?.username ?? t('my_guest');
  const myTeamId = user?.my_team_id ?? null;
  const myTeam = myTeamId ? KBO_TEAMS.find((t) => t.id === myTeamId) : null;
  const myPosts = posts.filter((p) => user?.id && p.user_id === user.id);

  const handleEditProfile = useCallback(() => {
    setEditNickname(user?.display_name ?? '');
    setEditBio(user?.bio ?? '');
    setShowEditProfile(true);
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    await updateUserProfile({ display_name: editNickname.trim() || null, bio: editBio.trim() || null });
    setShowEditProfile(false);
    showToast(t('profile_edit_saved'));
  }, [editNickname, editBio, updateUserProfile, showToast]);

  const handleSelectMyTeam = useCallback(async (teamId: string | null) => {
    await updateUserProfile({ my_team_id: teamId });
  }, [updateUserProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert(t('my_logout_title'), t('my_logout_confirm'), [
      { text: t('btn_cancel'), style: 'cancel' },
      { text: t('btn_logout'), style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const handleAvatarChange = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permission_denied'), t('permission_photo_library'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      await updateUserProfile({ avatar_url: result.assets[0].uri });
      showToast(t('profile_avatar_updated'));
    }
  }, [updateUserProfile, showToast, t]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MY</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (!MESSAGE_FEATURE_ENABLED) { showComingSoon('message'); return; }
              navigation.navigate('MessageList');
            }}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Card ─── */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={myTeam ? [myTeam.color, 'transparent'] : [colors.primary, 'transparent']}
            style={styles.profileGradient}
          />
          <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8} onPress={handleAvatarChange}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={36} color={colors.textSecondary} />
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={11} color={colors.buttonPrimaryText} />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{nickname}</Text>

          {/* My Team Badge */}
          {myTeam ? (
            <TouchableOpacity
              style={[styles.teamBadge, { backgroundColor: colors.surfaceElevated, borderColor: myTeam.color }]}
              activeOpacity={0.7}
              onPress={() => setShowTeamSheet(true)}
            >
              <Text style={[styles.teamBadgeText, { color: myTeam.color }]}>{myTeam.shortName}</Text>
              <Ionicons name="chevron-down" size={12} color={myTeam.color} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.teamBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => setShowTeamSheet(true)}
            >
              <Text style={[styles.teamBadgeText, { color: colors.textTertiary }]}>{t('my_team_select')}</Text>
              <Ionicons name="add" size={12} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.7}
            onPress={handleEditProfile}
          >
            <Ionicons name="create-outline" size={14} color={colors.primary} />
            <Text style={styles.editProfileBtnText}>{t('my_edit_profile')}</Text>
          </TouchableOpacity>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{myPosts.length}</Text>
              <Text style={styles.statLabel}>{t('my_stat_posts')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{savedPostIds.length}</Text>
              <Text style={styles.statLabel}>{t('my_stat_saved')}</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('FollowingList', { initialTab: 'following' })}
            >
              <Text style={styles.statNumber}>{followedPgIds.size}</Text>
              <Text style={styles.statLabel}>{t('my_stat_following')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Admin Dashboard Entry ─── */}
        {user?.is_admin && (
          <TouchableOpacity
            style={styles.adminCta}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AdminDashboard')}
          >
            <View style={styles.adminCtaIcon}>
              <Ionicons name="shield-checkmark" size={22} color="#FFF" />
            </View>
            <View style={styles.photographerCtaContent}>
              <Text style={styles.photographerCtaTitle}>{t('my_admin_dashboard')}</Text>
              <Text style={styles.photographerCtaDesc}>{t('my_admin_dashboard_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* ─── Become Photographer CTA ─── */}
        {!isPhotographer && (
          <TouchableOpacity
            style={styles.photographerCta}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PhotographerRegister')}
          >
            <View style={styles.photographerCtaIcon}>
              <Ionicons name="camera" size={24} color={colors.primary} />
            </View>
            <View style={styles.photographerCtaContent}>
              <Text style={styles.photographerCtaTitle}>{t('my_become_photographer')}</Text>
              <Text style={styles.photographerCtaDesc}>{t('my_become_photographer_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* ─── Photographer Quick Actions ─── */}
        {isPhotographer && photographerId && (
          <View style={styles.pgQuickActions}>
            <TouchableOpacity
              style={styles.pgQuickBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PhotographerProfile', { photographerId })}
            >
              <View style={[styles.pgQuickIcon, { backgroundColor: colors.primaryAlpha8 }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <Text style={styles.pgQuickLabel}>{t('my_pg_profile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pgQuickBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('UploadPost' as any)}
            >
              <View style={[styles.pgQuickIcon, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
                <Ionicons name="cloud-upload" size={20} color={colors.success} />
              </View>
              <Text style={styles.pgQuickLabel}>{t('upload_title')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pgQuickBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Studio', { photographerId })}
            >
              <View style={[styles.pgQuickIcon, { backgroundColor: 'rgba(255,159,10,0.1)' }]}>
                <Ionicons name="grid" size={20} color="#FF9F0A" />
              </View>
              <Text style={styles.pgQuickLabel}>{t('studio_title')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── My Posts Section ─── */}
        {myPosts.length > 0 && (
          <>
            <View style={styles.feedHeader}>
              <View style={styles.feedHeaderLeft}>
                <Ionicons name="create" size={16} color={colors.primary} />
                <Text style={styles.feedHeaderTitle}>{t('my_my_posts_label')}</Text>
              </View>
              <Text style={styles.seeAllLink}>{t('my_posts_count', { count: myPosts.length })}</Text>
            </View>
            <View style={styles.postListCard}>
              {myPosts.slice(0, 5).map((post, idx) => (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.postItem, idx === Math.min(myPosts.length - 1, 4) && { borderBottomWidth: 0 }]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('CommunityPostDetail', { postId: post.id })}
                >
                  <View style={styles.postItemInfo}>
                    {post.team && (() => {
                      const td = KBO_TEAMS.find((t) => t.id === post.team_id);
                      return (
                        <View style={[styles.postTeamPill, td && { borderColor: td.color }]}>
                          <Text style={[styles.postTeamPillText, td && { color: td.color }]}>{td?.shortName ?? post.team.name_ko}</Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.postItemTitle} numberOfLines={1}>{post.title}</Text>
                    <View style={styles.postItemMeta}>
                      <Ionicons name="heart" size={10} color={colors.error} />
                      <Text style={styles.postItemMetaText}>{post.like_count}</Text>
                      <Ionicons name="chatbubble" size={10} color={colors.textTertiary} />
                      <Text style={styles.postItemMetaText}>{post.comment_count}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ─── Settings ─── */}
        <View style={styles.settingsSection}>
          {/* Notifications — navigate to notifications page */}
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.settingsLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_notifications')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Blocked Users */}
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => navigation.navigate('BlockedUsers')}>
            <View style={styles.settingsLeft}>
              <Ionicons name="ban-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_blocked_users')}</Text>
              {blockedUserIds.size > 0 && (
                <View style={styles.blockCountBadge}>
                  <Text style={styles.blockCountText}>{blockedUserIds.size}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Privacy */}
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => navigation.navigate('Privacy')}>
            <View style={styles.settingsLeft}>
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_privacy_policy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Announcements */}
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => navigation.navigate('Announcements')}>
            <View style={styles.settingsLeft}>
              <Ionicons name="megaphone-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_announcements')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* 1:1 Inquiry */}
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => navigation.navigate('ContactSupport')}>
            <View style={styles.settingsLeft}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_inquiry')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Terms */}
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => navigation.navigate('Terms')}>
            <View style={styles.settingsLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_terms')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Account Management */}
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => navigation.navigate('AccountManagement')}>
            <View style={styles.settingsLeft}>
              <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_account_management')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* App Version */}
          <View style={[styles.settingsItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingsLeft}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('my_app_version')}</Text>
            </View>
            <Text style={styles.settingsValue}>{APP_VERSION}</Text>
          </View>
        </View>

        {/* ─── Logout Button ─── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>{t('btn_logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Team Select Sheet */}
      <TeamSelectSheet
        visible={showTeamSheet}
        currentTeamId={myTeamId}
        onSelect={handleSelectMyTeam}
        onClose={() => setShowTeamSheet(false)}
      />

      {/* ─── Edit Profile Modal ─── */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancel}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('profile_edit_title')}</Text>
              <TouchableOpacity onPress={handleSaveProfile} activeOpacity={0.7}>
                <Text style={styles.modalSave}>{t('btn_save')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity style={styles.modalAvatarWrap} activeOpacity={0.8} onPress={handleAvatarChange}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.modalAvatarImg} />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Ionicons name="person" size={28} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.modalAvatarBadge}>
                  <Ionicons name="camera" size={10} color={colors.buttonPrimaryText} />
                </View>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>{t('profile_edit_nickname')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('profile_edit_nickname_placeholder')}
                placeholderTextColor={colors.textTertiary}
                value={editNickname}
                onChangeText={setEditNickname}
                maxLength={20}
              />

              <Text style={[styles.modalLabel, { marginTop: 18 }]}>{t('profile_edit_bio')}</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder={t('profile_edit_bio_placeholder')}
                placeholderTextColor={colors.textTertiary}
                value={editBio}
                onChangeText={setEditBio}
                multiline
                maxLength={150}
                textAlignVertical="top"
              />
              <Text style={styles.modalCharCount}>{editBio.length}/150</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: layout.tabBarHeight + 20 },

  // ─── Header ───
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },

  // ─── Profile Card ───
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginHorizontal: GRID_PADDING,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    opacity: 0.12,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: 'rgba(27, 42, 74, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.round,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.round,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  teamBadgeText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.heading,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: 'rgba(27, 42, 74, 0.20)',
    marginBottom: 18,
  },
  editProfileBtnText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  statLabel: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // ─── Feed Section Headers ───
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    marginTop: 24,
    marginBottom: 12,
  },
  feedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedHeaderTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  seeAllLink: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },

  // ─── Admin CTA ───
  adminCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: GRID_PADDING,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
  },
  adminCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Photographer CTA ───
  photographerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: GRID_PADDING,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryAlpha15,
  },
  photographerCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.xxl,
    backgroundColor: colors.primaryAlpha8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photographerCtaContent: {
    flex: 1,
  },
  photographerCtaTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  photographerCtaDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },

  // ─── Photographer Quick Actions ───
  pgQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: GRID_PADDING,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  pgQuickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  pgQuickIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pgQuickLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ─── My Posts ───
  postListCard: {
    marginHorizontal: GRID_PADDING,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  postItemInfo: {
    flex: 1,
  },
  postTeamPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 4,
  },
  postTeamPillText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
  },
  postItemTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  postItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postItemMetaText: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
    marginRight: 6,
  },

  // ─── Settings ───
  settingsSection: {
    marginHorizontal: GRID_PADDING,
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  settingsItemSwitch: {
    paddingVertical: 10,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  blockCountBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  blockCountText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsValue: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // ─── Logout ───
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: GRID_PADDING,
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.error,
  },

  // ─── Modal Shared ───
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  modalCancel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  modalSave: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.primary,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTextArea: {
    height: 100,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  modalAvatarWrap: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: radius.round,
  },
  modalAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  modalCharCount: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },

});
