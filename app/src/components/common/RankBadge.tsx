import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RANK_TIERS, type RankTier, type RankProgress } from '../../contexts/RankContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface RankBadgeProps {
  tier: RankTier;
  progress?: RankProgress;
  size?: 'sm' | 'md';
}

export default function RankBadge({ tier, progress, size = 'sm' }: RankBadgeProps) {
  const { t } = useTranslation();
  const isMd = size === 'md';
  const [showInfo, setShowInfo] = useState(false);

  // Determine which tiers are achieved
  const currentIdx = RANK_TIERS.findIndex((rt) => rt.id === tier.id);

  // Overall progress across all tiers (for the top bar)
  const overallProgress = (() => {
    if (!progress) return 0;
    const maxScore = RANK_TIERS[RANK_TIERS.length - 1].minScore;
    if (maxScore === 0) return 1;
    return Math.min(progress.score / maxScore, 1);
  })();

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, isMd && styles.badgeMd]}
        activeOpacity={0.7}
        onPress={() => setShowInfo(true)}
      >
        <Text style={[styles.emoji, isMd && styles.emojiMd]}>{tier.emoji}</Text>
        <Text style={[styles.label, isMd && styles.labelMd]}>
          {tier.nameKo}
        </Text>
      </TouchableOpacity>

      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowInfo(false)}
        >
          <View style={styles.popup} onStartShouldSetResponder={() => true}>
            <Text style={styles.popupTitle}>{t('rank_system_title')}</Text>
            <Text style={styles.popupDesc}>{t('rank_system_desc')}</Text>

            {/* ── Overall progress bar ── */}
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.round(overallProgress * 100)}%` }]} />
                {/* Tier markers */}
                {RANK_TIERS.map((rt, i) => {
                  const maxScore = RANK_TIERS[RANK_TIERS.length - 1].minScore;
                  const pos = maxScore > 0 ? (rt.minScore / maxScore) * 100 : 0;
                  const achieved = i <= currentIdx;
                  return (
                    <View
                      key={rt.id}
                      style={[
                        styles.marker,
                        { left: `${pos}%` },
                        achieved ? styles.markerAchieved : styles.markerLocked,
                        i === currentIdx && styles.markerCurrent,
                      ]}
                    />
                  );
                })}
              </View>
              {/* Score label */}
              {progress && (
                <Text style={styles.scoreLabel}>
                  {progress.score} {t('rank_pts')}
                </Text>
              )}
            </View>

            {/* ── Rank cards ── */}
            <View style={styles.tierList}>
              {RANK_TIERS.map((rt, i) => {
                const isCurrent = i === currentIdx;
                const isAchieved = i < currentIdx;
                const isLocked = i > currentIdx;

                return (
                  <View
                    key={rt.id}
                    style={[
                      styles.tierCard,
                      isCurrent && styles.tierCardCurrent,
                      isLocked && styles.tierCardLocked,
                    ]}
                  >
                    {/* Left: emoji */}
                    <View style={[
                      styles.tierEmojiWrap,
                      isCurrent && styles.tierEmojiWrapCurrent,
                      isLocked && styles.tierEmojiWrapLocked,
                    ]}>
                      <Text style={[styles.tierEmoji, isCurrent && styles.tierEmojiCurrent]}>
                        {rt.emoji}
                      </Text>
                    </View>

                    {/* Center: name + score */}
                    <View style={styles.tierInfo}>
                      <Text style={[
                        styles.tierName,
                        isCurrent && styles.tierNameCurrent,
                        isLocked && styles.tierNameLocked,
                      ]}>
                        {rt.nameKo}
                      </Text>
                      <Text style={[styles.tierScore, isLocked && styles.tierScoreLocked]}>
                        {rt.minScore === 0 ? t('rank_score_start') : t('rank_score_min', { score: rt.minScore })}
                      </Text>
                    </View>

                    {/* Right: status icon */}
                    {isAchieved && (
                      <View style={styles.checkWrap}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      </View>
                    )}
                    {isCurrent && (
                      <View style={styles.currentTag}>
                        <Text style={styles.currentTagText}>{t('rank_current')}</Text>
                      </View>
                    )}
                    {isLocked && (
                      <View style={styles.lockWrap}>
                        <Ionicons name="lock-closed" size={16} color={colors.textTertiary} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* ── Bottom: next rank info ── */}
            {progress?.nextTier ? (
              <View style={styles.nextInfo}>
                <Ionicons name="arrow-up-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.nextInfoText}>
                  {t('rank_points_to_next', { tier: progress.nextTier.nameKo, points: progress.pointsToNext })}
                </Text>
              </View>
            ) : (
              <View style={styles.nextInfo}>
                <Ionicons name="trophy" size={16} color={colors.star} />
                <Text style={styles.nextInfoText}>{t('rank_max_reached')}</Text>
              </View>
            )}

            <Text style={styles.formula}>{t('rank_formula')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.round,
    backgroundColor: colors.primaryAlpha8,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emoji: {
    fontSize: 12,
  },
  emojiMd: {
    fontSize: 16,
  },
  label: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  labelMd: {
    fontSize: fontSize.meta,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popup: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 24,
  },
  popupTitle: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  popupDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Progress bar section
  progressSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: colors.background,
  },
  markerAchieved: {
    backgroundColor: colors.primary,
  },
  markerLocked: {
    backgroundColor: colors.border,
  },
  markerCurrent: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    top: -5,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
  },
  scoreLabel: {
    marginTop: 10,
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },

  // Tier cards
  tierList: {
    gap: 8,
    marginBottom: 16,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierCardCurrent: {
    backgroundColor: colors.primaryAlpha8,
    borderColor: colors.primary,
    paddingVertical: 16,
    borderWidth: 2,
  },
  tierCardLocked: {
    opacity: 0.5,
  },

  // Emoji wrap
  tierEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierEmojiWrapCurrent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryAlpha12,
  },
  tierEmojiWrapLocked: {
    backgroundColor: colors.border,
  },
  tierEmoji: {
    fontSize: 18,
  },
  tierEmojiCurrent: {
    fontSize: 22,
  },

  // Tier info
  tierInfo: {
    flex: 1,
    gap: 2,
  },
  tierName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  tierNameCurrent: {
    fontSize: fontSize.cardName,
    color: colors.primary,
    fontWeight: fontWeight.heading,
  },
  tierNameLocked: {
    color: colors.textTertiary,
  },
  tierScore: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  tierScoreLocked: {
    color: colors.textTertiary,
  },

  // Status icons
  checkWrap: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
  currentTagText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
  lockWrap: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Next rank info
  nextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.primaryAlpha3,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  nextInfoText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.primary,
  },

  formula: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
