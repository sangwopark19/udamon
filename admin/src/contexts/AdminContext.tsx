import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type {
  PhotoPost, ReportEntry, UserSanction, PhotographerApplication, Announcement, AuditLog,
  AdminStats, SanctionType, ReportResolution, AnnouncementType, AuditTargetType,
  UserProfile, KBOTeam, Player, Cheerleader, AdminNotification, AdminNotifType,
  VisitorStats, TermsDocument, SiteSettings, MaintenanceConfig, AppVersionInfo,
  AdPlacement, AdRevenue, AdType, AdPosition,
  CommunityPost, CommunityComment, Poll, Inquiry, DMConversation,
  TicketTransaction, TicketPackage, GiftItem, SupportRecord, SettlementRecord, SettlementStatus,
  RankTier, AwardCategory, AwardRecord, BlockRecord, PgCollection,
  SearchKeyword, PhotographerFollowStats, TimelineEvent, EventType,
} from '../types';
import {
  MOCK_POSTS, MOCK_USERS, MOCK_REPORTS, MOCK_APPLICATIONS, MOCK_ANNOUNCEMENTS,
  MOCK_AUDIT_LOGS, KBO_TEAMS, MOCK_PLAYERS, MOCK_CHEERLEADERS, MOCK_SENT_NOTIFICATIONS,
  SANCTION_LABELS, MOCK_VISITOR_STATS, MOCK_TERMS_DOCUMENTS, MOCK_SITE_SETTINGS,
  MOCK_MAINTENANCE, MOCK_APP_VERSION, MOCK_AD_PLACEMENTS, MOCK_AD_REVENUE,
  MOCK_COMMUNITY_POSTS, MOCK_COMMUNITY_COMMENTS, MOCK_POLLS, MOCK_INQUIRIES,
  MOCK_DM_CONVERSATIONS, MOCK_TICKET_TRANSACTIONS, MOCK_TICKET_PACKAGES,
  GIFT_ITEMS, MOCK_SUPPORT_RECORDS, MOCK_SETTLEMENTS,
  RANK_TIERS, AWARD_CATEGORIES, MOCK_AWARDS, MOCK_BLOCKS,
  MOCK_COLLECTIONS, MOCK_SEARCH_KEYWORDS, MOCK_FOLLOW_STATS, MOCK_EVENTS,
} from '../data/mock';

