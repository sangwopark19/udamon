import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import { KBO_TEAMS } from '../../constants/teams';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'FollowingList'>;
type Tab = 'following' | 'followers';

export default function FollowingListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { photographers, followedPgIds, toggleFollow, isFollowing } = usePhotographer();
  // TODO (Phase 5): Plan 03 Context 에서 followerPgIds (mock 의존) 제거됨.
  // Phase 5 에서 photographerApi.fetchFollowers(userId) 또는 inverse query 로 교체 예정.
  const followerPgIds = useMemo(() => new Set<string>(), []);

  const [activeTab, setActiveTab] = useState<Tab>(route.params?.initialTab ?? 'following');

  const followingList = useMemo(
    () => photographers.filter((pg) => followedPgIds.has(pg.id)),
    [photographers, followedPgIds],
  );

  const followerList = useMemo(
    () => photographers.filter((pg) => followerPgIds.has(pg.id)),
    [photographers, followerPgIds],
  );

  const list = activeTab === 'following' ? followingList : followerList;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'following', label: t('follow_following'), count: followedPgIds.size },
    { id: 'followers', label: t('follow_followers'), count: followerList.length },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('follow_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            <Text style={[styles.tabCount, activeTab === tab.id && styles.tabCountActive]}>
              {tab.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'following' ? t('follow_empty_following') : t('follow_empty_followers')}
            </Text>
            <Text style={styles.emptyDesc}>
              {activeTab === 'following' ? t('follow_empty_following_desc') : t('follow_empty_followers_desc')}
            </Text>
          </View>
        ) : (
          list.map((pg) => {
            const team = pg.team_id ? KBO_TEAMS.find((t) => t.id === pg.team_id) : null;
            const following = isFollowing(pg.id);
            return (
              <TouchableOpacity
                key={pg.id}
                style={styles.userItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PhotographerProfile', { photographerId: pg.id })}
              >
                <View style={[styles.avatar, team && { borderColor: team.color }]}>
                  {pg.avatar_url ? (
                    <Image source={{ uri: pg.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={20} color={colors.textTertiary} />
                  )}
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.displayName}>{pg.display_name}</Text>
                    {pg.is_verified && (
                      <Ionicons name="checkmark-circle" size={14} color={colors.verified} />
                    )}
                  </View>
                  <Text style={styles.userMeta}>
                    {team?.shortName ?? ''}
                    {team ? ' · ' : ''}
                    {t('pg_posts')} {pg.post_count}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.followBtn, following ? styles.followBtnFollowing : styles.followBtnFollow]}
                  onPress={() => toggleFollow(pg.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.followBtnText, following ? styles.followBtnTextFollowing : styles.followBtnTextFollow]}>
                    {following ? t('btn_following') : t('btn_follow')}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  tabCount: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.heading,
    color: colors.textTertiary,
  },
  tabCountActive: {
    color: colors.primary,
  },

  scrollContent: {
    paddingTop: 8,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },

  // User Item
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  userMeta: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  followBtnFollow: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followBtnFollowing: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  followBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
  },
  followBtnTextFollow: {
    color: colors.buttonPrimaryText,
  },
  followBtnTextFollowing: {
    color: colors.textSecondary,
  },
});
