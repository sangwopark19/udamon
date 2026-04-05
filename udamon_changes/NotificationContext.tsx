import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconsName = keyof typeof Ionicons.glyphMap;

export type NotificationType =
  | 'new_follower'
  | 'following_post'
  | 'post_like'
  | 'comment'
  | 'app_update'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  icon: IoniconsName;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: { postId?: string; photographerId?: string };
}

const ACTIVITY_TYPES: NotificationType[] = [
  'new_follower', 'following_post', 'post_like', 'comment',
];

interface NotificationContextValue {
  notifications: AppNotification[];
  activityNotifications: AppNotification[];
  generalNotifications: AppNotification[];
  unreadCount: number;
  activityUnread: number;
  generalUnread: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (type: NotificationType, title: string, body: string, data?: AppNotification['data']) => void;
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1', type: 'new_follower', icon: 'person-add',
    title: '새로운 팔로워', body: 'baseball_lover님이 회원님을 팔로우하기 시작했습니다.',
    read: false, createdAt: new Date(Date.now() - 1800000).toISOString(),
    data: {},
  },
  {
    id: 'n2', type: 'following_post', icon: 'camera',
    title: '새 포토 업로드', body: '팔로우 중인 StadiumShots님이 새 사진을 업로드했습니다.',
    read: false, createdAt: new Date(Date.now() - 7200000).toISOString(),
    data: { postId: 'pp-1' },
  },
  {
    id: 'n3', type: 'post_like', icon: 'heart',
    title: '좋아요', body: '회원님의 사진 "잠실 야경 시리즈"에 좋아요 15개가 달렸습니다.',
    read: true, createdAt: new Date(Date.now() - 86400000).toISOString(),
    data: { postId: 'pp-2' },
  },
  {
    id: 'n4', type: 'comment', icon: 'chatbubble',
    title: '새 댓글', body: '회원님의 게시글에 새 댓글이 달렸습니다.',
    read: true, createdAt: new Date(Date.now() - 172800000).toISOString(),
    data: { postId: 'pp-3' },
  },
  {
    id: 'n5', type: 'app_update', icon: 'rocket',
    title: '앱 업데이트', body: '우다몬 v1.1 업데이트가 출시되었습니다. 새로운 기능을 확인하세요!',
    read: true, createdAt: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: 'n6', type: 'system', icon: 'megaphone',
    title: '공지사항', body: '2026 시즌 개막전 기념 이벤트가 진행 중입니다.',
    read: false, createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);

  const activityNotifications = useMemo(
    () => notifications.filter((n) => ACTIVITY_TYPES.includes(n.type)),
    [notifications],
  );
  const generalNotifications = useMemo(
    () => notifications.filter((n) => !ACTIVITY_TYPES.includes(n.type)),
    [notifications],
  );

  const activityUnread = activityNotifications.filter((n) => !n.read).length;
  const generalUnread = generalNotifications.filter((n) => !n.read).length;
  const unreadCount = activityUnread + generalUnread;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const ICON_MAP: Record<NotificationType, IoniconsName> = {
    new_follower: 'person-add',
    following_post: 'camera',
    post_like: 'heart',
    comment: 'chatbubble',
    app_update: 'rocket',
    system: 'megaphone',
  };

  const addNotification = useCallback((type: NotificationType, title: string, body: string, data?: AppNotification['data']) => {
    const n: AppNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      icon: ICON_MAP[type] ?? 'notifications',
      title,
      body,
      read: false,
      createdAt: new Date().toISOString(),
      data,
    };
    setNotifications((prev) => [n, ...prev]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications, activityNotifications, generalNotifications,
        unreadCount, activityUnread, generalUnread,
        markAsRead, markAllAsRead, removeNotification, addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
