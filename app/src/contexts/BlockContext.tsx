import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

interface BlockContextValue {
  blockedUserIds: Set<string>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isUserBlocked: (userId: string) => boolean;
}

const BlockContext = createContext<BlockContextValue | null>(null);

export function BlockProvider({ children }: { children: ReactNode }) {
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  // 인증된 사용자의 차단 목록 로드
  useEffect(() => {
    if (!user?.id) {
      setBlockedUserIds(new Set());
      return;
    }

    const loadBlocks = async () => {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (!error && data) {
        setBlockedUserIds(new Set(data.map((b: { blocked_id: string }) => b.blocked_id)));
      }
    };

    loadBlocks();
  }, [user?.id]);

  const blockUser = useCallback(async (blockedId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: blockedId });

    if (error) {
      if (error.code === '23505') {
        // 이미 차단된 사용자 (UNIQUE 제약 위반)
        showToast(t('block_already'), 'error');
        return;
      }
      showToast(t('block_error'), 'error');
      return;
    }

    setBlockedUserIds((prev) => new Set(prev).add(blockedId));
    showToast(t('block_success'), 'success');
  }, [user?.id, showToast, t]);

  const unblockUser = useCallback(async (blockedId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) {
      showToast(t('unblock_error'), 'error');
      return;
    }

    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      next.delete(blockedId);
      return next;
    });
    showToast(t('unblock_success'), 'success');
  }, [user?.id, showToast, t]);

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
