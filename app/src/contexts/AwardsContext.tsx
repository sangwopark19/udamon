import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { usePhotographer } from './PhotographerContext';

export interface AwardCategory {
  id: string;
  nameKo: string;
  emoji: string;
}

export const AWARD_CATEGORIES: AwardCategory[] = [
  { id: 'fans_pick',    nameKo: '팬즈 픽',     emoji: '🏅' },
  { id: 'rising_star',  nameKo: '라이징 스타',  emoji: '🌟' },
  { id: 'most_loved',   nameKo: '모스트 러브드', emoji: '❤️' },
  { id: 'best_shot',    nameKo: '베스트 샷',    emoji: '📸' },
  { id: 'team_spirit',  nameKo: '팀 스피릿',   emoji: '⚾' },
];

export interface AwardRecord {
  id: string;
  categoryId: string;
  photographerId: string;
  photographerName: string;
  photographerAvatar?: string;
  month: string; // YYYY-MM
}

interface AwardsContextValue {
  awards: AwardRecord[];
  getCurrentMonthAwards: () => AwardRecord[];
  getAwardsForPhotographer: (photographerId: string) => AwardRecord[];
}

const AwardsContext = createContext<AwardsContextValue | null>(null);

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function AwardsProvider({ children }: { children: ReactNode }) {
  const { photographers } = usePhotographer();

  // Generate mock awards from current photographers
  const awards = useMemo<AwardRecord[]>(() => {
    if (photographers.length === 0) return [];

    const month = getCurrentMonth();
    const sorted = [...photographers].sort((a, b) => b.follower_count - a.follower_count);

    return AWARD_CATEGORIES.map((cat, i) => {
      const pg = sorted[i % sorted.length];
      return {
        id: `award_${month}_${cat.id}`,
        categoryId: cat.id,
        photographerId: pg.id,
        photographerName: pg.display_name,
        photographerAvatar: pg.avatar_url ?? undefined,
        month,
      };
    });
  }, [photographers]);

  const getCurrentMonthAwards = useCallback(() => {
    const month = getCurrentMonth();
    return awards.filter((a) => a.month === month);
  }, [awards]);

  const getAwardsForPhotographer = useCallback(
    (photographerId: string) => awards.filter((a) => a.photographerId === photographerId),
    [awards],
  );

  const value = useMemo<AwardsContextValue>(() => ({
    awards,
    getCurrentMonthAwards,
    getAwardsForPhotographer,
  }), [awards, getCurrentMonthAwards, getAwardsForPhotographer]);

  return <AwardsContext.Provider value={value}>{children}</AwardsContext.Provider>;
}

export function useAwards() {
  const ctx = useContext(AwardsContext);
  if (!ctx) throw new Error('useAwards must be used inside AwardsProvider');
  return ctx;
}
