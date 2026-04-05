import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThankYouWall } from '../../contexts/ThankYouWallContext';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

const MAX_LENGTH = 100;

interface ThankYouWriteModalProps {
  visible: boolean;
  photographerId: string;
  onClose: () => void;
}

export default function ThankYouWriteModal({ visible, photographerId, onClose }: ThankYouWriteModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addMessage } = useThankYouWall();
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!user || text.trim().length === 0) return;
    addMessage({
      fromUserId: user.id,
      fromUserName: user.display_name ?? user.email ?? 'User',
      toPhotographerId: photographerId,
      message: text.trim(),
    });
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            응원 메시지 남기기
          </Text>
          <TextInput
            style={styles.input}
            placeholder="응원 메시지를 남겨주세요 (최대 100자)"
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={(v) => setText(v.slice(0, MAX_LENGTH))}
            multiline
            maxLength={MAX_LENGTH}
          />
          <View style={styles.footer}>
            <Text style={styles.charCount}>{text.length}/{MAX_LENGTH}</Text>
            <TouchableOpacity
              style={[styles.submitBtn, text.trim().length === 0 && styles.submitBtnDisabled]}
              activeOpacity={0.7}
              onPress={handleSubmit}
              disabled={text.trim().length === 0}
            >
              <Text style={styles.submitBtnText}>{t('btn_submit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  charCount: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.round,
  },
  submitBtnDisabled: {
    opacity: 0.35,
  },
  submitBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
});
