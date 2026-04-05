import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { KBO_TEAMS } from '../../constants/teams';
import { usePhotographer } from '../../contexts/PhotographerContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, radius, fontSize, fontWeight } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const POPULAR_TEAM_IDS = ['lg', 'kia', 'samsung', 'doosan'];

export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { photographers, photoPosts } = usePhotographer();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const POPULAR_KEYWORDS = ['두산', '기아', 'LG', '홈런', '포수', '선발투수'];

  const handleSearch = useCallback((keyword: string) => {
    setQuery(keyword);
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== keyword);
      return [keyword, ...filtered].slice(0, 10);
    });
  }, []);

  const removeRecent = useCallback((keyword: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== keyword));
  }, []);

  // Search teams
  const teamResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return KBO_TEAMS.filter(
      (t) => t.nameKo.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q),
    );
  }, [query]);

  // Search photographers
  const photographerResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return photographers.filter((p) => p.display_name.toLowerCase().includes(q));
  }, [query, photographers]);

  // Search photo posts
  const postResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return photoPosts
      .filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, photoPosts]);

  const hasResults = teamResults.length > 0 || photographerResults.length > 0 || postResults.length > 0;
  const showNoResults = query.trim().length > 0 && !hasResults;
  const popularTeams = KBO_TEAMS.filter((t) => POPULAR_TEAM_IDS.includes(t.id));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.input}
            placeholder={t('search_placeholder')}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Team Results */}
        {teamResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TEAMS</Text>
            {teamResults.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={styles.resultItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
              >
                <View style={[styles.resultAvatar, { borderColor: team.color }]}>
                  <Text style={[styles.resultInitial, { color: team.color }]}>{team.shortName}</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{team.nameKo}</Text>
                  <Text style={styles.resultMeta}>{team.city} · {team.stadium}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Photographer Results */}
        {photographerResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PHOTOGRAPHERS</Text>
            {photographerResults.map((pg) => (
              <TouchableOpacity
                key={pg.id}
                style={styles.resultItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PhotographerProfile', { photographerId: pg.id })}
              >
                <View style={styles.resultAvatar}>
                  {pg.avatar_url ? (
                    <Image source={{ uri: pg.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="camera" size={18} color={colors.primary} />
                  )}
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>@{pg.display_name}</Text>
                  <Text style={styles.resultMeta}>{pg.post_count} posts · {pg.follower_count} followers</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Post Results */}
        {postResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PHOTOS</Text>
            {postResults.map((post) => {
              const td = KBO_TEAMS.find((t) => t.id === post.team_id);
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.resultItem}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  <Image source={{ uri: post.images[0] }} style={styles.postThumb} />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{post.title}</Text>
                    <View style={styles.postMeta}>
                      {td && (
                        <View style={[styles.miniTeamBadge, { borderColor: td.color }]}>
                          <Text style={[styles.miniTeamText, { color: td.color }]}>{td.shortName}</Text>
                        </View>
                      )}
                      <Text style={styles.resultMeta}>@{post.photographer.display_name}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* No results */}
        {showNoResults && (
          <View style={styles.section}>
            <View style={styles.noResultWrap}>
              <View style={styles.noResultIcon}>
                <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
              </View>
              <Text style={styles.noResultTitle}>{t('empty_no_results')}</Text>
              <Text style={styles.noResultText}>"{query}"에 대한 결과를 찾을 수 없습니다</Text>
            </View>
            <Text style={styles.sectionLabel}>POPULAR TEAMS</Text>
            {popularTeams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={styles.resultItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
              >
                <View style={[styles.resultAvatar, { borderColor: team.color }]}>
                  <Text style={[styles.resultInitial, { color: team.color }]}>{team.shortName}</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{team.nameKo}</Text>
                  <Text style={styles.resultMeta}>{team.city}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state — no query */}
        {!query.trim() && (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <View style={styles.recentHeader}>
                  <Text style={styles.sectionLabel}>RECENT</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setRecentSearches([])}>
                    <Text style={styles.clearAllText}>전체 삭제</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.chipRow}>
                  {recentSearches.map((keyword) => (
                    <TouchableOpacity
                      key={keyword}
                      style={styles.recentChip}
                      activeOpacity={0.7}
                      onPress={() => handleSearch(keyword)}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                      <Text style={styles.recentChipText}>{keyword}</Text>
                      <TouchableOpacity hitSlop={8} onPress={() => removeRecent(keyword)}>
                        <Ionicons name="close" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Keywords */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>POPULAR</Text>
              <View style={styles.chipRow}>
                {POPULAR_KEYWORDS.map((keyword) => (
                  <TouchableOpacity
                    key={keyword}
                    style={styles.popularChip}
                    activeOpacity={0.7}
                    onPress={() => handleSearch(keyword)}
                  >
                    <Ionicons name="trending-up" size={14} color={colors.primary} />
                    <Text style={styles.popularChipText}>{keyword}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Popular Teams */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>POPULAR TEAMS</Text>
              {popularTeams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={styles.resultItem}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
                >
                  <View style={[styles.resultAvatar, { borderColor: team.color }]}>
                    <Text style={[styles.resultInitial, { color: team.color }]}>{team.shortName}</Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{team.nameKo}</Text>
                    <Text style={styles.resultMeta}>{team.city} · {team.stadium}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    justifyContent: 'center', alignItems: 'center',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.border,
    height: 44, paddingHorizontal: 14,
  },
  input: {
    flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.body,
    color: colors.textPrimary,
  },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: fontSize.badge, fontWeight: fontWeight.heading,
    color: colors.textTertiary, letterSpacing: 1.2, marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  resultAvatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48, height: 48, borderRadius: 24,
  },
  resultInitial: {
    fontSize: fontSize.micro, fontWeight: fontWeight.heading,
    color: colors.primary, letterSpacing: 0.3,
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontSize: fontSize.cardName, fontWeight: fontWeight.name, color: colors.textPrimary,
  },
  resultMeta: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textSecondary,
    marginTop: 2,
  },
  postThumb: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  postMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2,
  },
  miniTeamBadge: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: radius.sm, borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  miniTeamText: {
    fontSize: fontSize.badge, fontWeight: fontWeight.name,
  },
  noResultWrap: {
    alignItems: 'center', gap: 8, paddingVertical: 32,
  },
  noResultIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  noResultTitle: {
    fontSize: fontSize.cardName, fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  noResultText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body,
    color: colors.textTertiary, marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  clearAllText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8,
  },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.surface, borderRadius: radius.round,
    borderWidth: 1, borderColor: colors.border,
  },
  recentChipText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textPrimary,
  },
  popularChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.primaryAlpha8, borderRadius: radius.round,
  },
  popularChipText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.primary,
  },
});
