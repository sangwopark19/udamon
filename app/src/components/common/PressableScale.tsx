import React, { useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  type ViewStyle,
  type StyleProp,
  type GestureResponderEvent,
} from 'react-native';

interface Props {
  children: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
  activeOpacity?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'tab' | 'link';
}

export default function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  scaleTo = 0.96,
  activeOpacity,
  accessibilityLabel,
  accessibilityRole = 'button',
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <Animated.View
        style={[
          style,
          { transform: [{ scale }] },
          activeOpacity !== undefined && disabled ? { opacity: activeOpacity } : undefined,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
