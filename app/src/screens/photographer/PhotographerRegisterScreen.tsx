import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { KBO_TEAMS } from '../../constants/teams';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Step = 1 | 2 | 3 | 4;

const MAX_LINKS = 3;
const MAX_PLAN_LENGTH = 200;

export default function PhotographerRegisterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { submitPhotographerApplication } = usePhotographer();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Profile
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activityLinks, setActivityLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [activityPlan, setActivityPlan] = useState('');

  // Step 2 — Terms
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [copyrightPolicyAgreed, setCopyrightPolicyAgreed] = useState(false);

  // Step 3 — Copyright Confirmation
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);

  const handleAddLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    if (activityLinks.length >= MAX_LINKS) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert(t('pg_register_url_error_title'), t('pg_register_url_error_msg'));
      return;
    }
    setActivityLinks((prev) => [...prev, trimmed]);
    setLinkInput('');
  };

  const handleRemoveLink = (idx: number) => {
    setActivityLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      if (!selectedTeamId) return;
      // T-4-08: 활동 내역 링크 각 항목이 http(s) prefix 를 만족하는지 제출 시점 재검증
      const invalidLinks = activityLinks.filter(
        (link) => link.trim() !== '' && !/^https?:\/\//i.test(link.trim()),
      );
      if (invalidLinks.length > 0) {
        Alert.alert(t('pg_register_url_error_title'), t('pg_register_url_error_msg'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!termsAgreed || !copyrightPolicyAgreed) return;
      setStep(3);
    } else if (step === 3) {
      if (!copyrightConfirmed || !selectedTeamId || !user) return;
      setLoading(true);
      const res = await submitPhotographerApplication({
        user_id: user.id,
        team_slug: selectedTeamId,
        activity_links: activityLinks.map((s) => s.trim()).filter(Boolean),
        activity_plan: activityPlan.trim(),
        portfolio_url: null,
        bio: '',
      });
      setLoading(false);
      if (res.error) {
        Alert.alert(t('pg_register_fail'), t('pg_register_fail_desc'));
        setError(res.error);
        return;
      }
      setStep(4);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) navigation.goBack();
    else setStep((s) => (s - 1) as Step);
  };

  const canProceed = () => {
    if (step === 1) return selectedTeamId !== null;
    if (step === 2) return termsAgreed && copyrightPolicyAgreed;
    if (step === 3) return copyrightConfirmed;
    return false;
  };

  const getButtonLabel = () => {
    if (step === 1) return t('btn_next');
    if (step === 2) return t('btn_next');
    return t('pg_register_submit');
  };

  const stepLabels = [t('pg_register_step1_label'), t('pg_register_step2_label'), t('pg_register_step3_label')];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pg_register_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.progressStep}>
            <View style={[styles.progressDot, s <= step && styles.progressDotActive]} />
            <Text style={[styles.progressLabel, s <= step && styles.progressLabelActive]}>
              {stepLabels[s - 1]}
            </Text>
          </View>
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
          {/* ── Step 1: Profile Setup ── */}
          {step === 1 && (
            <View style={styles.stepWrap}>
              {/* Team Selection */}
              <Text style={styles.stepTitle}>{t('pg_register_step_team')}</Text>
              <Text style={styles.stepDesc}>{t('pg_register_step_team_desc')}</Text>

              <View style={styles.teamGrid}>
                {KBO_TEAMS.map((team) => {
                  const isSelected = selectedTeamId === team.id;
                  return (
                    <TouchableOpacity
                      key={team.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedTeamId(isSelected ? null : team.id)}
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
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Activity Links */}
              <View style={styles.sectionDivider} />
              <Text style={styles.fieldLabel}>{t('pg_register_activity_links')}</Text>
              <Text style={styles.fieldHint}>
                {t('pg_register_activity_links_hint')}
              </Text>

              {activityLinks.map((link, idx) => (
                <View key={idx} style={styles.linkItem}>
                  <Ionicons name="link" size={16} color={colors.primary} />
                  <Text style={styles.linkText} numberOfLines={1}>{link}</Text>
                  <TouchableOpacity onPress={() => handleRemoveLink(idx)} hitSlop={8} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}

              {activityLinks.length < MAX_LINKS && (
                <View style={styles.linkInputRow}>
                  <TextInput
                    style={styles.linkInput}
                    placeholder="https://"
                    placeholderTextColor={colors.textTertiary}
                    value={linkInput}
                    onChangeText={setLinkInput}
                    autoCapitalize="none"
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={handleAddLink}
                  />
                  <TouchableOpacity
                    style={[styles.addLinkBtn, !linkInput.trim() && { opacity: 0.4 }]}
                    activeOpacity={0.7}
                    onPress={handleAddLink}
                    disabled={!linkInput.trim()}
                  >
                    <Text style={styles.addLinkBtnText}>{t('pg_register_add_link')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.linkCounter}>
                {t('pg_register_link_count', { count: activityLinks.length, max: MAX_LINKS })}
              </Text>

              {/* Activity Plan */}
              <View style={styles.sectionDivider} />
              <Text style={styles.fieldLabel}>{t('pg_register_activity_plan')}</Text>
              <TextInput
                style={styles.planInput}
                placeholder={t('pg_register_activity_plan_placeholder')}
                placeholderTextColor={colors.textTertiary}
                value={activityPlan}
                onChangeText={(text) => setActivityPlan(text.slice(0, MAX_PLAN_LENGTH))}
                multiline
                maxLength={MAX_PLAN_LENGTH}
                textAlignVertical="top"
              />
              <Text style={styles.charCounter}>
                {activityPlan.length}/{MAX_PLAN_LENGTH}
              </Text>
            </View>
          )}

          {/* ── Step 2: Terms Agreement ── */}
          {step === 2 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t('pg_register_terms_title')}</Text>
              <Text style={styles.stepDesc}>{t('pg_register_terms_desc')}</Text>

              {/* Photographer Terms */}
              <View style={styles.termsCard}>
                <View style={styles.termsCardHeader}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  <Text style={styles.termsCardTitle}>{t('pg_register_pg_terms')}</Text>
                </View>
                <Text style={styles.termsCardBody}>
                  {t('pg_register_pg_terms_body')}
                </Text>
                <TouchableOpacity
                  style={styles.viewFullBtn}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('PhotographerTerms')}
                >
                  <Text style={styles.viewFullBtnText}>{t('pg_register_view_full')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.7}
                  onPress={() => setTermsAgreed(!termsAgreed)}
                >
                  <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
                    {termsAgreed && <Ionicons name="checkmark" size={16} color={colors.buttonPrimaryText} />}
                  </View>
                  <Text style={styles.checkboxLabel}>{t('pg_register_pg_terms_agree')}</Text>
                </TouchableOpacity>
              </View>

              {/* Copyright Policy */}
              <View style={styles.termsCard}>
                <View style={styles.termsCardHeader}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                  <Text style={styles.termsCardTitle}>{t('pg_register_copyright_policy')}</Text>
                </View>
                <Text style={styles.termsCardBody}>
                  {t('pg_register_copyright_policy_body')}
                </Text>
                <TouchableOpacity
                  style={styles.viewFullBtn}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('CopyrightPolicy')}
                >
                  <Text style={styles.viewFullBtnText}>{t('pg_register_view_full')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.7}
                  onPress={() => setCopyrightPolicyAgreed(!copyrightPolicyAgreed)}
                >
                  <View style={[styles.checkbox, copyrightPolicyAgreed && styles.checkboxChecked]}>
                    {copyrightPolicyAgreed && <Ionicons name="checkmark" size={16} color={colors.buttonPrimaryText} />}
                  </View>
                  <Text style={styles.checkboxLabel}>{t('pg_register_copyright_policy_agree')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.requiredBadge}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.requiredText}>{t('pg_register_terms_all_required')}</Text>
              </View>
            </View>
          )}

          {/* ── Step 3: Copyright Notice + Final Confirmation ── */}
          {step === 3 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t('pg_register_copyright_title')}</Text>
              <Text style={styles.copyrightBody}>
                {t('pg_register_copyright_body')}
              </Text>

              {/* Warning Box */}
              <View style={styles.warningBox}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={20} color={colors.warning} />
                  <Text style={styles.warningTitle}>{t('pg_register_warning_title')}</Text>
                </View>
                <Text style={styles.warningText}>
                  {t('pg_register_warning_body')}
                </Text>
              </View>

              {/* Confirmation Checkbox */}
              <View style={styles.consentCard}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.7}
                  onPress={() => setCopyrightConfirmed(!copyrightConfirmed)}
                >
                  <View style={[styles.checkbox, copyrightConfirmed && styles.checkboxChecked]}>
                    {copyrightConfirmed && <Ionicons name="checkmark" size={16} color={colors.buttonPrimaryText} />}
                  </View>
                  <Text style={styles.consentTitle}>
                    {t('pg_register_copyright_consent')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Step 4: Pending review (UI-SPEC §PhotographerRegisterScreen Step 4) ── */}
          {step === 4 && (
            <View style={styles.pendingWrap}>
              <Ionicons name="time-outline" size={64} color={colors.warning} />
              <Text style={styles.pendingTitle}>{t('pg_register_pending_title')}</Text>
              <Text style={styles.pendingDesc}>{t('pg_register_pending_desc')}</Text>
              <TouchableOpacity
                style={styles.pendingCta}
                activeOpacity={0.7}
                onPress={() => navigation.goBack()}
                accessibilityLabel={t('pg_register_pending_go_home')}
              >
                <Text style={styles.pendingCtaLabel}>{t('pg_register_pending_go_home')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      {step < 4 && (
        <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleNext}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
            ) : (
              <Text style={styles.nextBtnText}>{getButtonLabel()}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  // Header
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },

  // Progress
  progressRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingVertical: 16, paddingHorizontal: 20,
  },
  progressStep: { flex: 1, alignItems: 'center', gap: 6 },
  progressDot: { width: '100%', height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  progressLabel: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.textTertiary },
  progressLabelActive: { color: colors.primary, fontWeight: fontWeight.name },

  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },

  // Steps
  stepWrap: { gap: 16 },
  stepTitle: { fontSize: fontSize.sectionTitle, fontWeight: fontWeight.heading, color: colors.textPrimary },
  stepDesc: { fontSize: fontSize.body, fontWeight: fontWeight.body, color: colors.textSecondary, marginTop: -8 },

  // Team Grid
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  teamItem: { width: '47%', alignItems: 'center', paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1.5 },
  teamName: { fontSize: fontSize.body, fontWeight: fontWeight.name },

  // Section Divider
  sectionDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  // Field
  fieldLabel: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  fieldHint: { fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textTertiary, lineHeight: 20, marginTop: -8 },

  // Activity Links
  linkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
  },
  linkText: { flex: 1, fontSize: fontSize.meta, color: colors.primary },
  linkInputRow: { flexDirection: 'row', gap: 8 },
  linkInput: {
    flex: 1, height: 44, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, fontSize: fontSize.body, color: colors.textPrimary,
  },
  addLinkBtn: {
    height: 44, paddingHorizontal: 16,
    backgroundColor: colors.primary, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  addLinkBtnText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },
  linkCounter: { fontSize: fontSize.micro, color: colors.textTertiary, textAlign: 'right', marginTop: -8 },

  // Activity Plan
  planInput: {
    minHeight: 100, maxHeight: 160,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, fontSize: fontSize.body, color: colors.textPrimary,
    lineHeight: 22, textAlignVertical: 'top',
  },
  charCounter: { fontSize: fontSize.micro, color: colors.textTertiary, textAlign: 'right', marginTop: -8 },

  // Terms Cards (Step 2)
  termsCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12,
  },
  termsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  termsCardTitle: { fontSize: fontSize.body, fontWeight: fontWeight.heading, color: colors.textPrimary },
  termsCardBody: { fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textSecondary, lineHeight: 20 },
  viewFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  viewFullBtnText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.primary },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary, lineHeight: 22 },

  // Consent Card
  consentCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16,
  },
  consentTitle: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary, lineHeight: 22 },

  // Copyright (Step 3)
  copyrightBody: { fontSize: fontSize.body, fontWeight: fontWeight.body, color: colors.textSecondary, lineHeight: 24 },
  warningBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 16, gap: 8,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningTitle: { fontSize: fontSize.body, fontWeight: fontWeight.heading, color: colors.warning },
  warningText: { fontSize: fontSize.meta, fontWeight: fontWeight.body, color: colors.textSecondary, lineHeight: 22 },

  // Required Badge
  requiredBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requiredText: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.error },

  // Pending (Step 4 redesign — UI-SPEC §PhotographerRegisterScreen)
  pendingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: 24,
  },
  pendingTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  pendingDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginTop: spacing.md,
  },
  pendingCta: {
    height: 48,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  pendingCtaLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.buttonPrimaryText,
  },

  // Error
  errorText: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.error, textAlign: 'center', marginTop: 12 },

  // Bottom Action
  bottomAction: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
  },
  nextBtn: { height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: fontSize.cardName, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },
});
