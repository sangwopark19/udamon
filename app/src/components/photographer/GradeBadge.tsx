import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';
import { gradeToBadge, type GradeInfo } from '../../utils/photographerGrade';

export interface GradeBadgeProps {
  grade: number;
  variant?: 'icon' | 'icon-label';
  size?: 'sm' | 'md';
}

// ─── Pure helpers (unit tested) ───────────────────────────────
// UI-SPEC §GradeBadge tier palette — test 대상이므로 export.

export function gradeBgColor(tier: GradeInfo['tier']): string {
  if (tier === 'gold') return colors.featuredAlpha20;
  if (tier === 'diamond') return colors.primaryAlpha8;
  return colors.surfaceLight; // bronze, silver
}

export function gradeLabelColor(tier: GradeInfo['tier']): string {
  if (tier === 'gold') return colors.featuredAccent;
  if (tier === 'diamond') return colors.primary;
  if (tier === 'bronze') return colors.textSecondary;
  return colors.textPrimary; // silver
}

export interface GradeBadgeLayout {
  iconSize: number;
  labelSize: number;
  isMd: boolean;
}

export function gradeBadgeLayout(size: 'sm' | 'md'): GradeBadgeLayout {
  const isMd = size === 'md';
  return {
    iconSize: isMd ? 16 : 12,
    labelSize: isMd ? fontSize.meta : fontSize.badge,
    isMd,
  };
}

// ─── Component ────────────────────────────────────────────────

export default function GradeBadge({ grade, variant = 'icon-label', size = 'sm' }: GradeBadgeProps) {
  const { t } = useTranslation();
  const info = gradeToBadge(grade);
  // IN-04: i18n 키 (ko.ts 의 grade_tier_*) 를 단일 source of truth 로 사용.
  // photographerGrade.ts 의 info.label 은 내부 식별용으로만 유지하고, UI 에는 번역값을 노출한다.
  const tierLabel = t(`grade_tier_${info.tier}`);

  if (variant === 'icon') {
    return (
      <Ionicons
        name={info.iconName}
        size={20}
        color={info.iconColor}
        accessibilityLabel={t('grade_a11y_label', { tier: tierLabel })}
      />
    );
  }

  const layout = gradeBadgeLayout(size);

  return (
    <View
      style={[
        styles.pill,
        layout.isMd ? styles.pillMd : styles.pillSm,
        { backgroundColor: gradeBgColor(info.tier) },
      ]}
      accessibilityLabel={t('grade_a11y_label', { tier: tierLabel })}
    >
      <Ionicons name={info.iconName} size={layout.iconSize} color={info.iconColor} />
      <Text style={[styles.label, { fontSize: layout.labelSize, color: gradeLabelColor(info.tier) }]}>
        {tierLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.round,
  },
  pillSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    fontWeight: fontWeight.name,
  },
});
