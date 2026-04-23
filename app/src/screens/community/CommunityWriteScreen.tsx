import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import TeamFilterBar from '../../components/common/TeamFilterBar';
import { uploadCommunityImages } from '../../services/r2Upload';
import { supabase } from '../../services/supabase';
import type { PollDuration } from '../../types/poll';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'CommunityWrite'>;

const TITLE_MAX = 30;
const CONTENT_MAX = 1000;
const IMAGES_MAX = 10;
const POLL_OPTIONS_MIN = 2;
const POLL_OPTIONS_MAX = 6;

const POLL_DURATION_I18N: Record<PollDuration, string> = {
  '24h': 'write_poll_24h',
  '3d': 'write_poll_3d',
  '7d': 'write_poll_7d',
};

export default function CommunityWriteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScreenRoute>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { createPost } = useCommunity();
  const { showToast } = useToast();

  const POLL_DURATIONS: { key: PollDuration; label: string }[] = [
    { key: '24h', label: t(POLL_DURATION_I18N['24h']) },
    { key: '3d', label: t(POLL_DURATION_I18N['3d']) },
    { key: '7d', label: t(POLL_DURATION_I18N['7d']) },
  ];

  // Form state — initialize teamId from route param if provided
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(route.params?.teamId ?? null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollDuration, setPollDuration] = useState<PollDuration>('24h');

  // Submit / upload state (D-09, D-18)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading_images' | 'creating_post'>('idle');
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);

  const contentRef = useRef<TextInput>(null);
  // Stable ref for retry-from-Alert without creating a dependency cycle on handleSubmit
  const handleSubmitRef = useRef<() => void>(() => {});

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    title.length <= TITLE_MAX &&
    content.length <= CONTENT_MAX &&
    (!showPoll || pollOptions.filter((o) => o.trim()).length >= POLL_OPTIONS_MIN);

  // ─── Handlers ─────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (title.trim() || content.trim()) {
      Alert.alert(t('write_cancel_title'), t('write_cancel_desc'), [
        { text: t('write_cancel_continue'), style: 'cancel' },
        { text: t('write_cancel_leave'), style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  }, [title, content, navigation]);

  // D-09: R2 upload FIRST → then createPost with publicUrls
  // D-18: Alert + form retention on any failure, no auto-retry
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user?.id) return;
    setIsSubmitting(true);

    let publicUrls: string[] = [];

    // Step 1: Upload images to R2 (if any)
    if (images.length > 0) {
      setUploadStep('uploading_images');
      setUploadTotal(images.length);
      setUploadCurrent(0);

      const sessionResult = await supabase.auth.getSession();
      const token = sessionResult.data.session?.access_token;
      if (!token) {
        setIsSubmitting(false);
        setUploadStep('idle');
        Alert.alert(
          t('community_image_upload_failed_title'),
          t('community_image_upload_failed_desc'),
          [
            { text: t('btn_cancel'), style: 'cancel' },
            { text: t('btn_retry'), onPress: () => { handleSubmitRef.current(); } },
          ],
        );
        return;
      }

      const uploadResult = await uploadCommunityImages(images, token);
      if (uploadResult.error || !uploadResult.data) {
        setIsSubmitting(false);
        setUploadStep('idle');
        Alert.alert(
          t('community_image_upload_failed_title'),
          t('community_image_upload_failed_desc'),
          [
            { text: t('btn_cancel'), style: 'cancel' },
            { text: t('btn_retry'), onPress: () => { handleSubmitRef.current(); } },
          ],
        );
        return;
      }
      publicUrls = uploadResult.data;
      setUploadCurrent(images.length);
    }

    // Step 2: Create post (+ poll if present)
    setUploadStep('creating_post');

    const pollInput = showPoll
      ? {
          allow_multiple: pollAllowMultiple,
          duration: pollDuration,
          options: pollOptions.filter((o) => o.trim()),
        }
      : undefined;

    const created = await createPost(
      {
        team_id: selectedTeamId ?? undefined,
        title: title.trim(),
        content: content.trim(),
        images: publicUrls,
      },
      pollInput,
    );

    if (!created) {
      // Orphan R2 files per D-09 — log for v2 cleanup
      if (publicUrls.length > 0) {
        console.warn('[Community] R2 upload succeeded but DB insert failed — orphan:', publicUrls);
      }
      setIsSubmitting(false);
      setUploadStep('idle');
      Alert.alert(
        t('community_post_create_failed_title'),
        t('community_post_create_failed_desc'),
        [
          { text: t('btn_cancel'), style: 'cancel' },
          { text: t('btn_retry'), onPress: () => { handleSubmitRef.current(); } },
        ],
      );
      return;
    }

    // Full success
    setIsSubmitting(false);
    setUploadStep('idle');
    showToast(t('write_post_success'), 'success');
    navigation.goBack();
  }, [
    canSubmit,
    user?.id,
    images,
    showPoll,
    pollAllowMultiple,
    pollDuration,
    pollOptions,
    createPost,
    selectedTeamId,
    title,
    content,
    navigation,
    showToast,
    t,
  ]);

  // Keep the retry ref in sync with the latest handleSubmit closure
  useEffect(() => {
    handleSubmitRef.current = () => {
      void handleSubmit();
    };
  }, [handleSubmit]);

  const handleAddImage = useCallback(async () => {
    if (images.length >= IMAGES_MAX) {
      Alert.alert(t('write_max_images', { max: IMAGES_MAX }));
      return;
    }
    const remaining = IMAGES_MAX - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const uris = result.assets.map((a) => a.uri);
    setImages((prev) => [...prev, ...uris].slice(0, IMAGES_MAX));
  }, [images.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTogglePoll = useCallback(() => {
    setShowPoll((prev) => !prev);
    if (showPoll) {
      // Reset poll state when hiding
      setPollOptions(['', '']);
      setPollAllowMultiple(false);
      setPollDuration('24h');
    }
  }, [showPoll]);

  const handlePollOptionChange = useCallback((index: number, text: string) => {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? text : o)));
  }, []);

  const handleAddPollOption = useCallback(() => {
    if (pollOptions.length >= POLL_OPTIONS_MAX) return;
    setPollOptions((prev) => [...prev, '']);
  }, [pollOptions.length]);

  const handleRemovePollOption = useCallback((index: number) => {
    if (pollOptions.length <= POLL_OPTIONS_MIN) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  }, [pollOptions.length]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('community_write')}</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={!canSubmit || isSubmitting}
            style={styles.headerBtn}
          >
            <Text style={[styles.submitText, (!canSubmit || isSubmitting) && styles.submitTextDisabled]}>
              {t('write_register')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Team Selector */}
          <View style={styles.teamSection}>
            <TeamFilterBar
              selectedTeamId={selectedTeamId}
              onSelect={(id) => setSelectedTeamId(id === selectedTeamId ? null : id)}
              showAll={false}
              myTeamId={user?.my_team_id}
            />
          </View>

          {/* Title */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.titleInput}
              placeholder={t('write_title_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={(text) => setTitle(text.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
            />
            <Text style={[styles.charCount, title.length >= TITLE_MAX && styles.charCountOver]}>
              {title.length}/{TITLE_MAX}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.inputSection}>
            <TextInput
              ref={contentRef}
              style={styles.contentInput}
              placeholder={t('write_content_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={content}
              onChangeText={(text) => setContent(text.slice(0, CONTENT_MAX))}
              maxLength={CONTENT_MAX}
              multiline
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, content.length >= CONTENT_MAX && styles.charCountOver]}>
              {content.length}/{CONTENT_MAX}
            </Text>
          </View>

          {/* Images */}
          {images.length > 0 && (
            <View style={styles.imageSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.imageThumb} />
                    <TouchableOpacity
                      style={styles.imageRemoveBtn}
                      onPress={() => handleRemoveImage(index)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Poll Section */}
          {showPoll && (
            <View style={styles.pollSection}>
              <View style={styles.pollHeader}>
                <Text style={styles.pollTitle}>{t('write_poll')}</Text>
                <TouchableOpacity onPress={handleTogglePoll} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Poll Options */}
              {pollOptions.map((opt, index) => (
                <View key={index} style={styles.pollOptionRow}>
                  <TextInput
                    style={styles.pollOptionInput}
                    placeholder={t('write_poll_option', { index: index + 1 })}
                    placeholderTextColor={colors.textTertiary}
                    value={opt}
                    onChangeText={(text) => handlePollOptionChange(index, text)}
                    maxLength={50}
                  />
                  {pollOptions.length > POLL_OPTIONS_MIN && (
                    <TouchableOpacity onPress={() => handleRemovePollOption(index)} activeOpacity={0.7}>
                      <Ionicons name="remove-circle-outline" size={22} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < POLL_OPTIONS_MAX && (
                <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddPollOption} activeOpacity={0.7}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addOptionText}>{t('write_poll_add_option')}</Text>
                </TouchableOpacity>
              )}

              {/* Poll Settings */}
              <View style={styles.pollSettings}>
                {/* Multiple choice toggle */}
                <TouchableOpacity
                  style={styles.pollToggle}
                  onPress={() => setPollAllowMultiple((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={pollAllowMultiple ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={pollAllowMultiple ? colors.primary : colors.textTertiary}
                  />
                  <Text style={styles.pollToggleText}>{t('write_poll_allow_multiple')}</Text>
                </TouchableOpacity>

                {/* Duration selector */}
                <View style={styles.durationRow}>
                  <Text style={styles.durationLabel}>{t('write_poll_deadline')}</Text>
                  {POLL_DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d.key}
                      onPress={() => setPollDuration(d.key)}
                      activeOpacity={0.7}
                      style={[styles.durationChip, pollDuration === d.key && styles.durationChipActive]}
                    >
                      <Text style={[styles.durationChipText, pollDuration === d.key && styles.durationChipTextActive]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.toolBtn} onPress={handleAddImage} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
            {images.length > 0 && (
              <Text style={styles.toolBadge}>{images.length}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={handleTogglePoll}
            activeOpacity={0.7}
          >
            <Ionicons
              name="bar-chart-outline"
              size={24}
              color={showPoll ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Uploading Overlay (D-09) — blocks UI during R2 upload + createPost */}
      <Modal
        visible={isSubmitting}
        transparent
        animationType="fade"
        onRequestClose={() => { /* non-dismissable */ }}
      >
        <View
          style={styles.overlayRoot}
          accessibilityViewIsModal
          importantForAccessibility="yes"
        >
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayCaption}>{t('community_image_uploading')}</Text>
            {uploadStep === 'uploading_images' && uploadTotal > 1 && (
              <Text style={styles.overlayProgress}>
                {t('community_image_upload_progress', {
                  current: uploadCurrent,
                  total: uploadTotal,
                })}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  submitText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  submitTextDisabled: {
    color: colors.textTertiary,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Team selector
  teamSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Title / Content
  inputSection: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleInput: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    paddingVertical: 14,
  },
  contentInput: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    paddingVertical: 14,
    minHeight: 200,
  },
  charCount: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
    textAlign: 'right',
    paddingBottom: 8,
  },
  charCountOver: {
    color: colors.error,
  },

  // Images
  imageSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  imageScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.background,
    borderRadius: 10,
  },

  // Poll
  pollSection: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pollTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollOptionInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addOptionText: {
    fontSize: fontSize.meta,
    color: colors.primary,
    fontWeight: fontWeight.body,
  },
  pollSettings: {
    marginTop: 12,
    gap: 12,
  },
  pollToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollToggleText: {
    fontSize: fontSize.meta,
    color: colors.textPrimary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationLabel: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    marginRight: 4,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationChipText: {
    fontSize: fontSize.micro,
    color: colors.textSecondary,
  },
  durationChipTextActive: {
    color: colors.buttonPrimaryText,
  },

  // Bottom Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 16,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolBadge: {
    fontSize: fontSize.micro,
    color: colors.primary,
    fontWeight: fontWeight.name,
  },

  // Uploading overlay (D-09)
  overlayRoot: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    ...shadow.elevated,
  },
  overlayCaption: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  overlayProgress: {
    marginTop: spacing.sm,
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
