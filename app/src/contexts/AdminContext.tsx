import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePhotographer } from './PhotographerContext';
import { useReport } from './ReportContext';
import { useNotification } from './NotificationContext';
import type {
  AdminStats,
  UserSanction,
  SanctionType,
  ReportResolution,
  PhotographerApplication,
  Announcement,
  AnnouncementType,
  AuditLog,
} from '../types/admin';
import type { PhotoPost } from '../types/photographer';
import type { ReportEntry } from './ReportContext';

interface AdminContextValue {
  // Stats
  stats: AdminStats;

  // Post review
  pendingPosts: PhotoPost[];
  approvePost: (postId: string) => void;
  rejectPost: (postId: string, reason: string) => void;

  // Report management
  pendingReports: (ReportEntry & { index: number })[];
  resolveReport: (index: number, resolution: ReportResolution, note?: string) => void;

  // User sanctions
  sanctions: UserSanction[];
  sanctionUser: (userId: string, type: SanctionType, reason: string) => void;
  revokeSanction: (sanctionId: string) => void;
  getUserSanctions: (userId: string) => UserSanction[];

  // Photographer review
  photographerApplications: PhotographerApplication[];
  approvePhotographer: (photographerId: string) => void;
  rejectPhotographer: (photographerId: string, note: string) => void;

  // Announcements
  announcements: Announcement[];
  createAnnouncement: (title: string, body: string, type: AnnouncementType, isPinned: boolean) => void;
  deleteAnnouncement: (id: string) => void;

  // Audit log
  auditLogs: AuditLog[];
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { photoPosts, photographers, deletePhotoPost } = usePhotographer();
  // TODO (Phase 5 admin): Plan 03 Context 에서 updatePostStatus/updatePhotographerVerification 제거됨.
  // Phase 5 에서 adminApi 경유 호출로 교체 예정. 임시로 no-op 로 유지하여 runtime crash 방지.
  const updatePostStatus = (_postId: string, _status: 'approved' | 'rejected', _reason?: string): void => {
    console.warn('[AdminContext] updatePostStatus 미구현 — Phase 5 adminApi 이관 대상');
  };
  const updatePhotographerVerification = (_photographerId: string, _verified: boolean): void => {
    console.warn('[AdminContext] updatePhotographerVerification 미구현 — Phase 5 adminApi 이관 대상');
  };
  const { getPendingReports, resolveReport: resolveReportCtx } = useReport();
  const { addNotification } = useNotification();

