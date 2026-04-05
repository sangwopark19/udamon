// @ts-nocheck — MVP 블라인드: 티켓/결제/후원 기능 비활성화
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

// Mock purchase history
const MOCK_HISTORY = [
  { id: '1', type: 'purchase' as const, amount: 110, price: '₩11,000', date: '2025-03-15', desc: '100+10 티켓 패키지' },
  { id: '2', type: 'spend' as const, amount: -5, price: '', date: '2025-03-16', desc: '포토그래퍼 서포트 (@baseball_lens)' },
  { id: '3', type: 'spend' as const, amount: -10, price: '', date: '2025-03-17', desc: '포토그래퍼 서포트 (@kbo_moments)' },
  { id: '4', type: 'purchase' as const, amount: 50, price: '₩5,500', date: '2025-03-20', desc: '50 티켓 패키지' },
  { id: '5', type: 'spend' as const, amount: -3, price: '', date: '2025-03-22', desc: '포토그래퍼 서포트 (@diamond_shot)' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PurchaseHistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('history_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_HISTORY.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t('history_empty')}</Text>
            <Text style={styles.emptyDesc}>{t('history_empty_desc')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {MOCK_HISTORY.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.listItem, idx === MOCK_HISTORY.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={[
                  styles.iconWrap,
                  item.type === 'purchase'
                    ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' }
                    : { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                ]}>
                  <Ionicons
                    name={item.type === 'purchase' ? 'add-circle' : 'remove-circle'}
                    size={20}
                    color={item.type === 'purchase' ? colors.success : colors.error}
                  />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[
                    styles.itemAmount,
                    { color: item.type === 'purchase' ? colors.success : colors.error },
                  ]}>
                    {item.amount > 0 ? '+' : ''}{item.amount}
                  </Text>
                  {item.price ? (
                    <Text style={styles.itemPrice}>{item.price}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
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

  // List
  list: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  itemDate: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemAmount: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
  },
  itemPrice: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
});
