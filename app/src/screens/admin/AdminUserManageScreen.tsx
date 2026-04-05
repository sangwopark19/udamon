import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAdmin } from '../../contexts/AdminContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import type { SanctionType } from '../../types/admin';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

const SANCTION_OPTIONS: { type: SanctionType; label: string; color: string }[] = [
  { type: 'warning', label: '경고', color: colors.warning },
  { type: 'suspend_7d', label: '7일 정지', color: colors.error },
  { type: 'suspend_30d', label: '30일 정지', color: colors.error },
  { type: 'permanent_ban', label: '영구정지', color: '#B91C1C' },
];

export default function AdminUserManageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { sanctions, sanctionUser, revokeSanction, getUserSanctions } = useAdmin();
  const { photographers } = usePhotographer();
  const [search, setSearch] = useState('');

  // Show photographers as "users" for demo
  const users = photographers.map((p) => ({
    id: p.user_id,
    displayName: p.display_name,
    isPhotographer: true,
    postCount: p.post_count,
  }));

  const filtered = search.trim()
    ? users.filter((u) => u.displayName.toLowerCase().includes(search.toLowerCase()))
    : users;

  const handleSanction = (userId: string, displayName: string) => {
    Alert.alert(
      `${displayName} 제재`,
      '제재 유형을 선택하세요',
      [
        ...SANCTION_OPTIONS.map((opt) => ({
          text: opt.label,
          style: (opt.type === 'permanent_ban' ? 'destructive' : 'default') as any,
          onPress: () => {
            sanctionUser(userId, opt.type, '관리자 제재');
          },
        })),
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  const activeSanctions = sanctions.filter((s) => s.isActive);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>유저 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="유저 검색"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Active sanctions */}
      {activeSanctions.length > 0 && (
        <View style={styles.sanctionSection}>
          <Text style={styles.sanctionHeader}>활성 제재 ({activeSanctions.length})</Text>
          {activeSanctions.map((s) => (
            <View key={s.id} style={styles.sanctionCard}>
              <View style={styles.sanctionInfo}>
                <Text style={styles.sanctionType}>{
                  s.type === 'warning' ? '경고' :
                  s.type === 'suspend_7d' ? '7일 정지' :
                  s.type === 'suspend_30d' ? '30일 정지' : '영구정지'
                }</Text>
                <Text style={styles.sanctionUserId} numberOfLines={1}>ID: {s.userId}</Text>
                <Text style={styles.sanctionReason}>{s.reason}</Text>
              </View>
              <TouchableOpacity
                style={styles.revokeBtn}
                activeOpacity={0.7}
                onPress={() => revokeSanction(s.id)}
              >
                <Text style={styles.revokeText}>해제</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const userSanctions = getUserSanctions(item.id);
          const hasActive = userSanctions.some((s) => s.isActive);
          return (
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{item.displayName}</Text>
                  {item.isPhotographer && (
                    <View style={styles.pgBadge}><Text style={styles.pgBadgeText}>포토그래퍼</Text></View>
                  )}
                  {hasActive && (
                    <View style={[styles.pgBadge, { backgroundColor: colors.error + '20' }]}>
                      <Text style={[styles.pgBadgeText, { color: colors.error }]}>제재 중</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userMeta}>게시물 {item.postCount} | 제재 이력 {userSanctions.length}</Text>
              </View>
              <TouchableOpacity
                style={styles.sanctionBtn}
                activeOpacity={0.7}
                onPress={() => handleSanction(item.id, item.displayName)}
              >
                <Ionicons name="shield" size={18} color={colors.warning} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.round,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, height: 40, fontSize: fontSize.body, color: colors.textPrimary },
  sanctionSection: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sanctionHeader: { fontSize: fontSize.meta, fontWeight: fontWeight.heading, color: colors.error, marginBottom: spacing.sm },
  sanctionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.error + '08', borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.error + '20',
  },
  sanctionInfo: { flex: 1, gap: 2 },
  sanctionType: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.error },
  sanctionUserId: { fontSize: fontSize.micro, color: colors.textTertiary },
  sanctionReason: { fontSize: fontSize.micro, color: colors.textSecondary },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.surface },
  revokeText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.textPrimary },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryAlpha8, justifyContent: 'center', alignItems: 'center',
  },
  userInfo: { flex: 1, gap: 4 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  pgBadge: {
    backgroundColor: colors.primaryAlpha8, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.round,
  },
  pgBadgeText: { fontSize: fontSize.tiny, fontWeight: fontWeight.name, color: colors.primary },
  userMeta: { fontSize: fontSize.micro, color: colors.textTertiary },
  sanctionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.warning + '18', justifyContent: 'center', alignItems: 'center',
  },
});
