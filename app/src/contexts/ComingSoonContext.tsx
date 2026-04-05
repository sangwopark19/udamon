import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, fontWeight, radius, shadow } from '../styles/theme';

type ComingSoonFeature = 'support' | 'message';

interface ComingSoonContextValue {
  showComingSoon: (feature?: ComingSoonFeature) => void;
}

const ComingSoonContext = createContext<ComingSoonContextValue | null>(null);

const { width: SCREEN_W } = Dimensions.get('window');

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [feature, setFeature] = useState<ComingSoonFeature>('support');
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showComingSoon = useCallback((feat: ComingSoonFeature = 'support') => {
    setFeature(feat);
    setVisible(true);
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [scaleAnim, opacityAnim]);

  return (
    <ComingSoonContext.Provider value={{ showComingSoon }}>
      {children}

      <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
            {/* Glow circle */}
            <View style={styles.iconWrap}>
              <View style={styles.iconGlow} />
              <View style={styles.iconCircle}>
                <Ionicons name="construct" size={32} color={colors.primary} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('coming_soon_title')}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Description */}
            <Text style={styles.desc}>
              {feature === 'message' ? t('coming_soon_message_msg') : t('coming_soon_support_msg')}
            </Text>

            {/* Feature preview chips */}
            <View style={styles.chipRow}>
              {feature === 'message'
                ? ['chatbubble-outline', 'exit-outline', 'eye-off-outline'].map((icon, i) => (
                    <View key={icon} style={styles.chip}>
                      <Ionicons name={icon as any} size={14} color={colors.primary} />
                      <Text style={styles.chipText}>
                        {i === 0 ? t('msg_title') : i === 1 ? t('msg_chip_exit') : t('msg_chip_unread')}
                      </Text>
                    </View>
                  ))
                : ['ticket-outline', 'gift-outline', 'bar-chart-outline'].map((icon, i) => (
                    <View key={icon} style={styles.chip}>
                      <Ionicons name={icon as any} size={14} color={colors.primary} />
                      <Text style={styles.chipText}>
                        {i === 0 ? t('shop_title') : i === 1 ? t('btn_support') : t('revenue_title')}
                      </Text>
                    </View>
                  ))}
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.btn} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.btnText}>{t('btn_confirm')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </ComingSoonContext.Provider>
  );
}

export function useComingSoonModal(): ComingSoonContextValue {
  const ctx = useContext(ComingSoonContext);
  if (!ctx) throw new Error('useComingSoonModal must be inside ComingSoonProvider');
  return ctx;
}

const CARD_W = Math.min(SCREEN_W - 56, 340);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_W,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xxl,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 24,
    alignItems: 'center',
    ...shadow.elevated,
  },
  iconWrap: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryAlpha8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryAlpha12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryAlpha15,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  desc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.round,
    backgroundColor: colors.primaryAlpha3,
    borderWidth: 1,
    borderColor: colors.primaryAlpha8,
  },
  chipText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  btn: {
    width: '100%',
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
});
