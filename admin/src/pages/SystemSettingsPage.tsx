import { useState } from 'react';
import { Users, Globe, Wrench, FileText, BarChart3, Smartphone, Eye, Activity, UserPlus, CheckCircle, X as XIcon, ShieldCheck } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { TERMS_TYPE_LABELS } from '../data/mock';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import type { TermsDocument } from '../types';

type SettingsTab = 'admins' | 'site' | 'maintenance' | 'terms' | 'copyright' | 'visitors' | 'version';

const TABS: { key: SettingsTab; label: string; icon: typeof Users }[] = [
  { key: 'admins', label: '관리자 계정', icon: Users },
  { key: 'site', label: '사이트 설정', icon: Globe },
  { key: 'maintenance', label: '점검 모드', icon: Wrench },
  { key: 'terms', label: '약관 관리', icon: FileText },
  { key: 'copyright', label: '저작권 정책', icon: ShieldCheck },
  { key: 'visitors', label: '방문자 현황', icon: BarChart3 },
  { key: 'version', label: '앱 버전', icon: Smartphone },
];

export default function SystemSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('admins');

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">시스템 설정</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === t.key
                  ? 'bg-navy text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'admins' && <AdminsTab />}
      {tab === 'site' && <SiteTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'terms' && <TermsTab />}
      {tab === 'copyright' && <CopyrightTab />}
      {tab === 'visitors' && <VisitorsTab />}
      {tab === 'version' && <VersionTab />}
    </div>
  );
}

