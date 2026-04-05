import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';

type Tab = 'keywords' | 'follows';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('keywords');

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">분석</h1>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('keywords')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'keywords' ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Search size={16} /> 검색 키워드
        </button>
        <button onClick={() => setTab('follows')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'follows' ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Users size={16} /> 팔로우 현황
        </button>
      </div>
      {tab === 'keywords' && <KeywordsTab />}
      {tab === 'follows' && <FollowsTab />}
    </div>
  );
}

function KeywordsTab() {
  const { searchKeywords } = useAdmin();
  const maxCount = Math.max(...searchKeywords.map((k) => k.count), 1);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp size={14} className="text-emerald-500" />;
    if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">인기 검색어 (최근 7일)</h3>
        </div>
        <div className="p-6 space-y-3">
          {searchKeywords.map((kw, i) => (
            <div key={kw.keyword} className="flex items-center gap-4">
              <span className="w-6 text-right text-sm font-bold text-gray-400">{i + 1}</span>
              <span className="text-sm font-medium text-gray-900 w-32 shrink-0">{kw.keyword}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                <div
                  className="h-full bg-navy rounded-full transition-all"
                  style={{ width: `${(kw.count / maxCount) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-gray-700">
                  {kw.count.toLocaleString()}회
                </span>
              </div>
              <TrendIcon trend={kw.trend} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FollowsTab() {
  const { followStats } = useAdmin();

  const totalFollowers = followStats.reduce((s, f) => s + f.followerCount, 0);
  const maxFollowers = Math.max(...followStats.map((f) => f.followerCount), 1);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">포토그래퍼 수</div>
          <div className="text-2xl font-bold text-gray-900">{followStats.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">전체 팔로워</div>
          <div className="text-2xl font-bold text-gray-900">{totalFollowers.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">평균 팔로워</div>
          <div className="text-2xl font-bold text-gray-900">
            {followStats.length > 0 ? Math.round(totalFollowers / followStats.length).toLocaleString() : 0}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">순위</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">포토그래퍼</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">팔로워</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">팔로잉</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">팔로워 비율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...followStats].sort((a, b) => b.followerCount - a.followerCount).map((fs, i) => (
              <tr key={fs.photographerId} className="hover:bg-gray-50/50">
                <td className="px-6 py-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-200 text-gray-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'text-gray-400'
                  }`}>{i + 1}</span>
                </td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{fs.photographerName}</td>
                <td className="px-6 py-3 text-sm font-bold text-navy">{fs.followerCount.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{fs.followingCount.toLocaleString()}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[120px]">
                      <div className="h-full bg-navy rounded-full" style={{ width: `${(fs.followerCount / maxFollowers) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{Math.round((fs.followerCount / totalFollowers) * 100)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
