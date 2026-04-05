import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CommunityPostWithAuthor } from '../../types/community';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';
import { timeAgo } from '../../utils/time';

interface Props {
  post: CommunityPostWithAuthor;
  onPress: (postId: string) => void;
}

export default function CommunityPostCard({ post, onPress }: Props) {
  const hasImage = post.images.length > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(post.id)}
      style={styles.container}
    >
      <View style={styles.body}>
        {/* Header: team tag + trending */}
        <View style={styles.header}>
          {post.team && (
            <View style={styles.teamBadge}>
              <Text style={styles.teamBadgeText}>{post.team.name_ko}</Text>
            </View>
          )}
          {post.is_trending && (
            <View style={styles.trendingBadge}>
              <Text style={styles.trendingText}>트렌딩</Text>
            </View>
          )}
          {post.has_poll && (
            <View style={styles.pollBadge}>
              <Ionicons name="bar-chart-outline" size={10} color={colors.primary} />
              <Text style={styles.pollBadgeText}>투표</Text>
            </View>
          )}
        </View>

        {/* Content row */}
        <View style={styles.contentRow}>
          <View style={styles.textArea}>
            <Text style={styles.title} numberOfLines={1}>{post.title}</Text>
            <Text style={styles.content} numberOfLines={hasImage ? 1 : 2}>
              {post.content}
            </Text>
          </View>
          {hasImage && (
            <Image source={{ uri: post.images[0] }} style={styles.thumbnail} />
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.author}>{post.user.nickname}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{timeAgo(post.created_at)}</Text>
          <View style={styles.spacer} />
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.statText}>{post.like_count}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.statText}>{post.comment_count}</Text>
          </View>
          {post.is_edited && <Text style={styles.editedLabel}>(수정됨)</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  body: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  teamBadgeText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  trendingBadge: {
    backgroundColor: colors.errorAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  trendingText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.heading,
    color: colors.trending,
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryAlpha8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  pollBadgeText: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  textArea: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  content: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  author: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  dot: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  meta: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  spacer: {
    flex: 1,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
  },
  statText: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  editedLabel: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
    marginLeft: 4,
  },
});
