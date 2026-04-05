import { useState, useMemo } from 'react';
import { Bell, Send, Users, User } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import type { AdminNotifType, AdminNotification } from '../types';
import Modal from '../components/Modal';

type NotifFilter = 'all' | 'auto' | 'manual';

const FILTER_TABS: { id: NotifFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'auto', label: '자동' },
  { id: 'manual', label: '수동' },
];

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  post_approved: { label: '게시물 승인', cls: 'bg-emerald-100 text-emerald-700' },
  post_rejected: { label: '게시물 거부', cls: 'bg-red-100 text-red-700' },
  photographer_approved: { label: '포토그래퍼 승인', cls: 'bg-emerald-100 text-emerald-700' },
  photographer_rejected: { label: '포토그래퍼 반려', cls: 'bg-red-100 text-red-700' },
  sanction_issued: { label: '제재 발급', cls: 'bg-amber-100 text-amber-700' },
  sanction_revoked: { label: '제재 해제', cls: 'bg-blue-100 text-blue-700' },
  announcement: { label: '공지사항', cls: 'bg-blue-100 text-blue-700' },
  app_update: { label: '앱 업데이트', cls: 'bg-purple-100 text-purple-700' },
  system: { label: '시스템', cls: 'bg-gray-100 text-gray-700' },
  custom: { label: '커스텀', cls: 'bg-navy/10 text-navy' },
};

const MANUAL_TYPES: { type: AdminNotifType; label: string }[] = [
  { type: 'app_update', label: '앱 업데이트' },
  { type: 'system', label: '시스템' },
  { type: 'custom', label: '커스텀' },
];

export default function NotificationPage() {
  const { sentNotifications, sendNotification, users } = useAdmin();
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [showSendForm, setShowSendForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Send form state
  const [sendTarget, setSendTarget] = useState<'all' | 'user'>('all');
  const [sendUserId, setSendUserId] = useState('');
  const [sendType, setSendType] = useState<AdminNotifType>('app_update');
  const [sendTitle, setSendTitle] = useState('');
  const [sendBody, setSendBody] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'auto') return sentNotifications.filter((n) => n.isAuto);
    if (filter === 'manual') return sentNotifications.filter((n) => !n.isAuto);
    return sentNotifications;
  }, [sentNotifications, filter]);

  const counts = useMemo(() => ({
    all: sentNotifications.length,
    auto: sentNotifications.filter((n) => n.isAuto).length,
    manual: sentNotifications.filter((n) => !n.isAuto).length,
  }), [sentNotifications]);

  const getTargetLabel = (notif: AdminNotification) => {
    if (notif.target === 'all') return null;
    const user = users.find((u) => u.id === notif.targetUserId);
    return user?.display_name ?? notif.targetUserId ?? '알 수 없음';
  };

  const resetForm = () => {
    setShowSendForm(false);
    setSendTarget('all');
    setSendUserId('');
    setSendType('app_update');
    setSendTitle('');
    setSendBody('');
  };

  const handleSend = () => {
    if (!sendTitle.trim() || !sendBody.trim()) return;
    if (sendTarget === 'user' && !sendUserId) return;
    sendNotification(sendType, sendTarget, sendTarget === 'user' ? sendUserId : null, sendTitle.trim(), sendBody.trim());
    setToast('알림이 발송되���습니다');
    setTimeout(() => setToast(null), 3000);
    resetForm();
  };

  const canSend = sendTitle.trim() && sendBody.trim() && (sendTarget === 'all' || sendUserId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          알림 관리 <span className="text-navy/50 font-normal">({sentNotifications.length})</span>
        </h1>
        <button
          onClick={() => setShowSendForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
        >
          <Send size={16} /> 알림 발송
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.id
                ? 'bg-navy text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${filter === tab.id ? 'text-white/70' : 'text-gray-400'}`}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bell size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">발송된 알림이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">유형</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">제목</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">대상</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">구분</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">발송일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((notif) => {
                const badge = TYPE_BADGE[notif.type] ?? { label: notif.type, cls: 'bg-gray-100 text-gray-600' };
                const targetLabel = getTargetLabel(notif);
                return (
                  <tr key={notif.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{notif.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{notif.body}</div>
                    </td>
                    <td className="px-5 py-3">
                      {notif.target === 'all' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <Users size={10} /> 전체
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          <User size={10} /> {targetLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        notif.isAuto ? 'bg-gray-100 text-gray-600' : 'bg-navy/10 text-navy'
                      }`}>
                        {notif.isAuto ? '자동' : '수동'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Modal */}
      <Modal open={showSendForm} onClose={resetForm} title="알림 발송">
        <div className="space-y-4">
          {/* Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">발송 대상</label>
            <div className="flex gap-2">
              {(['all', 'user'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setSendTarget(t); setSendUserId(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    sendTarget === t
                      ? 'border-navy bg-navy/5 text-navy font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'all' ? <><Users size={14} /> 전체 유저</> : <><User size={14} /> 특정 유저</>}
                </button>
              ))}
            </div>
          </div>

          {/* User select */}
          {sendTarget === 'user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">유저 선택</label>
              <select
                value={sendUserId}
                onChange={(e) => setSendUserId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              >
                <option value="">유저를 선택하세요</option>
                {users.filter((u) => !u.is_admin).map((u) => (
                  <option key={u.id} value={u.id}>{u.display_name} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">알림 유형</label>
            <div className="flex gap-2">
              {MANUAL_TYPES.map((mt) => (
                <button
                  key={mt.type}
                  onClick={() => setSendType(mt.type)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    sendType === mt.type
                      ? 'border-navy bg-navy/5 text-navy font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
            <input
              type="text"
              value={sendTitle}
              onChange={(e) => setSendTitle(e.target.value)}
              maxLength={50}
              placeholder="알림 제목을 입력하세요"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{sendTitle.length}/50</div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
            <textarea
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="알림 내용을 입력하세요"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{sendBody.length}/500</div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              취소
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 disabled:opacity-40 transition-colors"
            >
              발송 확인
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-emerald-500">
          <Bell size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
