import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RankProgress } from '../../contexts/RankContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface RankProgressBarProps {
  progress: RankProgress;
}

export default function RankProgressBar({ progress: rp }: RankProgressBarProps) {
  const pct = Math.round(rp.progress * 100);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.currentRank}>
          {rp.tier.emoji} {rp.tier.nameKo}
        </Text>
        {rp.nextTier && (
          <Text style={styles.nextRank}>
            → {rp.nextTier.emoji} {rp.nextTier.nameKo}
          </Text>
        )}
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.score}>{rp.score} pts</Text>
        {rp.nextTier && (
          <Text style={styles.remaining}>{rp.pointsToNext} to next</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentRank: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  nextRank: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  score: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  remaining: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
});
