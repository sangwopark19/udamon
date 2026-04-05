import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAdmin } from '../../contexts/AdminContext';
import { timeAgo } from '../../utils/time';
import type { ReportResolution } from '../../types/admin';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

const RESOLUTION_LABELS: Record<ReportResolution, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  delete_content: { label: '콘텐츠 삭제', color: colors.error, icon: 'trash' },
  warn_user: { label: '경고 발송', color: colors.warning, icon: 'warning' },
  suspend_user: { label: '유저 정지', color: colors.error, icon: 'ban' },
  dismiss: { label: '무시', color: colors.textTertiary, icon: 'close-circle' },
};

const REASON_LABELS: Record<string, string> = {
  spam: '스팸/광고',
  inappropriate: '부적절한 콘텐츠',
  copyright: '저작권 침해',
  harassment: '괴롭힘/혐오',
  misinformation: '허위 정보',
  other: '기타',
};

export default function AdminReportManageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { pendingReports, resolveReport } = useAdmin();

  const handleResolve = (index: number, targetType: string) => {
    const options: ReportResolution[] = ['delete_content', 'warn_user', 'suspend_user', 'dismiss'];
    Alert.alert(
      '신고 처리',
      `대상: ${targetType}\n처리 방법을 선택하세요`,
      [
        ...options.map((res) => ({
          text: RESOLUTION_LABELS[res].label,
          style: (res === 'delete_content' || res === 'suspend_user' ? 'destructive' : 'default') as any,
          onPress: () => resolveReport(index, res),
        })),
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>신고 관리 ({pendingReports.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      {pendingReports.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shield-checkmark" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>미처리 신고 없음</Text>
          <Text style={styles.emptyDesc}>모든 신고가 처리되었습니다</Text>
        </View>
      ) : (
        <FlatList
          data={pendingReports}
          keyExtractor={(item) => `${item.index}-${item.targetId}`}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.targetType}</Text>
                </View>
                <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
              </View>

              <View style={styles.reasonRow}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.reasonText}>{REASON_LABELS[item.reason] ?? item.reason}</Text>
              </View>

              {item.detail && (
                <Text style={styles.detailText}>{item.detail}</Text>
              )}

              <Text style={styles.targetId} numberOfLines={1}>ID: {item.targetId}</Text>

              <TouchableOpacity
                style={styles.resolveBtn}
                activeOpacity={0.7}
                onPress={() => handleResolve(item.index, item.targetType)}
              >
                <Ionicons name="hammer" size={16} color="#FFF" />
                <Text style={styles.resolveBtnText}>처리하기</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
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
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  emptyDesc: { fontSize: fontSize.meta, color: colors.textTertiary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  typeBadge: {
    backgroundColor: colors.primaryAlpha8, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.round,
  },
  typeBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.primary },
  cardTime: { fontSize: fontSize.micro, color: colors.textTertiary },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  reasonText: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  detailText: { fontSize: fontSize.meta, color: colors.textSecondary, marginBottom: spacing.sm },
  targetId: { fontSize: fontSize.micro, color: colors.textTertiary, marginBottom: spacing.md },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.primary,
  },
  resolveBtnText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: '#FFF' },
});
