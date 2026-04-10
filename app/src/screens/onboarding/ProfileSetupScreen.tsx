import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../services/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Constants ───
const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,12}$/;
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 12;
const DEBOUNCE_MS = 500;
const GRID_COLUMNS = 3;

type NicknameStatus = 'idle' | 'checking' | 'available' | 'taken';

interface Team {
  id: string;
  name_ko: string;
  logo_url: string | null;
}

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  // ─── State ───
  const existingNickname = user?.nickname && !user.nickname.startsWith('user_') ? user.nickname : '';
  const [nickname, setNickname] = useState(existingNickname);
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>(existingNickname ? 'available' : 'idle');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ─── Load Teams ───
  useEffect(() => {
    const loadTeams = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name_ko, logo_url')
        .order('sort_order');
      if (error) {
        console.error('[ProfileSetup] Failed to load teams:', error);
      } else if (data) {
        setTeams(data as Team[]);
      }
      setTeamsLoading(false);
    };
    loadTeams();
  }, []);

  // ─── Nickname Validation & Uniqueness Check ───
  const checkNickname = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    setNicknameError(null);

    // 길이 부족 시 idle
    if (trimmed.length < NICKNAME_MIN) {
      setNicknameStatus('idle');
      return;
    }

    // 길이 초과
    if (trimmed.length > NICKNAME_MAX) {
      setNicknameError(t('profile_setup_nickname_invalid'));
      setNicknameStatus('idle');
      return;
    }

    // 허용 문자 체크
    if (!/^[가-힣a-zA-Z0-9]+$/.test(trimmed)) {
      setNicknameError(t('profile_setup_nickname_invalid'));
      setNicknameStatus('idle');
      return;
    }

    setNicknameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', trimmed)
        .maybeSingle();

      if (error) {
        console.error('[ProfileSetup] Nickname check error:', error);
        setNicknameStatus('idle');
        return;
      }

      // data가 존재하면 이미 사용 중, 단 자기 자신의 닉네임이면 허용
      if (data && data.id !== user?.id) {
        setNicknameStatus('taken');
      } else {
        setNicknameStatus('available');
      }
    }, DEBOUNCE_MS);
  }, [user?.id, t]);

  const handleNicknameChange = useCallback((value: string) => {
    setNickname(value);
    checkNickname(value);
  }, [checkNickname]);

  // ─── Cleanup debounce on unmount ───
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── Submit ───
  const canSubmit = nicknameStatus === 'available' && selectedTeamId !== null && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user) return;

    const trimmedNickname = nickname.trim();

    // 최종 정규식 검증
    if (!NICKNAME_REGEX.test(trimmedNickname)) {
      showToast(t('profile_setup_nickname_invalid'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nickname: trimmedNickname,
          my_team_id: selectedTeamId,
          nickname_changed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('[ProfileSetup] Profile update error:', error);
        showToast(t('profile_update_error'), 'error');
        setIsSubmitting(false);
        return;
      }

      await refreshUser();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: unknown) {
      console.error('[ProfileSetup] Unexpected error:', e instanceof Error ? e.message : 'Unknown');
      showToast(t('profile_update_error'), 'error');
      setIsSubmitting(false);
    }
  }, [canSubmit, user, nickname, selectedTeamId, refreshUser, navigation, showToast, t]);

  // ─── Nickname Status Feedback ───
  const renderNicknameStatus = () => {
    if (nicknameError) {
      return (
        <View style={styles.statusRow}>
          <Ionicons name="close-circle" size={16} color={colors.error} />
          <Text style={styles.statusTextError}>{nicknameError}</Text>
        </View>
      );
    }

    switch (nicknameStatus) {
      case 'checking':
        return (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.textTertiary} />
            <Text style={styles.statusTextChecking}>{t('profile_setup_nickname_checking')}</Text>
          </View>
        );
      case 'available':
        return (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.statusTextAvailable}>{t('profile_setup_nickname_available')}</Text>
          </View>
        );
      case 'taken':
        return (
          <View style={styles.statusRow}>
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={styles.statusTextError}>{t('profile_setup_nickname_taken')}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // ─── Team Item ───
  const renderTeamItem = ({ item }: { item: Team }) => {
    const isSelected = item.id === selectedTeamId;
    return (
      <TouchableOpacity
        style={[styles.teamItem, isSelected && styles.teamItemSelected]}
        onPress={() => setSelectedTeamId(item.id)}
        activeOpacity={0.7}
        accessibilityLabel={item.name_ko}
      >
        <View style={[styles.teamIconWrap, isSelected && styles.teamIconWrapSelected]}>
          <Ionicons
            name="baseball"
            size={24}
            color={isSelected ? colors.primary : colors.textTertiary}
          />
        </View>
        <Text
          style={[styles.teamName, isSelected && styles.teamNameSelected]}
          numberOfLines={1}
        >
          {item.name_ko}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Header ─── */}
        <Text style={styles.title}>{t('profile_setup_title')}</Text>

        {/* ─── Nickname Section ─── */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profile_setup_nickname_label')}</Text>
          <TextInput
            style={[
              styles.input,
              nicknameStatus === 'available' && styles.inputAvailable,
              (nicknameStatus === 'taken' || nicknameError) && styles.inputError,
            ]}
            value={nickname}
            onChangeText={handleNicknameChange}
            placeholder={t('profile_setup_nickname_placeholder')}
            placeholderTextColor={colors.textTertiary}
            maxLength={NICKNAME_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          {renderNicknameStatus()}
        </View>

        {/* ─── Team Selection Section ─── */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profile_setup_team_label')}</Text>
          <Text style={styles.sublabel}>{t('profile_setup_team_select')}</Text>
          {teamsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.teamsLoader} />
          ) : (
            <FlatList
              data={teams}
              keyExtractor={(item) => item.id}
              renderItem={renderTeamItem}
              numColumns={GRID_COLUMNS}
              scrollEnabled={false}
              columnWrapperStyle={styles.teamRow}
              contentContainerStyle={styles.teamGrid}
            />
          )}
        </View>

        {/* ─── Avatar Placeholder ─── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color={colors.textTertiary} />
          </View>
          <Text style={styles.avatarLater}>{t('profile_setup_avatar_later')}</Text>
        </View>

        {/* ─── Submit Button ─── */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
              {t('profile_setup_start')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flexGrow: 1,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
  },

  // ─── Section ───
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sublabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // ─── Input ───
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  inputAvailable: {
    borderColor: colors.success,
  },
  inputError: {
    borderColor: colors.error,
  },

  // ─── Nickname Status ───
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statusTextChecking: {
    fontSize: fontSize.meta,
    color: colors.textTertiary,
  },
  statusTextAvailable: {
    fontSize: fontSize.meta,
    color: colors.success,
  },
  statusTextError: {
    fontSize: fontSize.meta,
    color: colors.error,
  },

  // ─── Team Grid ───
  teamGrid: {
    gap: spacing.sm,
  },
  teamRow: {
    gap: spacing.sm,
  },
  teamItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  teamItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha8,
  },
  teamIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  teamIconWrapSelected: {
    backgroundColor: colors.primaryAlpha15,
  },
  teamName: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  teamNameSelected: {
    color: colors.primary,
    fontWeight: fontWeight.name,
  },
  teamsLoader: {
    marginTop: spacing.lg,
  },

  // ─── Avatar ───
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarLater: {
    fontSize: fontSize.meta,
    color: colors.textTertiary,
  },

  // ─── Submit Button ───
  submitBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  submitBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
  submitBtnTextDisabled: {
    color: colors.buttonDisabledText,
  },
});
