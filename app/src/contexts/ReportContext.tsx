import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ReportResolution } from '../types/admin';

export type ReportTargetType = 'post' | 'photographer' | 'community_post' | 'comment';

export interface ReportEntry {
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  detail?: string;
  createdAt: string;
  status: 'pending' | 'resolved';
  resolution?: ReportResolution;
  resolvedAt?: string;
}

interface ReportContextValue {
  reports: ReportEntry[];
  submitReport: (entry: Omit<ReportEntry, 'createdAt' | 'status'>) => void;
  hasReported: (targetId: string, targetType: ReportTargetType) => boolean;
  resolveReport: (index: number, resolution: ReportResolution) => void;
  getPendingReports: () => (ReportEntry & { index: number })[];
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<ReportEntry[]>([]);

  const submitReport = useCallback((entry: Omit<ReportEntry, 'createdAt' | 'status'>) => {
    setReports((prev) => [...prev, { ...entry, createdAt: new Date().toISOString(), status: 'pending' }]);
  }, []);

  const hasReported = useCallback((targetId: string, targetType: ReportTargetType) => {
    return reports.some((r) => r.targetId === targetId && r.targetType === targetType);
  }, [reports]);

  const resolveReport = useCallback((index: number, resolution: ReportResolution) => {
    setReports((prev) => prev.map((r, i) =>
      i === index ? { ...r, status: 'resolved' as const, resolution, resolvedAt: new Date().toISOString() } : r,
    ));
  }, []);

  const getPendingReports = useCallback(() => {
    return reports
      .map((r, index) => ({ ...r, index }))
      .filter((r) => r.status === 'pending');
  }, [reports]);

  return (
    <ReportContext.Provider value={{ reports, submitReport, hasReported, resolveReport, getPendingReports }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used within ReportProvider');
  return ctx;
}
