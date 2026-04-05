import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

export default function AccountManagementScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDeleteAccount = useCallback(() => {
    setDeleteConfirmText('');
    setShowDeleteAccount(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteAccount(false);
    await logout();
    showToast(t('account_delete_done'));
  }, [logout, showToast]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('my_account_management')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Account Info */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>{t('account_email')}</Text>
            </View>
            <Text style={styles.infoValue}>{user?.email ?? '-'}</Text>
          </View>
        </View>

        {/* Delete Account — small, non-prominent text link at the bottom */}
        <TouchableOpacity
          style={styles.deleteLink}
          activeOpacity={0.7}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteLinkText}>{t('my_delete_account')}</Text>
        </TouchableOpacity>
      </View>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteAccount} transparent animationType="fade" onRequestClose={() => setShowDeleteAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteSheet}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="warning" size={32} color={colors.error} />
            </View>
            <Text style={styles.deleteTitle}>{t('account_delete_title')}</Text>
            <Text style={styles.deleteWarning}>{t('account_delete_warning')}</Text>

            <Text style={styles.deleteTypeLabel}>{t('account_delete_type_confirm')}</Text>
            <TextInput
              style={styles.deleteInput}
              placeholder="DELETE"
              placeholderTextColor={colors.textTertiary}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
            />

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                activeOpacity={0.7}
                onPress={() => setShowDeleteAccount(false)}
              >
                <Text style={styles.deleteCancelText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleteConfirmText !== 'DELETE' && { opacity: 0.4 }]}
                activeOpacity={0.7}
                onPress={handleConfirmDelete}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                <Text style={styles.deleteConfirmText}>{t('btn_delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // Section
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  infoValue: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },

  // Delete link — small, unobtrusive
  deleteLink: {
    alignSelf: 'center',
    marginTop: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteLinkText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  deleteSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 60, height: 60, borderRadius: radius.round,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  deleteWarning: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  deleteTypeLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  deleteInput: {
    width: '100%', height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.error,
    borderWidth: 1, borderColor: colors.border,
    textAlign: 'center', letterSpacing: 2,
    marginBottom: 20,
  },
  deleteActions: {
    flexDirection: 'row', gap: 12, width: '100%',
  },
  deleteCancelBtn: {
    flex: 1, height: 48, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textSecondary,
  },
  deleteConfirmBtn: {
    flex: 1, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: fontSize.body, fontWeight: fontWeight.heading, color: colors.buttonPrimaryText,
  },
});
