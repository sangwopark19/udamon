import { useState } from 'react';
import { Plus, Trash2, Pin, Megaphone } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import type { AnnouncementType } from '../types';
import Modal from '../components/Modal';

const TYPE_CONFIG: Record<AnnouncementType, { label: string; color: string }> = {
  notice: { label: '공지', color: 'bg-blue-100 text-blue-700' },
  event: { label: '이벤트', color: 'bg-emerald-100 text-emerald-700' },
  maintenance: { label: '점검', color: 'bg-amber-100 text-amber-700' },
};

export default function AnnouncementPage() {
  const { announcements, createAnnouncement, deleteAnnouncement } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('notice');
  const [isPinned, setIsPinned] = useState(false);

  const handleCreate = () => {
    if (!title.trim() || !body.trim()) return;
    createAnnouncement(title.trim(), body.trim(), type, isPinned);
    setTitle('');
    setBody('');
    setType('notice');
    setIsPinned(false);
    setShowForm(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setTitle('');
    setBody('');
    setType('notice');
    setIsPinned(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">공지사항</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition-colors"
        >
          <Plus size={16} /> 새 공지
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Megaphone size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">공지사항이 없습니다</p>
          <button onClick={() => setShowForm(true)} className="text-navy text-sm font-medium mt-2">
            새 공지 작성
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">유형</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">제목</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">고정</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">작성일</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {announcements.map((ann) => {
                const cfg = TYPE_CONFIG[ann.type];
                return (
                  <tr key={ann.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-gray-900">{ann.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ann.body}</div>
                    </td>
                    <td className="px-6 py-3">
                      {ann.isPinned && <Pin size={14} className="text-amber-500" />}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(ann.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => deleteAnnouncement(ann.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={12} /> 삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={resetForm} title="새 공지 작성">
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
            <div className="flex gap-2">
              {(['notice', 'event', 'maintenance'] as AnnouncementType[]).map((t) => {
                const cfg = TYPE_CONFIG[t];
                const selected = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      selected
                        ? 'border-navy bg-navy/5 text-navy font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="공지 제목"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">내용</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              rows={4}
              placeholder="공지 내용"
              maxLength={500}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span className="text-sm text-gray-700">상단 고정</span>
          </label>

          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !body.trim()}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light disabled:opacity-40 transition-colors"
            >
              공지 등록
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
