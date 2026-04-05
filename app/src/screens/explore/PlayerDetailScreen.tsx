import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Share,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useTranslation } from 'react-i18next';
import { KBO_TEAMS } from '../../constants/teams';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginGate } from '../../hooks/useLoginGate';
import { timeAgo } from '../../utils/time';
import type { PhotoPost } from '../../types/photographer';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

interface CheerMessage {
  id: string;
  nickname: string;
  message: string;
  createdAt: string;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PlayerDetail'>;
type TabKey = 'popular' | 'latest' | 'likes' | 'comments';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_COLS = 2;
const GRID_GAP = 8;
const CARD_W = (SCREEN_W - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const CARD_IMG_H = CARD_W * 1.1;

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent)));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function PlayerDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { playerId } = route.params;

  const { getPlayer, getPhotoPostsByPlayer } = usePhotographer();
  const player = getPlayer(playerId);
  const photoPosts = getPhotoPostsByPlayer(playerId);
  const team = player ? KBO_TEAMS.find((tm) => tm.id === player.team_id) : null;
  const teamColor = team?.color ?? colors.primary;
  const teamTextColor = team?.textColor ?? colors.buttonPrimaryText;

  const { user, isPhotographer } = useAuth();
  const requireLogin = useLoginGate();

  const [activeTab, setActiveTab] = useState<TabKey>('popular');

  // Cheer messages
  const [cheerMessages, setCheerMessages] = useState<CheerMessage[]>([
    { id: 'c1', nickname: '야구러버', message: '오늘도 화이팅! 시즌 최고의 활약 기대합니다 🔥', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'c2', nickname: '직관요정', message: '경기장에서 항상 응원합니다! 파이팅!!', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'c3', nickname: '팬123', message: '최고의 선수! 올 시즌도 멋진 플레이 보여주세요 ⚾', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ]);
  const [cheerInput, setCheerInput] = useState('');
  const [showCheerInput, setShowCheerInput] = useState(false);
  const cheerInputRef = useRef<TextInput>(null);

  const handleSubmitCheer = useCallback(() => {
    const trimmed = cheerInput.trim();
    if (!trimmed || !user) return;
    const newMsg: CheerMessage = {
      id: `c_${Date.now()}`,
      nickname: user.display_name ?? user.username ?? 'User',
      message: trimmed,
      createdAt: new Date().toISOString(),
    };
    setCheerMessages((prev) => [newMsg, ...prev]);
    setCheerInput('');
    setShowCheerInput(false);
  }, [cheerInput, user]);

  const handleCheerPress = useCallback(() => {
    if (!requireLogin()) return;
    setShowCheerInput(true);
    setTimeout(() => cheerInputRef.current?.focus(), 100);
  }, [requireLogin]);

  const totalLikes = useMemo(() => photoPosts.reduce((s, p) => s + p.like_count, 0), [photoPosts]);

  // Full cheer modal
  const CHEER_PAGE_SIZE = 20;
  const [showCheerModal, setShowCheerModal] = useState(false);
  const [cheerPage, setCheerPage] = useState(1);
  const [cheerModalInput, setCheerModalInput] = useState('');
  const [showCheerModalInput, setShowCheerModalInput] = useState(false);
  const cheerModalInputRef = useRef<TextInput>(null);

  const cheerDisplayMessages = useMemo(() => cheerMessages.slice(0, cheerPage * CHEER_PAGE_SIZE), [cheerMessages, cheerPage]);
  const cheerHasMore = cheerDisplayMessages.length < cheerMessages.length;
  const handleCheerLoadMore = useCallback(() => {
    if (cheerHasMore) setCheerPage((p) => p + 1);
  }, [cheerHasMore]);

  // Reset page when modal opens
  useEffect(() => {
    if (showCheerModal) setCheerPage(1);
  }, [showCheerModal]);

  const handleCheerModalWrite = useCallback(() => {
    if (!requireLogin()) return;
    setShowCheerModalInput(true);
    setTimeout(() => cheerModalInputRef.current?.focus(), 100);
  }, [requireLogin]);

  const handleSubmitCheerModal = useCallback(() => {
    const trimmed = cheerModalInput.trim();
    if (!trimmed || !user) return;
    const newMsg: CheerMessage = {
      id: `c_${Date.now()}`,
      nickname: user.display_name ?? user.username ?? 'User',
      message: trimmed,
      createdAt: new Date().toISOString(),
    };
    setCheerMessages((prev) => [newMsg, ...prev]);
    setCheerModalInput('');
    setShowCheerModalInput(false);
  }, [cheerModalInput, user]);

  const displayPosts = useMemo(() => {
    const copy = [...photoPosts];
    switch (activeTab) {
      case 'popular':
        return copy.sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count));
      case 'latest':
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'likes':
        return copy.sort((a, b) => b.like_count - a.like_count);
      case 'comments':
        return copy.sort((a, b) => b.comment_count - a.comment_count);
    }
  }, [photoPosts, activeTab]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleShare = useCallback(async () => {
    if (!player) return;
    await Share.share({
      message: `${player.name_ko} #${player.number} — udamon://player/${player.id}`,
    });
  }, [player]);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  const handleTeamPress = useCallback(() => {
    if (team) navigation.navigate('TeamDetail', { teamId: team.id });
  }, [navigation, team]);

  if (!player) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.fallbackHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('player_not_found')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient
          colors={[teamColor, shadeColor(teamColor, -30)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top }]}
        >
          {/* Decorative */}
          <View style={[styles.heroCircle, styles.heroCircle1, { borderColor: `${teamTextColor}12` }]} />
          <View style={[styles.heroCircle, styles.heroCircle2, { borderColor: `${teamTextColor}08` }]} />

          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity onPress={handleBack} style={styles.heroBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={teamTextColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.heroBtn} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={20} color={teamTextColor} />
            </TouchableOpacity>
          </View>

          {/* Player info */}
          <View style={styles.heroContent}>
            <View style={styles.heroRow}>
              {/* Number badge */}
              <View style={[styles.heroBigNum, { backgroundColor: `${teamTextColor}18` }]}>
                <Text style={[styles.heroBigNumText, { color: teamTextColor }]}>{player.number}</Text>
              </View>
              <View style={styles.heroTextCol}>
                <Text style={[styles.heroNameKo, { color: teamTextColor }]}>{player.name_ko}</Text>
                <View style={styles.heroBadgeRow}>
                  <View style={[styles.posBadge, { backgroundColor: `${teamTextColor}20` }]}>
                    <Text style={[styles.posBadgeText, { color: teamTextColor }]}>{player.position}</Text>
                  </View>
                  {team && (
                    <TouchableOpacity
                      style={[styles.teamBadge, { backgroundColor: `${teamTextColor}15` }]}
                      activeOpacity={0.7}
                      onPress={handleTeamPress}
                    >
                      <Text style={[styles.teamBadgeText, { color: teamTextColor }]}>{team.shortName}</Text>
                      <Ionicons name="chevron-forward" size={11} color={`${teamTextColor}80`} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: teamTextColor }]}>{photoPosts.length}</Text>
              <Text style={[styles.statLabel, { color: `${teamTextColor}80` }]}>{t('player_stat_photos')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: `${teamTextColor}20` }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: teamTextColor }]}>{totalLikes}</Text>
              <Text style={[styles.statLabel, { color: `${teamTextColor}80` }]}>{t('player_stat_likes')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: `${teamTextColor}20` }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: teamTextColor }]}>{cheerMessages.length}</Text>
              <Text style={[styles.statLabel, { color: `${teamTextColor}80` }]}>{t('player_stat_cheers')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Cheer Messages */}
        <View style={styles.cheerSection}>
          <View style={styles.cheerHeader}>
            <View style={styles.cheerTitleRow}>
              <Text style={styles.cheerEmoji}>📣</Text>
              <Text style={styles.cheerTitle}>{t('player_cheer_title')}</Text>
              <Text style={styles.cheerCount}>{cheerMessages.length}</Text>
            </View>
            <TouchableOpacity
              style={[styles.cheerWriteBtn, { backgroundColor: teamColor }]}
              activeOpacity={0.7}
              onPress={handleCheerPress}
            >
              <Ionicons name="create-outline" size={14} color={teamTextColor} />
              <Text style={[styles.cheerWriteBtnText, { color: teamTextColor }]}>{t('player_cheer_write')}</Text>
            </TouchableOpacity>
          </View>

          {/* Input area */}
          {showCheerInput && (
            <View style={styles.cheerInputWrap}>
              <TextInput
                ref={cheerInputRef}
                style={styles.cheerInput}
                placeholder={t('player_cheer_placeholder')}
                placeholderTextColor={colors.textTertiary}
                value={cheerInput}
                onChangeText={setCheerInput}
                maxLength={100}
                multiline
              />
              <View style={styles.cheerInputActions}>
                <Text style={styles.cheerCharCount}>{cheerInput.length}/100</Text>
                <View style={styles.cheerInputBtns}>
                  <TouchableOpacity
                    onPress={() => { setShowCheerInput(false); setCheerInput(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cheerCancelText}>{t('btn_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cheerSubmitBtn, { backgroundColor: teamColor }, !cheerInput.trim() && { opacity: 0.4 }]}
                    activeOpacity={0.8}
                    onPress={handleSubmitCheer}
                    disabled={!cheerInput.trim()}
                  >
                    <Text style={[styles.cheerSubmitText, { color: teamTextColor }]}>{t('btn_send')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Message cards — max 3 */}
          {cheerMessages.length > 0 ? (
            <>
              <FlatList
                data={cheerMessages.slice(0, 3)}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cheerList}
                renderItem={({ item }) => (
                  <View style={styles.cheerCard}>
                    <View style={styles.cheerCardHeader}>
                      <View style={[styles.cheerAvatar, { backgroundColor: teamColor }]}>
                        <Text style={[styles.cheerAvatarText, { color: teamTextColor }]}>
                          {item.nickname.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.cheerCardMeta}>
                        <Text style={styles.cheerNickname}>{item.nickname}</Text>
                        <Text style={styles.cheerTime}>{timeAgo(item.createdAt)}</Text>
                      </View>
                    </View>
                    <Text style={styles.cheerMessage} numberOfLines={3}>{item.message}</Text>
                  </View>
                )}
              />
              <TouchableOpacity
                style={styles.cheerViewAllLink}
                activeOpacity={0.7}
                onPress={() => setShowCheerModal(true)}
              >
                <Text style={[styles.cheerViewAllLinkText, { color: teamColor }]}>
                  {t('player_cheer_view_all')} →
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.cheerEmpty}>
              <Text style={styles.cheerEmptyText}>{t('player_cheer_empty')}</Text>
            </View>
          )}
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {([
            { key: 'popular' as TabKey, icon: 'flame' as const, label: t('player_tab_popular') },
            { key: 'latest' as TabKey, icon: 'time-outline' as const, label: t('player_tab_latest') },
            { key: 'likes' as TabKey, icon: 'heart-outline' as const, label: t('player_tab_likes') },
            { key: 'comments' as TabKey, icon: 'chatbubble-outline' as const, label: t('player_tab_comments') },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={13}
                color={activeTab === tab.key ? colors.buttonPrimaryText : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Grid */}
        {displayPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>{t('player_no_related_content')}</Text>
            <Text style={styles.emptyDesc}>
              {t('player_empty_encourage', { name: player.name_ko })}
            </Text>
            {isPhotographer && (
              <TouchableOpacity
                style={[styles.emptyUploadBtn, { backgroundColor: teamColor }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('UploadPost' as any)}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={teamTextColor} />
                <Text style={[styles.emptyUploadText, { color: teamTextColor }]}>
                  {t('player_empty_upload')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {displayPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.gridCard}
                activeOpacity={0.8}
                onPress={() => handlePostPress(post.id)}
              >
                <Image source={{ uri: post.images[0] }} style={styles.gridImg} />
                <LinearGradient colors={['transparent', colors.overlay]} style={styles.gridOverlay}>
                  <View style={styles.gridLikes}>
                    <Ionicons name="heart" size={11} color={colors.buttonPrimaryText} />
                    <Text style={styles.gridLikesText}>{post.like_count}</Text>
                  </View>
                </LinearGradient>
                <View style={styles.gridInfo}>
                  <Text style={styles.gridTitle} numberOfLines={1}>{post.title}</Text>
                  <View style={styles.gridMeta}>
                    <Text style={styles.gridAuthor} numberOfLines={1}>{post.photographer.display_name}</Text>
                    <Text style={styles.gridTime}>{timeAgo(post.created_at)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Full Cheer Messages Modal */}
      <Modal visible={showCheerModal} animationType="slide" onRequestClose={() => setShowCheerModal(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCheerModal(false); setShowCheerModalInput(false); }} style={styles.modalBackBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('player_cheer_title')}</Text>
            <Text style={styles.modalCount}>{cheerMessages.length}</Text>
          </View>

          {/* Messages list */}
          <FlatList
            data={cheerDisplayMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
            onEndReached={handleCheerLoadMore}
            onEndReachedThreshold={0.3}
            renderItem={({ item }) => (
              <View style={styles.modalCard}>
                <View style={styles.cheerCardHeader}>
                  <View style={[styles.cheerAvatar, { backgroundColor: teamColor }]}>
                    <Text style={[styles.cheerAvatarText, { color: teamTextColor }]}>
                      {item.nickname.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.cheerCardMeta}>
                    <Text style={styles.cheerNickname}>{item.nickname}</Text>
                    <Text style={styles.cheerTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.modalMessage}>{item.message}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.cheerEmpty}>
                <Text style={styles.cheerEmptyText}>{t('player_cheer_empty')}</Text>
              </View>
            }
            ListFooterComponent={
              cheerHasMore ? (
                <ActivityIndicator size="small" color={teamColor} style={styles.cheerLoader} />
              ) : null
            }
          />

          {/* Cheer input area inside modal */}
          {showCheerModalInput && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.modalInputWrap}>
                <TextInput
                  ref={cheerModalInputRef}
                  style={styles.cheerInput}
                  placeholder={t('player_cheer_placeholder')}
                  placeholderTextColor={colors.textTertiary}
                  value={cheerModalInput}
                  onChangeText={setCheerModalInput}
                  maxLength={100}
                  multiline
                />
                <View style={styles.cheerInputActions}>
                  <Text style={styles.cheerCharCount}>{cheerModalInput.length}/100</Text>
                  <View style={styles.cheerInputBtns}>
                    <TouchableOpacity
                      onPress={() => { setShowCheerModalInput(false); setCheerModalInput(''); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cheerCancelText}>{t('btn_cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cheerSubmitBtn, { backgroundColor: teamColor }, !cheerModalInput.trim() && { opacity: 0.4 }]}
                      activeOpacity={0.8}
                      onPress={handleSubmitCheerModal}
                      disabled={!cheerModalInput.trim()}
                    >
                      <Text style={[styles.cheerSubmitText, { color: teamTextColor }]}>{t('btn_send')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* Floating write button */}
          {!showCheerModalInput && (
            <TouchableOpacity
              style={[styles.floatingBtn, { backgroundColor: teamColor }, { bottom: Math.max(insets.bottom, 16) + 16 }]}
              activeOpacity={0.8}
              onPress={handleCheerModalWrite}
            >
              <Ionicons name="create-outline" size={22} color={teamTextColor} />
              <Text style={[styles.floatingBtnText, { color: teamTextColor }]}>{t('player_cheer_write')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fallbackHeader: {
    height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: fontSize.body, color: colors.textTertiary },

  // Hero
  hero: { paddingBottom: 20, overflow: 'hidden' },
  heroCircle: { position: 'absolute', borderRadius: 9999, borderWidth: 1 },
  heroCircle1: { width: 180, height: 180, top: -30, right: -50 },
  heroCircle2: { width: 120, height: 120, bottom: -10, left: -20 },
  heroTopBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, height: 56,
  },
  heroBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  heroContent: { paddingHorizontal: 16, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroBigNum: {
    width: 68, height: 68, borderRadius: radius.xl,
    justifyContent: 'center', alignItems: 'center',
  },
  heroBigNumText: { fontSize: 30, fontWeight: fontWeight.heading },
  heroTextCol: { flex: 1 },
  heroNameKo: { fontSize: fontSize.display, fontWeight: fontWeight.heading, letterSpacing: -0.5 },

  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  posBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.round,
  },
  posBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.name },
  teamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.round,
  },
  teamBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.name },

  // Stats
  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.sectionTitle, fontWeight: fontWeight.heading },
  statLabel: { fontSize: fontSize.micro, fontWeight: fontWeight.body, marginTop: 2 },
  statDivider: { width: 1, height: 28 },

  // Cheer Messages
  cheerSection: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cheerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cheerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cheerEmoji: {
    fontSize: 18,
  },
  cheerTitle: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  cheerCount: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  cheerWriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.round,
  },
  cheerWriteBtnText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
  },
  cheerInputWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  cheerInput: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    minHeight: 48,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  cheerInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cheerCharCount: {
    fontSize: fontSize.micro,
    color: colors.textTertiary,
  },
  cheerInputBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cheerCancelText: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
  },
  cheerSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.round,
  },
  cheerSubmitText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
  },
  cheerList: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  cheerCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cheerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cheerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cheerAvatarText: {
    fontSize: 12,
    fontWeight: fontWeight.name,
  },
  cheerCardMeta: {
    flex: 1,
  },
  cheerNickname: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  cheerTime: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  cheerMessage: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cheerViewAllLink: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cheerViewAllLinkText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
  },
  cheerEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  cheerEmptyText: {
    fontSize: fontSize.meta,
    color: colors.textTertiary,
  },
  cheerLoader: {
    paddingVertical: 16,
  },

  // Cheer Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  modalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  modalCount: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  modalList: {
    padding: 16,
    gap: 12,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  modalMessage: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  modalInputWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    padding: 12,
    paddingHorizontal: 16,
  },
  floatingBtn: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radius.round,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingBtnText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 6,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textSecondary },
  tabTextActive: { color: colors.buttonPrimaryText },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: fontSize.cardName, fontWeight: fontWeight.name, color: colors.textPrimary },
  emptyDesc: { fontSize: fontSize.body, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  emptyUploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.round, marginTop: 12,
  },
  emptyUploadText: { fontSize: fontSize.meta, fontWeight: fontWeight.heading },

  // Grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP,
    paddingHorizontal: 16, paddingTop: 16,
  },
  gridCard: { width: CARD_W, marginBottom: 8 },
  gridImg: {
    width: CARD_W, height: CARD_IMG_H, borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  gridOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: CARD_IMG_H,
    borderRadius: radius.md, justifyContent: 'flex-end', padding: 8,
  },
  gridLikes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridLikesText: { fontSize: fontSize.micro, fontWeight: fontWeight.name, color: colors.buttonPrimaryText },
  gridInfo: { paddingTop: 6, paddingHorizontal: 2 },
  gridTitle: { fontSize: fontSize.meta, fontWeight: fontWeight.name, color: colors.textPrimary },
  gridMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  gridAuthor: { fontSize: fontSize.micro, color: colors.textSecondary, flex: 1 },
  gridTime: { fontSize: fontSize.micro, color: colors.textTertiary },
});
