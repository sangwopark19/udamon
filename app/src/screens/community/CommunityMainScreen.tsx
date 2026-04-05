import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useLoginGate } from '../../hooks/useLoginGate';

import { useAuth } from '../../contexts/AuthContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useNotification } from '../../contexts/NotificationContext';
import type { CommunityPostWithAuthor, PostSortOrder } from '../../types/community';
import type { RootStackParamList } from '../../types/navigation';
import TeamTabBar from '../../components/community/TeamTabBar';
import CommunityPostCard from '../../components/community/CommunityPostCard';
import { colors, fontSize, fontWeight, layout, spacing } from '../../styles/theme';
import { CommunitySkeleton } from '../../components/common/Skeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SORT_I18N: Record<PostSortOrder, string> = {
  popular: 'community_sort_popular',
  latest: 'community_sort_latest',
  likes: 'community_sort_likes',
  comments: 'community_sort_comments',
};

export default function CommunityMainScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const SORT_OPTIONS: { key: PostSortOrder; label: string }[] = [
    { key: 'popular', label: t(SORT_I18N.popular) },
    { key: 'latest', label: t(SORT_I18N.latest) },
    { key: 'likes', label: t(SORT_I18N.likes) },
    { key: 'comments', label: t(SORT_I18N.comments) },
  ];
  const { user } = useAuth();
  const { getFilteredPosts, refreshPosts } = useCommunity();
  const { unreadCount: notifUnread } = useNotification();
  const requireLogin = useLoginGate();

  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [sortOrder, setSortOrder] = useState<PostSortOrder>('latest');
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const posts = getFilteredPosts(selectedTeamId, sortOrder, page);

  const availableSorts = SORT_OPTIONS;

  const handleTeamSelect = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setPage(0);
  }, [sortOrder]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshPosts();
    setPage(0);
    setTimeout(() => setRefreshing(false), 500);
  }, [refreshPosts]);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate('CommunityPostDetail', { postId });
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('CommunitySearch');
  }, [navigation]);

  const handleWritePress = useCallback(() => {
    if (!requireLogin()) return;
    const teamParam = selectedTeamId !== 'all' ? selectedTeamId : undefined;
    navigation.navigate('CommunityWrite', teamParam ? { teamId: teamParam } : undefined);
  }, [navigation, requireLogin, selectedTeamId]);

  const renderPost = useCallback(({ item }: { item: CommunityPostWithAuthor }) => (
    <CommunityPostCard post={item} onPress={handlePostPress} />
  ), [handlePostPress]);

  const renderEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="chatbubbles-outline" size={40} color={colors.textTertiary} />
      <Text style={styles.emptyText}>{t('community_empty')}</Text>
    </View>
  ), [t]);

  const renderHeader = useCallback(() => (
    <>
      <TeamTabBar selectedTeamId={selectedTeamId} onSelect={handleTeamSelect} myTeamId={user?.my_team_id} />
      <View style={styles.sortBar}>
        {availableSorts.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setSortOrder(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.sortLabel,
              sortOrder === opt.key && styles.sortLabelActive,
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  ), [selectedTeamId, sortOrder, availableSorts, handleTeamSelect]);

  if (!ready) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CommunitySkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('community_title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={handleSearchPress}>
            <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            {notifUnread > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifUnread > 99 ? '99+' : notifUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Post list */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={() => setPage((p) => p + 1)}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.tabBarHeight + 20 }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={handleWritePress}
        activeOpacity={0.8}
        accessibilityLabel={t('a11y_write')}
      >
        <Ionicons name="pencil" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: fontSize.micro2, fontWeight: fontWeight.name, color: colors.buttonPrimaryText, lineHeight: 12 },
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  sortLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.heading,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
