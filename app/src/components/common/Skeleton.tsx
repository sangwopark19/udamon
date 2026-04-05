import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { colors, radius } from '../../styles/theme';

interface Props {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Skeleton({
  width,
  height,
  borderRadius = radius.md,
  style,
}: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/** Pre-built skeleton layouts for common screen patterns */
export function HomeSkeleton() {
  return (
    <Animated.View style={styles.homeWrap}>
      {/* Spotlight row */}
      <Animated.View style={styles.row}>
        <Skeleton width={80} height={36} borderRadius={radius.round} />
        <Skeleton width={80} height={36} borderRadius={radius.round} />
        <Skeleton width={80} height={36} borderRadius={radius.round} />
        <Skeleton width={80} height={36} borderRadius={radius.round} />
      </Animated.View>

      {/* Section title */}
      <Skeleton width={140} height={20} style={styles.sectionGap} />

      {/* Featured cards row */}
      <Animated.View style={styles.row}>
        <Skeleton width={200} height={260} borderRadius={radius.xl} />
        <Skeleton width={200} height={260} borderRadius={radius.xl} />
      </Animated.View>

      {/* Section title */}
      <Skeleton width={160} height={20} style={styles.sectionGap} />

      {/* Post grid */}
      <Animated.View style={styles.grid}>
        <Skeleton width="48%" height={220} borderRadius={radius.xxl} />
        <Skeleton width="48%" height={220} borderRadius={radius.xxl} />
      </Animated.View>
    </Animated.View>
  );
}

export function ExploreSkeleton() {
  return (
    <Animated.View style={styles.homeWrap}>
      {/* Search bar */}
      <Skeleton width="100%" height={44} borderRadius={radius.lg} />

      {/* Trending cards */}
      <Animated.View style={[styles.row, styles.sectionGap]}>
        <Skeleton width={150} height={56} borderRadius={radius.lg} />
        <Skeleton width={150} height={56} borderRadius={radius.lg} />
      </Animated.View>

      {/* HOT cards */}
      <Animated.View style={[styles.grid, styles.sectionGap]}>
        <Skeleton width="48%" height={280} borderRadius={radius.xl} />
        <Skeleton width="48%" height={280} borderRadius={radius.xl} />
      </Animated.View>
    </Animated.View>
  );
}

export function CommunitySkeleton() {
  return (
    <Animated.View style={styles.homeWrap}>
      {/* Post items */}
      {[1, 2, 3, 4].map((i) => (
        <Animated.View key={i} style={styles.listRow}>
          <Skeleton width={48} height={48} borderRadius={radius.round} />
          <Animated.View style={styles.listText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="90%" height={16} style={{ marginTop: 6 }} />
            <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
          </Animated.View>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
  },
  homeWrap: {
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionGap: {
    marginTop: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  listText: {
    flex: 1,
  },
});
