import { useState, useMemo } from 'react';
import { Eye, EyeOff, Trash2, MessageSquare, BarChart3, Lock } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { getTeamName } from '../data/mock';

type Tab = 'posts' | 'comments' | 'polls';

export default function CommunityManagePage() {
  const [tab, setTab] = useState<Tab>('posts');
  const { communityPosts, communityComments, polls } = useAdmin();

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare; count: number }[] = [
    { key: 'posts', label: '게시글', icon: MessageSquare, count: communityPosts.length },
    { key: 'comments', label: '댓글', icon: MessageSquare, count: communityComments.length },
    { key: 'polls', label: '투표', icon: BarChart3, count: polls.length },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">커뮤니티 관리</h1>
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === t.key ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              <Icon size={16} /> {t.label} ({t.count})
            </button>
          );
        })}
      </div>
      {tab === 'posts' && <PostsTab />}
      {tab === 'comments' && <CommentsTab />}
      {tab === 'polls' && <PollsTab />}
    </div>
  );
}

function PostsTab() {
  const { communityPosts, blindCommunityPost, unblindCommunityPost, deleteCommunityPost } = useAdmin();
  const [filter, setFilter] = useState<'all' | 'blinded' | 'trending'>('all');

  const filtered = useMemo(() => {
    if (filter === 'blinded') return communityPosts.filter((p) => p.is_blinded);
    if (filter === 'trending') return communityPosts.filter((p) => p.is_trending);
    return communityPosts;
  }, [communityPosts, filter]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all', 'blinded', 'trending'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filter === f ? 'bg-navy/10 text-navy' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {f === 'all' ? '전체' : f === 'blinded' ? '블라인드' : '트렌딩'}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">제목</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">작성자</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">팀</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">반응</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">작성일</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((post) => (
              <tr key={post.id} className={`hover:bg-gray-50/50 ${post.is_blinded ? 'opacity-60' : ''}`}>
                <td className="px-6 py-3">
                  <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                  <div className="text-xs text-gray-500 line-clamp-1">{post.content}</div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">{post.user_name}</td>
                <td className="px-6 py-3">
                  {post.team_id ? (
                    <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full">{getTeamName(post.team_id)}</span>
                  ) : <span className="text-xs text-gray-400">전체</span>}
                </td>
                <td className="px-6 py-3 text-xs text-gray-500">
                  ♥{post.like_count} 💬{post.comment_count} 👁{post.view_count}
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-1">
                    {post.is_blinded && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">블라인드</span>}
                    {post.is_trending && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">트렌딩</span>}
                    {post.has_poll && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">투표</span>}
                    {post.is_edited && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">수정됨</span>}
                  </div>
                </td>
                <td className="px-6 py-3 text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString('ko-KR')}</td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {post.is_blinded ? (
                      <button onClick={() => unblindCommunityPost(post.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded" title="블라인드 해제">
                        <Eye size={14} />
                      </button>
                    ) : (
                      <button onClick={() => blindCommunityPost(post.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded" title="블라인드">
                        <EyeOff size={14} />
                      </button>
                    )}
                    <button onClick={() => deleteCommunityPost(post.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="삭제">
                      <Trash2 size={14} />
                    </button>
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

function CommentsTab() {
  const { communityComments, blindComment, unblindComment, deleteComment } = useAdmin();
  const [filter, setFilter] = useState<'all' | 'blinded'>('all');

  const filtered = useMemo(() => {
    if (filter === 'blinded') return communityComments.filter((c) => c.is_blinded);
    return communityComments.filter((c) => !c.is_deleted);
  }, [communityComments, filter]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filter === 'all' ? 'bg-navy/10 text-navy' : 'bg-gray-100 text-gray-500'}`}>전체</button>
        <button onClick={() => setFilter('blinded')} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filter === 'blinded' ? 'bg-navy/10 text-navy' : 'bg-gray-100 text-gray-500'}`}>블라인드</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">내용</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">작성자</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">게시글 ID</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">유형</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">좋아요</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((c) => (
              <tr key={c.id} className={`hover:bg-gray-50/50 ${c.is_blinded ? 'opacity-60' : ''}`}>
                <td className="px-6 py-3 text-sm text-gray-900 max-w-xs truncate">{c.content}</td>
                <td className="px-6 py-3 text-sm text-gray-700">{c.user_name}</td>
                <td className="px-6 py-3 text-xs font-mono text-gray-500">{c.post_id}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.parent_comment_id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.parent_comment_id ? '대댓글' : '댓글'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">{c.like_count}</td>
                <td className="px-6 py-3">
                  {c.is_blinded && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">블라인드</span>}
                  {c.is_edited && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-1">수정됨</span>}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {c.is_blinded ? (
                      <button onClick={() => unblindComment(c.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded"><Eye size={14} /></button>
                    ) : (
                      <button onClick={() => blindComment(c.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded"><EyeOff size={14} /></button>
                    )}
                    <button onClick={() => deleteComment(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
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

function PollsTab() {
  const { polls, closePoll } = useAdmin();

  return (
    <div className="space-y-4">
      {polls.map((poll) => {
        const maxVotes = Math.max(...poll.options.map((o) => o.vote_count), 1);
        return (
          <div key={poll.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">{poll.post_title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  게시글: {poll.post_id} · 총 {poll.total_votes}표 · {poll.allow_multiple ? '복수 선택' : '단일 선택'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {poll.is_closed ? (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">종료됨</span>
                ) : (
                  <>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">진행 중</span>
                    <button onClick={() => closePoll(poll.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                      <Lock size={12} /> 종료
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {poll.options.map((opt) => {
                const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
                return (
                  <div key={opt.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 shrink-0 truncate">{opt.text}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(opt.vote_count / maxVotes) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-16 text-right">{opt.vote_count}표 ({pct}%)</span>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-gray-400">
              마감: {new Date(poll.expires_at).toLocaleString('ko-KR')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
