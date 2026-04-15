import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, fontWeight } from '../../styles/theme';
import { hapticLight } from '../../utils/haptics';

interface TabDef {
  key: string;
  i18nKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}

const tabs: TabDef[] = [
  { key: 'Home',      i18nKey: 'tab_home',         icon: 'home-outline',        iconFocused: 'home' },
  { key: 'Explore',   i18nKey: 'tab_discover',     icon: 'flame-outline',       iconFocused: 'flame' },
  { key: 'Studio',    i18nKey: 'tab_photographer', icon: 'camera-outline',      iconFocused: 'camera' },
  { key: 'Archive',   i18nKey: 'tab_archive',      icon: 'grid-outline',        iconFocused: 'grid' },
  { key: 'Community', i18nKey: 'tab_community',    icon: 'chatbubbles-outline', iconFocused: 'chatbubbles' },
  { key: 'MyPage',    i18nKey: 'tab_my',           icon: 'person-outline',      iconFocused: 'person' },
];

function AnimatedTab({
  tab,
  isFocused,
  onPress,
  label,
  renderIcon,
}: {
  tab: TabDef;
  isFocused: boolean;
  onPress: () => void;
  label: string;
  renderIcon?: (focused: boolean) => React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevFocused = useRef(isFocused);

  useEffect(() => {
    if (isFocused && !prevFocused.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();
    }
    prevFocused.current = isFocused;
  }, [isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItem}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {renderIcon ? (
          renderIcon(isFocused)
        ) : (
          <Ionicons
            name={isFocused ? tab.iconFocused : tab.icon}
            size={24}
            color={isFocused ? colors.textPrimary : colors.textTertiary}
          />
        )}
      </Animated.View>
      <Text
        style={[styles.label, isFocused && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {state.routes.map((route, index) => {
        const tab = tabs.find((candidate) => candidate.key === route.name);
        if (!tab) return null;

        const isFocused = state.index === index;
        const options = descriptors[route.key]?.options;

        // descriptors 에 override 가 있으면 우선 사용 (MainTabNavigator Studio 탭 등)
        const labelOverride = typeof options?.tabBarLabel === 'string' ? options.tabBarLabel : undefined;
        const label = labelOverride ?? t(tab.i18nKey);

        const iconFn = options?.tabBarIcon;
        const renderIcon = iconFn
          ? (focused: boolean) =>
              iconFn({
                focused,
                color: focused ? colors.textPrimary : colors.textTertiary,
                size: 24,
              })
          : undefined;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            hapticLight();
            navigation.navigate(route.name);
          }
        };

        return (
          <AnimatedTab
            key={tab.key}
            tab={tab}
            isFocused={isFocused}
            onPress={onPress}
            label={label}
            renderIcon={renderIcon}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
    color: colors.textTertiary,
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: fontWeight.heading,
  },
});
