import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color?: string;
  onPress?: () => void;
}

export default function AdminStatCard({ icon, label, value, color = colors.primary, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={onPress ? 0.7 : 1} onPress={onPress} disabled={!onPress}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  label: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
});
