import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Heart } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { getTeamName } from '../data/mock';
import type { Cheerleader } from '../types';
import Modal from '../components/Modal';

export default function CheerleaderPage() {
  const { teams, cheerleaders, createCheerleader, updateCheerleader, deleteCheerleader } = useAdmin();

  const [teamFilter, setTeamFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Cheerleader | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  const filtered = useMemo(() => {
    return cheerleaders.filter((c) => teamFilter === 'all' || c.team_id === teamFilter);
  }, [cheerleaders, teamFilter]);

  const resetForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormName('');
    setFormTeamId('');
    setFormDescription('');
    setFormImageUrl('');
  };

  const openCreate = () => {
    resetForm();
    setFormTeamId(teams[0]?.id ?? '');
    setShowForm(true);
  };

  const openEdit = (c: Cheerleader) => {
    setEditTarget(c);
    setFormName(c.name);
    setFormTeamId(c.team_id);
    setFormDescription(c.description);
    setFormImageUrl(c.image_url);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formName.trim() || !formTeamId) return;
    if (editTarget) {
      updateCheerleader(editTarget.id, {
        name: formName.trim(),
        team_id: formTeamId,
        description: formDescription.trim(),
        image_url: formImageUrl.trim() || `https://picsum.photos/seed/${Date.now()}/300/300`,
      });
    } else {
      createCheerleader({
        name: formName.trim(),
        team_id: formTeamId,
        description: formDescription.trim(),
        image_url: formImageUrl.trim() || `https://picsum.photos/seed/${Date.now()}/300/300`,
      });
    }
    resetForm();
  };

  const teamColor = (teamId: string) => teams.find((t) => t.id === teamId)?.color ?? '#666';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          치어리더 관리 <span className="text-navy/50 font-normal">({cheerleaders.length})</span>
        </h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition-colors"
        >
          <Plus size={16} /> 새 치어리더 등록
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          <option value="all">전체 구단</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.shortName}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Heart size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">등록된 치어리더가 없습니다</p>
          <button onClick={openCreate} className="text-navy text-sm font-medium mt-2">
            새 치어리더 등록
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <img
                src={c.image_url}
                alt={c.name}
                className="w-full aspect-square object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox(c.image_url)}
              />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: teamColor(c.team_id) + '18', color: teamColor(c.team_id) }}
                  >
                    {getTeamName(c.team_id)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-1 text-xs text-navy hover:text-navy-light"
                  >
                    <Pencil size={12} /> 수정
                  </button>
                  <button
                    onClick={() => deleteCheerleader(c.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={12} /> 삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showForm} onClose={resetForm} title={editTarget ? '치어리더 정보 수정' : '새 치어리더 등록'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이름</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="치어리더 이름"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">소속 구단</label>
            <select
              value={formTeamId}
              onChange={(e) => setFormTeamId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.nameKo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">소개</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              rows={3}
              placeholder="치어리더 소개"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이미지 URL</label>
            <input
              type="text"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formName.trim() || !formTeamId}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light disabled:opacity-40 transition-colors"
            >
              {editTarget ? '저장' : '등록'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl" />
        </div>
      )}
    </div>
  );
}
