import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import type { Provider } from '@supabase/auth-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';
import { useToast } from './ToastContext';
import { APPLE_SIGNIN_ENABLED } from '../constants/config';
import type { AdminRole } from '../types/admin';

WebBrowser.maybeCompleteAuthSession();

export type LoginProvider = 'google' | 'apple' | 'kakao' | 'naver' | 'email';

export interface UserProfile {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  nickname: string | null;
  nickname_changed_at: string | null;
  is_photographer: boolean;
  is_admin: boolean;
  admin_role: AdminRole | null;
  ticket_balance: number;
  my_team_id: string | null;
  created_at: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  session: Session | null;
  isGuest: boolean;
  loginProvider: LoginProvider | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  guestMode: boolean;
  isPhotographer: boolean;
  photographerId: string | null;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  login: (provider: LoginProvider) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
  activatePhotographerMode: (teamId: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginProvider, setLoginProvider] = useState<LoginProvider | null>(null);
  const [isPhotographer, setIsPhotographer] = useState(false);
  const [photographerId, setPhotographerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  const isAuthenticated = user !== null;
  const isGuest = !isAuthenticated;
  const pendingOAuthProvider = useRef<LoginProvider | null>(null);
  const isProcessingCallback = useRef(false);

  // ─── User Profile Fetch ───
  const fetchUserProfile = async (authUser: User): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    if (error) { console.error('fetchUserProfile error:', error); return null; }
    return data as UserProfile;
  };

