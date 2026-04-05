import { useState } from 'react';
import { Pencil, Trophy } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import type { KBOTeam } from '../types';
import Modal from '../components/Modal';

export default function TeamPage() {
  const { teams, updateTeam } = useAdmin();
  const [editTarget, setEditTarget] = useState<KBOTeam | null>(null);

  // Form state
  const [nameKo, setNameKo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [stadium, setStadium] = useState('');
  const [color, setColor] = useState('');
  const [textColor, setTextColor] = useState('');

  const openEdit = (team: KBOTeam) => {
    setEditTarget(team);
    setNameKo(team.nameKo);
    setNameEn(team.nameEn);
    setShortName(team.shortName);
    setCity(team.city);
    setStadium(team.stadium);
    setColor(team.color);
    setTextColor(team.textColor);
  };

  const closeEdit = () => setEditTarget(null);

  const handleSave = () => {
    if (!editTarget) return;
    updateTeam(editTarget.id, { nameKo, nameEn, shortName, city, stadium, color, textColor });
    closeEdit();
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        구단 관리 <span className="text-navy/50 font-normal">({teams.length})</span>
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-2" style={{ backgroundColor: team.color }} />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: team.color, color: team.textColor }}
                >
                  {team.shortName}
                </span>
                <div className="font-semibold text-sm text-gray-900">{team.nameKo}</div>
              </div>
              <div className="text-xs text-gray-500 mb-0.5">{team.nameEn}</div>
              <div className="text-xs text-gray-400">{team.city} · {team.stadium}</div>
              <button
                onClick={() => openEdit(team)}
                className="mt-3 inline-flex items-center gap-1 text-xs text-navy font-medium hover:text-navy-light transition-colors"
              >
                <Pencil size={12} /> 수정
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={closeEdit} title="구단 정보 수정">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">구단명 (한국어)</label>
            <input
              type="text"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">구단명 (영어)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">약칭</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">연고지</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">홈 구장</label>
            <input
              type="text"
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">팀 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">텍스트 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={closeEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
