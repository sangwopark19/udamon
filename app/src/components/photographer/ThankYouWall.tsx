import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThankYouWall } from '../../contexts/ThankYouWallContext';
import { useAuth } from '../../contexts/AuthContext';
import ThankYouWriteModal from './ThankYouWriteModal';
import ThankYouWallFullModal from './ThankYouWallFullModal';
import { timeAgo } from '../../utils/time';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface ThankYouWallProps {
  photographerId: string;
}

export default function ThankYouWall({ photographerId }: ThankYouWallProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getMessagesForPhotographer, canWriteMessage } = useThankYouWall();
  const messages = getMessagesForPhotographer(photographerId);
  const canWrite = user ? canWriteMessage(user.id, photographerId) : false;

  const [writeVisible, setWriteVisible] = useState(false);
  const [fullVisible, setFullVisible] = useState(false);

  const preview = messages.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('thankyou_title')}
        </Text>
        {messages.length > 3 && (
          <TouchableOpacity onPress={() => setFullVisible(true)} activeOpacity={0.7}>
            <Text style={styles.viewAll}>
              {t('thankyou_view_all', { count: messages.length })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {preview.length === 0 ? (
        <Text style={styles.empty}>
          {t('thankyou_empty')}
        </Text>
      ) : (
        <View style={styles.list}>
          {preview.map((msg) => (
            <View key={msg.id} style={styles.msgCard}>
              <Text style={styles.msgText}>"{msg.message}"</Text>
              <View style={styles.msgFooter}>
                <Text style={styles.msgUser}>{msg.fromUserName}</Text>
                <Text style={styles.msgTime}>{timeAgo(msg.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {canWrite && (
        <TouchableOpacity
          style={styles.writeBtn}
          activeOpacity={0.7}
          onPress={() => setWriteVisible(true)}
        >
          <Ionicons name="pencil" size={14} color={colors.buttonPrimaryText} />
          <Text style={styles.writeBtnText}>
            {t('thankyou_write')}
          </Text>
        </TouchableOpacity>
      )}

      <ThankYouWriteModal
        visible={writeVisible}
        photographerId={photographerId}
        onClose={() => setWriteVisible(false)}
      />
      <ThankYouWallFullModal
        visible={fullVisible}
        photographerId={photographerId}
        onClose={() => setFullVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  viewAll: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  empty: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  list: { gap: 8 },
  msgCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  msgText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 6,
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
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  writeBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
