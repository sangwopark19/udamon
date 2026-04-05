import { useState } from 'react';
import { Calendar, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { EVENT_TYPE_LABELS, KBO_TEAMS } from '../data/mock';
import Modal from '../components/Modal';
import type { TimelineEvent, EventType } from '../types';

const getTeamName = (teamId: string) => KBO_TEAMS.find((t) => t.id === teamId)?.shortName ?? teamId;

const EMPTY_FORM = {
  title: '',
  eventType: 'regular_season' as EventType,
  teamIds: [] as string[],
  date: '',
  location: '',
  description: '',
  thumbnailUrl: null as string | null,
};

export default function EventManagePage() {
  const { events, createEvent, updateEvent, deleteEvent } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (ev: TimelineEvent) => {
    setEditId(ev.id);
    setForm({
      title: ev.title,
      eventType: ev.eventType,
      teamIds: ev.teamIds,
      date: ev.date,
      location: ev.location,
      description: ev.description,
      thumbnailUrl: ev.thumbnailUrl,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.date) return;
    if (editId) {
      updateEvent(editId, form);
    } else {
      createEvent(form);
    }
    setModalOpen(false);
  };

  const toggleTeam = (teamId: string) => {
    setForm((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  const sorted = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">이벤트 관리</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors">
          <Plus size={16} /> 이벤트 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">일자</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이벤트</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">유형</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">관련 팀</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">장소</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">게시물</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((ev) => (
              <tr key={ev.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar size={14} className="text-gray-400" />
                    {new Date(ev.date).toLocaleDateString('ko-KR')}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="text-sm font-medium text-gray-900">{ev.title}</div>
                  {ev.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ev.description}</div>}
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {EVENT_TYPE_LABELS[ev.eventType]}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-1">
                    {ev.teamIds.map((tid) => (
                      <span key={tid} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{getTeamName(tid)}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={12} /> {ev.location}
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">{ev.postCount}개</td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(ev)} className="p-1.5 text-gray-400 hover:text-navy">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteEvent(ev.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? '이벤트 수정' : '이벤트 등록'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="이벤트 제목"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">유형</label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value as EventType })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">일자</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">장소</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="장소"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              rows={3}
              placeholder="이벤트 설명 (선택)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">관련 팀</label>
            <div className="flex flex-wrap gap-2">
              {KBO_TEAMS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTeam(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    form.teamIds.includes(t.id)
                      ? 'bg-navy text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t.shortName}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.date}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 disabled:opacity-40 transition-colors"
            >
              {editId ? '수정' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
