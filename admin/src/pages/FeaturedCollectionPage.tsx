import { useState } from 'react';
import { Star, FolderOpen, StarOff, Trash2 } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { getTeamName } from '../data/mock';

type Tab = 'featured' | 'collections';

export default function FeaturedCollectionPage() {
  const [tab, setTab] = useState<Tab>('featured');

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">피처 / 컬렉션</h1>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('featured')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'featured' ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Star size={16} /> 추천 게시물
        </button>
        <button onClick={() => setTab('collections')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'collections' ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <FolderOpen size={16} /> 컬렉션
        </button>
      </div>
      {tab === 'featured' && <FeaturedTab />}
      {tab === 'collections' && <CollectionsTab />}
    </div>
  );
}

function FeaturedTab() {
  const { posts, toggleFeatured } = useAdmin();
  const [view, setView] = useState<'featured' | 'all'>('featured');

  const approvedPosts = posts.filter((p) => p.status === 'approved');
  const displayed = view === 'featured' ? approvedPosts.filter((p) => p.is_featured) : approvedPosts;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('featured')}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium ${view === 'featured' ? 'bg-navy/10 text-navy' : 'bg-gray-100 text-gray-500'}`}>
          추천 중 ({approvedPosts.filter((p) => p.is_featured).length})
        </button>
        <button onClick={() => setView('all')}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium ${view === 'all' ? 'bg-navy/10 text-navy' : 'bg-gray-100 text-gray-500'}`}>
          승인 전체 ({approvedPosts.length})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이미지</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">제목</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">포토그래퍼</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">팀</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">추천</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-3">
                  <img src={post.image_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                </td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{post.title}</td>
                <td className="px-6 py-3 text-sm text-gray-700">{post.photographer_name}</td>
                <td className="px-6 py-3">
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full">{getTeamName(post.team_id)}</span>
                </td>
                <td className="px-6 py-3">
                  {post.is_featured ? (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">추천 중</span>
                  ) : (
                    <span className="text-xs text-gray-400">미추천</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => toggleFeatured(post.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ml-auto ${
                      post.is_featured ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}>
                    {post.is_featured ? <><StarOff size={12} /> 해제</> : <><Star size={12} /> 추천</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollectionsTab() {
  const { collections, deleteCollection } = useAdmin();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">컬렉션</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">포토그래퍼</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">게시물 수</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">생성일</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {collections.map((col) => (
            <tr key={col.id} className="hover:bg-gray-50/50">
              <td className="px-6 py-3">
                <span className="text-sm font-medium text-gray-900">{col.emoji} {col.name}</span>
              </td>
              <td className="px-6 py-3 text-sm text-gray-700">{col.photographerName}</td>
              <td className="px-6 py-3 text-sm text-gray-500">{col.postCount}개</td>
              <td className="px-6 py-3 text-xs text-gray-500">{new Date(col.createdAt).toLocaleDateString('ko-KR')}</td>
              <td className="px-6 py-3 text-right">
                <button onClick={() => deleteCollection(col.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
