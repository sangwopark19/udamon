import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { KBO_TEAMS } from '../../constants/teams';
import type { KBOTeam } from '../../constants/teams';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface TeamFilterBarProps {
  selectedTeamId: string | null;
  onSelect: (teamId: string | null) => void;
  showAll?: boolean;
  myTeamId?: string | null;
}

type TeamItem = { id: string; label: string; color: string; textColor: string; isMy?: boolean };

export default function TeamFilterBar({
  selectedTeamId,
  onSelect,
  showAll = true,
  myTeamId,
}: TeamFilterBarProps) {
  const { t } = useTranslation();
  const items = useMemo(() => {
    const result: TeamItem[] = [];

    // "ALL" button
    if (showAll) {
      result.push({
        id: '__all__',
        label: t('filter_all'),
        color: colors.primary,
        textColor: colors.buttonPrimaryText,
      });
    }

    // My team first (if set and exists)
    if (myTeamId) {
      const myTeam = KBO_TEAMS.find((team) => team.id === myTeamId);
      if (myTeam) {
        result.push({
          id: myTeam.id,
          label: myTeam.shortName,
          color: myTeam.color,
          textColor: myTeam.textColor,
          isMy: true,
        });
      }
    }

    // Remaining teams (skip my team to avoid duplicate)
    KBO_TEAMS.forEach((team: KBOTeam) => {
      if (team.id === myTeamId) return;
      result.push({ id: team.id, label: team.shortName, color: team.color, textColor: team.textColor });
    });

    return result;
  }, [showAll, myTeamId, t]);

  const isAllSelected = selectedTeamId === null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item) => {
        const isAll = item.id === '__all__';
        const active = isAll ? isAllSelected : selectedTeamId === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(isAll ? null : item.id)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              active
                ? { backgroundColor: item.color, borderColor: item.color }
                : isAll
                  ? { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceElevated, borderColor: item.color },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active
                    ? (isAll ? colors.buttonPrimaryText : item.textColor)
                    : isAll
                      ? colors.primary
                      : item.color,
                },
              ]}
            >
              {item.isMy ? `★ ${item.label}` : item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.round,
    borderWidth: 1.5,
  },
  label: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
  },
});
