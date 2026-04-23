import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { usePhotographer } from '../../contexts/PhotographerContext';
import { KBO_TEAMS } from '../../constants/teams';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function CheerleadersAllScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { cheerleaders } = usePhotographer();

  const handlePress = useCallback(
    (cheerleaderId: string) => {
      navigation.navigate('CheerleaderProfile', { cheerleaderId });
    },
    [navigation],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cheerleader_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {cheerleaders.map((cl) => {
            const team = KBO_TEAMS.find((tm) => tm.id === cl.team_id);
            return (
              <TouchableOpacity
                key={cl.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handlePress(cl.id)}
              >
                {cl.image_url ? (
                  <Image source={{ uri: cl.image_url }} style={styles.cardImage} />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Ionicons name="person" size={32} color={colors.textTertiary} />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>{cl.name_ko}</Text>
                  {cl.position ? (
                    <Text style={styles.desc} numberOfLines={1}>{cl.position}</Text>
                  ) : null}
                  {team && (
                    <View style={[styles.teamBadge, { borderColor: team.color }]}>
                      <Text style={[styles.teamText, { color: team.color }]}>{team.shortName}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {cheerleaders.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('cheerleader_empty')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 16 },

  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING, gap: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH, borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
  },
  cardImage: {
    width: '100%', height: CARD_WIDTH, resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    width: '100%', height: CARD_WIDTH,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  info: { padding: 12, gap: 3 },
  name: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textPrimary },
  desc: { fontSize: fontSize.micro, color: colors.textTertiary },
  teamBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.round,
    borderWidth: 1,
  },
  teamText: { fontSize: fontSize.tiny, fontWeight: fontWeight.name },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: fontSize.body, fontWeight: fontWeight.body, color: colors.textTertiary },
});
