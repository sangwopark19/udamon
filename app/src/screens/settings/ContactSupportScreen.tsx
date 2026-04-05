import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { useTranslation } from 'react-i18next';
import { useInquiry, type InquiryCategory } from '../../contexts/InquiryContext';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

const CATEGORIES: { id: InquiryCategory; labelKo: string }[] = [
  { id: 'account', labelKo: '계정' },
  { id: 'payment', labelKo: '결제' },
  { id: 'bug', labelKo: '버그 신고' },
  { id: 'feature', labelKo: '기능 요청' },
  { id: 'other', labelKo: '기타' },
];

export default function ContactSupportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { submitInquiry } = useInquiry();

  const [category, setCategory] = useState<InquiryCategory>('other');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!user || title.trim().length === 0 || content.trim().length === 0) return;
    submitInquiry({
      userId: user.id,
      category,
      title: title.trim(),
      content: content.trim(),
    });
    Alert.alert(
      t('contact_submitted_title'),
      t('contact_submitted_desc'),
    );
    navigation.goBack();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('contact_header')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('InquiryList')} activeOpacity={0.7}>
          <Ionicons name="time-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category */}
        <Text style={styles.label}>{t('contact_category')}</Text>
        <View style={styles.catRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, category === cat.id && styles.catChipActive]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catText, category === cat.id && styles.catTextActive]}>
                {cat.labelKo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.label}>{t('contact_title')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('contact_title_placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />

        {/* Content */}
        <Text style={styles.label}>{t('contact_content')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('contact_content_placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, (title.trim().length === 0 || content.trim().length === 0) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={title.trim().length === 0 || content.trim().length === 0}
        >
          <Text style={styles.submitBtnText}>{t('contact_submit')}</Text>
        </TouchableOpacity>
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
  label: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  catTextActive: {
    color: colors.buttonPrimaryText,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 120,
  },
  submitBtn: {
    marginTop: 24,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.35,
  },
  submitBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
  },
});
