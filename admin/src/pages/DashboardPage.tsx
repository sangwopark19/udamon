import { useNavigate } from 'react-router-dom';
import { Clock, Flag, FileText, Users, Eye, UserPlus, Activity } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAdmin } from '../contexts/AdminContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { stats, visitorStats, auditLogs } = useAdmin();

  const maxDau = Math.max(...visitorStats.dailyTrend.map((d) => d.dau), 1);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Clock}
          label="심사 대기"
          value={stats.pendingReviewCount}
          color="#1B2A4A"
          onClick={() => navigate('/posts')}
        />
        <StatCard
          icon={Flag}
          label="신고 접수"
          value={stats.pendingReportCount}
          color="#EF4444"
          onClick={() => navigate('/reports')}
        />
        <StatCard
          icon={FileText}
          label="총 게시물"
          value={stats.totalPosts}
        />
        <StatCard
          icon={Users}
          label="포토그래퍼"
          value={stats.totalPhotographers}
        />
      </div>

      {/* Visitor Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Eye} label="DAU (일간)" value={stats.dau.toLocaleString()} color="#6366F1" />
        <StatCard icon={Activity} label="WAU (주간)" value={stats.wau.toLocaleString()} color="#8B5CF6" />
        <StatCard icon={Activity} label="MAU (월간)" value={stats.mau.toLocaleString()} color="#A855F7" />
        <StatCard icon={UserPlus} label="오늘 신규 가입" value={stats.todayNewUsers} color="#10B981" />
      </div>

      {/* 7-Day Visitor Trend */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">7일간 방문자 추이</h2>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-end gap-3 h-40">
            {visitorStats.dailyTrend.map((d) => {
              const pct = (d.dau / maxDau) * 100;
              const date = new Date(d.date);
              const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{d.dau.toLocaleString()}</span>
                  <div className="w-full bg-indigo-100 rounded-t-lg relative" style={{ height: `${Math.max(pct, 4)}%` }}>
                    <div className="absolute inset-0 bg-indigo-500 rounded-t-lg" />
                  </div>
                  <span className="text-[10px] text-gray-500">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">최근 관리 이력</h2>
        </div>
        {auditLogs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            관리 이력이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="px-6 py-3 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-navy shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <p className="text-xs text-gray-500 truncate">{log.detail}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
