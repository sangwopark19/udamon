import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useReport, type ReportTargetType } from '../../contexts/ReportContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface ReportSheetProps {
  visible: boolean;
  targetId: string;
  targetType: ReportTargetType;
  onClose: () => void;
}

const REPORT_REASONS = [
  { id: 'spam', label: '스팸/광고' },
  { id: 'inappropriate', label: '부적절한 콘텐츠' },
  { id: 'harassment', label: '괴롭힘/혐오 발언' },
  { id: 'copyright', label: '저작권 침해' },
  { id: 'other', label: '기타' },
];

export default function ReportSheet({ visible, targetId, targetType, onClose }: ReportSheetProps) {
  const { submitReport } = useReport();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason) return;
    submitReport({ targetId, targetType, reason: selectedReason, detail: detail.trim() || undefined });
    setSubmitted(true);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetail('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>신고가 접수되었습니다</Text>
              <Text style={styles.successDesc}>검토 후 적절한 조치를 취하겠습니다.</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.doneBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>신고하기</Text>
              <Text style={styles.subtitle}>신고 사유를 선택해주세요.</Text>

              <View style={styles.reasonList}>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonItem, selectedReason === reason.id && styles.reasonItemActive]}
                    onPress={() => setSelectedReason(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, selectedReason === reason.id && styles.radioActive]}>
                      {selectedReason === reason.id && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.reasonLabel, selectedReason === reason.id && styles.reasonLabelActive]}>
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedReason === 'other' && (
                <TextInput
                  style={styles.detailInput}
                  placeholder="상세 내용을 입력해주세요"
                  placeholderTextColor={colors.textTertiary}
                  value={detail}
                  onChangeText={setDetail}
                  multiline
                  maxLength={300}
                />
              )}

              <TouchableOpacity
                style={[styles.submitBtn, !selectedReason && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.7}
                disabled={!selectedReason}
              >
                <Text style={styles.submitBtnText}>신고 제출</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
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
    fontSize: fontSize.price,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  reasonList: {
    gap: 4,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
  },
  reasonItemActive: {
    backgroundColor: colors.surface,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
  },
  reasonLabelActive: {
    fontWeight: fontWeight.name,
  },
  detailInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: colors.border,
  },
  submitBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },

  // Success
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  successDesc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
  },
  doneBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: radius.lg,
  },
  doneBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
