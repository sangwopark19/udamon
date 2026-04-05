import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/AdminContext';
import type { Announcement, AnnouncementType } from '../../types/admin';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

const PAGE_SIZE = 10;

const TYPE_CONFIG: Record<AnnouncementType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  notice: { label: '공지', icon: 'megaphone', color: colors.primary },
  event: { label: '이벤트', icon: 'gift', color: colors.success },
  maintenance: { label: '점검', icon: 'construct', color: colors.warning },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function AnnouncementsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { announcements } = useAdmin();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sorted = useMemo(() => {
    const pinned = announcements.filter((a) => a.isPinned);
    const rest = announcements.filter((a) => !a.isPinned);
    pinned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    rest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...pinned, ...rest];
  }, [announcements]);

  const visibleData = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderItem = ({ item }: { item: Announcement }) => {
    const typeInfo = TYPE_CONFIG[item.type];
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            {item.isPinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={10} color={colors.primary} />
              </View>
            )}
            <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '18' }]}>
              <Ionicons name={typeInfo.icon} size={12} color={typeInfo.color} />
              <Text style={[styles.typeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        {isExpanded && (
          <Text style={styles.cardBody}>{item.body}</Text>
        )}

        <View style={styles.expandHint}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('announcements_header')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {sorted.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="megaphone-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('announcements_empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={visibleData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                activeOpacity={0.7}
                onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                <Text style={styles.loadMoreText}>{t('announcements_load_more')}</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
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
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinnedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryAlpha8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.round,
  },
  typeText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.heading,
  },
  cardDate: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  cardBody: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: 10,
  },
  expandHint: {
    alignItems: 'center',
    marginTop: 6,
  },

  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textTertiary,
  },

  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
});
