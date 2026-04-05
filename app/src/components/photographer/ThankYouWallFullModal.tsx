import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useThankYouWall } from '../../contexts/ThankYouWallContext';
import { timeAgo } from '../../utils/time';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

const PAGE_SIZE = 20;

interface ThankYouWallFullModalProps {
  visible: boolean;
  photographerId: string;
  onClose: () => void;
}

export default function ThankYouWallFullModal({ visible, photographerId, onClose }: ThankYouWallFullModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { getMessagesForPhotographer } = useThankYouWall();
  const allMessages = getMessagesForPhotographer(photographerId);

  const [page, setPage] = useState(1);

  // Reset page when modal opens
  useEffect(() => {
    if (visible) setPage(1);
  }, [visible]);

  const displayMessages = useMemo(() => allMessages.slice(0, page * PAGE_SIZE), [allMessages, page]);
  const hasMore = displayMessages.length < allMessages.length;

  const handleLoadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('thankyou_title')}
          </Text>
          <Text style={styles.headerCount}>{allMessages.length}</Text>
        </View>
        <FlatList
          data={displayMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <View style={styles.msgCard}>
              <Text style={styles.msgText}>"{item.message}"</Text>
              <View style={styles.msgFooter}>
                <Text style={styles.msgUser}>{item.fromUserName}</Text>
                <Text style={styles.msgTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {t('thankyou_empty')}
            </Text>
          }
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  headerCount: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  msgCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  msgText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  msgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  msgUser: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  msgTime: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  empty: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  loader: {
    paddingVertical: 16,
  },
});
