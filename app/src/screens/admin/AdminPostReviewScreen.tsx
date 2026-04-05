import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAdmin } from '../../contexts/AdminContext';
import { KBO_TEAMS } from '../../constants/teams';
import { timeAgo } from '../../utils/time';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

export default function AdminPostReviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { pendingPosts, approvePost, rejectPost } = useAdmin();
  const [rejectModalPost, setRejectModalPost] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = (postId: string, title: string) => {
    Alert.alert('게시물 승인', `"${title}"을(를) 승인하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '승인', onPress: () => approvePost(postId) },
    ]);
  };

  const handleReject = () => {
    if (!rejectModalPost || !rejectReason.trim()) return;
    rejectPost(rejectModalPost, rejectReason.trim());
    setRejectModalPost(null);
    setRejectReason('');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시물 심사 ({pendingPosts.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      {pendingPosts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>심사 대기 게시물 없음</Text>
          <Text style={styles.emptyDesc}>모든 게시물이 처리되었습니다</Text>
        </View>
      ) : (
        <FlatList
          data={pendingPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const team = KBO_TEAMS.find((t) => t.id === item.team_id);
            return (
              <View style={styles.card}>
                {/* Images preview */}
                <View style={styles.imageRow}>
                  {item.images.slice(0, 3).map((uri, idx) => (
                    <Image key={idx} source={{ uri }} style={styles.thumb} />
                  ))}
                  {item.images.length > 3 && (
                    <View style={styles.moreThumb}>
                      <Text style={styles.moreText}>+{item.images.length - 3}</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.description.length > 0 && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                )}
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>@{item.photographer.display_name}</Text>
                  {team && <Text style={[styles.metaText, { color: team.color }]}>{team.shortName}</Text>}
                  <Text style={styles.metaTime}>{timeAgo(item.created_at)}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    activeOpacity={0.7}
                    onPress={() => handleApprove(item.id, item.title)}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    activeOpacity={0.7}
                    onPress={() => setRejectModalPost(item.id)}
                  >
                    <Ionicons name="close" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>거부</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Reject reason modal */}
      <Modal visible={!!rejectModalPost} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>거부 사유 입력</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="거부 사유를 입력하세요"
              placeholderTextColor={colors.textTertiary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => { setRejectModalPost(null); setRejectReason(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn, !rejectReason.trim() && { opacity: 0.4 }]}
                onPress={handleReject}
                disabled={!rejectReason.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>거부</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  emptyDesc: { fontSize: fontSize.meta, color: colors.textTertiary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  imageRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceLight },
  moreThumb: {
    width: 72, height: 72, borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  moreText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textSecondary },
  cardTitle: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: fontSize.meta, color: colors.textSecondary, marginBottom: spacing.sm },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  metaText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.textSecondary },
  metaTime: { fontSize: fontSize.micro, color: colors.textTertiary, marginLeft: 'auto' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.md,
  },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.error },
  actionBtnText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: '#FFF' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  modalContent: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.xl,
  },
  modalTitle: { fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.body, color: colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  modalCancelBtn: { backgroundColor: colors.surfaceLight },
  modalConfirmBtn: { backgroundColor: colors.error },
  modalCancelText: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  modalConfirmText: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: '#FFF' },
});
