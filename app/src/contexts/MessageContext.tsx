import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessageContextValue {
  conversations: Conversation[];
  totalUnread: number;
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, text: string) => void;
  markConversationRead: (conversationId: string) => void;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1',
    recipientId: 'pg1',
    recipientName: 'baseball_lens',
    recipientAvatar: null,
    lastMessage: '사진 정말 좋네요! 혹시 원본 구매 가능한가요?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unreadCount: 2,
  },
  {
    id: 'conv2',
    recipientId: 'pg2',
    recipientName: 'kbo_moments',
    recipientAvatar: null,
    lastMessage: '감사합니다! 다음 직관 때 뵐게요',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unreadCount: 0,
  },
  {
    id: 'conv3',
    recipientId: 'pg3',
    recipientName: 'diamond_shot',
    recipientAvatar: null,
    lastMessage: '서포트 감사합니다!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    unreadCount: 0,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  conv1: [
    { id: 'm1', conversationId: 'conv1', senderId: 'pg1', text: '안녕하세요! 포토 잘 보고 있습니다.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
    { id: 'm2', conversationId: 'conv1', senderId: 'me', text: '감사합니다! 어떤 사진이 좋으셨나요?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString() },
    { id: 'm3', conversationId: 'conv1', senderId: 'pg1', text: '사진 정말 좋네요! 혹시 원본 구매 가능한가요?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  ],
  conv2: [
    { id: 'm4', conversationId: 'conv2', senderId: 'me', text: '사진 잘 봤습니다!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString() },
    { id: 'm5', conversationId: 'conv2', senderId: 'pg2', text: '감사합니다! 다음 직관 때 뵐게요', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  ],
  conv3: [
    { id: 'm6', conversationId: 'conv3', senderId: 'pg3', text: '서포트 감사합니다!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  ],
};

const MessageContext = createContext<MessageContextValue | null>(null);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const getMessages = useCallback(
    (conversationId: string): Message[] => messages[conversationId] ?? [],
    [messages],
  );

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: 'me',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: text, lastMessageAt: newMsg.createdAt }
          : c,
      ),
    );
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  return (
    <MessageContext.Provider
      value={{ conversations, totalUnread, getMessages, sendMessage, markConversationRead }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessage(): MessageContextValue {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessage must be used within MessageProvider');
  return ctx;
}
