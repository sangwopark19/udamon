import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GiftItem } from '../../contexts/SupportContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface SupportSuccessModalProps {
  visible: boolean;
  gift: GiftItem | null;
  photographerName: string;
  onClose: () => void;
}

export default function SupportSuccessModal({ visible, gift, photographerName, onClose }: SupportSuccessModalProps) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.8);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  if (!gift) return null;

  const giftName = gift.nameKo;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <Text style={styles.emoji}>{gift.emoji}</Text>
          <Text style={styles.title}>{t('support_success_title')}</Text>
          <Text style={styles.message}>
            {t('support_success_msg', { giftName, name: photographerName })}
          </Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>@{photographerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gift</Text>
              <Text style={styles.detailValue}>{gift.emoji} {giftName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{gift.ticketCost}T</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} activeOpacity={0.8} onPress={onClose}>
            <Text style={styles.doneBtnText}>{t('btn_confirm')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.xxl,
    padding: 28,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  message: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
