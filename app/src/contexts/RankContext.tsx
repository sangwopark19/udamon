import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { usePhotographer } from './PhotographerContext';

export interface RankTier {
  id: string;
  nameKo: string;
  emoji: string;
  minScore: number;
}

export const RANK_TIERS: RankTier[] = [
  { id: 'rookie',  nameKo: '루키',   emoji: '🌱', minScore: 0   },
  { id: 'amateur', nameKo: '아마추어', emoji: '📷', minScore: 10  },
  { id: 'pro',     nameKo: '프로',   emoji: '⭐', minScore: 30  },
  { id: 'elite',   nameKo: '엘리트', emoji: '🏆', minScore: 70  },
  { id: 'legend',  nameKo: '레전드', emoji: '👑', minScore: 150 },
];

function computeScore(postCount: number, followerCount: number): number {
  return postCount + Math.floor(followerCount / 10);
}

function getTierForScore(score: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (score >= RANK_TIERS[i].minScore) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

export interface RankProgress {
  tier: RankTier;
  score: number;
  nextTier: RankTier | null;
  progress: number; // 0-1
  pointsToNext: number;
}

interface RankContextValue {
  getRankForPhotographer: (photographerId: string) => RankTier;
  getRankProgress: (photographerId: string) => RankProgress;
  getScoreForPhotographer: (photographerId: string) => number;
}

const RankContext = createContext<RankContextValue | null>(null);

export function RankProvider({ children }: { children: ReactNode }) {
  const { getPhotographer } = usePhotographer();

  const getScoreForPhotographer = useCallback((photographerId: string): number => {
    const pg = getPhotographer(photographerId);
    if (!pg) return 0;
    return computeScore(pg.post_count, pg.follower_count);
  }, [getPhotographer]);

  const getRankForPhotographer = useCallback((photographerId: string): RankTier => {
    return getTierForScore(getScoreForPhotographer(photographerId));
  }, [getScoreForPhotographer]);

  const getRankProgress = useCallback((photographerId: string): RankProgress => {
    const score = getScoreForPhotographer(photographerId);
    const tier = getTierForScore(score);
    const tierIdx = RANK_TIERS.findIndex((t) => t.id === tier.id);
    const nextTier = tierIdx < RANK_TIERS.length - 1 ? RANK_TIERS[tierIdx + 1] : null;

    let progress = 1;
    let pointsToNext = 0;
    if (nextTier) {
      const range = nextTier.minScore - tier.minScore;
      const earned = score - tier.minScore;
      progress = range > 0 ? Math.min(earned / range, 1) : 1;
      pointsToNext = nextTier.minScore - score;
    }

    return { tier, score, nextTier, progress, pointsToNext };
  }, [getScoreForPhotographer]);

  const value = useMemo<RankContextValue>(() => ({
    getRankForPhotographer,
    getRankProgress,
    getScoreForPhotographer,
  }), [getRankForPhotographer, getRankProgress, getScoreForPhotographer]);

  return <RankContext.Provider value={value}>{children}</RankContext.Provider>;
}

export function useRank() {
  const ctx = useContext(RankContext);
  if (!ctx) throw new Error('useRank must be used inside RankProvider');
  return ctx;
}
