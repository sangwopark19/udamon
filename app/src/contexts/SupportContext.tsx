import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export const PLATFORM_COMMISSION_RATE = 0.3;
export const MIN_SETTLEMENT_AMOUNT = 10;

export interface GiftItem {
  id: string;
  nameKo: string;
  emoji: string;
  ticketCost: number;
}

export const GIFT_ITEMS: GiftItem[] = [
  { id: 'coffee',      nameKo: '커피',        emoji: '☕', ticketCost: 2  },
  { id: 'hotdog',      nameKo: '핫도그',      emoji: '🌭', ticketCost: 5  },
  { id: 'beer',        nameKo: '맥주',        emoji: '🍺', ticketCost: 7  },
  { id: 'signed_ball', nameKo: '사인볼',      emoji: '⚾', ticketCost: 15 },
  { id: 'lens',        nameKo: '카메라 렌즈', emoji: '📸', ticketCost: 30 },
  { id: 'season_pass', nameKo: '시즌권',      emoji: '🎟️', ticketCost: 50 },
];

export interface SupportRecord {
  id: string;
  fromUserId: string;
  toPhotographerId: string;
  giftId: string;
  ticketAmount: number;
  createdAt: string;
}

export interface SettlementRecord {
  id: string;
  photographerId: string;
  type: 'full' | 'partial';
  amount: number;
  commission: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed';
  requestedAt: string;
}

interface SupportContextValue {
  supports: SupportRecord[];
  settlements: SettlementRecord[];
  addSupport: (record: Omit<SupportRecord, 'id' | 'createdAt'>) => void;
  getPhotographerSupports: (photographerId: string) => SupportRecord[];
  getSupporterCount: (photographerId: string) => number;
  getTotalEarned: (photographerId: string) => number;
  getWeeklyEarned: (photographerId: string) => number;
  getMonthlyEarned: (photographerId: string) => number;
  getSettleableAmount: (photographerId: string) => number;
  requestSettlement: (photographerId: string, amount: number) => boolean;
  getSettlements: (photographerId: string) => SettlementRecord[];
  getUserSupports: (userId: string) => SupportRecord[];
}

const SupportContext = createContext<SupportContextValue | null>(null);

export function SupportProvider({ children }: { children: ReactNode }) {
  const [supports, setSupports] = useState<SupportRecord[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);

  const addSupport = useCallback((record: Omit<SupportRecord, 'id' | 'createdAt'>) => {
    const newRecord: SupportRecord = {
      ...record,
      id: `sup_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSupports((prev) => [newRecord, ...prev]);
  }, []);

  const getPhotographerSupports = useCallback(
    (photographerId: string) => supports.filter((s) => s.toPhotographerId === photographerId),
    [supports],
  );

  const getSupporterCount = useCallback(
    (photographerId: string) => {
      const unique = new Set(supports.filter((s) => s.toPhotographerId === photographerId).map((s) => s.fromUserId));
      return unique.size;
    },
    [supports],
  );

  const getTotalEarned = useCallback(
    (photographerId: string) =>
      supports.filter((s) => s.toPhotographerId === photographerId).reduce((sum, s) => sum + s.ticketAmount, 0),
    [supports],
  );

  const getWeeklyEarned = useCallback(
    (photographerId: string) => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      return supports
        .filter((s) => s.toPhotographerId === photographerId && new Date(s.createdAt) >= monday)
        .reduce((sum, s) => sum + s.ticketAmount, 0);
    },
    [supports],
  );

  const getMonthlyEarned = useCallback(
    (photographerId: string) => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return supports
        .filter((s) => s.toPhotographerId === photographerId && new Date(s.createdAt) >= firstDay)
        .reduce((sum, s) => sum + s.ticketAmount, 0);
    },
    [supports],
  );

  const getSettleableAmount = useCallback(
    (photographerId: string) => {
      const total = getTotalEarned(photographerId);
      const settled = settlements
        .filter((s) => s.photographerId === photographerId && s.status !== 'pending')
        .reduce((sum, s) => sum + s.amount, 0);
      return total - settled;
    },
    [getTotalEarned, settlements],
  );

  const requestSettlement = useCallback(
    (photographerId: string, amount: number): boolean => {
      const available = getSettleableAmount(photographerId);
      if (amount < MIN_SETTLEMENT_AMOUNT || amount > available) return false;
      const commission = Math.round(amount * PLATFORM_COMMISSION_RATE);
      const newSettlement: SettlementRecord = {
        id: `stl_${Date.now()}`,
        photographerId,
        type: amount === available ? 'full' : 'partial',
        amount,
        commission,
        netAmount: amount - commission,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };
      setSettlements((prev) => [newSettlement, ...prev]);
      return true;
    },
    [getSettleableAmount],
  );

  const getSettlements = useCallback(
    (photographerId: string) => settlements.filter((s) => s.photographerId === photographerId),
    [settlements],
  );

  const getUserSupports = useCallback(
    (userId: string) => supports.filter((s) => s.fromUserId === userId),
    [supports],
  );

  const value = useMemo<SupportContextValue>(() => ({
    supports,
    settlements,
    addSupport,
    getPhotographerSupports,
    getSupporterCount,
    getTotalEarned,
    getWeeklyEarned,
    getMonthlyEarned,
    getSettleableAmount,
    requestSettlement,
    getSettlements,
    getUserSupports,
  }), [supports, settlements, addSupport, getPhotographerSupports, getSupporterCount, getTotalEarned, getWeeklyEarned, getMonthlyEarned, getSettleableAmount, requestSettlement, getSettlements, getUserSupports]);

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used inside SupportProvider');
  return ctx;
}
