import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { KBO_TEAMS } from '../../constants/teams';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Step = 1 | 2 | 3;

interface DbTeam {
  id: string;
  name_ko: string;
}

export default function SignupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { signUpWithEmail, completeSignup } = useAuth();

  // Step
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Consent
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const allAgreed = agreePrivacy && agreeTerms && agreeMarketing;
  const toggleAll = () => {
    const next = !allAgreed;
    setAgreePrivacy(next);
    setAgreeTerms(next);
    setAgreeMarketing(next);
  };

  // Step 1 — Email real-time check
  type CheckStatus = 'idle' | 'checking' | 'available' | 'taken';
  const [emailStatus, setEmailStatus] = useState<CheckStatus>('idle');
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const checkEmail = useCallback((value: string) => {
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    const trimmed = value.trim().toLowerCase();
    if (!trimmed.includes('@') || trimmed.length < 5) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    emailDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', trimmed)
        .maybeSingle();
      setEmailStatus(data ? 'taken' : 'available');
    }, 500);
  }, []);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    checkEmail(value);
  }, [checkEmail]);

  // Step 2 — Profile
  const [nickname, setNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<CheckStatus>('idle');
  const nicknameDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [dbTeams, setDbTeams] = useState<DbTeam[]>([]);

  // DB에서 팀 목록 로드 (UUID ID 획득)
  useEffect(() => {
    supabase
      .from('teams')
      .select('id, name_ko')
      .order('sort_order')
      .then(({ data }) => { if (data) setDbTeams(data as DbTeam[]); });
  }, []);

  const checkNickname = useCallback((value: string) => {
    if (nicknameDebounceRef.current) clearTimeout(nicknameDebounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 2 || !/^[가-힣a-zA-Z0-9]+$/.test(trimmed)) {
      setNicknameStatus('idle');
      return;
    }
    setNicknameStatus('checking');
    nicknameDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', trimmed)
        .maybeSingle();
      setNicknameStatus(data ? 'taken' : 'available');
    }, 500);
  }, []);

  const handleNicknameChange = useCallback((value: string) => {
    setNickname(value);
    checkNickname(value);
  }, [checkNickname]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
      if (nicknameDebounceRef.current) clearTimeout(nicknameDebounceRef.current);
    };
  }, []);

  // Step 3 — Complete
  const [signupDone, setSignupDone] = useState(false);
  const celebScale = useRef(new Animated.Value(0)).current;
  const celebOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(20)).current;
  const confettiAnims = useRef(
    Array.from({ length: 10 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0),
    })),
  ).current;

  // Celebration effect
  useEffect(() => {
    if (!signupDone) return;

    // Main icon: scale spring
    Animated.sequence([
      Animated.timing(celebOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(celebScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
    ]).start();

    // Text slide up
    Animated.timing(textSlide, { toValue: 0, duration: 400, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    // Confetti particles
    const EMOJIS_COUNT = confettiAnims.length;
    confettiAnims.forEach((anim, i) => {
      const angle = (Math.PI * 2 * i) / EMOJIS_COUNT;
      const dist = 100 + Math.random() * 60;
      const toX = Math.cos(angle) * dist;
      const toY = Math.sin(angle) * dist - 40;

      Animated.sequence([
        Animated.delay(200 + i * 40),
        Animated.parallel([
          Animated.spring(anim.scale, { toValue: 1, friction: 5, useNativeDriver: true }),
          Animated.timing(anim.x, { toValue: toX, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(anim.y, { toValue: toY, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.timing(anim.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    });
  }, [signupDone]);

  // Validation
  const [error, setError] = useState('');

  const validateStep1 = (): boolean => {
    if (!email.includes('@')) { setError(t('signup_error_email')); return false; }
    if (emailStatus === 'taken') { setError(t('signup_error_email_taken')); return false; }
    if (emailStatus === 'checking') { setError(t('signup_error_email_checking')); return false; }
    if (password.length < 8) { setError(t('signup_error_password')); return false; }
    if (password !== confirmPassword) { setError(t('signup_error_password_mismatch')); return false; }
    if (!agreePrivacy || !agreeTerms) { setError(t('signup_error_consent_required')); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (nickname.trim().length < 2 || nickname.trim().length > 12) {
      setError(t('signup_error_nickname_length'));
      return false;
    }
    if (!/^[가-힣a-zA-Z0-9]+$/.test(nickname.trim())) {
      setError(t('signup_error_nickname_format'));
      return false;
    }
    if (nicknameStatus === 'taken') { setError(t('signup_error_nickname_taken')); return false; }
    if (nicknameStatus === 'checking') { setError(t('signup_error_nickname_checking')); return false; }
    return true;
  };

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setLoading(true);
      const result = await signUpWithEmail(email, password, nickname.trim(), selectedTeamId ?? undefined);
      if (!result.success) {
        setLoading(false);
        setError(result.error ?? t('signup_error_failed'));
        return;
      }
      // signupInProgress 플래그가 navigator key 변경을 차단하므로
      // 컴포넌트가 살아있는 상태에서 step 3 축하 화면으로 전환
      setLoading(false);
      setStep(3);
      setSignupDone(true);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) navigation.goBack();
    else setStep((s) => (s - 1) as Step);
  };

  const canProceed = () => {
    if (step === 1) return email.length > 0 && emailStatus !== 'taken' && emailStatus !== 'checking' && password.length >= 8 && confirmPassword.length > 0 && agreePrivacy && agreeTerms;
    if (step === 2) return nickname.trim().length >= 2 && nicknameStatus !== 'taken' && nicknameStatus !== 'checking' && selectedTeamId !== null;
    return false;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('signup_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1 — Account */}
          {step === 1 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t('signup_step_account')}</Text>
              <Text style={styles.stepDesc}>{t('signup_step1_desc')}</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('signup_label_email')}</Text>
                <View style={[styles.inputWrap, emailStatus === 'taken' && styles.inputError, emailStatus === 'available' && styles.inputAvailable]}>
                  <Ionicons name="mail-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@email.com"
                    placeholderTextColor={colors.textTertiary}
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {emailStatus === 'checking' && <ActivityIndicator size="small" color={colors.textTertiary} />}
                  {emailStatus === 'available' && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                  {emailStatus === 'taken' && <Ionicons name="close-circle" size={18} color={colors.error} />}
                </View>
                {emailStatus === 'taken' && <Text style={styles.fieldError}>{t('signup_error_email_taken')}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('signup_label_password')}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('signup_password_placeholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('signup_label_password_confirm')}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('signup_confirm_placeholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Consent */}
              <View style={styles.consentSection}>
                <TouchableOpacity style={styles.consentAllBtn} onPress={toggleAll} activeOpacity={0.7}>
                  <Ionicons
                    name={allAgreed ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={allAgreed ? colors.primary : colors.textTertiary}
                  />
                  <Text style={styles.consentAllText}>{t('signup_consent_all')}</Text>
                </TouchableOpacity>

                <View style={styles.consentDivider} />

                {/* Privacy [필수] */}
                <View style={styles.consentRow}>
                  <TouchableOpacity style={styles.consentCheck} onPress={() => setAgreePrivacy(!agreePrivacy)} activeOpacity={0.7}>
                    <Ionicons
                      name={agreePrivacy ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={agreePrivacy ? colors.primary : colors.textTertiary}
                    />
                    <Text style={styles.consentLabel}>{t('signup_consent_privacy')}</Text>
                    <View style={styles.consentRequiredBadge}>
                      <Text style={styles.consentRequiredText}>{t('signup_consent_required_tag')}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Privacy')} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {/* Terms [필수] */}
                <View style={styles.consentRow}>
                  <TouchableOpacity style={styles.consentCheck} onPress={() => setAgreeTerms(!agreeTerms)} activeOpacity={0.7}>
                    <Ionicons
                      name={agreeTerms ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={agreeTerms ? colors.primary : colors.textTertiary}
                    />
                    <Text style={styles.consentLabel}>{t('signup_consent_terms')}</Text>
                    <View style={styles.consentRequiredBadge}>
                      <Text style={styles.consentRequiredText}>{t('signup_consent_required_tag')}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Terms')} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {/* Marketing [선택] */}
                <View style={styles.consentRow}>
                  <TouchableOpacity style={styles.consentCheck} onPress={() => setAgreeMarketing(!agreeMarketing)} activeOpacity={0.7}>
                    <Ionicons
                      name={agreeMarketing ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={agreeMarketing ? colors.primary : colors.textTertiary}
                    />
                    <Text style={styles.consentLabel}>{t('signup_consent_marketing')}</Text>
                    <View style={styles.consentOptionalBadge}>
                      <Text style={styles.consentOptionalText}>{t('signup_consent_optional_tag')}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Step 2 — Profile */}
          {step === 2 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t('signup_step_profile')}</Text>
              <Text style={styles.stepDesc}>{t('signup_step2_desc')}</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('signup_label_nickname')}</Text>
                <View style={[styles.inputWrap, nicknameStatus === 'taken' && styles.inputError, nicknameStatus === 'available' && styles.inputAvailable]}>
                  <Ionicons name="person-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('signup_nickname_placeholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={nickname}
                    onChangeText={handleNicknameChange}
                    maxLength={12}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {nicknameStatus === 'checking' && <ActivityIndicator size="small" color={colors.textTertiary} />}
                  {nicknameStatus === 'available' && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                  {nicknameStatus === 'taken' && <Ionicons name="close-circle" size={18} color={colors.error} />}
                </View>
                {nicknameStatus === 'taken' && <Text style={styles.fieldError}>{t('signup_error_nickname_taken')}</Text>}
                {nicknameStatus === 'available' && <Text style={styles.fieldSuccess}>{t('signup_nickname_available')}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('signup_label_team')}</Text>
                <View style={styles.teamGrid}>
                  {dbTeams.map((dbTeam) => {
                    const kboMatch = KBO_TEAMS.find((k) => dbTeam.name_ko.includes(k.shortName) || k.nameKo === dbTeam.name_ko);
                    const teamColor = kboMatch?.color ?? colors.textTertiary;
                    const teamTextColor = kboMatch?.textColor ?? '#FFFFFF';
                    const shortName = kboMatch?.shortName ?? dbTeam.name_ko;
                    const isSelected = selectedTeamId === dbTeam.id;
                    return (
                      <TouchableOpacity
                        key={dbTeam.id}
                        activeOpacity={0.7}
                        onPress={() => setSelectedTeamId(isSelected ? null : dbTeam.id)}
                        style={[
                          styles.teamItem,
                          isSelected
                            ? { backgroundColor: teamColor, borderColor: teamColor }
                            : { backgroundColor: colors.surfaceElevated, borderColor: teamColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.teamName,
                            { color: isSelected ? teamTextColor : teamColor },
                          ]}
                        >
                          {shortName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Step 3 — Complete (Celebration) */}
          {step === 3 && (
            <View style={styles.completeWrap}>
              {/* Confetti particles */}
              <View style={styles.confettiContainer}>
                {confettiAnims.map((anim, i) => (
                  <Animated.Text
                    key={i}
                    style={[
                      styles.confettiParticle,
                      {
                        opacity: anim.opacity,
                        transform: [
                          { translateX: anim.x },
                          { translateY: anim.y },
                          { scale: anim.scale },
                        ],
                      },
                    ]}
                  >
                    {'⚾'}
                  </Animated.Text>
                ))}
              </View>

              {/* Main icon */}
              <Animated.View
                style={[
                  styles.celebIcon,
                  { opacity: celebOpacity, transform: [{ scale: celebScale }] },
                ]}
              >
                <Text style={styles.celebEmoji}>⚾</Text>
              </Animated.View>

              {/* Text */}
              <Animated.View style={[styles.celebTextWrap, { opacity: celebOpacity, transform: [{ translateY: textSlide }] }]}>
                <Text style={styles.completeTitle}>{t('signup_complete_title')}</Text>
                <Text style={styles.completeDesc}>
                  {t('signup_complete_welcome')}
                </Text>
              </Animated.View>

              <TouchableOpacity
                style={styles.startBtn}
                activeOpacity={0.8}
                onPress={() => completeSignup()}
              >
                <Text style={styles.startBtnText}>{t('signup_start')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      {step < 3 && (
        <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleNext}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.nextBtnText}>
                {step === 1 ? t('signup_btn_next') : t('signup_btn_submit')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },

  // Header
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Steps
  stepWrap: {
    gap: 20,
  },
  stepTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  stepDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    marginTop: -12,
  },

  // Form
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: 12,
  },
  fieldError: {
    fontSize: fontSize.micro,
    color: colors.error,
    marginTop: 4,
  },
  fieldSuccess: {
    fontSize: fontSize.micro,
    color: colors.success,
    marginTop: 4,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputAvailable: {
    borderColor: colors.success,
  },

  // Team Grid
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  teamName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
  },

  // Consent
  consentSection: {
    gap: 12,
    paddingTop: 4,
  },
  consentAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  consentAllText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  consentDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consentCheck: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  consentLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  consentRequiredBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  consentRequiredText: {
    fontSize: 10,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
  consentOptionalBadge: {
    backgroundColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  consentOptionalText: {
    fontSize: 10,
    fontWeight: fontWeight.name,
    color: colors.textTertiary,
  },

  // Complete
  completeWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  confettiContainer: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiParticle: {
    position: 'absolute',
    fontSize: 24,
  },
  celebIcon: {
    marginBottom: 16,
  },
  celebEmoji: {
    fontSize: 72,
  },
  celebTextWrap: {
    alignItems: 'center',
    gap: 8,
  },
  completeTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  completeDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  startBtn: {
    height: 52,
    paddingHorizontal: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  startBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },

  // Bottom Action
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
