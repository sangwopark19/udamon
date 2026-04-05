import { useState, useMemo } from 'react';
import { Check, X, Image as ImageIcon, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { getTeamName } from '../data/mock';
import Modal from '../components/Modal';
import type { PhotoPost } from '../types';

type StatusTab = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거부' },
];

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  approved: { text: '승인', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { text: '거부', cls: 'bg-red-100 text-red-700' },
};

export default function PostReviewPage() {
  const { posts, approvePost, rejectPost } = useAdmin();
  const [tab, setTab] = useState<StatusTab>('all');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailPost, setDetailPost] = useState<PhotoPost | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const filteredPosts = useMemo(() => {
    if (tab === 'all') return posts;
    return posts.filter((p) => p.status === tab);
  }, [posts, tab]);

  const tabCounts = useMemo(() => ({
    all: posts.length,
    pending: posts.filter((p) => p.status === 'pending').length,
    approved: posts.filter((p) => p.status === 'approved').length,
    rejected: posts.filter((p) => p.status === 'rejected').length,
  }), [posts]);

  const handleReject = () => {
    if (rejectTarget && rejectReason.trim()) {
      rejectPost(rejectTarget, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const openDetail = (post: PhotoPost) => {
    setDetailPost(post);
    setGalleryIdx(0);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">게시물 심사</h1>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === t.key
                ? 'bg-navy text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label} ({tabCounts[t.key]})
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ImageIcon size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">게시물이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이미지</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">제목</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">포토그래퍼</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">팀</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">업로드일</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPosts.map((post) => {
                const badge = STATUS_BADGE[post.status];
                return (
                  <tr key={post.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openDetail(post)}>
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        {post.image_urls.slice(0, 2).map((url, i) => (
                          <img key={i} src={url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ))}
                        {post.image_urls.length > 2 && (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                            +{post.image_urls.length - 2}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-sm text-gray-900">{post.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{post.description}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{post.photographer_name}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full">
                        {getTeamName(post.team_id)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetail(post)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Eye size={14} /> 상세
                        </button>
                        {post.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approvePost(post.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                              <Check size={14} /> 승인
                            </button>
                            <button
                              onClick={() => setRejectTarget(post.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
                            >
                              <X size={14} /> 거부
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailPost} onClose={() => setDetailPost(null)} title="게시물 상세" maxWidth="max-w-2xl">
        {detailPost && (
          <div className="space-y-6">
            {/* Image Gallery */}
            <div className="relative">
              <img
                src={detailPost.image_urls[galleryIdx]}
                alt=""
                className="w-full h-64 object-cover rounded-xl"
              />
              {detailPost.image_urls.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIdx((i) => (i > 0 ? i - 1 : detailPost.image_urls.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setGalleryIdx((i) => (i < detailPost.image_urls.length - 1 ? i + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {galleryIdx + 1} / {detailPost.image_urls.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {detailPost.image_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {detailPost.image_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className={`w-16 h-16 rounded-lg object-cover cursor-pointer shrink-0 ${
                      i === galleryIdx ? 'ring-2 ring-navy' : 'opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setGalleryIdx(i)}
                  />
                ))}
              </div>
            )}

            {/* Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[detailPost.status].cls}`}>
                  {STATUS_BADGE[detailPost.status].text}
                </span>
                <span className="text-xs text-gray-400">ID: {detailPost.id}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{detailPost.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{detailPost.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">포토그래퍼</div>
                  <div className="font-medium text-gray-900">{detailPost.photographer_name}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">팀</div>
                  <div className="font-medium text-gray-900">{getTeamName(detailPost.team_id)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">업로드일</div>
                  <div className="font-medium text-gray-900">{new Date(detailPost.created_at).toLocaleString('ko-KR')}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">이미지 수</div>
                  <div className="font-medium text-gray-900">{detailPost.image_urls.length}장</div>
                </div>
              </div>

              {/* Tags */}
              {detailPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailPost.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Review History */}
              {detailPost.status !== 'pending' && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">심사 이력</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full ${detailPost.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="font-medium text-gray-900">
                        {detailPost.status === 'approved' ? '승인됨' : '거부됨'}
                      </span>
                    </div>
                    {detailPost.reviewed_by && (
                      <div className="text-xs text-gray-500">심사자: {detailPost.reviewed_by}</div>
                    )}
                    {detailPost.reviewed_at && (
                      <div className="text-xs text-gray-500">심사일: {new Date(detailPost.reviewed_at).toLocaleString('ko-KR')}</div>
                    )}
                    {detailPost.reject_reason && (
                      <div className="text-xs text-red-600 mt-1">거부 사유: {detailPost.reject_reason}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions for pending */}
              {detailPost.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { approvePost(detailPost.id); setDetailPost(null); }}
                    className="flex-1 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => { setRejectTarget(detailPost.id); setDetailPost(null); }}
                    className="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    거부
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }} title="게시물 거부">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">거부 사유</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              rows={3}
              placeholder="거부 사유를 입력하세요"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setRejectTarget(null); setRejectReason(''); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              취소
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              거부 확인
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
