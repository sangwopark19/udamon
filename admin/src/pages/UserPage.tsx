import { useState, useMemo } from 'react';
import { Search, Shield, XCircle, Eye, CheckCircle, X as XIcon } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { SANCTION_LABELS, LOGIN_PROVIDER_LABELS } from '../data/mock';
import type { SanctionType, UserProfile } from '../types';
import Modal from '../components/Modal';

const SANCTION_OPTIONS: { type: SanctionType; label: string }[] = [
  { type: 'warning', label: '경고' },
  { type: 'suspend_7d', label: '7일 정지' },
  { type: 'suspend_30d', label: '30일 정지' },
  { type: 'permanent_ban', label: '영구정지' },
];

export default function UserPage() {
  const { users, sanctions, sanctionUser, revokeSanction } = useAdmin();
  const [search, setSearch] = useState('');
  const [marketingOnly, setMarketingOnly] = useState(false);
  const [sanctionTarget, setSanctionTarget] = useState<{ id: string; name: string } | null>(null);
  const [sanctionType, setSanctionType] = useState<SanctionType>('warning');
  const [sanctionReason, setSanctionReason] = useState('');
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (marketingOnly) {
      list = list.filter((u) => u.consents.marketing.agreed);
    }
    return list;
  }, [users, search, marketingOnly]);

  const activeSanctions = sanctions.filter((s) => s.isActive);

  const handleSanction = () => {
    if (sanctionTarget && sanctionReason.trim()) {
      sanctionUser(sanctionTarget.id, sanctionType, sanctionReason.trim());
      setSanctionTarget(null);
      setSanctionReason('');
      setSanctionType('warning');
    }
  };

  const getUserName = (userId: string) => users.find((u) => u.id === userId)?.display_name ?? userId;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">유저 관리</h1>

      {/* Search + Marketing Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm focus:outline-none"
            placeholder="이름 또는 이메일로 검색"
          />
        </div>
        <button
          onClick={() => setMarketingOnly(!marketingOnly)}
          className={`px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${
            marketingOnly
              ? 'bg-navy text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          마케팅 동의만
        </button>
      </div>

      {/* Active Sanctions */}
      {activeSanctions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-red-500 mb-3">활성 제재 ({activeSanctions.length})</h2>
          <div className="space-y-2">
            {activeSanctions.map((s) => (
              <div key={s.id} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-700">{SANCTION_LABELS[s.type]}</div>
                  <div className="text-xs text-gray-500">{getUserName(s.userId)} · {s.reason}</div>
                </div>
                <button
                  onClick={() => revokeSanction(s.id)}
                  className="text-xs font-medium text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  해제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이름</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이메일</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">로그인</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">유형</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">게시물</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">제재</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((user) => {
              const userSanctions = sanctions.filter((s) => s.userId === user.id && s.isActive);
              return (
                <tr key={user.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setDetailUser(user)}>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{user.display_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {LOGIN_PROVIDER_LABELS[user.login_provider]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {user.is_admin ? (
                      <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">관리자</span>
                    ) : user.is_photographer ? (
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">포토그래퍼</span>
                    ) : (
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">일반</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{user.post_count}</td>
                  <td className="px-6 py-3">
                    {userSanctions.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                        <XCircle size={12} /> 제재 중
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">없음</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDetailUser(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Eye size={12} /> 상세
                      </button>
                      {!user.is_admin && (
                        <button
                          onClick={() => setSanctionTarget({ id: user.id, name: user.display_name })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-200 transition-colors"
                        >
                          <Shield size={12} /> 제재
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      <Modal open={!!detailUser} onClose={() => setDetailUser(null)} title="유저 상세" maxWidth="max-w-xl">
        {detailUser && (() => {
          const userSanctions = sanctions.filter((s) => s.userId === detailUser.id);
          return (
            <div className="space-y-5">
              {/* Profile */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center text-navy font-bold text-lg">
                    {detailUser.display_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{detailUser.display_name}</div>
                    <div className="text-sm text-gray-500">{detailUser.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">로그인 방식</div>
                    <div className="font-medium text-gray-900">{LOGIN_PROVIDER_LABELS[detailUser.login_provider]}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">가입일</div>
                    <div className="font-medium text-gray-900">{new Date(detailUser.created_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">유형</div>
                    <div className="font-medium text-gray-900">
                      {detailUser.is_admin ? '관리자' : detailUser.is_photographer ? '포토그래퍼' : '일반 유저'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">게시물 수</div>
                    <div className="font-medium text-gray-900">{detailUser.post_count}개</div>
                  </div>
                </div>

                {/* Photographer info */}
                {detailUser.is_photographer && detailUser.photographer_since && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">포토그래퍼 전환일</div>
                    <div className="font-medium text-blue-900">{new Date(detailUser.photographer_since).toLocaleDateString('ko-KR')}</div>
                  </div>
                )}
              </div>

              {/* Consent History */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">동의 내역</h4>
                <div className="space-y-2">
                  <ConsentRow label="개인정보처리방침" agreed={detailUser.consents.privacy.agreed} date={detailUser.consents.privacy.agreedAt} />
                  <ConsentRow label="이용약관" agreed={detailUser.consents.terms.agreed} date={detailUser.consents.terms.agreedAt} />
                  <ConsentRow label="마케팅 수신 동의" agreed={detailUser.consents.marketing.agreed} date={detailUser.consents.marketing.agreedAt} />
                </div>
              </div>

              {/* Sanction History */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">제재 이력 ({userSanctions.length})</h4>
                {userSanctions.length === 0 ? (
                  <p className="text-xs text-gray-400">제재 이력이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {userSanctions.map((s) => (
                      <div key={s.id} className={`rounded-lg p-3 text-sm ${s.isActive ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            s.isActive ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {SANCTION_LABELS[s.type]}
                          </span>
                          <span className="text-xs text-gray-400">
                            {s.isActive ? '활성' : '해제됨'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{s.reason}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(s.issuedAt).toLocaleString('ko-KR')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Sanction Modal */}
      <Modal
        open={!!sanctionTarget}
        onClose={() => { setSanctionTarget(null); setSanctionReason(''); }}
        title={`${sanctionTarget?.name ?? ''} 제재`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제재 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {SANCTION_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSanctionType(opt.type)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    sanctionType === opt.type
                      ? 'border-navy bg-navy/5 text-navy font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">사유</label>
            <textarea
              value={sanctionReason}
              onChange={(e) => setSanctionReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              rows={2}
              placeholder="제재 사유를 입력하세요"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setSanctionTarget(null); setSanctionReason(''); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              취소
            </button>
            <button
              onClick={handleSanction}
              disabled={!sanctionReason.trim()}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              제재 적용
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ConsentRow({ label, agreed, date }: { label: string; agreed: boolean; date: string | null }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-2">
        {agreed ? (
          <CheckCircle size={16} className="text-emerald-500" />
        ) : (
          <XIcon size={16} className="text-gray-300" />
        )}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-xs text-gray-400">
        {agreed && date ? new Date(date).toLocaleDateString('ko-KR') : agreed ? '동의' : '미동의'}
      </span>
    </div>
  );
}
