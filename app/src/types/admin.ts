// ─── 관리자 역할 ───────────────────────────────────────────
export type AdminRole = 'super_admin' | 'moderator';

// ─── 게시물 심사 액션 ──────────────────────────────────────
export interface PostReviewAction {
  postId: string;
  action: 'approve' | 'reject';
  reason?: string;
  reviewedBy: string;
  reviewedAt: string;
}

// ─── 유저 제재 ─────────────────────────────────────────────
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

// ─── 신고 처리 ─────────────────────────────────────────────
export type ReportResolution = 'delete_content' | 'warn_user' | 'suspend_user' | 'dismiss';

export interface ReportAction {
  reportIndex: number;
  resolution: ReportResolution;
  note?: string;
  resolvedBy: string;
  resolvedAt: string;
}

// ─── 포토그래퍼 인증 심사 ──────────────────────────────────
export interface PhotographerApplication {
  photographerId: string;
  userId: string;
  displayName: string;
  bio: string;
  portfolioImages: string[];
  teamId: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNote?: string;
}

// ─── 공지사항 ──────────────────────────────────────────────
export type AnnouncementType = 'notice' | 'event' | 'maintenance';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

// ─── 감사 로그 ─────────────────────────────────────────────
export type AuditTargetType = 'post' | 'user' | 'photographer' | 'report' | 'announcement';

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  detail: string;
  createdAt: string;
}

// ─── 대시보드 통계 ─────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  totalPhotographers: number;
  totalPosts: number;
  pendingReviewCount: number;
  pendingReportCount: number;
  pendingPhotographerCount: number;
  todayNewUsers: number;
  todayNewPosts: number;
}
