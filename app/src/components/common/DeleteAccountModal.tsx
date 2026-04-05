import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountModal({ visible, onClose, onConfirm }: DeleteAccountModalProps) {
  const [input, setInput] = useState('');
  const isValid = input === CONFIRM_WORD;

  const handleConfirm = () => {
    if (!isValid) return;
    setInput('');
    onConfirm();
  };

  const handleClose = () => {
    setInput('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning" size={32} color={colors.error} />
          </View>
          <Text style={styles.title}>
            계정 탈퇴
          </Text>
          <Text style={styles.desc}>
            {'탈퇴 시 30일간 유예 후 모든 데이터가 영구 삭제됩니다.\n확인을 위해 아래에 "DELETE"를 입력하세요.'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="DELETE"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            autoCapitalize="characters"
          />
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, !isValid && styles.deleteBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.7}
              disabled={!isValid}
            >
              <Text style={styles.deleteBtnText}>탈퇴하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.error,
    marginBottom: 8,
  },
  desc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.35,
  },
  deleteBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
});
