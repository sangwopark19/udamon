import React, { useRef, useEffect, useState } from 'react';
import { Animated, Text, View, StyleSheet, type TextStyle, type StyleProp } from 'react-native';

interface Props {
  value: number;
  style?: StyleProp<TextStyle>;
  formatter?: (n: number) => string;
}

export default function AnimatedCounter({ value, style, formatter }: Props) {
  const [display, setDisplay] = useState(formatter ? formatter(value) : String(value));
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (value === prevValue.current) return;
    const goingUp = value > prevValue.current;
    prevValue.current = value;

    // Slide out
    Animated.parallel([
      Animated.timing(translateY, { toValue: goingUp ? -14 : 14, duration: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setDisplay(formatter ? formatter(value) : String(value));
      translateY.setValue(goingUp ? 14 : -14);
      // Slide in
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    });
  }, [value]);

  return (
    <View style={styles.wrap}>
      <Animated.Text
        style={[style, { transform: [{ translateY }], opacity }]}
      >
        {display}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
