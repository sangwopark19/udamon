import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAdmin } from '../../contexts/AdminContext';
import type { AnnouncementType } from '../../types/admin';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

const TYPE_CONFIG: Record<AnnouncementType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  notice: { label: '공지', icon: 'megaphone', color: colors.primary },
  event: { label: '이벤트', icon: 'gift', color: colors.success },
  maintenance: { label: '점검', icon: 'construct', color: colors.warning },
};

export default function AdminAnnouncementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { announcements, createAnnouncement, deleteAnnouncement } = useAdmin();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('notice');
  const [isPinned, setIsPinned] = useState(false);

  const handleCreate = () => {
    if (!title.trim() || !body.trim()) return;
    createAnnouncement(title.trim(), body.trim(), type, isPinned);
    setTitle('');
    setBody('');
    setType('notice');
    setIsPinned(false);
    setShowForm(false);
  };

  const handleDelete = (id: string, annTitle: string) => {
    Alert.alert('공지 삭제', `"${annTitle}"을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteAnnouncement(id) },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공지사항</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} activeOpacity={0.7}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {announcements.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="megaphone-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>공지사항 없음</Text>
          <TouchableOpacity onPress={() => setShowForm(true)} activeOpacity={0.7}>
            <Text style={styles.emptyLink}>새 공지 작성</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const cfg = TYPE_CONFIG[item.type];
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {item.isPinned && (
                    <Ionicons name="pin" size={14} color={colors.warning} />
                  )}
                  <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody} numberOfLines={3}>{item.body}</Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={styles.deleteText}>삭제</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Create Form Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 공지 작성</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={styles.typeRow}>
              {(['notice', 'event', 'maintenance'] as AnnouncementType[]).map((t) => {
                const cfg = TYPE_CONFIG[t];
                const sel = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, sel && { backgroundColor: cfg.color + '18', borderColor: cfg.color }]}
                    onPress={() => setType(t)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={cfg.icon} size={14} color={sel ? cfg.color : colors.textTertiary} />
                    <Text style={[styles.typeBtnText, sel && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.formInput}
              placeholder="제목"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
            <TextInput
              style={[styles.formInput, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="내용"
              placeholderTextColor={colors.textTertiary}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={styles.pinToggle}
              activeOpacity={0.7}
              onPress={() => setIsPinned(!isPinned)}
            >
              <Ionicons name={isPinned ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              <Text style={styles.pinLabel}>상단 고정</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, (!title.trim() || !body.trim()) && { opacity: 0.4 }]}
              activeOpacity={0.7}
              onPress={handleCreate}
              disabled={!title.trim() || !body.trim()}
            >
              <Text style={styles.submitText}>공지 등록</Text>
            </TouchableOpacity>
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
  emptyLink: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.primary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.round,
  },
  typeBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.name },
  cardTime: { fontSize: fontSize.micro, color: colors.textTertiary, marginLeft: 'auto' },
  cardTitle: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary, marginBottom: 4 },
  cardBody: { fontSize: fontSize.meta, color: colors.textSecondary, lineHeight: 20 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end', marginTop: spacing.sm, paddingVertical: 4,
  },
  deleteText: { fontSize: fontSize.micro, color: colors.error },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  typeBtnText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textTertiary },
  formInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.body, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  pinToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pinLabel: { fontSize: fontSize.body, fontWeight: fontWeight.body, color: colors.textPrimary },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  submitText: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: '#FFF' },
});
