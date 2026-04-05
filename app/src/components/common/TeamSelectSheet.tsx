import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KBO_TEAMS } from '../../constants/teams';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface TeamSelectSheetProps {
  visible: boolean;
  currentTeamId: string | null;
  onSelect: (teamId: string | null) => void;
  onClose: () => void;
}

export default function TeamSelectSheet({
  visible,
  currentTeamId,
  onSelect,
  onClose,
}: TeamSelectSheetProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(currentTeamId);

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>MY TEAM</Text>
            <Text style={styles.subtitle}>응원하는 팀을 선택하세요</Text>
          </View>

          {/* Team Grid (2 columns) */}
          <View style={styles.grid}>
            {KBO_TEAMS.map((team) => {
              const isSelected = selected === team.id;
              return (
                <TouchableOpacity
                  key={team.id}
                  activeOpacity={0.7}
                  onPress={() => setSelected(isSelected ? null : team.id)}
                  style={[
                    styles.teamItem,
                    isSelected
                      ? { backgroundColor: team.color, borderColor: team.color }
                      : { backgroundColor: colors.surfaceElevated, borderColor: team.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.teamName,
                      { color: isSelected ? team.textColor : team.color },
                    ]}
                  >
                    {team.shortName}
                  </Text>
                  <Text
                    style={[
                      styles.teamCity,
                      { color: isSelected ? colors.whiteAlpha70 : colors.textTertiary },
                    ]}
                  >
                    {team.city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.confirmText}>
                {selected ? '선택 완료' : '선택 안함'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  teamName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
  },
  teamCity: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
  },
  actions: {
    marginTop: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  confirmText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