interface AdminContextValue {
  stats: AdminStats;
  // Posts
  posts: PhotoPost[];
  pendingPosts: PhotoPost[];
  approvePost: (postId: string) => void;
  rejectPost: (postId: string, reason: string) => void;
  toggleFeatured: (postId: string) => void;
  // Reports
  reports: ReportEntry[];
  pendingReports: ReportEntry[];
  resolveReport: (index: number, resolution: ReportResolution) => void;
  // Users
  users: UserProfile[];
  sanctions: UserSanction[];
  sanctionUser: (userId: string, type: SanctionType, reason: string) => void;
  revokeSanction: (id: string) => void;
  // Photographers
  applications: PhotographerApplication[];
  pendingApplications: PhotographerApplication[];
  approvePhotographer: (id: string) => void;
  rejectPhotographer: (id: string, note: string) => void;
  // Announcements
  announcements: Announcement[];
  createAnnouncement: (title: string, body: string, type: AnnouncementType, isPinned: boolean) => void;
  deleteAnnouncement: (id: string) => void;
  // Teams
  teams: KBOTeam[];
  updateTeam: (teamId: string, updates: Partial<Omit<KBOTeam, 'id'>>) => void;
  // Players
  players: Player[];
  createPlayer: (data: Omit<Player, 'id'>) => void;
  updatePlayer: (playerId: string, updates: Partial<Omit<Player, 'id'>>) => void;
  deletePlayer: (playerId: string) => void;
  // Cheerleaders
  cheerleaders: Cheerleader[];
  createCheerleader: (data: Omit<Cheerleader, 'id'>) => void;
  updateCheerleader: (cheerleaderId: string, updates: Partial<Omit<Cheerleader, 'id'>>) => void;
  deleteCheerleader: (cheerleaderId: string) => void;
  // Notifications
  sentNotifications: AdminNotification[];
  sendNotification: (type: AdminNotifType, target: 'all' | 'user', targetUserId: string | null, title: string, body: string) => void;
  // Visitor Stats
  visitorStats: VisitorStats;
  // Terms
  termsDocuments: TermsDocument[];
  updateTermsDocument: (id: string, updates: Partial<Omit<TermsDocument, 'id' | 'type'>>) => void;
  // Site Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (updates: Partial<SiteSettings>) => void;
  // Maintenance
  maintenance: MaintenanceConfig;
  updateMaintenance: (updates: Partial<MaintenanceConfig>) => void;
  // App Version
  appVersion: AppVersionInfo;
  updateAppVersion: (updates: Partial<Pick<AppVersionInfo, 'currentVersion' | 'minimumVersion' | 'forceUpdate'>>) => void;
  addAppVersion: (version: string, notes: string) => void;
  // Ad Management
  adPlacements: AdPlacement[];
  adRevenue: AdRevenue;
  createAdPlacement: (data: { name: string; type: AdType; adUnitId: string; position: AdPosition; isEnabled: boolean }) => void;
  updateAdPlacement: (id: string, updates: Partial<Omit<AdPlacement, 'id' | 'createdAt'>>) => void;
  toggleAdPlacement: (id: string) => void;
  deleteAdPlacement: (id: string) => void;
  // Community
  communityPosts: CommunityPost[];
  blindCommunityPost: (id: string) => void;
  unblindCommunityPost: (id: string) => void;
  deleteCommunityPost: (id: string) => void;
  // Comments
  communityComments: CommunityComment[];
  blindComment: (id: string) => void;
  unblindComment: (id: string) => void;
  deleteComment: (id: string) => void;
  // Polls
  polls: Poll[];
  closePoll: (id: string) => void;
  // Inquiries
  inquiries: Inquiry[];
  replyInquiry: (id: string, reply: string) => void;
  closeInquiry: (id: string) => void;
  // DM
  dmConversations: DMConversation[];
  dismissDMReport: (id: string) => void;
  // Tickets
  ticketTransactions: TicketTransaction[];
  ticketPackages: TicketPackage[];
  toggleTicketPackage: (id: string) => void;
  // Support / Revenue
  giftItems: GiftItem[];
  supportRecords: SupportRecord[];
  settlements: SettlementRecord[];
  updateSettlementStatus: (id: string, status: SettlementStatus) => void;
  // Rank
  rankTiers: RankTier[];
  updateRankTier: (id: string, minScore: number) => void;
  // Awards
  awardCategories: AwardCategory[];
  awards: AwardRecord[];
  createAward: (categoryId: string, photographerId: string, photographerName: string, month: string) => void;
  deleteAward: (id: string) => void;
  // Blocks
  blocks: BlockRecord[];
  removeBlock: (id: string) => void;
  // Collections
  collections: PgCollection[];
  deleteCollection: (id: string) => void;
  // Search Analytics
  searchKeywords: SearchKeyword[];
  // Follow Stats
  followStats: PhotographerFollowStats[];
  // Events
  events: TimelineEvent[];
  createEvent: (data: Omit<TimelineEvent, 'id' | 'postCount'>) => void;
  updateEvent: (id: string, updates: Partial<Omit<TimelineEvent, 'id'>>) => void;
  deleteEvent: (id: string) => void;
  // Audit
  auditLogs: AuditLog[];
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // Existing states
  const [posts, setPosts] = useState<PhotoPost[]>(MOCK_POSTS);
  const [reports, setReports] = useState<ReportEntry[]>(MOCK_REPORTS);
  const [sanctions, setSanctions] = useState<UserSanction[]>([]);
  const [applications, setApplications] = useState<PhotographerApplication[]>(MOCK_APPLICATIONS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [users] = useState<UserProfile[]>(MOCK_USERS);
  const [teams, setTeams] = useState<KBOTeam[]>(KBO_TEAMS);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [cheerleaders, setCheerleaders] = useState<Cheerleader[]>(MOCK_CHEERLEADERS);
  const [sentNotifications, setSentNotifications] = useState<AdminNotification[]>(MOCK_SENT_NOTIFICATIONS);
  const [visitorStats] = useState<VisitorStats>(MOCK_VISITOR_STATS);
  const [termsDocuments, setTermsDocuments] = useState<TermsDocument[]>(MOCK_TERMS_DOCUMENTS);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(MOCK_SITE_SETTINGS);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(MOCK_MAINTENANCE);
  const [appVersion, setAppVersion] = useState<AppVersionInfo>(MOCK_APP_VERSION);
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>(MOCK_AD_PLACEMENTS);
  const [adRevenue] = useState<AdRevenue>(MOCK_AD_REVENUE);
  // New states
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(MOCK_COMMUNITY_POSTS);
  const [communityComments, setCommunityComments] = useState<CommunityComment[]>(MOCK_COMMUNITY_COMMENTS);
  const [polls, setPolls] = useState<Poll[]>(MOCK_POLLS);
  const [inquiries, setInquiries] = useState<Inquiry[]>(MOCK_INQUIRIES);
  const [dmConversations, setDMConversations] = useState<DMConversation[]>(MOCK_DM_CONVERSATIONS);
  const [ticketTransactions] = useState<TicketTransaction[]>(MOCK_TICKET_TRANSACTIONS);
  const [ticketPackages, setTicketPackages] = useState<TicketPackage[]>(MOCK_TICKET_PACKAGES);
  const [supportRecords] = useState<SupportRecord[]>(MOCK_SUPPORT_RECORDS);
  const [settlements, setSettlements] = useState<SettlementRecord[]>(MOCK_SETTLEMENTS);
  const [rankTiers, setRankTiers] = useState<RankTier[]>(RANK_TIERS);
  const [awards, setAwards] = useState<AwardRecord[]>(MOCK_AWARDS);
  const [blocks, setBlocks] = useState<BlockRecord[]>(MOCK_BLOCKS);
  const [collections, setCollections] = useState<PgCollection[]>(MOCK_COLLECTIONS);
  const [searchKeywords] = useState<SearchKeyword[]>(MOCK_SEARCH_KEYWORDS);
  const [followStats] = useState<PhotographerFollowStats[]>(MOCK_FOLLOW_STATS);
  const [events, setEvents] = useState<TimelineEvent[]>(MOCK_EVENTS);

  // ─── Helpers ───
  const addLog = useCallback((action: string, targetType: AuditTargetType, targetId: string, detail: string) => {
    const log: AuditLog = { id: `log-${Date.now()}`, adminId: 'admin-001', action, targetType, targetId, detail, createdAt: new Date().toISOString() };
    setAuditLogs((prev) => [log, ...prev]);
  }, []);

  const addNotification = useCallback((type: AdminNotifType, target: 'all' | 'user', targetUserId: string | null, title: string, body: string, isAuto: boolean) => {
    const notif: AdminNotification = { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, target, targetUserId, title, body, sentBy: 'admin-001', isAuto, createdAt: new Date().toISOString() };
    setSentNotifications((prev) => [notif, ...prev]);
  }, []);

  const sendNotification = useCallback((type: AdminNotifType, target: 'all' | 'user', targetUserId: string | null, title: string, body: string) => {
    addNotification(type, target, targetUserId, title, body, false);
    addLog('send_notification', 'notification', `notif-${Date.now()}`, `알림 발송: "${title}" → ${target === 'all' ? '전체 유저' : targetUserId}`);
  }, [addNotification, addLog]);

  // ─── Posts ───
  const pendingPosts = useMemo(() => posts.filter((p) => p.status === 'pending'), [posts]);

  const approvePost = useCallback((postId: string) => {
    const now = new Date().toISOString();
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: 'approved' as const, reviewed_by: 'admin-001', reviewed_at: now } : p)));
    const post = posts.find((p) => p.id === postId);
    addLog('approve_post', 'post', postId, `게시물 "${post?.title}" 승인`);
    addNotification('post_approved', 'user', post?.photographer_id ?? postId, '게시물 승인', `게시물 "${post?.title}"이(가) 승인되었습니다.`, true);
  }, [posts, addLog, addNotification]);

  const rejectPost = useCallback((postId: string, reason: string) => {
    const now = new Date().toISOString();
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: 'rejected' as const, reviewed_by: 'admin-001', reviewed_at: now, reject_reason: reason } : p)));
    const post = posts.find((p) => p.id === postId);
    addLog('reject_post', 'post', postId, `게시물 "${post?.title}" 거부: ${reason}`);
    addNotification('post_rejected', 'user', post?.photographer_id ?? postId, '게시물 거부', `게시물 "${post?.title}"이(가) 거부되었습니다. 사유: ${reason}`, true);
  }, [posts, addLog, addNotification]);

  const toggleFeatured = useCallback((postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_featured: !p.is_featured } : p)));
    const post = posts.find((p) => p.id === postId);
    addLog('toggle_featured', 'post', postId, `게시물 "${post?.title}" 피처 ${post?.is_featured ? '해제' : '설정'}`);
  }, [posts, addLog]);

  // ─── Reports ───
  const pendingReports = useMemo(() => reports.filter((r) => r.status === 'pending'), [reports]);

  const resolveReport = useCallback((index: number, resolution: ReportResolution) => {
    setReports((prev) => prev.map((r, i) => (i === index ? { ...r, status: 'resolved' as const, resolution } : r)));
    addLog('resolve_report', 'report', `report-${index}`, `신고 처리: ${resolution}`);
  }, [addLog]);

  // ─── Sanctions ───
  const sanctionUser = useCallback((userId: string, type: SanctionType, reason: string) => {
    const now = new Date();
    let expiresAt: string | null = null;
    if (type === 'suspend_7d') expiresAt = new Date(now.getTime() + 7 * 86400000).toISOString();
    else if (type === 'suspend_30d') expiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();
    const sanction: UserSanction = { id: `sanc-${Date.now()}`, userId, type, reason, issuedBy: 'admin-001', issuedAt: now.toISOString(), expiresAt, isActive: true };
    setSanctions((prev) => [sanction, ...prev]);
    const user = users.find((u) => u.id === userId);
    addLog('sanction_user', 'user', userId, `${user?.display_name ?? userId} ${type}: ${reason}`);
    addNotification('sanction_issued', 'user', userId, '계정 제재 알림', `회원님의 계정에 제재가 적용되었습니다. (${SANCTION_LABELS[type] ?? type}): ${reason}`, true);
  }, [users, addLog, addNotification]);

  const revokeSanction = useCallback((id: string) => {
    const sanction = sanctions.find((s) => s.id === id);
    setSanctions((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: false } : s)));
    addLog('revoke_sanction', 'user', id, '제재 해제');
    addNotification('sanction_revoked', 'user', sanction?.userId ?? id, '제재 해제 알림', '회원님의 계정 제재가 해제되었습니다.', true);
  }, [sanctions, addLog, addNotification]);

  // ─── Photographers ───
  const pendingApplications = useMemo(() => applications.filter((a) => a.status === 'pending'), [applications]);

  const approvePhotographer = useCallback((id: string) => {
    setApplications((prev) => prev.map((a) => (a.photographerId === id ? { ...a, status: 'approved' as const, reviewedBy: 'admin-001' } : a)));
    const app = applications.find((a) => a.photographerId === id);
    addLog('approve_photographer', 'photographer', id, `포토그래퍼 "${app?.displayName}" 인증 승인`);
    addNotification('photographer_approved', 'user', app?.userId ?? id, '포토그래퍼 인증 승인', '포토그래퍼 인증이 승인되었습니다!', true);
  }, [applications, addLog, addNotification]);

  const rejectPhotographer = useCallback((id: string, note: string) => {
    setApplications((prev) => prev.map((a) => (a.photographerId === id ? { ...a, status: 'rejected' as const, reviewedBy: 'admin-001', reviewNote: note } : a)));
    const app = applications.find((a) => a.photographerId === id);
    addLog('reject_photographer', 'photographer', id, `포토그래퍼 "${app?.displayName}" 반려: ${note}`);
    addNotification('photographer_rejected', 'user', app?.userId ?? id, '포토그래퍼 인증 반려', `사유: ${note}`, true);
  }, [applications, addLog, addNotification]);

  // ─── Announcements ───
  const createAnnouncement = useCallback((title: string, body: string, type: AnnouncementType, isPinned: boolean) => {
    const ann: Announcement = { id: `ann-${Date.now()}`, title, body, type, isPinned, createdBy: 'admin-001', createdAt: new Date().toISOString() };
    setAnnouncements((prev) => [ann, ...prev]);
    addLog('create_announcement', 'announcement', ann.id, `공지사항 "${title}" 작성`);
    addNotification('announcement', 'all', null, `공지: ${title}`, body, true);
  }, [addLog, addNotification]);

  const deleteAnnouncement = useCallback((id: string) => {
    const ann = announcements.find((a) => a.id === id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    addLog('delete_announcement', 'announcement', id, `공지사항 "${ann?.title}" 삭제`);
  }, [announcements, addLog]);

  // ─── Teams ───
  const updateTeam = useCallback((teamId: string, updates: Partial<Omit<KBOTeam, 'id'>>) => {
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, ...updates } : t)));
    addLog('update_team', 'team', teamId, `구단 정보 수정`);
  }, [addLog]);

  // ─── Players ───
  const createPlayer = useCallback((data: Omit<Player, 'id'>) => {
    const player: Player = { ...data, id: `pl-${Date.now()}` };
    setPlayers((prev) => [player, ...prev]);
    addLog('create_player', 'player', player.id, `선수 "${data.name_ko}" 등록`);
  }, [addLog]);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Omit<Player, 'id'>>) => {
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, ...updates } : p)));
    addLog('update_player', 'player', playerId, `선수 정보 수정`);
  }, [addLog]);

  const deletePlayer = useCallback((playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    addLog('delete_player', 'player', playerId, `선수 "${player?.name_ko}" 삭제`);
  }, [players, addLog]);

  // ─── Cheerleaders ───
  const createCheerleader = useCallback((data: Omit<Cheerleader, 'id'>) => {
    const cheer: Cheerleader = { ...data, id: `cl-${Date.now()}` };
    setCheerleaders((prev) => [cheer, ...prev]);
    addLog('create_cheerleader', 'cheerleader', cheer.id, `치어리더 "${data.name}" 등록`);
  }, [addLog]);

  const updateCheerleader = useCallback((cheerleaderId: string, updates: Partial<Omit<Cheerleader, 'id'>>) => {
    setCheerleaders((prev) => prev.map((c) => (c.id === cheerleaderId ? { ...c, ...updates } : c)));
    addLog('update_cheerleader', 'cheerleader', cheerleaderId, `치어리더 정보 수정`);
  }, [addLog]);

  const deleteCheerleader = useCallback((cheerleaderId: string) => {
    const cheer = cheerleaders.find((c) => c.id === cheerleaderId);
    setCheerleaders((prev) => prev.filter((c) => c.id !== cheerleaderId));
    addLog('delete_cheerleader', 'cheerleader', cheerleaderId, `치어리더 "${cheer?.name}" 삭제`);
  }, [cheerleaders, addLog]);

  // ─── Terms ───
  const updateTermsDocument = useCallback((id: string, updates: Partial<Omit<TermsDocument, 'id' | 'type'>>) => {
    setTermsDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)));
    addLog('update_terms', 'terms', id, `약관 수정`);
  }, [addLog]);

  // ─── Site Settings ───
  const updateSiteSettings = useCallback((updates: Partial<SiteSettings>) => {
    setSiteSettings((prev) => ({ ...prev, ...updates }));
    addLog('update_settings', 'settings', 'site', `사이트 설정 수정`);
  }, [addLog]);

  // ─── Maintenance ───
  const updateMaintenance = useCallback((updates: Partial<MaintenanceConfig>) => {
    setMaintenance((prev) => ({ ...prev, ...updates }));
    addLog('update_maintenance', 'settings', 'maintenance', updates.isEnabled !== undefined ? `점검 모드 ${updates.isEnabled ? '활성화' : '비활성화'}` : '점검 설정 수정');
  }, [addLog]);

  // ─── App Version ───
  const updateAppVersion = useCallback((updates: Partial<Pick<AppVersionInfo, 'currentVersion' | 'minimumVersion' | 'forceUpdate'>>) => {
    setAppVersion((prev) => ({ ...prev, ...updates }));
    addLog('update_app_version', 'settings', 'app-version', `앱 버전 설정 수정`);
  }, [addLog]);

  const addAppVersion = useCallback((version: string, notes: string) => {
    setAppVersion((prev) => ({ ...prev, currentVersion: version, history: [{ version, releasedAt: new Date().toISOString(), notes }, ...prev.history] }));
    addLog('add_app_version', 'settings', 'app-version', `새 버전 ${version} 등록`);
  }, [addLog]);

  // ─── Ad Management ───
  const createAdPlacement = useCallback((data: { name: string; type: AdType; adUnitId: string; position: AdPosition; isEnabled: boolean }) => {
    const ad: AdPlacement = { ...data, id: `ad-${Date.now()}`, createdAt: new Date().toISOString() };
    setAdPlacements((prev) => [ad, ...prev]);
    addLog('create_ad', 'ad', ad.id, `광고 배치 "${data.name}" 생성`);
  }, [addLog]);

  const updateAdPlacement = useCallback((id: string, updates: Partial<Omit<AdPlacement, 'id' | 'createdAt'>>) => {
    setAdPlacements((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    addLog('update_ad', 'ad', id, `광고 배치 수정`);
  }, [addLog]);

  const toggleAdPlacement = useCallback((id: string) => {
    setAdPlacements((prev) => prev.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a)));
    addLog('toggle_ad', 'ad', id, `광고 토글`);
  }, [addLog]);

  const deleteAdPlacement = useCallback((id: string) => {
    setAdPlacements((prev) => prev.filter((a) => a.id !== id));
    addLog('delete_ad', 'ad', id, `광고 배치 삭제`);
  }, [addLog]);

  // ─── Community Posts ───
  const blindCommunityPost = useCallback((id: string) => {
    setCommunityPosts((prev) => prev.map((p) => (p.id === id ? { ...p, is_blinded: true } : p)));
    addLog('blind_community_post', 'community', id, '커뮤니티 게시글 블라인드');
  }, [addLog]);

  const unblindCommunityPost = useCallback((id: string) => {
    setCommunityPosts((prev) => prev.map((p) => (p.id === id ? { ...p, is_blinded: false } : p)));
    addLog('unblind_community_post', 'community', id, '커뮤니티 게시글 블라인드 해제');
  }, [addLog]);

  const deleteCommunityPost = useCallback((id: string) => {
    setCommunityPosts((prev) => prev.filter((p) => p.id !== id));
    addLog('delete_community_post', 'community', id, '커뮤니티 게시글 삭제');
  }, [addLog]);

  // ─── Comments ───
  const blindComment = useCallback((id: string) => {
    setCommunityComments((prev) => prev.map((c) => (c.id === id ? { ...c, is_blinded: true } : c)));
    addLog('blind_comment', 'comment', id, '댓글 블라인드');
  }, [addLog]);

  const unblindComment = useCallback((id: string) => {
    setCommunityComments((prev) => prev.map((c) => (c.id === id ? { ...c, is_blinded: false } : c)));
    addLog('unblind_comment', 'comment', id, '댓글 블라인드 해제');
  }, [addLog]);

  const deleteComment = useCallback((id: string) => {
    setCommunityComments((prev) => prev.map((c) => (c.id === id ? { ...c, is_deleted: true } : c)));
    addLog('delete_comment', 'comment', id, '댓글 삭제');
  }, [addLog]);

  // ─── Polls ───
  const closePoll = useCallback((id: string) => {
    setPolls((prev) => prev.map((p) => (p.id === id ? { ...p, is_closed: true } : p)));
    addLog('close_poll', 'poll', id, '투표 종료');
  }, [addLog]);

  // ─── Inquiries ───
  const replyInquiry = useCallback((id: string, reply: string) => {
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, status: 'replied' as const, reply, repliedAt: new Date().toISOString() } : inq)));
    addLog('reply_inquiry', 'inquiry', id, `문의 답변`);
  }, [addLog]);

  const closeInquiry = useCallback((id: string) => {
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, status: 'closed' as const } : inq)));
    addLog('close_inquiry', 'inquiry', id, '문의 종료');
  }, [addLog]);

  // ─── DM ───
  const dismissDMReport = useCallback((id: string) => {
    setDMConversations((prev) => prev.map((d) => (d.id === id ? { ...d, isReported: false, reportReason: undefined } : d)));
    addLog('dismiss_dm_report', 'dm', id, 'DM 신고 해제');
  }, [addLog]);

  // ─── Tickets ───
  const toggleTicketPackage = useCallback((id: string) => {
    setTicketPackages((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
    addLog('toggle_ticket_package', 'ticket', id, '티켓 패키지 토글');
  }, [addLog]);

  // ─── Settlements ───
  const updateSettlementStatus = useCallback((id: string, status: SettlementStatus) => {
    setSettlements((prev) => prev.map((s) => (s.id === id ? { ...s, status, ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}) } : s)));
    addLog('update_settlement', 'settlement', id, `정산 상태 변경: ${status}`);
  }, [addLog]);

  // ─── Ranks ───
  const updateRankTier = useCallback((id: string, minScore: number) => {
    setRankTiers((prev) => prev.map((r) => (r.id === id ? { ...r, minScore } : r)));
    addLog('update_rank', 'settings', id, `랭크 "${id}" 기준점수 → ${minScore}`);
  }, [addLog]);

  // ─── Awards ───
  const createAward = useCallback((categoryId: string, photographerId: string, photographerName: string, month: string) => {
    const award: AwardRecord = { id: `aw-${Date.now()}`, categoryId, photographerId, photographerName, month };
    setAwards((prev) => [award, ...prev]);
    addLog('create_award', 'award', award.id, `어워드 수여: ${photographerName} (${month})`);
  }, [addLog]);

  const deleteAward = useCallback((id: string) => {
    setAwards((prev) => prev.filter((a) => a.id !== id));
    addLog('delete_award', 'award', id, '어워드 삭제');
  }, [addLog]);

  // ─── Blocks ───
  const removeBlock = useCallback((id: string) => {
    const blk = blocks.find((b) => b.id === id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    addLog('remove_block', 'block', id, `차단 해제: ${blk?.blockerName} → ${blk?.blockedName}`);
  }, [blocks, addLog]);

  // ─── Collections ───
  const deleteCollection = useCallback((id: string) => {
    const col = collections.find((c) => c.id === id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    addLog('delete_collection', 'collection', id, `컬렉션 "${col?.name}" 삭제`);
  }, [collections, addLog]);

  // ─── Events ───
  const createEvent = useCallback((data: Omit<TimelineEvent, 'id' | 'postCount'>) => {
    const ev: TimelineEvent = { ...data, id: `ev-${Date.now()}`, postCount: 0 };
    setEvents((prev) => [ev, ...prev]);
    addLog('create_event', 'event', ev.id, `이벤트 "${data.title}" 생성`);
  }, [addLog]);

  const updateEvent = useCallback((id: string, updates: Partial<Omit<TimelineEvent, 'id'>>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    addLog('update_event', 'event', id, '이벤트 수정');
  }, [addLog]);

  const deleteEvent = useCallback((id: string) => {
    const ev = events.find((e) => e.id === id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    addLog('delete_event', 'event', id, `이벤트 "${ev?.title}" 삭제`);
  }, [events, addLog]);

  // ─── Stats ───
  const stats: AdminStats = useMemo(() => ({
    totalUsers: users.length,
    totalPhotographers: users.filter((u) => u.is_photographer).length,
    totalPosts: posts.length,
    pendingReviewCount: pendingPosts.length,
    pendingReportCount: pendingReports.length,
    pendingPhotographerCount: pendingApplications.length,
    todayNewUsers: 0,
    todayNewPosts: posts.filter((p) => new Date(p.created_at).toDateString() === new Date().toDateString()).length,
    dau: visitorStats.dau,
    wau: visitorStats.wau,
    mau: visitorStats.mau,
  }), [users, posts, pendingPosts, pendingReports, pendingApplications, visitorStats]);

  const value: AdminContextValue = useMemo(() => ({
    stats,
    posts, pendingPosts, approvePost, rejectPost, toggleFeatured,
    reports, pendingReports, resolveReport,
    users, sanctions, sanctionUser, revokeSanction,
    applications, pendingApplications, approvePhotographer, rejectPhotographer,
    announcements, createAnnouncement, deleteAnnouncement,
    teams, updateTeam,
    players, createPlayer, updatePlayer, deletePlayer,
    cheerleaders, createCheerleader, updateCheerleader, deleteCheerleader,
    sentNotifications, sendNotification,
    visitorStats,
    termsDocuments, updateTermsDocument,
    siteSettings, updateSiteSettings,
    maintenance, updateMaintenance,
    appVersion, updateAppVersion, addAppVersion,
    adPlacements, adRevenue, createAdPlacement, updateAdPlacement, toggleAdPlacement, deleteAdPlacement,
    communityPosts, blindCommunityPost, unblindCommunityPost, deleteCommunityPost,
    communityComments, blindComment, unblindComment, deleteComment,
    polls, closePoll,
    inquiries, replyInquiry, closeInquiry,
    dmConversations, dismissDMReport,
    ticketTransactions, ticketPackages, toggleTicketPackage,
    giftItems: GIFT_ITEMS, supportRecords, settlements, updateSettlementStatus,
    rankTiers, updateRankTier,
    awardCategories: AWARD_CATEGORIES, awards, createAward, deleteAward,
    blocks, removeBlock,
    collections, deleteCollection,
    searchKeywords, followStats,
    events, createEvent, updateEvent, deleteEvent,
    auditLogs,
  }), [
    stats, posts, pendingPosts, approvePost, rejectPost, toggleFeatured,
    reports, pendingReports, resolveReport,
    users, sanctions, sanctionUser, revokeSanction,
    applications, pendingApplications, approvePhotographer, rejectPhotographer,
    announcements, createAnnouncement, deleteAnnouncement,
    teams, updateTeam,
    players, createPlayer, updatePlayer, deletePlayer,
    cheerleaders, createCheerleader, updateCheerleader, deleteCheerleader,
    sentNotifications, sendNotification,
    visitorStats,
    termsDocuments, updateTermsDocument,
    siteSettings, updateSiteSettings,
    maintenance, updateMaintenance,
    appVersion, updateAppVersion, addAppVersion,
    adPlacements, adRevenue, createAdPlacement, updateAdPlacement, toggleAdPlacement, deleteAdPlacement,
    communityPosts, blindCommunityPost, unblindCommunityPost, deleteCommunityPost,
    communityComments, blindComment, unblindComment, deleteComment,
    polls, closePoll,
    inquiries, replyInquiry, closeInquiry,
    dmConversations, dismissDMReport,
    ticketTransactions, ticketPackages, toggleTicketPackage,
    supportRecords, settlements, updateSettlementStatus,
    rankTiers, updateRankTier,
    awards, createAward, deleteAward,
    blocks, removeBlock,
    collections, deleteCollection,
    searchKeywords, followStats,
    events, createEvent, updateEvent, deleteEvent,
    auditLogs,
  ]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
