import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius, shadow } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = 'onboarding_complete';

interface OnboardingPage {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  title: string;
  desc: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: 'camera',
    iconColor: colors.primary,
    bgColor: colors.primaryAlpha8,
    title: 'KBO 팬 포토그래퍼',
    desc: '야구장의 순간을 담는\n팬 포토그래퍼들의 작품을 만나보세요',
  },
  {
    icon: 'heart',
    iconColor: colors.featuredAccent,
    bgColor: colors.featuredAlpha20,
    title: '팔로우 & 응원',
    desc: '좋아하는 포토그래퍼를\n팔로우하고 응원하세요',
  },
  {
    icon: 'baseball',
    iconColor: colors.success,
    bgColor: 'rgba(34, 197, 94, 0.1)',
    title: '팬 커뮤니티',
    desc: 'KBO 팬들과 함께\n직관의 감동을 나누세요',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIdx(idx);
  }, []);

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleNext = () => {
    if (activeIdx < PAGES.length - 1) {
      listRef.current?.scrollToOffset({ offset: (activeIdx + 1) * SCREEN_WIDTH, animated: true });
    } else {
      handleComplete();
    }
  };

  const isLast = activeIdx === PAGES.length - 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleComplete} activeOpacity={0.7}>
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>

      {/* Pages */}
      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon} size={48} color={item.iconColor} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      {/* Dots + Button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>
            {isLast ? '시작하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export { ONBOARDING_KEY };

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textTertiary,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    ...shadow.elevated,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  desc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  nextBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
});
