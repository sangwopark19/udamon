import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';

export default function DMMonitorPage() {
  const { dmConversations, dismissDMReport } = useAdmin();
  const [filter, setFilter] = useState<'all' | 'reported'>('all');

  const filtered = useMemo(() => {
    if (filter === 'reported') return dmConversations.filter((d) => d.isReported);
    return dmConversations;
  }, [dmConversations, filter]);

  const reportedCount = dmConversations.filter((d) => d.isReported).length;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">DM 모니터링</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          전체 ({dmConversations.length})
        </button>
        <button onClick={() => setFilter('reported')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${filter === 'reported' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          신고됨 ({reportedCount})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">참여자</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">마지막 메시지</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">메시지 수</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">최근 활동</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((dm) => (
              <tr key={dm.id} className={`hover:bg-gray-50/50 ${dm.isReported ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-3">
                  <div className="text-sm font-medium text-gray-900">{dm.user1Name}</div>
                  <div className="text-xs text-gray-500">↔ {dm.user2Name}</div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{dm.lastMessage}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MessageSquare size={12} /> {dm.messageCount}
                  </div>
                </td>
                <td className="px-6 py-3 text-xs text-gray-500">{new Date(dm.lastMessageAt).toLocaleString('ko-KR')}</td>
                <td className="px-6 py-3">
                  {dm.isReported ? (
                    <div>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                        <AlertTriangle size={10} /> 신고됨
                      </span>
                      {dm.reportReason && <div className="text-xs text-red-500 mt-1">{dm.reportReason}</div>}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">정상</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  {dm.isReported && (
                    <button onClick={() => dismissDMReport(dm.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-200 ml-auto">
                      <CheckCircle size={12} /> 신고 해제
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
