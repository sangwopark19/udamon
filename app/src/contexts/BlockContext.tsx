import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from './ToastContext';

interface BlockContextValue {
  blockedUserIds: Set<string>;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
}

const BlockContext = createContext<BlockContextValue | null>(null);

export function BlockProvider({ children }: { children: ReactNode }) {
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  const blockUser = useCallback((userId: string) => {
    setBlockedUserIds((prev) => new Set(prev).add(userId));
    showToast('차단되었습니다', 'success');
  }, [showToast]);

  const unblockUser = useCallback((userId: string) => {
    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const isUserBlocked = useCallback((userId: string) => {
    return blockedUserIds.has(userId);
  }, [blockedUserIds]);

  return (
    <BlockContext.Provider value={{ blockedUserIds, blockUser, unblockUser, isUserBlocked }}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlock(): BlockContextValue {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error('useBlock must be used within BlockProvider');
  return ctx;
}
