import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAdmin } from '../../contexts/AdminContext';
import { KBO_TEAMS } from '../../constants/teams';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';

export default function AdminPhotographerReviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { photographerApplications, approvePhotographer, rejectPhotographer } = useAdmin();

  const pending = photographerApplications.filter((a) => a.status === 'pending');

  const handleApprove = (pgId: string, name: string) => {
    Alert.alert('포토그래퍼 인증', `"${name}"을(를) 인증하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '인증 승인', onPress: () => approvePhotographer(pgId) },
    ]);
  };

  const handleReject = (pgId: string) => {
    Alert.alert('인증 반려', '반려 사유를 선택하세요', [
      { text: '포트폴리오 부족', onPress: () => rejectPhotographer(pgId, '포트폴리오가 충분하지 않습니다') },
      { text: '본인 촬영 미확인', onPress: () => rejectPhotographer(pgId, '본인 촬영 사진인지 확인할 수 없습니다') },
      { text: '가이드라인 미준수', onPress: () => rejectPhotographer(pgId, '커뮤니티 가이드라인을 준수해주세요') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포토그래퍼 인증 ({pending.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      {pending.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="camera" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>대기 중인 신청 없음</Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.photographerId}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const team = KBO_TEAMS.find((t) => t.id === item.teamId);
            return (
              <View style={styles.card}>
                {/* Portfolio images */}
                {item.portfolioImages.length > 0 && (
                  <View style={styles.portfolioRow}>
                    {item.portfolioImages.slice(0, 4).map((uri, idx) => (
                      <Image key={idx} source={{ uri }} style={styles.portfolioThumb} />
                    ))}
                  </View>
                )}

                <View style={styles.profileRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="camera" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{item.displayName}</Text>
                    <Text style={styles.profileBio} numberOfLines={2}>{item.bio || '소개 없음'}</Text>
                    {team && (
                      <View style={[styles.teamTag, { borderColor: team.color }]}>
                        <Text style={[styles.teamTagText, { color: team.color }]}>{team.shortName}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.dateText}>신청일: {new Date(item.appliedAt).toLocaleDateString('ko-KR')}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    activeOpacity={0.7}
                    onPress={() => handleApprove(item.photographerId, item.displayName)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.actionText}>인증 승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    activeOpacity={0.7}
                    onPress={() => handleReject(item.photographerId)}
                  >
                    <Ionicons name="close-circle" size={18} color="#FFF" />
                    <Text style={styles.actionText}>반려</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
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
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  portfolioRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  portfolioThumb: {
    flex: 1, aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.surfaceLight,
  },
  profileRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryAlpha8, justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: fontSize.body, fontWeight: fontWeight.name, color: colors.textPrimary },
  profileBio: { fontSize: fontSize.meta, color: colors.textSecondary },
  teamTag: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.round,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  teamTagText: { fontSize: fontSize.micro, fontWeight: fontWeight.name },
  dateText: { fontSize: fontSize.micro, color: colors.textTertiary, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.md,
  },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.error },
  actionText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: '#FFF' },
});
