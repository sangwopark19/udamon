import { useState } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { REASON_LABELS, RESOLUTION_LABELS } from '../data/mock';
import type { ReportResolution } from '../types';

export default function ReportPage() {
  const { reports, pendingReports, resolveReport } = useAdmin();
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending');

  const displayed = tab === 'pending' ? pendingReports : reports.filter((r) => r.status === 'resolved');

  const handleResolve = (reportIndex: number, resolution: ReportResolution) => {
    // Find the actual index in the full reports array
    const pending = reports.map((r, i) => ({ ...r, _idx: i })).filter((r) => r.status === 'pending');
    const actual = pending[reportIndex]?._idx;
    if (actual !== undefined) {
      resolveReport(actual, resolution);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        신고 관리 <span className="text-navy/50 font-normal">({pendingReports.length})</span>
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            tab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          미처리 ({pendingReports.length})
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            tab === 'resolved' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          처리 완료
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShieldCheck size={48} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {tab === 'pending' ? '미처리 신고가 없습니다' : '처리 완료된 신고가 없습니다'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">대상</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">사유</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상세</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">신고일</th>
                {tab === 'pending' ? (
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">처리</th>
                ) : (
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">결과</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((report, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium bg-navy/10 text-navy px-2 py-1 rounded-full">
                      {report.targetType}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                    {report.detail || '-'}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  {tab === 'pending' ? (
                    <td className="px-6 py-3 text-right">
                      <select
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleResolve(idx, e.target.value as ReportResolution);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="" disabled>처리하기</option>
                        <option value="delete_content">콘텐츠 삭제</option>
                        <option value="warn_user">경고 발송</option>
                        <option value="suspend_user">유저 정지</option>
                        <option value="dismiss">무시</option>
                      </select>
                    </td>
                  ) : (
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full">
                        {RESOLUTION_LABELS[report.resolution ?? ''] ?? report.resolution}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