  // ─── OAuth Session Extraction ───
  /** Extract code or tokens from an OAuth redirect URL and establish session */
  const extractAndSetSession = async (url: string) => {
    // 중복 콜백 방지 — WebBrowser 콜백과 Deep Link 리스너가 동시에 호출될 수 있다
    if (isProcessingCallback.current) {
      console.log('[OAuth] Skipping duplicate callback');
      return;
    }

    // URL 유효성 검증 — auth/callback 경로가 아니면 무시
    if (!url || !url.includes('auth/callback')) {
      console.warn('[OAuth] Unexpected callback URL format:', url);
      pendingOAuthProvider.current = null;
      return;
    }

    isProcessingCallback.current = true;
    try {
      console.log('[OAuth] extractAndSetSession URL:', url);
      const provider = pendingOAuthProvider.current;

      // Parse query params & hash fragment
      const qs = url.split('?')[1]?.split('#')[0] ?? '';
      const hash = url.split('#')[1] ?? '';
      const qp = new URLSearchParams(qs);
      const hp = new URLSearchParams(hash);

      const code = qp.get('code') || hp.get('code');
      const accessToken = hp.get('access_token') || qp.get('access_token');
      const refreshToken = hp.get('refresh_token') || qp.get('refresh_token');
      console.log('[OAuth] code:', code, 'accessToken:', !!accessToken, 'refreshToken:', !!refreshToken);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[OAuth] Code exchange error:', error);
          showToast(t('oauth_error'), 'error');
        } else {
          if (provider) setLoginProvider(provider);
          // 웹: 콜백 URL 정리 — /auth/callback 에 머물면 재파싱 가능
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/');
          }
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[OAuth] Set session error:', error);
          showToast(t('oauth_error'), 'error');
        } else {
          if (provider) setLoginProvider(provider);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/');
          }
        }
      } else {
        console.warn('[OAuth] No code or tokens found in URL');
      }

      pendingOAuthProvider.current = null;
    } finally {
      isProcessingCallback.current = false;
    }
  };

  // ─── Initialization & Auth State Listener ───
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
          if (profile?.is_photographer) { setIsPhotographer(true); setPhotographerId(profile.id); }
        }
      } catch { /* Supabase unreachable */ }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === 'SIGNED_IN') {
        // 로그인 시에만 프로필 조회
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
          if (profile?.is_photographer) { setIsPhotographer(true); setPhotographerId(profile.id); }
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // 토큰 갱신 시 세션만 업데이트 (프로필 재조회 안 함)
        if (!session) {
          // 세션 갱신 실패 — 로그인 화면으로 이동
          setUser(null);
          setIsPhotographer(false);
          setPhotographerId(null);
          showToast(t('session_expired'), 'error');
        }
      } else if (event === 'SIGNED_OUT') {
        // 로그아웃 시 상태 초기화
        setUser(null);
        setIsPhotographer(false);
        setPhotographerId(null);
      }
    });

    // Deep link fallback — catches OAuth redirect when openAuthSessionAsync misses it
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[Deep Link] URL received:', url, 'pendingOAuth:', pendingOAuthProvider.current);
      if (url.includes('auth/callback') && pendingOAuthProvider.current) {
        extractAndSetSession(url);
        WebBrowser.dismissBrowser();
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  // ─── OAuth Login ───
  const login = async (provider: LoginProvider) => {
    if (provider === 'email') return;

    // Apple Sign In이 비활성화 상태면 무시 (D-02)
    if (provider === 'apple' && !APPLE_SIGNIN_ENABLED) return;

    // Naver OIDC 커스텀 provider — Supabase 설정 완료 후 활성화
    if (provider === 'naver') {
      showToast(t('oauth_naver_preparing'), 'info');
      return;
    }

    const providerMap: Record<string, Provider> = {
      google: 'google',
      apple: 'apple',
      kakao: 'kakao',
    };

    const redirectUrl = Linking.createURL('auth/callback');
    console.log('[OAuth] redirectUrl:', redirectUrl);
    pendingOAuthProvider.current = provider;

    if (Platform.OS === 'web') {
      // 웹: 페이지 전체 리디렉트 방식 — Google COOP 정책과 충돌하는 팝업 대신
      // Supabase가 직접 리디렉트를 처리하고, detectSessionInUrl이 콜백을 파싱한다.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerMap[provider],
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        console.error('[OAuth] signInWithOAuth error:', error);
        pendingOAuthProvider.current = null;
        showToast(t('oauth_error'), 'error');
        return;
      }
      if (data?.url) {
        console.log('[OAuth] Web: redirecting to', data.url);
        window.location.href = data.url;
      }
      return;
    }

    // 네이티브: WebBrowser (Chrome Custom Tabs / ASWebAuthenticationSession)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: providerMap[provider],
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error) {
      console.error('[OAuth] signInWithOAuth error:', error);
      pendingOAuthProvider.current = null;
      showToast(t('oauth_error'), 'error');
      return;
    }

    console.log('[OAuth] Opening auth URL:', data?.url);

    if (data?.url) {
      try {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        console.log('[OAuth] WebBrowser result:', result.type);
        if (result.type === 'success' && result.url && pendingOAuthProvider.current) {
          await extractAndSetSession(result.url);
        } else if (result.type === 'cancel') {
          pendingOAuthProvider.current = null;
        }
      } catch (err: unknown) {
        console.error('[OAuth] WebBrowser error:', err);
        pendingOAuthProvider.current = null;
        showToast(t('oauth_error'), 'error');
      }
    }
  };

  // ─── Email Login ───
  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    setLoginProvider('email');
    return { success: true };
  };

  // ─── Email Sign Up ───
  const signUpWithEmail = async (email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, display_name: username } },
    });
    if (error) return { success: false, error: error.message };
    setLoginProvider('email');
    return { success: true };
  };

  // ─── Guest Mode ───
  const loginAsGuest = () => {
    setGuestMode(true);
    setLoading(false);
  };

  // ─── Logout ───
  const logout = async () => {
    await supabase.auth.signOut().catch(() => {});
    setUser(null); setSession(null); setLoginProvider(null);
    setIsPhotographer(false); setPhotographerId(null); setGuestMode(false);
  };

  // ─── Profile Updates ───
  const NICKNAME_CHANGE_LIMIT_DAYS = 30;

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;

    // 닉네임 변경 30일 제한 체크 (D-07)
    if (updates.nickname && updates.nickname !== user.nickname) {
      if (user.nickname_changed_at) {
        const lastChanged = new Date(user.nickname_changed_at);
        const daysSince = (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < NICKNAME_CHANGE_LIMIT_DAYS) {
          showToast(t('nickname_change_limit', { days: Math.ceil(NICKNAME_CHANGE_LIMIT_DAYS - daysSince) }), 'error');
          return;
        }
      }
      updates.nickname_changed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('users').update(updates).eq('id', user.id);
    if (error) {
      console.error('updateUserProfile error:', error);
      showToast(t('profile_update_error'), 'error');
      return;
    }
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, [user, showToast, t]);

  const refreshUser = useCallback(async () => {
    if (!session?.user) return;
    const profile = await fetchUserProfile(session.user);
    if (profile) setUser(profile);
  }, [session]);

  const activatePhotographerMode = useCallback(async (teamId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const updates = { is_photographer: true, my_team_id: teamId };
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', user.id);
      if (error) console.warn('Supabase update failed, applying locally:', error.message);
    } catch {
      console.warn('Supabase unreachable, applying locally');
    }
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    setIsPhotographer(true);
    setPhotographerId(user.id);
    return { success: true };
  }, [user]);

  // ─── Password Reset ───
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const redirectUrl = Linking.createURL('auth/reset');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, session, isGuest, loginProvider, loading,
      guestMode, isPhotographer, photographerId,
      isAdmin: user?.is_admin ?? false,
      adminRole: user?.admin_role ?? null,
      login, loginWithEmail, signUpWithEmail, loginAsGuest, logout,
      updateUserProfile, refreshUser, activatePhotographerMode, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
