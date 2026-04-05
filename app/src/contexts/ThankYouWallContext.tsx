import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export interface ThankYouMessage {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toPhotographerId: string;
  message: string;
  createdAt: string;
}

interface ThankYouWallContextValue {
  messages: ThankYouMessage[];
  canWriteMessage: (userId: string, photographerId: string) => boolean;
  addMessage: (msg: Omit<ThankYouMessage, 'id' | 'createdAt'>) => void;
  getMessagesForPhotographer: (photographerId: string) => ThankYouMessage[];
}

const ThankYouWallContext = createContext<ThankYouWallContextValue | null>(null);

const MOCK_MESSAGES: ThankYouMessage[] = [
  { id: 'ty1', fromUserId: 'u1', fromUserName: '야구팬123', toPhotographerId: 'pg1', message: '항상 멋진 사진 감사합니다! 덕분에 직관 못 가도 경기장 느낌을 느낄 수 있어요 🙏', createdAt: '2026-03-28T14:30:00Z' },
  { id: 'ty2', fromUserId: 'u2', fromUserName: '두산베어스팬', toPhotographerId: 'pg1', message: '선수들 표정을 정말 잘 잡으시네요! 최고입니다 👍', createdAt: '2026-03-27T09:15:00Z' },
  { id: 'ty3', fromUserId: 'u3', fromUserName: '잠실러버', toPhotographerId: 'pg1', message: '오늘 경기 사진도 기대할게요~ 화이팅!', createdAt: '2026-03-26T18:00:00Z' },
  { id: 'ty4', fromUserId: 'u4', fromUserName: '기아타이거즈', toPhotographerId: 'pg1', message: '사진 퀄리티가 프로급이에요. 응원합니다!', createdAt: '2026-03-25T12:00:00Z' },
  { id: 'ty5', fromUserId: 'u5', fromUserName: '삼성팬', toPhotographerId: 'pg2', message: '덕분에 좋은 사진 많이 봅니다. 감사해요!', createdAt: '2026-03-27T16:00:00Z' },
];

export function ThankYouWallProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ThankYouMessage[]>(MOCK_MESSAGES);

  const canWriteMessage = useCallback(
    (_userId: string, _photographerId: string): boolean => {
      return true; // any logged-in user can write
    },
    [],
  );

  const addMessage = useCallback((msg: Omit<ThankYouMessage, 'id' | 'createdAt'>) => {
    const newMsg: ThankYouMessage = {
      ...msg,
      id: `ty_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [newMsg, ...prev]);
  }, []);

  const getMessagesForPhotographer = useCallback(
    (photographerId: string) => messages.filter((m) => m.toPhotographerId === photographerId),
    [messages],
  );

  const value = useMemo<ThankYouWallContextValue>(() => ({
    messages,
    canWriteMessage,
    addMessage,
    getMessagesForPhotographer,
  }), [messages, canWriteMessage, addMessage, getMessagesForPhotographer]);

  return <ThankYouWallContext.Provider value={value}>{children}</ThankYouWallContext.Provider>;
}

export function useThankYouWall() {
  const ctx = useContext(ThankYouWallContext);
  if (!ctx) throw new Error('useThankYouWall must be used inside ThankYouWallProvider');
  return ctx;
}
