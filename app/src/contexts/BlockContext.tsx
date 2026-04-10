import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

interface BlockContextValue {
  blockedUserIds: Set<string>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isUserBlocked: (userId: string) => boolean;
  // D-15 cross-context cache invalidation signal — increments on any block/unblock mutation
  // CommunityContext observes this to trigger a re-fetch so blocked user posts drop out via RLS.
  blockedUsersVersion: number;
}

const BlockContext = createContext<BlockContextValue | null>(null);

export function BlockProvider({ children }: { children: ReactNode }) {
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [blockedUsersVersion, setBlockedUsersVersion] = useState(0);
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
        showToast(t('block_already'), 'error');
        return;
      }
      // FK 위반 등 DB 에러 시 로컬 상태에만 반영 (mock 데이터 사용자 대응)
      console.warn('[BlockContext] Supabase insert failed, applying locally:', error.message);
      setBlockedUserIds((prev) => new Set(prev).add(blockedId));
      setBlockedUsersVersion((v) => v + 1);
      showToast(t('block_success'), 'success');
      return;
    }

    setBlockedUserIds((prev) => new Set(prev).add(blockedId));
    setBlockedUsersVersion((v) => v + 1);
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
      console.warn('[BlockContext] Supabase delete failed, applying locally:', error.message);
    }

    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      next.delete(blockedId);
      return next;
    });
    setBlockedUsersVersion((v) => v + 1);
    showToast(t('unblock_success'), 'success');
  }, [user?.id, showToast, t]);

  const isUserBlocked = useCallback((userId: string) => {
    return blockedUserIds.has(userId);
  }, [blockedUserIds]);

  const value = useMemo<BlockContextValue>(
    () => ({
      blockedUserIds,
      blockUser,
      unblockUser,
      isUserBlocked,
      blockedUsersVersion,
    }),
    [blockedUserIds, blockUser, unblockUser, isUserBlocked, blockedUsersVersion],
  );

  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>;
}

export function useBlock(): BlockContextValue {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error('useBlock must be used within BlockProvider');
  return ctx;
}
