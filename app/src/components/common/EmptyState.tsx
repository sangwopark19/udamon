import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, shadow } from '../../styles/theme';

type EmptyVariant =
  | 'archive'
  | 'search'
  | 'posts'
  | 'photos'
  | 'notifications'
  | 'comments'
  | 'generic';

const CONFIG: Record<EmptyVariant, {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  color: string;
}> = {
  archive: {
    icon: 'bookmark-outline',
    title: '저장한 항목이 없어요',
    desc: '마음에 드는 포토나 게시글을\n저장해보세요',
    color: colors.primary,
  },
  search: {
    icon: 'search-outline',
    title: '검색 결과가 없어요',
    desc: '다른 키워드로 검색해보세요',
    color: colors.textTertiary,
  },
  posts: {
    icon: 'document-text-outline',
    title: '게시글이 없어요',
    desc: '첫 번째 게시글을 작성해보세요',
    color: colors.primary,
  },
  photos: {
    icon: 'camera-outline',
    title: '포토가 없어요',
    desc: '아직 업로드된 포토가 없습니다',
    color: colors.primary,
  },
  notifications: {
    icon: 'notifications-off-outline',
    title: '알림이 없어요',
    desc: '새로운 소식이 생기면 알려드릴게요',
    color: colors.textTertiary,
  },
  comments: {
    icon: 'chatbubble-outline',
    title: '댓글이 없어요',
    desc: '첫 번째 댓글을 남겨보세요',
    color: colors.primary,
  },
  generic: {
    icon: 'file-tray-outline',
    title: '아직 데이터가 없어요',
    desc: '',
    color: colors.textTertiary,
  },
};

interface Props {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  variant = 'generic',
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  const cfg = CONFIG[variant];

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { borderColor: cfg.color + '25' }]}>
        <View style={[styles.iconInner, { backgroundColor: cfg.color + '10' }]}>
          <Ionicons name={cfg.icon} size={32} color={cfg.color} />
        </View>
      </View>
      <Text style={styles.title}>{title ?? cfg.title}</Text>
      {(description ?? cfg.desc) ? (
        <Text style={styles.desc}>{description ?? cfg.desc}</Text>
      ) : null}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.price,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    ...shadow.card,
  },
  actionText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: '#FFFFFF',
  },
});
