import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAwards, AWARD_CATEGORIES } from '../../contexts/AwardsContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface AwardsListProps {
  photographerId: string;
}

export default function AwardsList({ photographerId }: AwardsListProps) {
  const { getAwardsForPhotographer } = useAwards();
  const awards = getAwardsForPhotographer(photographerId);

  if (awards.length === 0) return null;

  // Deduplicate by categoryId (show each award type once)
  const uniqueAwards = awards.reduce<typeof awards>((acc, a) => {
    if (!acc.find((x) => x.categoryId === a.categoryId)) acc.push(a);
    return acc;
  }, []);

  return (
    <View style={styles.row}>
      {uniqueAwards.map((award) => {
        const cat = AWARD_CATEGORIES.find((c) => c.id === award.categoryId);
        if (!cat) return null;
        return (
          <View key={award.id} style={styles.badge}>
            <Text style={styles.emoji}>{cat.emoji}</Text>
            <Text style={styles.label}>{cat.nameKo}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 12,
  },
  label: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
});
