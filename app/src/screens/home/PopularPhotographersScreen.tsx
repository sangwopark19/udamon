import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import { KBO_TEAMS } from '../../constants/teams';
import { formatCount } from '../../utils/time';
import type { Photographer } from '../../types/photographer';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';
import GradeBadge from '../../components/photographer/GradeBadge';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortMode = 'popular' | 'latest';

const MAX_VISIBLE = 60;

export default function PopularPhotographersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { photographers } = usePhotographer();

  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [showDropdown, setShowDropdown] = useState(false);

  const SORT_LABELS: Record<SortMode, string> = {
    popular: t('home_sort_popular'),
    latest: t('home_sort_latest'),
  };

  const sorted = useMemo(() => {
    const copy = [...photographers];
    switch (sortMode) {
      case 'popular':
        return copy
          .sort((a, b) => (b.follower_count + b.post_count) - (a.follower_count + a.post_count))
          .slice(0, MAX_VISIBLE);
      case 'latest':
        return copy
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, MAX_VISIBLE);
    }
  }, [photographers, sortMode]);

  const renderItem = ({ item: pg }: { item: Photographer }) => {
    const team = pg.team_id ? KBO_TEAMS.find((tm) => tm.id === pg.team_id) : null;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('PhotographerProfile', { photographerId: pg.id })}
      >
        <View style={[styles.avatarWrap, team && { borderColor: team.color }]}>
          {pg.avatar_url ? (
            <Image source={{ uri: pg.avatar_url }} style={styles.avatar} />
          ) : (
            <Ionicons name="person" size={28} color={colors.textTertiary} />
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{pg.display_name}</Text>
            <GradeBadge grade={pg.grade} variant="icon" />
            {pg.is_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
          </View>
          {team && <Text style={[styles.teamName, { color: team.color }]}>{team.shortName}</Text>}
          {pg.bio ? <Text style={styles.bio} numberOfLines={1}>{pg.bio}</Text> : null}
        </View>
        <View style={styles.statsCol}>
          <View style={styles.statRow}>
            <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.statText}>{formatCount(pg.follower_count)}</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="images-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.statText}>{pg.post_count}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('home_popular_pg_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <Text style={styles.countText}>{sorted.length}{t('popular_pg_count_suffix')}</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.7}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.sortBtnText}>{SORT_LABELS[sortMode]}</Text>
          <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {(['popular', 'latest'] as SortMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.dropdownItem, sortMode === mode && styles.dropdownItemActive]}
              onPress={() => { setSortMode(mode); setShowDropdown(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownText, sortMode === mode && styles.dropdownTextActive]}>
                {SORT_LABELS[mode]}
              </Text>
              {sortMode === mode && <Ionicons name="checkmark" size={14} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('empty_no_posts')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },

  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortBtnText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  dropdown: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemActive: { backgroundColor: colors.primaryAlpha8 },
  dropdownText: { fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textPrimary },
  dropdownTextActive: { fontWeight: fontWeight.heading, color: colors.primary },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  teamName: { fontSize: fontSize.micro, fontWeight: fontWeight.name },
  bio: { fontSize: fontSize.micro, color: colors.textTertiary, marginTop: 2 },
  statsCol: { alignItems: 'flex-end', gap: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.textSecondary },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: fontSize.body, color: colors.textTertiary },
});
