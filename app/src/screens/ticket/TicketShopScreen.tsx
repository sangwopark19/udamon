// @ts-nocheck — MVP 블라인드: 티켓/결제/후원 기능 비활성화
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useTicket } from '../../contexts/TicketContext';
import { useComingSoon } from '../../hooks/useComingSoon';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface TicketPackage {
  id: string;
  amount: number;
  price: string;
  bonus: number;
  popular?: boolean;
}

const PACKAGES: TicketPackage[] = [
  { id: 'p1', amount: 10, price: '₩1,100', bonus: 0 },
  { id: 'p2', amount: 50, price: '₩5,500', bonus: 0 },
  { id: 'p3', amount: 100, price: '₩11,000', bonus: 10, popular: true },
  { id: 'p4', amount: 300, price: '₩33,000', bonus: 50 },
  { id: 'p5', amount: 500, price: '₩55,000', bonus: 100 },
  { id: 'p6', amount: 1000, price: '₩110,000', bonus: 250 },
];

export default function TicketShopScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { balance, addTickets } = useTicket();
  const checkSupport = useComingSoon();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = PACKAGES.find((p) => p.id === selectedId);

  const handlePurchase = () => {
    if (!selected) return;
    if (!checkSupport()) return;
    Alert.alert(
      t('shop_purchase_title'),
      t('shop_purchase_confirm_desc', { amount: selected.amount + selected.bonus, price: selected.price }),
      [
        { text: t('btn_cancel'), style: 'cancel' },
        {
          text: t('shop_purchase'),
          onPress: () => {
            addTickets(selected.amount + selected.bonus);
            Alert.alert(t('shop_purchase_done'), t('shop_purchase_done_desc', { amount: selected.amount + selected.bonus }));
            setSelectedId(null);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shop_title')}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('PurchaseHistory')}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('shop_balance')}</Text>
          <View style={styles.balanceRow}>
            <Ionicons name="ticket" size={28} color={colors.primary} />
            <Text style={styles.balanceValue}>{balance.toLocaleString()}</Text>
            <Text style={styles.balanceUnit}>{t('shop_unit')}</Text>
          </View>
          <Text style={styles.balanceDesc}>
            {t('shop_balance_desc')}
          </Text>
        </View>

        {/* Packages */}
        <Text style={styles.sectionLabel}>{t('shop_products')}</Text>
        <View style={styles.packageGrid}>
          {PACKAGES.map((pkg) => {
            const isSelected = selectedId === pkg.id;
            return (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                onPress={() => setSelectedId(isSelected ? null : pkg.id)}
                activeOpacity={0.8}
              >
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>{t('shop_popular')}</Text>
                  </View>
                )}
                <Ionicons
                  name="ticket"
                  size={24}
                  color={isSelected ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.packageAmount, isSelected && styles.packageAmountSelected]}>
                  {pkg.amount}
                </Text>
                {pkg.bonus > 0 && (
                  <Text style={styles.packageBonus}>+{pkg.bonus} {t('shop_bonus')}</Text>
                )}
                <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                  {pkg.price}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.infoText}>{t('shop_no_refund')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.infoText}>{t('shop_bonus_info')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Purchase Button */}
      {selected && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomLabel}>
              {selected.amount}{selected.bonus > 0 ? `+${selected.bonus}` : ''} {t('shop_unit')}
            </Text>
            <Text style={styles.bottomPrice}>{selected.price}</Text>
          </View>
          <TouchableOpacity style={styles.purchaseBtn} onPress={handlePurchase} activeOpacity={0.8}>
            <Ionicons name="card-outline" size={18} color={colors.buttonPrimaryText} />
            <Text style={styles.purchaseBtnText}>{t('shop_pay')}</Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Balance
  balanceCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  balanceUnit: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  balanceDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // Packages
  sectionLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 2,
  },
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  packageCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(27, 42, 74, 0.04)',
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.error,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: radius.md,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
    letterSpacing: 0.5,
  },
  packageAmount: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  packageAmountSelected: {
    color: colors.primary,
  },
  packageBonus: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
    color: colors.success,
  },
  packagePrice: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  packagePriceSelected: {
    color: colors.primary,
  },

  // Info
  infoSection: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  bottomPrice: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  purchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  purchaseBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
