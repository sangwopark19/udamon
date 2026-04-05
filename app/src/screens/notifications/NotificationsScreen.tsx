import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTranslation } from 'react-i18next';

import { useNotification, type AppNotification } from '../../contexts/NotificationContext';
import { timeAgo as formatTimeAgo } from '../../utils/time';
import type { RootStackParamList } from '../../types/navigation';
import { colors, radius, fontSize, fontWeight } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const iconMap: Record<string, { bg: string; color: string }> = {
  new_follower: { bg: colors.notifBlueBg, color: colors.notifBlue },
  following_post: { bg: colors.notifGreenBg, color: colors.notifGreen },
  post_like: { bg: colors.errorAlpha12, color: colors.error },
  comment: { bg: colors.primaryAlpha12, color: colors.primary },
  app_update: { bg: colors.surface, color: colors.textSecondary },
  system: { bg: colors.surface, color: colors.textSecondary },
};

type TabKey = 'activity' | 'general';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {
    activityNotifications,
    generalNotifications,
    unreadCount,
    activityUnread,
    generalUnread,
    markAsRead,
    markAllAsRead,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [showSettings, setShowSettings] = useState(false);
  const [notiActivity, setNotiActivity] = useState(true);
  const [notiGeneral, setNotiGeneral] = useState(true);

  const filtered = activeTab === 'activity' ? activityNotifications : generalNotifications;

  const handlePress = (notif: AppNotification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.data?.photographerId) {
      navigation.navigate('PhotographerProfile', { photographerId: notif.data.photographerId });
    } else if (notif.data?.postId) {
      navigation.navigate('PostDetail', { postId: notif.data.postId });
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7} accessibilityLabel={t('a11y_back')}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notif_title')}</Text>
          <TouchableOpacity
            style={[styles.settingsBtn, showSettings && styles.settingsBtnActive]}
            onPress={() => setShowSettings(!showSettings)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={showSettings ? colors.buttonPrimaryText : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar + Mark All Read */}
      <View style={styles.tabRow}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            activeOpacity={0.7}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>{t('notif_activity')}</Text>
            {activityUnread > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{activityUnread > 9 ? '9+' : activityUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'general' && styles.tabActive]}
            activeOpacity={0.7}
            onPress={() => setActiveTab('general')}
          >
            <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>{t('notif_general')}</Text>
            {generalUnread > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{generalUnread > 9 ? '9+' : generalUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>{t('btn_mark_all_read')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingsRow}>
            <View style={styles.settingsLabelRow}>
              <Ionicons name="pulse-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('notif_setting_activity')}</Text>
            </View>
            <Switch
              value={notiActivity}
              onValueChange={setNotiActivity}
              trackColor={{ false: colors.surface, true: 'rgba(27, 42, 74, 0.4)' }}
              thumbColor={notiActivity ? colors.primary : colors.textTertiary}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
          </View>
          <View style={styles.settingsRow}>
            <View style={styles.settingsLabelRow}>
              <Ionicons name="megaphone-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>{t('notif_setting_general')}</Text>
            </View>
            <Switch
              value={notiGeneral}
              onValueChange={setNotiGeneral}
              trackColor={{ false: colors.surface, true: 'rgba(27, 42, 74, 0.4)' }}
              thumbColor={notiGeneral ? colors.primary : colors.textTertiary}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'activity' ? t('notif_empty_activity') : t('notif_empty_general')}
            </Text>
            <Text style={styles.emptyDesc}>
              {activeTab === 'activity'
                ? t('notif_empty_activity_desc')
                : t('notif_empty_general_desc')}
            </Text>
          </View>
        ) : (
          <View style={styles.notifList}>
            {filtered.map((notif) => {
              const typeStyle = iconMap[notif.type] || iconMap.system;
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                  activeOpacity={0.7}
                  onPress={() => handlePress(notif)}
                >
                  <View style={[styles.notifIconWrap, { backgroundColor: typeStyle.bg }]}>
                    <Ionicons name={notif.icon} size={18} color={typeStyle.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                    <Text style={styles.notifTime}>{formatTimeAgo(notif.createdAt)}</Text>
                  </View>
                  {!notif.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: { backgroundColor: colors.background },
  headerInner: {
    height: 56, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  settingsBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  settingsBtnActive: {
    backgroundColor: colors.primary,
  },

  // Settings Panel
  settingsPanel: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16,
  },
  markAllBtn: {
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: radius.md,
  },
  markAllText: {
    fontSize: fontSize.micro, fontWeight: fontWeight.heading,
    color: colors.primary,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.body, fontWeight: fontWeight.name,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary, fontWeight: fontWeight.heading,
  },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: fontSize.micro2, fontWeight: fontWeight.heading, color: colors.buttonPrimaryText,
  },

  // Empty
  emptyState: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 10,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: fontSize.cardName, fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: fontSize.body, fontWeight: fontWeight.body,
    color: colors.textTertiary, textAlign: 'center',
  },

  // List
  notifList: { paddingTop: 4 },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  notifItemUnread: {
    backgroundColor: colors.primaryAlpha3,
  },
  notifIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  notifContent: { flex: 1 },
  notifTitle: {
    fontSize: fontSize.body, fontWeight: fontWeight.name,
    color: colors.textPrimary, marginBottom: 2,
  },
  notifTitleUnread: { fontWeight: fontWeight.heading },
  notifBody: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body,
    color: colors.textSecondary, lineHeight: 18, marginBottom: 4,
  },
  notifTime: {
    fontSize: fontSize.micro, fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary, marginTop: 8,
  },
});
