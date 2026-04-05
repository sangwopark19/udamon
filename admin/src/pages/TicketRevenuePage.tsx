import { useState } from 'react';
import { Coins, Gift, Banknote, ArrowUpDown } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { TICKET_TX_TYPE_LABELS, GIFT_ITEMS, SETTLEMENT_STATUS_LABELS } from '../data/mock';
import StatCard from '../components/StatCard';
import type { SettlementStatus } from '../types';

type Tab = 'transactions' | 'supports' | 'settlements' | 'packages';

export default function TicketRevenuePage() {
  const [tab, setTab] = useState<Tab>('transactions');

  const tabs: { key: Tab; label: string; icon: typeof Coins }[] = [
    { key: 'transactions', label: '티켓 거래', icon: Coins },
    { key: 'supports', label: '후원 현황', icon: Gift },
    { key: 'settlements', label: '정산 관리', icon: Banknote },
    { key: 'packages', label: '티켓 패키지', icon: ArrowUpDown },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">티켓 / 수익 관리</h1>
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === t.key ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'supports' && <SupportsTab />}
      {tab === 'settlements' && <SettlementsTab />}
      {tab === 'packages' && <PackagesTab />}
    </div>
  );
}

function TransactionsTab() {
  const { ticketTransactions } = useAdmin();
  const totalPurchased = ticketTransactions.filter((t) => t.type === 'purchase').reduce((s, t) => s + t.amount, 0);
  const totalGifted = ticketTransactions.filter((t) => t.type === 'gift_sent').reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Coins} label="총 구매 티켓" value={totalPurchased} color="#6366F1" />
        <StatCard icon={Gift} label="총 선물 티켓" value={totalGifted} color="#EC4899" />
        <StatCard icon={ArrowUpDown} label="총 거래 수" value={ticketTransactions.length} color="#1B2A4A" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">유저</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">유형</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">수량</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">설명</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ticketTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{tx.userName}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    tx.type === 'purchase' ? 'bg-emerald-100 text-emerald-700' :
                    tx.type === 'refund' ? 'bg-amber-100 text-amber-700' :
                    tx.type === 'gift_sent' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                  }`}>{TICKET_TX_TYPE_LABELS[tx.type]}</span>
                </td>
                <td className={`px-6 py-3 text-sm font-medium ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{tx.description}</td>
                <td className="px-6 py-3 text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupportsTab() {
  const { supportRecords } = useAdmin();
  const giftMap = Object.fromEntries(GIFT_ITEMS.map((g) => [g.id, g]));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">후원자</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">포토그래퍼</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">선물</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">티켓</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">일시</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {supportRecords.map((s) => {
            const gift = giftMap[s.giftId];
            return (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{s.fromUserName}</td>
                <td className="px-6 py-3 text-sm text-gray-700">{s.toPhotographerName}</td>
                <td className="px-6 py-3 text-sm">{gift?.emoji} {gift?.nameKo ?? s.giftId}</td>
                <td className="px-6 py-3 text-sm font-medium text-pink-600">{s.ticketAmount} 티켓</td>
                <td className="px-6 py-3 text-xs text-gray-500">{new Date(s.createdAt).toLocaleString('ko-KR')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SettlementsTab() {
  const { settlements, updateSettlementStatus } = useAdmin();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">포토그래퍼</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">금액</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">수수료(30%)</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">정산액</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">신청일</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {settlements.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50/50">
              <td className="px-6 py-3 text-sm font-medium text-gray-900">{s.photographerName}</td>
              <td className="px-6 py-3 text-sm text-gray-700">{s.amount} 티켓</td>
              <td className="px-6 py-3 text-sm text-red-500">-{s.commission}</td>
              <td className="px-6 py-3 text-sm font-bold text-emerald-600">{s.netAmount} 티켓</td>
              <td className="px-6 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  s.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  s.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>{SETTLEMENT_STATUS_LABELS[s.status]}</span>
              </td>
              <td className="px-6 py-3 text-xs text-gray-500">{new Date(s.requestedAt).toLocaleDateString('ko-KR')}</td>
              <td className="px-6 py-3 text-right">
                {s.status === 'pending' && (
                  <button onClick={() => updateSettlementStatus(s.id, 'processing' as SettlementStatus)}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200">처리 시작</button>
                )}
                {s.status === 'processing' && (
                  <button onClick={() => updateSettlementStatus(s.id, 'completed' as SettlementStatus)}
                    className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-200">완료</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PackagesTab() {
  const { ticketPackages, toggleTicketPackage } = useAdmin();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ticketPackages.map((pkg) => (
        <div key={pkg.id} className={`bg-white rounded-xl border border-gray-200 p-5 space-y-3 ${!pkg.isActive ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{pkg.name}</h3>
            <button onClick={() => toggleTicketPackage(pkg.id)}
              className={`relative w-10 h-5 rounded-full transition-colors ${pkg.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${pkg.isActive ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500">티켓</div>
              <div className="font-bold text-navy">{pkg.ticketAmount}개</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500">가격</div>
              <div className="font-bold text-gray-900">₩{pkg.price.toLocaleString()}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
