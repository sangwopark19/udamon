import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useInquiry } from '../../contexts/InquiryContext';
import { useAuth } from '../../contexts/AuthContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const statusColors: Record<string, string> = {
  open: colors.textTertiary,
  replied: colors.success,
  closed: colors.textSecondary,
};

export default function InquiryListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { getUserInquiries } = useInquiry();

  const inquiries = user ? getUserInquiries(user.id) : [];

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      open: t('inquiry_status_open'),
      replied: t('inquiry_status_replied'),
      closed: t('inquiry_status_closed'),
    };
    return map[status] ?? status;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('inquiry_header')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ContactSupport' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={inquiries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('InquiryDetail' as any, { inquiryId: item.id })}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (statusColors[item.status] ?? colors.textTertiary) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbox-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>
              {t('inquiry_empty')}
            </Text>
          </View>
        }
      />
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
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.round,
  },
  statusText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
  },
  cardDate: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
});
