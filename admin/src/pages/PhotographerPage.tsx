import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Camera, Bell, Clock, ShieldCheck, ShieldX, ExternalLink, FileText } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { getTeamName } from '../data/mock';
import type { PhotographerApplication } from '../types';
import Modal from '../components/Modal';

const REJECT_REASONS = [
  '포트폴리오가 충분하지 않습니다',
  '본인 촬영 사진인지 확인할 수 없습니다',
  '커뮤니티 가이드라인을 준수해주세요',
];

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'pending', label: '대기' },
  { id: 'approved', label: '승인' },
  { id: 'rejected', label: '반려' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: '대기', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '승인', cls: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
  rejected: { label: '반려', cls: 'bg-red-100 text-red-700', icon: ShieldX },
};

export default function PhotographerPage() {
  const { applications, approvePhotographer, rejectPhotographer } = useAdmin();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const counts = useMemo(() => ({
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }), [applications]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = (app: PhotographerApplication) => {
    approvePhotographer(app.photographerId);
    showToast(`"${app.displayName}" 승인 완료 — 알림이 발송되었습니다`, 'success');
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectNote) return;
    const app = applications.find((a) => a.photographerId === rejectTarget);
    rejectPhotographer(rejectTarget, rejectNote);
    showToast(`"${app?.displayName}" 반려 — 알림이 발송되었습니다`, 'error');
    setRejectTarget(null);
    setRejectNote('');
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        포토그래퍼 인증 <span className="text-navy/50 font-normal">({applications.length})</span>
      </h1>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === tab.id
                ? 'bg-navy text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${statusFilter === tab.id ? 'text-white/70' : 'text-gray-400'}`}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Camera size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {statusFilter === 'pending' ? '대기 중인 신청이 없습니다' :
             statusFilter === 'approved' ? '승인된 포토그래퍼가 없습니다' :
             statusFilter === 'rejected' ? '반려된 신청이 없습니다' :
             '신청 내역이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((app) => {
            const badge = STATUS_BADGE[app.status];
            const BadgeIcon = badge.icon;
            return (
              <div key={app.photographerId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Profile */}
                <div className="px-5 pt-5 pb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center">
                      <Camera size={16} className="text-navy" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{app.displayName}</div>
                      <div className="text-xs text-gray-500">{getTeamName(app.teamId)}</div>
                    </div>
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>
                      <BadgeIcon size={12} />
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{app.bio || '소개 없음'}</p>

                  {/* Activity Links */}
                  {app.activityLinks.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-500 mb-1.5">활동 링크</div>
                      <div className="space-y-1">
                        {app.activityLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                          >
                            <ExternalLink size={12} className="shrink-0" />
                            <span className="truncate">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity Plan */}
                  {app.activityPlan && (
                    <div className="mb-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                        <FileText size={12} />
                        활동 계획
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{app.activityPlan}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mb-4">
                    신청일: {new Date(app.appliedAt).toLocaleDateString('ko-KR')}
                  </div>

                  {/* Review note (for rejected) */}
                  {app.status === 'rejected' && app.reviewNote && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                      <div className="text-xs font-medium text-red-600 mb-0.5">반려 사유</div>
                      <div className="text-sm text-red-700">{app.reviewNote}</div>
                    </div>
                  )}

                  {/* Actions — only for pending */}
                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(app)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        <CheckCircle size={16} /> 인증 승인
                      </button>
                      <button
                        onClick={() => setRejectTarget(app.photographerId)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <XCircle size={16} /> 반려
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectNote(''); }} title="인증 반려">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">반려 사유</label>
            <div className="space-y-2">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectNote(reason)}
                  className={`w-full text-left px-4 py-2.5 text-sm rounded-lg border transition-colors ${
                    rejectNote === reason
                      ? 'border-navy bg-navy/5 text-navy font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setRejectTarget(null); setRejectNote(''); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              취소
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectNote}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              반려 확인
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          <Bell size={16} />
          {toast.message}
        </div>
      )}
    </div>
  );
}
