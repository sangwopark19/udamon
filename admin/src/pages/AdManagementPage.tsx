import { useState } from 'react';
import { Plus, Pencil, Trash2, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { AD_TYPE_LABELS, AD_POSITION_LABELS } from '../data/mock';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import type { AdType, AdPosition } from '../types';

const AD_TYPE_OPTIONS: AdType[] = ['banner', 'interstitial', 'rewarded_video'];
const AD_POSITION_OPTIONS: AdPosition[] = ['home', 'explore', 'community', 'post_detail', 'photographer_profile'];

export default function AdManagementPage() {
  const { adPlacements, adRevenue, createAdPlacement, updateAdPlacement, toggleAdPlacement, deleteAdPlacement } = useAdmin();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'banner' as AdType,
    adUnitId: '',
    position: 'home' as AdPosition,
    isEnabled: true,
  });

  const openCreate = () => {
    setForm({ name: '', type: 'banner', adUnitId: '', position: 'home', isEnabled: true });
    setShowCreate(true);
    setEditId(null);
  };

  const openEdit = (id: string) => {
    const ad = adPlacements.find((a) => a.id === id);
    if (!ad) return;
    setForm({ name: ad.name, type: ad.type, adUnitId: ad.adUnitId, position: ad.position, isEnabled: ad.isEnabled });
    setEditId(id);
    setShowCreate(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.adUnitId.trim()) return;
    if (editId) {
      updateAdPlacement(editId, form);
    } else {
      createAdPlacement(form);
    }
    setShowCreate(false);
    setEditId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">광고 관리</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
        >
          <Plus size={16} /> 광고 배치 추가
        </button>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={DollarSign} label="오늘 수익" value={`₩${adRevenue.today.toLocaleString()}`} color="#10B981" />
        <StatCard icon={TrendingUp} label="이번 주 수익" value={`₩${adRevenue.thisWeek.toLocaleString()}`} color="#6366F1" />
        <StatCard icon={Calendar} label="이번 달 수익" value={`₩${adRevenue.thisMonth.toLocaleString()}`} color="#F59E0B" />
      </div>

      {/* Placement Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이름</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">유형</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ad Unit ID</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">위치</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {adPlacements.map((ad) => (
              <tr key={ad.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{ad.name}</td>
                <td className="px-6 py-3">
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {AD_TYPE_LABELS[ad.type]}
                  </span>
                </td>
                <td className="px-6 py-3 text-xs font-mono text-gray-500">{ad.adUnitId}</td>
                <td className="px-6 py-3">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {AD_POSITION_LABELS[ad.position]}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => toggleAdPlacement(ad.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${ad.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ad.isEnabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(ad.id)}
                      className="p-1.5 text-gray-400 hover:text-navy transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteAdPlacement(ad.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {adPlacements.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">등록된 광고 배치가 없습니다</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditId(null); }} title={editId ? '광고 배치 수정' : '광고 배치 추가'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이름</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="광고 배치 이름"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">유형</label>
            <div className="grid grid-cols-3 gap-2">
              {AD_TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    form.type === t
                      ? 'border-navy bg-navy/5 text-navy font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {AD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ad Unit ID</label>
            <input
              value={form.adUnitId}
              onChange={(e) => setForm({ ...form, adUnitId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="ca-app-pub-xxxx/xxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">위치</label>
            <div className="grid grid-cols-2 gap-2">
              {AD_POSITION_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, position: p })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    form.position === p
                      ? 'border-navy bg-navy/5 text-navy font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {AD_POSITION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">활성화</span>
            <button
              onClick={() => setForm({ ...form, isEnabled: !form.isEnabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isEnabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => { setShowCreate(false); setEditId(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.adUnitId.trim()}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 disabled:opacity-40 transition-colors"
            >
              {editId ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