  const [sanctions, setSanctions] = useState<UserSanction[]>([]);
  const [photographerApplications, setPhotographerApplications] = useState<PhotographerApplication[]>(() => {
    // Seed: treat all non-verified photographers as pending applications
    return photographers
      .filter((p) => !p.is_verified)
      .map((p) => ({
        photographerId: p.id,
        userId: p.user_id,
        displayName: p.display_name,
        bio: p.bio,
        portfolioImages: [p.avatar_url ?? '', p.cover_url ?? ''].filter(Boolean),
        teamId: p.team_id ?? '',
        appliedAt: p.created_at,
        status: 'pending' as const,
      }));
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 'ann-seed-1',
      title: '2026 KBO 시즌 우다몬 정식 오픈!',
      body: '우다몬이 2026 KBO 시즌과 함께 정식 오픈합니다. 좋아하는 야구 포토그래퍼를 팔로우하고, 서포트하고, 커뮤니티에 참여하세요!\n\n많은 이용 부탁드립니다.',
      type: 'notice',
      isPinned: true,
      createdBy: 'admin-001',
      createdAt: '2026-03-01T00:00:00Z',
      expiresAt: null,
    },
    {
      id: 'ann-seed-2',
      title: '개막전 포토 콘테스트 안내',
      body: '2026 KBO 개막전을 맞아 포토 콘테스트를 개최합니다!\n\n참여 방법: 개막전 직관 사진을 업로드하세요.\n상품: 우수 포토그래퍼에게 프리미엄 뱃지 + 티켓 100장',
      type: 'event',
      isPinned: true,
      createdBy: 'admin-001',
      createdAt: '2026-03-22T00:00:00Z',
      expiresAt: null,
    },
    {
      id: 'ann-seed-3',
      title: '앱 업데이트 v1.2.0 안내',
      body: '치어리더 프로필 페이지가 추가되었습니다.\n커뮤니티 검색 기능이 개선되었습니다.\n\n앱을 최신 버전으로 업데이트해주세요!',
      type: 'notice',
      isPinned: false,
      createdBy: 'admin-001',
      createdAt: '2026-03-20T10:00:00Z',
      expiresAt: null,
    },
    {
      id: 'ann-seed-4',
      title: '서버 점검 안내 (3/28)',
      body: '3월 28일 02:00~04:00 서버 점검이 예정되어 있습니다.\n점검 중에는 서비스 이용이 제한될 수 있습니다.\n\n이용에 불편을 드려 죄송합니다.',
      type: 'maintenance',
      isPinned: false,
      createdBy: 'admin-001',
      createdAt: '2026-03-27T15:00:00Z',
      expiresAt: null,
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const adminId = user?.id ?? 'unknown';

  // ─── Helpers ───
  const addLog = useCallback((action: string, targetType: AuditLog['targetType'], targetId: string, detail: string) => {
    setAuditLogs((prev) => [{
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      adminId,
      action,
      targetType,
      targetId,
      detail,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }, [adminId]);

  // ─── Post Review ───
  const pendingPosts = useMemo(() =>
    photoPosts.filter((p) => p.status === 'pending')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [photoPosts]);

  const approvePost = useCallback((postId: string) => {
    updatePostStatus(postId, 'approved');
    const post = photoPosts.find((p) => p.id === postId);
    if (post) {
      addNotification('system', '게시물 승인', `"${post.title}" 게시물이 승인되어 피드에 노출됩니다.`, { postId });
      addLog('approve_post', 'post', postId, `승인: ${post.title}`);
    }
  }, [updatePostStatus, photoPosts, addNotification, addLog]);

  const rejectPost = useCallback((postId: string, reason: string) => {
    updatePostStatus(postId, 'rejected', reason);
    const post = photoPosts.find((p) => p.id === postId);
    if (post) {
      addNotification('system', '게시물 승인 거부', `"${post.title}" 게시물이 거부되었습니다. 사유: ${reason}`, { postId });
      addLog('reject_post', 'post', postId, `거부: ${post.title} — ${reason}`);
    }
  }, [updatePostStatus, photoPosts, addNotification, addLog]);

  // ─── Report Management ───
  const pendingReports = useMemo(() => getPendingReports(), [getPendingReports]);

  const resolveReport = useCallback((index: number, resolution: ReportResolution, note?: string) => {
    resolveReportCtx(index, resolution);

    // Side effects based on resolution
    const report = pendingReports.find((r) => r.index === index);
    if (report) {
      if (resolution === 'delete_content') {
        if (report.targetType === 'post') {
          deletePhotoPost(report.targetId);
        }
      }
      addLog('resolve_report', 'report', report.targetId, `${resolution}${note ? ` — ${note}` : ''}`);
    }
  }, [resolveReportCtx, pendingReports, deletePhotoPost, addLog]);

  // ─── User Sanctions ───
  const sanctionUser = useCallback((userId: string, type: SanctionType, reason: string) => {
    const expiresMap: Record<SanctionType, number | null> = {
      warning: null,
      suspend_7d: 7 * 86400000,
      suspend_30d: 30 * 86400000,
      permanent_ban: null,
    };
    const duration = expiresMap[type];
    const sanction: UserSanction = {
      id: `sanc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      type,
      reason,
      issuedBy: adminId,
      issuedAt: new Date().toISOString(),
      expiresAt: duration ? new Date(Date.now() + duration).toISOString() : null,
      isActive: true,
    };
    setSanctions((prev) => [sanction, ...prev]);
    addNotification('system', '계정 제재 안내', `사유: ${reason}`, {});
    addLog('sanction_user', 'user', userId, `${type}: ${reason}`);
  }, [adminId, addNotification, addLog]);

  const revokeSanction = useCallback((sanctionId: string) => {
    setSanctions((prev) => prev.map((s) =>
      s.id === sanctionId ? { ...s, isActive: false } : s,
    ));
    const target = sanctions.find((s) => s.id === sanctionId);
    if (target) {
      addLog('revoke_sanction', 'user', target.userId, `해제: ${target.type}`);
    }
  }, [sanctions, addLog]);

  const getUserSanctions = useCallback((userId: string) => {
    return sanctions.filter((s) => s.userId === userId);
  }, [sanctions]);

  // ─── Photographer Review ───
  const approvePhotographer = useCallback((photographerId: string) => {
    updatePhotographerVerification(photographerId, true);
    setPhotographerApplications((prev) => prev.map((a) =>
      a.photographerId === photographerId ? { ...a, status: 'approved' as const, reviewedBy: adminId } : a,
    ));
    addNotification('system', '포토그래퍼 인증 완료', '축하합니다! 포토그래퍼 인증이 승인되었습니다.', { photographerId });
    addLog('approve_photographer', 'photographer', photographerId, '인증 승인');
  }, [updatePhotographerVerification, adminId, addNotification, addLog]);

  const rejectPhotographer = useCallback((photographerId: string, note: string) => {
    setPhotographerApplications((prev) => prev.map((a) =>
      a.photographerId === photographerId ? { ...a, status: 'rejected' as const, reviewedBy: adminId, reviewNote: note } : a,
    ));
    addNotification('system', '포토그래퍼 인증 반려', `사유: ${note}`, { photographerId });
    addLog('reject_photographer', 'photographer', photographerId, `반려: ${note}`);
  }, [adminId, addNotification, addLog]);

  // ─── Announcements ───
  const createAnnouncement = useCallback((title: string, body: string, type: AnnouncementType, isPinned: boolean) => {
    const announcement: Announcement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      type,
      isPinned,
      createdBy: adminId,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    };
    setAnnouncements((prev) => [announcement, ...prev]);
    addNotification('system', title, body, {});
    addLog('create_announcement', 'announcement', announcement.id, title);
  }, [adminId, addNotification, addLog]);

  const deleteAnnouncement = useCallback((id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    addLog('delete_announcement', 'announcement', id, '삭제');
  }, [addLog]);

  // ─── Stats ───
  const stats: AdminStats = useMemo(() => ({
    totalUsers: 3, // mock: 3 test accounts
    totalPhotographers: photographers.length,
    totalPosts: photoPosts.length,
    pendingReviewCount: pendingPosts.length,
    pendingReportCount: pendingReports.length,
    pendingPhotographerCount: photographerApplications.filter((a) => a.status === 'pending').length,
    todayNewUsers: 0,
    todayNewPosts: photoPosts.filter((p) => {
      const today = new Date();
      const created = new Date(p.created_at);
      return created.toDateString() === today.toDateString();
    }).length,
  }), [photographers, photoPosts, pendingPosts, pendingReports, photographerApplications]);

  const value = useMemo(() => ({
    stats,
    pendingPosts,
    approvePost,
    rejectPost,
    pendingReports,
    resolveReport,
    sanctions,
    sanctionUser,
    revokeSanction,
    getUserSanctions,
    photographerApplications,
    approvePhotographer,
    rejectPhotographer,
    announcements,
    createAnnouncement,
    deleteAnnouncement,
    auditLogs,
  }), [
    stats, pendingPosts, approvePost, rejectPost,
    pendingReports, resolveReport,
    sanctions, sanctionUser, revokeSanction, getUserSanctions,
    photographerApplications, approvePhotographer, rejectPhotographer,
    announcements, createAnnouncement, deleteAnnouncement,
    auditLogs,
  ]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
