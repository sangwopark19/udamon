// ─── Admin roles ───
export type AdminRole = 'super_admin' | 'moderator';

// ─── Sanction types ───
export type SanctionType = 'warning' | 'suspend_7d' | 'suspend_30d' | 'permanent_ban';

export interface UserSanction {
  id: string;
  userId: string;
  type: SanctionType;
  reason: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

// ─── Report resolution ───
export type ReportResolution = 'delete_content' | 'warn_user' | 'suspend_user' | 'dismiss';

// ─── Announcement ───
export type AnnouncementType = 'notice' | 'event' | 'maintenance';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
}

// ─── Audit log ───
export type AuditTargetType = 'post' | 'user' | 'photographer' | 'report' | 'announcement' | 'team' | 'player' | 'cheerleader' | 'notification' | 'settings' | 'terms' | 'ad' | 'community' | 'comment' | 'poll' | 'inquiry' | 'dm' | 'ticket' | 'settlement' | 'award' | 'block' | 'collection' | 'event';

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  detail: string;
  createdAt: string;
}

// ─── Dashboard stats ───
export interface AdminStats {
  totalUsers: number;
  totalPhotographers: number;
  totalPosts: number;
  pendingReviewCount: number;
  pendingReportCount: number;
  pendingPhotographerCount: number;
  todayNewUsers: number;
  todayNewPosts: number;
  dau: number;
  wau: number;
  mau: number;
}

// ─── Photographer application ───
export interface PhotographerApplication {
  photographerId: string;
  userId: string;
  displayName: string;
  bio: string;
  activityLinks: string[];
  activityPlan: string;
  teamId: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNote?: string;
}

// ─── Web model types ───
export interface PhotoPost {
  id: string;
  photographer_id: string;
  photographer_name: string;
  image_urls: string[];
  title: string;
  description: string;
  team_id: string;
  tags: string[];
  is_featured: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
}

export type LoginProvider = 'google' | 'apple' | 'kakao' | 'naver' | 'email';

export interface UserConsent {
  privacy: { agreed: boolean; agreedAt: string };
  terms: { agreed: boolean; agreedAt: string };
  marketing: { agreed: boolean; agreedAt: string | null };
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  is_photographer: boolean;
  is_admin: boolean;
  admin_role: AdminRole | null;
  post_count: number;
  created_at: string;
  login_provider: LoginProvider;
  photographer_since: string | null;
  consents: UserConsent;
}

export interface ReportEntry {
  targetType: 'photo_post' | 'community_post' | 'comment';
  targetId: string;
  reporterId: string;
  reason: string;
  detail?: string;
  status: 'pending' | 'resolved';
  resolution?: ReportResolution;
  createdAt: string;
}

export interface KBOTeam {
  id: string;
  nameKo: string;
  nameEn: string;
  shortName: string;
  city: string;
  stadium: string;
  color: string;
  textColor: string;
}

// ─── Player ───
export type PlayerPosition = 'P' | 'C' | 'IF' | 'OF';

export interface Player {
  id: string;
  team_id: string;
  name_ko: string;
  number: number;
  position: PlayerPosition;
  is_active: boolean;
}

// ─── Cheerleader ───
export interface Cheerleader {
  id: string;
  name: string;
  description: string;
  team_id: string;
  image_url: string;
}

// ─── Admin Notification ───
export type AdminNotifType =
  | 'post_approved' | 'post_rejected'
  | 'photographer_approved' | 'photographer_rejected'
  | 'sanction_issued' | 'sanction_revoked'
  | 'announcement'
  | 'app_update' | 'system' | 'custom';

export interface AdminNotification {
  id: string;
  type: AdminNotifType;
  target: 'all' | 'user';
  targetUserId: string | null;
  title: string;
  body: string;
  sentBy: string;
  isAuto: boolean;
  createdAt: string;
}

// ─── Visitor Analytics ───
export interface DailyVisitorData {
  date: string;
  dau: number;
  newUsers: number;
  pageViews: number;
}

export interface PageViewBreakdown {
  page: string;
  views: number;
  percentage: number;
}

export interface VisitorStats {
  dau: number;
  wau: number;
  mau: number;
  dailyTrend: DailyVisitorData[];
  pageBreakdown: PageViewBreakdown[];
}

// ─── Terms Document ───
export type TermsDocType = 'terms_of_service' | 'privacy_policy' | 'photographer_terms';

export interface TermsVersion {
  version: string;
  updatedAt: string;
  changeSummary: string;
}