// ─── Admins Tab ───
function AdminsTab() {
  const { users } = useAdmin();
  const admins = users.filter((u) => u.is_admin);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이름</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이메일</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">역할</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">가입일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {admins.map((a) => (
            <tr key={a.id}>
              <td className="px-6 py-3 text-sm font-medium text-gray-900">{a.display_name}</td>
              <td className="px-6 py-3 text-sm text-gray-500">{a.email}</td>
              <td className="px-6 py-3">
                <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {a.admin_role === 'super_admin' ? '최고 관리자' : '모더레이터'}
                </span>
              </td>
              <td className="px-6 py-3 text-sm text-gray-500">{new Date(a.created_at).toLocaleDateString('ko-KR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Site Settings Tab ───
function SiteTab() {
  const { siteSettings, updateSiteSettings } = useAdmin();
  const [form, setForm] = useState(siteSettings);

  const handleSave = () => {
    updateSiteSettings(form);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">사이트명</label>
        <input
          value={form.siteName}
          onChange={(e) => setForm({ ...form, siteName: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">사이트 설명</label>
        <textarea
          value={form.siteDescription}
          onChange={(e) => setForm({ ...form, siteDescription: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">기본 색상</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.primaryColor}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
          />
          <input
            value={form.primaryColor}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">로고 URL</label>
        <input
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>
      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
      >
        저장
      </button>
    </div>
  );
}

// ─── Maintenance Tab ───
function MaintenanceTab() {
  const { maintenance, updateMaintenance } = useAdmin();
  const [form, setForm] = useState(maintenance);

  const handleSave = () => {
    updateMaintenance(form);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">점검 모드</h3>
          <p className="text-xs text-gray-500 mt-0.5">활성화하면 유저에게 점검 화면이 표시됩니다</p>
        </div>
        <button
          onClick={() => setForm({ ...form, isEnabled: !form.isEnabled })}
          className={`relative w-12 h-6 rounded-full transition-colors ${form.isEnabled ? 'bg-red-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isEnabled ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">점검 메시지</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">점검 예정일</label>
          <input
            type="datetime-local"
            value={form.scheduledAt?.slice(0, 16) ?? ''}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">예상 종료일</label>
          <input
            type="datetime-local"
            value={form.estimatedEnd?.slice(0, 16) ?? ''}
            onChange={(e) => setForm({ ...form, estimatedEnd: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
      >
        저장
      </button>
    </div>
  );
}

// ─── Terms Tab ───
function TermsTab() {
  const { termsDocuments, updateTermsDocument } = useAdmin();
  const [editDoc, setEditDoc] = useState<TermsDocument | null>(null);
  const [editForm, setEditForm] = useState({ title: '', body: '', status: '' as 'published' | 'draft', newVersion: '', changeSummary: '' });

  const openEdit = (doc: TermsDocument) => {
    setEditDoc(doc);
    setEditForm({ title: doc.title, body: doc.body, status: doc.status, newVersion: '', changeSummary: '' });
  };

  const handleSave = () => {
    if (!editDoc) return;
    const updates: Partial<TermsDocument> = {
      title: editForm.title,
      body: editForm.body,
      status: editForm.status,
    };
    if (editForm.newVersion.trim() && editForm.changeSummary.trim()) {
      updates.currentVersion = editForm.newVersion.trim();
      updates.versions = [
        { version: editForm.newVersion.trim(), updatedAt: new Date().toISOString(), changeSummary: editForm.changeSummary.trim() },
        ...editDoc.versions,
      ];
    }
    updateTermsDocument(editDoc.id, updates);
    setEditDoc(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {termsDocuments.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-navy" />
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {TERMS_TYPE_LABELS[doc.type]}
              </span>
            </div>
            <h3 className="font-bold text-gray-900">{doc.title}</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <div>버전: <span className="font-medium text-gray-700">{doc.currentVersion}</span></div>
              <div>상태:
                <span className={`ml-1 font-medium ${doc.status === 'published' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {doc.status === 'published' ? '게시됨' : '초안'}
                </span>
              </div>
              <div>최종 수정: {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}</div>
            </div>
            <button
              onClick={() => openEdit(doc)}
              className="w-full py-2 bg-navy/5 text-navy text-sm font-medium rounded-lg hover:bg-navy/10 transition-colors"
            >
              편집
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal open={!!editDoc} onClose={() => setEditDoc(null)} title="약관 편집" maxWidth="max-w-2xl">
        {editDoc && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">제목</label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">본문</label>
              <textarea
                value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                rows={8}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">상태:</label>
              <button
                onClick={() => setEditForm({ ...editForm, status: editForm.status === 'published' ? 'draft' : 'published' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  editForm.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {editForm.status === 'published' ? '게시됨' : '초안'}
              </button>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-bold text-gray-900 mb-3">새 버전 등록 (선택)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">버전 번호</label>
                  <input
                    value={editForm.newVersion}
                    onChange={(e) => setEditForm({ ...editForm, newVersion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="예: 1.2.0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">변경 요약</label>
                  <input
                    value={editForm.changeSummary}
                    onChange={(e) => setEditForm({ ...editForm, changeSummary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="변경 내용 요약"
                  />
                </div>
              </div>
            </div>

            {/* Version History */}
            {editDoc.versions.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">버전 이력</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {editDoc.versions.map((v, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span className="font-mono font-medium text-navy bg-navy/5 px-2 py-0.5 rounded">{v.version}</span>
                      <span className="text-gray-500">{new Date(v.updatedAt).toLocaleDateString('ko-KR')}</span>
                      <span className="text-gray-700 flex-1">{v.changeSummary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditDoc(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── Copyright Tab ───
function CopyrightTab() {
  const [policy, setPolicy] = useState({
    ownershipNotice: '본 플랫폼에 게시된 모든 사진의 저작권은 해당 포토그래퍼에게 있습니다.',
    usagePolicy: '게시된 사진의 무단 복제, 배포, 상업적 사용을 금지합니다. 사진 사용을 원하시면 해당 포토그래퍼에게 직접 문의해주세요.',
    dmcaProcess: '저작권 침해 신고는 앱 내 신고 기능 또는 이메일(copyright@udamonfan.com)로 접수할 수 있습니다. 접수 후 3영업일 이내에 검토 및 조치가 이루어집니다.',
    watermarkEnabled: true,
    downloadProtection: true,
    autoDetection: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Text Policies */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">저작권 고지 문구</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">저작권 안내</label>
          <textarea
            value={policy.ownershipNotice}
            onChange={(e) => setPolicy({ ...policy, ownershipNotice: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">이용 정책</label>
          <textarea
            value={policy.usagePolicy}
            onChange={(e) => setPolicy({ ...policy, usagePolicy: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">침해 신고 절차 (DMCA)</label>
          <textarea
            value={policy.dmcaProcess}
            onChange={(e) => setPolicy({ ...policy, dmcaProcess: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Protection Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">보호 설정</h3>
        {[
          { key: 'watermarkEnabled' as const, label: '워터마크', desc: '업로드 사진에 자동 워터마크 적용' },
          { key: 'downloadProtection' as const, label: '다운로드 보호', desc: '사진 다운로드/스크린샷 방지 기능' },
          { key: 'autoDetection' as const, label: '자동 감지', desc: 'AI 기반 저작권 침해 자동 감지 (베타)' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700">{item.label}</h4>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
            <button
              onClick={() => setPolicy({ ...policy, [item.key]: !policy[item.key] })}
              className={`relative w-12 h-6 rounded-full transition-colors ${policy[item.key] ? 'bg-navy' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${policy[item.key] ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
      >
        {saved ? '✓ 저장 완료' : '저장'}
      </button>
    </div>
  );
}

// ─── Visitors Tab ───
function VisitorsTab() {
  const { visitorStats } = useAdmin();
  const maxDau = Math.max(...visitorStats.dailyTrend.map((d) => d.dau), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Eye} label="DAU (일간)" value={visitorStats.dau.toLocaleString()} color="#6366F1" />
        <StatCard icon={Activity} label="WAU (주간)" value={visitorStats.wau.toLocaleString()} color="#8B5CF6" />
        <StatCard icon={UserPlus} label="MAU (월간)" value={visitorStats.mau.toLocaleString()} color="#A855F7" />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">일별 방문자 추이</h3>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-end gap-3 h-48">
            {visitorStats.dailyTrend.map((d) => {
              const pct = (d.dau / maxDau) * 100;
              const date = new Date(d.date);
              const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{d.dau.toLocaleString()}</span>
                  <div className="w-full rounded-t-lg relative" style={{ height: `${Math.max(pct, 4)}%` }}>
                    <div className="absolute inset-0 bg-indigo-500 rounded-t-lg" />
                  </div>
                  <span className="text-[10px] text-gray-500">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">페이지별 조회수</h3>
        </div>
        <div className="p-6 space-y-3">
          {visitorStats.pageBreakdown.map((p) => (
            <div key={p.page} className="flex items-center gap-4">
              <span className="text-sm text-gray-700 w-28 shrink-0">{p.page}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${p.percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-700">
                  {p.views.toLocaleString()} ({p.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Version Tab ───
function VersionTab() {
  const { appVersion, updateAppVersion, addAppVersion } = useAdmin();
  const [minVer, setMinVer] = useState(appVersion.minimumVersion);
  const [forceUpdate, setForceUpdate] = useState(appVersion.forceUpdate);
  const [newVersion, setNewVersion] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleSaveSettings = () => {
    updateAppVersion({ minimumVersion: minVer, forceUpdate });
  };

  const handleAddVersion = () => {
    if (newVersion.trim() && newNotes.trim()) {
      addAppVersion(newVersion.trim(), newNotes.trim());
      setNewVersion('');
      setNewNotes('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
        <h3 className="text-sm font-bold text-gray-900">앱 버전 설정</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">현재 버전</div>
            <div className="font-bold text-gray-900 font-mono">{appVersion.currentVersion}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">최소 버전</div>
            <input
              value={minVer}
              onChange={(e) => setMinVer(e.target.value)}
              className="font-mono text-sm font-medium text-gray-900 bg-transparent focus:outline-none w-full"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">강제 업데이트</h4>
            <p className="text-xs text-gray-500">최소 버전 미만 유저에게 강제 업데이트</p>
          </div>
          <button
            onClick={() => setForceUpdate(!forceUpdate)}
            className={`relative w-12 h-6 rounded-full transition-colors ${forceUpdate ? 'bg-navy' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${forceUpdate ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
        <button
          onClick={handleSaveSettings}
          className="w-full py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
        >
          설정 저장
        </button>
      </div>

      {/* Add Version */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
        <h3 className="text-sm font-bold text-gray-900">새 버전 등록</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            placeholder="버전 (예: 2.1.0)"
          />
          <input
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            placeholder="릴리즈 노트"
          />
        </div>
        <button
          onClick={handleAddVersion}
          disabled={!newVersion.trim() || !newNotes.trim()}
          className="w-full py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-40 transition-colors"
        >
          버전 등록
        </button>
      </div>

      {/* Version History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">버전 이력</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {appVersion.history.map((v, i) => (
            <div key={i} className="px-6 py-3 flex items-center gap-4">
              <span className="font-mono font-bold text-sm text-navy bg-navy/5 px-3 py-1 rounded-lg">{v.version}</span>
              <span className="text-xs text-gray-400">{new Date(v.releasedAt).toLocaleDateString('ko-KR')}</span>
              <span className="text-sm text-gray-700 flex-1">{v.notes}</span>
              {i === 0 && (
                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">최신</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
