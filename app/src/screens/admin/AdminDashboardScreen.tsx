import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { useAdmin } from '../../contexts/AdminContext';
import AdminStatCard from '../../components/admin/AdminStatCard';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MENU_ITEMS: { key: keyof RootStackParamList; icon: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [
  { key: 'AdminPostReview', icon: 'images', label: '게시물 심사', color: colors.primary },
  { key: 'AdminReportManage', icon: 'flag', label: '신고 관리', color: colors.error },
  { key: 'AdminUserManage', icon: 'people', label: '유저 관리', color: colors.warning },
  { key: 'AdminPhotographerReview', icon: 'camera', label: '포토그래퍼 인증', color: colors.success },
  { key: 'AdminAnnouncement', icon: 'megaphone', label: '공지사항', color: '#6366F1' },
];

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { stats, auditLogs } = useAdmin();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>관리자 대시보드</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stat Cards */}
        <View style={styles.statRow}>
          <AdminStatCard icon="time" label="심사 대기" value={stats.pendingReviewCount} color={colors.primary} onPress={() => navigation.navigate('AdminPostReview')} />
          <AdminStatCard icon="flag" label="신고 접수" value={stats.pendingReportCount} color={colors.error} onPress={() => navigation.navigate('AdminReportManage')} />
        </View>
        <View style={styles.statRow}>
          <AdminStatCard icon="document-text" label="총 게시물" value={stats.totalPosts} />
          <AdminStatCard icon="people" label="포토그래퍼" value={stats.totalPhotographers} />
        </View>

        {/* Quick Menu */}
        <Text style={styles.sectionTitle}>바로가기</Text>
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(item.key as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.key === 'AdminPostReview' && stats.pendingReviewCount > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{stats.pendingReviewCount}</Text></View>
              )}
              {item.key === 'AdminReportManage' && stats.pendingReportCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}><Text style={styles.badgeText}>{stats.pendingReportCount}</Text></View>
              )}
              {item.key === 'AdminPhotographerReview' && stats.pendingPhotographerCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.success }]}><Text style={styles.badgeText}>{stats.pendingPhotographerCount}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Audit Logs */}
        <Text style={styles.sectionTitle}>최근 관리 이력</Text>
        {auditLogs.length === 0 ? (
          <View style={styles.emptyLogs}>
            <Ionicons name="document-text-outline" size={28} color={colors.textTertiary} />
            <Text style={styles.emptyText}>관리 이력이 없습니다</Text>
          </View>
        ) : (
          auditLogs.slice(0, 5).map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logDot} />
              <View style={styles.logContent}>
                <Text style={styles.logAction}>{log.action.replace(/_/g, ' ')}</Text>
                <Text style={styles.logDetail} numberOfLines={1}>{log.detail}</Text>
                <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleString('ko-KR')}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  menuGrid: {
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: '#FFF',
  },
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  logItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  logContent: {
    flex: 1,
    gap: 2,
  },
  logAction: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  logDetail: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  logTime: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
});