export interface TermsDocument {
  id: string;
  type: TermsDocType;
  title: string;
  body: string;
  currentVersion: string;
  status: 'published' | 'draft';
  versions: TermsVersion[];
  updatedAt: string;
}

// ─── Site Settings ───
export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  primaryColor: string;
  logoUrl: string;
}

// ─── Maintenance Mode ───
export interface MaintenanceConfig {
  isEnabled: boolean;
  message: string;
  scheduledAt: string | null;
  estimatedEnd: string | null;
}

// ─── App Version ───
export interface AppVersionHistory {
  version: string;
  releasedAt: string;
  notes: string;
}

export interface AppVersionInfo {
  currentVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  history: AppVersionHistory[];
}

// ─── Ad Management ───
export type AdType = 'banner' | 'interstitial' | 'rewarded_video';
export type AdPosition = 'home' | 'explore' | 'community' | 'post_detail' | 'photographer_profile';

export interface AdPlacement {
  id: string;
  name: string;
  type: AdType;
  adUnitId: string;
  isEnabled: boolean;
  position: AdPosition;
  createdAt: string;
}

export interface AdRevenue {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

// ─── Community Post ───
export interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  team_id: string | null;
  title: string;
  content: string;
  images: string[];
  has_poll: boolean;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_edited: boolean;
  is_trending: boolean;
  is_blinded: boolean;
  created_at: string;
}

// ─── Community Comment ───
export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  is_blinded: boolean;
  created_at: string;
}

// ─── Poll ───
export interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

export interface Poll {
  id: string;
  post_id: string;
  post_title: string;
  allow_multiple: boolean;
  expires_at: string;
  is_closed: boolean;
  total_votes: number;
  options: PollOption[];
  created_at: string;
}

// ─── Inquiry ───
export type InquiryCategory = 'account' | 'payment' | 'bug' | 'feature' | 'other';

export interface Inquiry {
  id: string;
  userId: string;
  userName: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: 'open' | 'replied' | 'closed';
  reply?: string;
  createdAt: string;
  repliedAt?: string;
}

// ─── DM Conversation (admin view) ───
export interface DMConversation {
  id: string;
  user1Id: string;
  user1Name: string;
  user2Id: string;
  user2Name: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  isReported: boolean;
  reportReason?: string;
}

// ─── Ticket ───
export type TicketTransactionType = 'purchase' | 'gift_sent' | 'gift_received' | 'refund';

export interface TicketTransaction {
  id: string;
  userId: string;
  userName: string;
  type: TicketTransactionType;
  amount: number;
  description: string;
  createdAt: string;
}

export interface TicketPackage {
  id: string;
  name: string;
  ticketAmount: number;
  price: number;
  isActive: boolean;
}

// ─── Support / Gift ───
export interface GiftItem {
  id: string;
  nameKo: string;
  emoji: string;
  ticketCost: number;
}

export interface SupportRecord {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toPhotographerId: string;
  toPhotographerName: string;
  giftId: string;
  ticketAmount: number;
  createdAt: string;
}

export type SettlementStatus = 'pending' | 'processing' | 'completed';

export interface SettlementRecord {
  id: string;
  photographerId: string;
  photographerName: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: SettlementStatus;
  requestedAt: string;
  completedAt?: string;
}

// ─── Rank ───
export interface RankTier {
  id: string;
  nameKo: string;
  emoji: string;
  minScore: number;
}

// ─── Award ───
export interface AwardCategory {
  id: string;
  nameKo: string;
  emoji: string;
}

export interface AwardRecord {
  id: string;
  categoryId: string;
  photographerId: string;
  photographerName: string;
  month: string;
}

// ─── Block ───
export interface BlockRecord {
  id: string;
  blockerId: string;
  blockerName: string;
  blockedId: string;
  blockedName: string;
  createdAt: string;
}

// ─── Collection ───
export interface PgCollection {
  id: string;
  photographerId: string;
  photographerName: string;
  name: string;
  emoji: string;
  postCount: number;
  createdAt: string;
}

// ─── Search Analytics ───
export interface SearchKeyword {
  keyword: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

// ─── Follow Stats ───
export interface PhotographerFollowStats {
  photographerId: string;
  photographerName: string;
  followerCount: number;
  followingCount: number;
}

// ─── Timeline Event ───
export type EventType = 'regular_season' | 'postseason' | 'allstar' | 'spring_camp' | 'fan_meeting' | 'first_pitch' | 'other';

export interface TimelineEvent {
  id: string;
  title: string;
  eventType: EventType;
  teamIds: string[];
  date: string;
  location: string;
  description: string;
  postCount: number;
  thumbnailUrl: string | null;
}
