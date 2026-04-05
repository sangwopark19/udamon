import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useTranslation } from 'react-i18next';

import i18n from '../../i18n';
import { useMessage } from '../../contexts/MessageContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'MessageDetail'>;

const MY_ID = 'me';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? i18n.t('time_am') : i18n.t('time_pm');
  return `${ampm} ${h % 12 || 12}:${m}`;
}

export default function MessageDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScreenRoute>();
  const scrollRef = useRef<ScrollView>(null);

  const { conversationId } = route.params;
  const recipientId = route.params?.recipientId;
  const { getMessages, sendMessage, markConversationRead, conversations } = useMessage();

  const messages = getMessages(conversationId);
  const conversation = conversations.find((c) => c.id === conversationId);
  const recipientName = conversation?.recipientName ?? recipientId ?? '';

  const [inputText, setInputText] = useState('');

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, markConversationRead]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(conversationId, text);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7} accessibilityLabel={t('a11y_back')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => {
            if (recipientId) {
              navigation.navigate('PhotographerProfile', { photographerId: recipientId });
            }
          }}
        >
          <Text style={styles.headerTitle}>@{recipientName}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7} accessibilityLabel={t('a11y_more')}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg) => {
            const isMine = msg.senderId === MY_ID;
            return (
              <View key={msg.id} style={[styles.msgRow, isMine && styles.msgRowMine]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.text}</Text>
                </View>
                <Text style={styles.msgTime}>{formatTime(msg.createdAt)}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder={t('msg_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!inputText.trim()}
            accessibilityLabel={t('a11y_send')}
          >
            <Ionicons name="send" size={18} color={inputText.trim() ? '#FFFFFF' : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },

  // Header
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },

  // Messages
  messageList: {
    padding: 16,
    gap: 12,
  },
  msgRow: {
    alignItems: 'flex-start',
    gap: 4,
  },
  msgRowMine: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bubbleTextMine: {
    color: colors.buttonPrimaryText,
  },
  msgTime: {
    fontSize: 10,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    marginHorizontal: 4,
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  input: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surface,
  },
});
