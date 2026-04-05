import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useInquiry } from '../../contexts/InquiryContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

export default function InquiryDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { inquiryId } = route.params;
  const { getInquiry } = useInquiry();

  const inquiry = getInquiry(inquiryId);
  if (!inquiry) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문의 상세</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{inquiry.title}</Text>
        <Text style={styles.meta}>
          {inquiry.category} · {new Date(inquiry.createdAt).toLocaleDateString()}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.body}>{inquiry.content}</Text>

        {inquiry.reply && (
          <>
            <View style={styles.divider} />
            <View style={styles.replyBox}>
              <Text style={styles.replyLabel}>답변</Text>
              <Text style={styles.replyText}>{inquiry.reply}</Text>
            </View>
          </>
        )}
      </ScrollView>
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
  content: { padding: 16 },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  meta: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  body: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  replyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  replyLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.heading,
    color: colors.primary,
    marginBottom: 8,
  },
  replyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
