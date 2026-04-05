import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RankTier } from '../../contexts/RankContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface RankUpModalProps {
  visible: boolean;
  tier: RankTier;
  onClose: () => void;
}

export default function RankUpModal({ visible, tier, onClose }: RankUpModalProps) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.3);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.emoji}>{tier.emoji}</Text>
          <Text style={styles.title}>
            랭크 업!
          </Text>
          <Text style={styles.tierName}>
            {tier.nameKo}
          </Text>
          <Text style={styles.desc}>
            {`축하합니다! ${tier.nameKo} 등급으로 승급했습니다.`}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.btnText}>{t('btn_done')}</Text>
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
  },
  card: {
    width: '80%',
    backgroundColor: colors.background,
    borderRadius: radius.xxl,
    padding: 32,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.primary,
    marginBottom: 4,
  },
  tierName: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  desc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.round,
  },
  btnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
});
