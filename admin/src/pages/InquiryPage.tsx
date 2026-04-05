import { useState, useMemo } from 'react';
import { Send, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { INQUIRY_CATEGORY_LABELS } from '../data/mock';
import Modal from '../components/Modal';
import type { Inquiry } from '../types';

type StatusFilter = 'all' | 'open' | 'replied' | 'closed';

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  open: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  replied: { text: '답변 완료', cls: 'bg-blue-100 text-blue-700' },
  closed: { text: '종료', cls: 'bg-gray-100 text-gray-500' },
};

export default function InquiryPage() {
  const { inquiries, replyInquiry, closeInquiry } = useAdmin();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'all') return inquiries;
    return inquiries.filter((i) => i.status === filter);
  }, [inquiries, filter]);

  const counts = useMemo(() => ({
    all: inquiries.length,
    open: inquiries.filter((i) => i.status === 'open').length,
    replied: inquiries.filter((i) => i.status === 'replied').length,
    closed: inquiries.filter((i) => i.status === 'closed').length,
  }), [inquiries]);

  const handleReply = () => {
    if (selectedInquiry && replyText.trim()) {
      replyInquiry(selectedInquiry.id, replyText.trim());
      setSelectedInquiry(null);
      setReplyText('');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">문의 관리</h1>

      <div className="flex gap-2 mb-6">
        {(['all', 'open', 'replied', 'closed'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${filter === f ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {f === 'all' ? '전체' : STATUS_BADGE[f].text} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((inq) => {
          const badge = STATUS_BADGE[inq.status];
          return (
            <div key={inq.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{INQUIRY_CATEGORY_LABELS[inq.category]}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-2">{inq.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{inq.content}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    {inq.userName} · {new Date(inq.createdAt).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>

              {inq.reply && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">관리자 답변</div>
                  <p className="text-sm text-blue-900">{inq.reply}</p>
                  {inq.repliedAt && <div className="text-xs text-blue-400 mt-1">{new Date(inq.repliedAt).toLocaleString('ko-KR')}</div>}
                </div>
              )}

              <div className="flex gap-2">
                {inq.status === 'open' && (
                  <button onClick={() => { setSelectedInquiry(inq); setReplyText(''); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy/90">
                    <MessageCircle size={12} /> 답변하기
                  </button>
                )}
                {inq.status === 'replied' && (
                  <button onClick={() => closeInquiry(inq.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">
                    <CheckCircle size={12} /> 종료
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!selectedInquiry} onClose={() => setSelectedInquiry(null)} title="문의 답변">
        {selectedInquiry && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">{selectedInquiry.userName}의 문의</div>
              <div className="text-sm font-medium text-gray-900">{selectedInquiry.title}</div>
              <p className="text-sm text-gray-600 mt-1">{selectedInquiry.content}</p>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              rows={4}
              placeholder="답변을 입력하세요"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelectedInquiry(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">취소</button>
              <button onClick={handleReply} disabled={!replyText.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 disabled:opacity-40">
                <Send size={14} /> 답변 발송
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
