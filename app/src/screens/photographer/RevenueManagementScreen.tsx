// @ts-nocheck — MVP 블라인드: 티켓/결제/후원 기능 비활성화
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useSupport, PLATFORM_COMMISSION_RATE, MIN_SETTLEMENT_AMOUNT, GIFT_ITEMS } from '../../contexts/SupportContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Period = 'week' | 'month' | 'all';

export default function RevenueManagementScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'RevenueManagement'>>();
  const { photographerId } = route.params;
  const {
    getPhotographerSupports,
    getSupporterCount,
    getTotalEarned,
    getWeeklyEarned,
    getMonthlyEarned,
    getSettleableAmount,
    requestSettlement,
    getSettlements,
  } = useSupport();

  const [period, setPeriod] = useState<Period>('all');

  const supports = getPhotographerSupports(photographerId);
  const settlements = getSettlements(photographerId);
  const supporterCount = getSupporterCount(photographerId);
  const settleable = getSettleableAmount(photographerId);

  const earned = useMemo(() => {
    switch (period) {
      case 'week': return getWeeklyEarned(photographerId);
      case 'month': return getMonthlyEarned(photographerId);
      default: return getTotalEarned(photographerId);
    }
  }, [period, photographerId, getWeeklyEarned, getMonthlyEarned, getTotalEarned]);

  const periodKeys: Period[] = ['week', 'month', 'all'];
  const periodLabels: Record<Period, string> = {
    week: t('revenue_period_week'),
    month: t('revenue_period_month'),
    all: t('revenue_period_all'),
  };

  const handleSettle = () => {
    if (settleable < MIN_SETTLEMENT_AMOUNT) {
      Alert.alert(t('revenue_settle_title'), t('revenue_settle_min', { min: MIN_SETTLEMENT_AMOUNT }));
      return;
    }
    const net = Math.round(settleable * (1 - PLATFORM_COMMISSION_RATE));
    Alert.alert(
      t('revenue_settle_title'),
      t('revenue_settle_confirm', { amount: settleable, net }),
      [
        { text: t('btn_cancel'), style: 'cancel' },
        {
          text: t('btn_confirm'),
          onPress: () => {
            const ok = requestSettlement(photographerId, settleable);
            Alert.alert(ok ? t('revenue_settle_success') : t('revenue_settle_fail'));
          },
        },
      ],
    );
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return colors.success;
    if (status === 'processing') return colors.primary;
    return colors.textTertiary;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('revenue_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Filter */}
        <View style={styles.periodRow}>
          {periodKeys.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {periodLabels[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="ticket-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{earned}T</Text>
            <Text style={styles.statLabel}>{t('revenue_total_earned')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{supporterCount}</Text>
            <Text style={styles.statLabel}>{t('revenue_supporter_count')}</Text>
          </View>
        </View>

        {/* Settlement Card */}
        <View style={styles.settleCard}>
          <View style={styles.settleTop}>
            <View>
              <Text style={styles.settleLabel}>{t('revenue_settleable')}</Text>
              <Text style={styles.settleAmount}>{settleable}T</Text>
              <Text style={styles.settleNote}>{t('revenue_net_note')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.settleBtn, settleable < MIN_SETTLEMENT_AMOUNT && styles.settleBtnDisabled]}
              activeOpacity={0.7}
              onPress={handleSettle}
              disabled={settleable < MIN_SETTLEMENT_AMOUNT}
            >
              <Text style={styles.settleBtnText}>{t('revenue_settle_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supporters */}
        <Text style={styles.sectionTitle}>{t('revenue_supporters_title')}</Text>
        {supports.length === 0 ? (
          <Text style={styles.emptyText}>{t('revenue_supporters_empty')}</Text>
        ) : (
          <View style={styles.listCard}>
            {supports.slice(0, 20).map((s) => {
              const gift = GIFT_ITEMS.find((g) => g.id === s.giftId);
              return (
                <View key={s.id} style={styles.supportRow}>
                  <Text style={styles.supportEmoji}>{gift?.emoji ?? '🎁'}</Text>
                  <View style={styles.supportInfo}>
                    <Text style={styles.supportUser}>{s.fromUserId}</Text>
                    <Text style={styles.supportGift}>
                      {gift?.nameKo} · {s.ticketAmount}T
                    </Text>
                  </View>
                  <Text style={styles.supportTime}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Settlement History */}
        <Text style={styles.sectionTitle}>{t('revenue_history_title')}</Text>
        {settlements.length === 0 ? (
          <Text style={styles.emptyText}>{t('revenue_history_empty')}</Text>
        ) : (
          <View style={styles.listCard}>
            {settlements.map((s) => (
              <View key={s.id} style={styles.settlementRow}>
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementAmount}>{s.amount}T → {s.netAmount}T</Text>
                  <Text style={styles.settlementDate}>
                    {new Date(s.requestedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(s.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor(s.status) }]}>
                    {t(`revenue_status_${s.status}` as any)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  content: { padding: 16 },

  // Period
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: colors.buttonPrimaryText,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
    gap: 6,
  },
  statValue: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },

  // Settlement
  settleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 24,
  },
  settleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settleLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  settleAmount: {
    fontSize: 28,
    fontWeight: fontWeight.heading,
    color: colors.primary,
    marginTop: 4,
  },
  settleNote: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    marginTop: 4,
  },
  settleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.round,
  },
  settleBtnDisabled: {
    opacity: 0.35,
  },
  settleBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },

  // Section
  sectionTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },

  // Supporters list
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  supportEmoji: { fontSize: 24 },
  supportInfo: { flex: 1, gap: 2 },
  supportUser: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  supportGift: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  supportTime: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // Settlement history
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settlementInfo: { gap: 2 },
  settlementAmount: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  settlementDate: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.round,
  },
  statusText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
  },
});
