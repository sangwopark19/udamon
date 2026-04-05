import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { POSITION_LABELS, getTeamName } from '../data/mock';
import type { Player, PlayerPosition } from '../types';
import Modal from '../components/Modal';

const POSITION_COLORS: Record<PlayerPosition, string> = {
  P: 'bg-red-100 text-red-700',
  C: 'bg-blue-100 text-blue-700',
  IF: 'bg-emerald-100 text-emerald-700',
  OF: 'bg-amber-100 text-amber-700',
};

export default function PlayerPage() {
  const { teams, players, createPlayer, updatePlayer, deletePlayer } = useAdmin();

  const [teamFilter, setTeamFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Player | null>(null);

  // Form state
  const [formTeamId, setFormTeamId] = useState('');
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState(0);
  const [formPosition, setFormPosition] = useState<PlayerPosition>('P');
  const [formIsActive, setFormIsActive] = useState(true);

  const filtered = useMemo(() => {
    return players
      .filter((p) => teamFilter === 'all' || p.team_id === teamFilter)
      .filter((p) => positionFilter === 'all' || p.position === positionFilter)
      .filter((p) => !search.trim() || p.name_ko.includes(search.trim()));
  }, [players, teamFilter, positionFilter, search]);

  const resetForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormTeamId('');
    setFormName('');
    setFormNumber(0);
    setFormPosition('P');
    setFormIsActive(true);
  };

  const openCreate = () => {
    resetForm();
    setFormTeamId(teams[0]?.id ?? '');
    setShowForm(true);
  };

  const openEdit = (player: Player) => {
    setEditTarget(player);
    setFormTeamId(player.team_id);
    setFormName(player.name_ko);
    setFormNumber(player.number);
    setFormPosition(player.position);
    setFormIsActive(player.is_active);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formName.trim() || !formTeamId) return;
    if (editTarget) {
      updatePlayer(editTarget.id, {
        team_id: formTeamId,
        name_ko: formName.trim(),
        number: formNumber,
        position: formPosition,
        is_active: formIsActive,
      });
    } else {
      createPlayer({
        team_id: formTeamId,
        name_ko: formName.trim(),
        number: formNumber,
        position: formPosition,
        is_active: formIsActive,
      });
    }
    resetForm();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          선수 관리 <span className="text-navy/50 font-normal">({players.length})</span>
        </h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition-colors"
        >
          <Plus size={16} /> 새 선수 등록
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          <option value="all">전체 포지션</option>
          {(Object.keys(POSITION_LABELS) as PlayerPosition[]).map((pos) => (
            <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 w-full max-w-xs">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm focus:outline-none"
            placeholder="선수 이름 검색"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">등록된 선수가 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">번호</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이름</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">팀</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">포지션</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-sm font-mono text-gray-900 font-semibold">
                    #{player.number}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{player.name_ko}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{getTeamName(player.team_id)}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${POSITION_COLORS[player.position]}`}>
                      {POSITION_LABELS[player.position]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {player.is_active ? (
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">활성</span>
                    ) : (
                      <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">비활성</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        onClick={() => openEdit(player)}
                        className="inline-flex items-center gap-1 text-xs text-navy hover:text-navy-light"
                      >
                        <Pencil size={12} /> 수정
                      </button>
                      <button
                        onClick={() => deletePlayer(player.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={12} /> 삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showForm} onClose={resetForm} title={editTarget ? '선수 정보 수정' : '새 선수 등록'}>
        <div className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">선수명</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="선수 이름"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">등번호</label>
            <input
              type="number"
              value={formNumber}
              onChange={(e) => setFormNumber(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              min={0}
              max={99}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">포지션</label>
            <div className="flex gap-2">
              {(Object.keys(POSITION_LABELS) as PlayerPosition[]).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setFormPosition(pos)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    formPosition === pos
                      ? 'border-navy bg-navy/5 text-navy font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {POSITION_LABELS[pos]}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span className="text-sm text-gray-700">활성 선수</span>
          </label>

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
    </div>
  );
}
