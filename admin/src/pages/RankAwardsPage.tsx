import { useState } from 'react';
import { Trophy, Star, Trash2 } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import Modal from '../components/Modal';

type Tab = 'ranks' | 'awards';

export default function RankAwardsPage() {
  const [tab, setTab] = useState<Tab>('ranks');

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">랭크 / 어워드</h1>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('ranks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'ranks' ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Star size={16} /> 랭크 설정
        </button>
        <button onClick={() => setTab('awards')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'awards' ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Trophy size={16} /> 어워드 관리
        </button>
      </div>
      {tab === 'ranks' && <RanksTab />}
      {tab === 'awards' && <AwardsTab />}
    </div>
  );
}

function RanksTab() {
  const { rankTiers, updateRankTier } = useAdmin();
  const [editing, setEditing] = useState<Record<string, number>>({});

  const handleSave = (id: string) => {
    if (editing[id] !== undefined) {
      updateRankTier(id, editing[id]);
      setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
      <p className="text-sm text-gray-500 mb-4">포토그래퍼 랭크 등급별 최소 점수를 설정합니다. 점수 = 게시물수 + 팔로워수/10</p>
      {rankTiers.map((tier) => {
        const isEditing = editing[tier.id] !== undefined;
        return (
          <div key={tier.id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
            <span className="text-2xl">{tier.emoji}</span>
            <div className="flex-1">
              <div className="font-bold text-gray-900">{tier.nameKo}</div>
              <div className="text-xs text-gray-500">ID: {tier.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={isEditing ? editing[tier.id] : tier.minScore}
                onChange={(e) => setEditing({ ...editing, [tier.id]: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
              <span className="text-xs text-gray-500">점</span>
              {isEditing && (
                <button onClick={() => handleSave(tier.id)}
                  className="px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy/90">저장</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AwardsTab() {
  const { awardCategories, awards, createAward, deleteAward, followStats } = useAdmin();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ categoryId: '', photographerId: '', month: '' });

  const months = [...new Set(awards.map((a) => a.month))].sort().reverse();

  const handleCreate = () => {
    const pg = followStats.find((f) => f.photographerId === form.photographerId);
    if (form.categoryId && form.photographerId && form.month && pg) {
      createAward(form.categoryId, form.photographerId, pg.photographerName, form.month);
      setShowCreate(false);
      setForm({ categoryId: '', photographerId: '', month: '' });
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90">
          어워드 수여
        </button>
      </div>

      {months.map((month) => {
        const monthAwards = awards.filter((a) => a.month === month);
        return (
          <div key={month} className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">{month}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthAwards.map((award) => {
                const cat = awardCategories.find((c) => c.id === award.categoryId);
                return (
                  <div key={award.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                    <span className="text-2xl">{cat?.emoji}</span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">{cat?.nameKo}</div>
                      <div className="text-sm font-bold text-gray-900">{award.photographerName}</div>
                    </div>
                    <button onClick={() => deleteAward(award.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="어워드 수여">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              {awardCategories.map((cat) => (
                <button key={cat.id} onClick={() => setForm({ ...form, categoryId: cat.id })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${form.categoryId === cat.id ? 'border-navy bg-navy/5 text-navy font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {cat.emoji} {cat.nameKo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">포토그래퍼</label>
            <select value={form.photographerId} onChange={(e) => setForm({ ...form, photographerId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
              <option value="">선택</option>
              {followStats.map((pg) => (
                <option key={pg.photographerId} value={pg.photographerId}>{pg.photographerName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">월</label>
            <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">취소</button>
            <button onClick={handleCreate} disabled={!form.categoryId || !form.photographerId || !form.month}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 disabled:opacity-40">수여</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
