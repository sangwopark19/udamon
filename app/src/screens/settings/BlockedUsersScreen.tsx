import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useBlock } from '../../contexts/BlockContext';
import { supabase } from '../../services/supabase';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface BlockedProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
}

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { blockedUserIds, unblockUser } = useBlock();

  const blockedList = Array.from(blockedUserIds);
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedProfile[]>([]);

  // 차단된 사용자 프로필 로드
  useEffect(() => {
    if (blockedList.length === 0) {
      setBlockedProfiles([]);
      return;
    }

    const loadProfiles = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', blockedList);

      if (data) setBlockedProfiles(data as BlockedProfile[]);
    };

    loadProfiles();
  }, [blockedUserIds]);

  const getProfile = (userId: string): BlockedProfile | undefined => {
    return blockedProfiles.find((p) => p.id === userId);
  };

  const handleUnblock = (userId: string) => {
    const profile = getProfile(userId);
    const displayName = profile?.nickname ?? userId;
    Alert.alert(t('btn_unblock'), t('block_unblock_confirm'), [
      { text: t('btn_cancel'), style: 'cancel' },
      {
        text: t('btn_unblock'),
        onPress: async () => {
          await unblockUser(userId);
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('block_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {blockedList.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="ban-outline" size={36} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>{t('block_empty')}</Text>
            <Text style={styles.emptyDesc}>
              {t('block_empty_desc')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {blockedList.map((userId, idx) => {
              const profile = getProfile(userId);
              return (
                <View
                  key={userId}
                  style={[styles.userItem, idx === blockedList.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.userAvatar}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={20} color={colors.textTertiary} />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{profile?.nickname ?? t('block_unknown_user')}</Text>
                    <Text style={styles.userSub}>{t('btn_block')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockBtn}
                    onPress={() => handleUnblock(userId)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.unblockBtnText}>{t('btn_unblock')}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.infoText}>
            {t('block_info')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // List
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  userSub: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  unblockBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },

  // Info
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    lineHeight: 18,
  },
});
