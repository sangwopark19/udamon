// @ts-nocheck — MVP 블라인드: 티켓/결제/후원 기능 비활성화
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { GIFT_ITEMS, type GiftItem } from '../../contexts/SupportContext';
import { useSupport } from '../../contexts/SupportContext';
import { useTicket } from '../../contexts/TicketContext';
import { useAuth } from '../../contexts/AuthContext';
import { useComingSoon } from '../../hooks/useComingSoon';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface SupportSheetProps {
  visible: boolean;
  photographerId: string;
  onClose: () => void;
  onSuccess: (gift: GiftItem) => void;
}

export default function SupportSheet({ visible, photographerId, onClose, onSuccess }: SupportSheetProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { balance } = useTicket();
  const { addSupport } = useSupport();
  const checkSupport = useComingSoon();
  const handleGiftPress = (gift: GiftItem) => {
    if (!checkSupport()) return;
    if (balance < gift.ticketCost) return;
    if (!user) return;

    addSupport({
      fromUserId: user.id,
      toPhotographerId: photographerId,
      giftId: gift.id,
      ticketAmount: gift.ticketCost,
    });

    onSuccess(gift);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>{t('support_title')}</Text>
          <Text style={styles.subtitle}>{t('support_subtitle')}</Text>

          {/* Balance row */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>{t('support_balance_label')}</Text>
            <Text style={styles.balanceValue}>{balance}T</Text>
            <TouchableOpacity
              style={styles.chargeBtn}
              activeOpacity={0.7}
              onPress={() => { onClose(); navigation.navigate('TicketShop'); }}
            >
              <Text style={styles.chargeBtnText}>{t('support_charge')}</Text>
            </TouchableOpacity>
          </View>

          {/* Gift grid */}
          <View style={styles.giftGrid}>
            {GIFT_ITEMS.map((gift) => {
              const canAfford = balance >= gift.ticketCost;
              return (
                <TouchableOpacity
                  key={gift.id}
                  style={[styles.giftItem, !canAfford && styles.giftItemDisabled]}
                  activeOpacity={canAfford ? 0.7 : 1}
                  onPress={() => handleGiftPress(gift)}
                  disabled={!canAfford}
                >
                  <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.giftName}>{gift.nameKo}</Text>
                  <Text style={styles.giftCost}>{gift.ticketCost}T</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
  },
  chargeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.round,
  },
  chargeBtnText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  giftItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  giftItemDisabled: {
    opacity: 0.35,
  },
  giftEmoji: {
    fontSize: 28,
  },
  giftName: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  giftCost: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.heading,
    color: colors.primary,
  },
});
