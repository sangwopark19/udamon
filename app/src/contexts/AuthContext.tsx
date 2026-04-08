import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
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

const TEST_ACCOUNT_KEY = 'udamon_test_account';
const PENDING_OAUTH_KEY = 'pending_oauth_provider';

const TEST_ACCOUNTS: Record<string, { password: string; profile: UserProfile; isPhotographer: boolean }> = {
  'test@udamon.com': {
    password: 'test1234',
    profile: {
      id: 'test-user-001',
      email: 'test@udamon.com',
      username: 'tester',
      display_name: '테스트유저',
      avatar_url: null,
      bio: '우다몬 테스트 계정입니다.',
      is_photographer: false,
      is_admin: false,
      admin_role: null,
      ticket_balance: 100,
      my_team_id: 'doosan',
      created_at: new Date().toISOString(),
    },
    isPhotographer: false,
  },
  'test2@udamon.com': {
    password: 'test1234',
    profile: {
      id: 'test-user-002',
      email: 'test2@udamon.com',
      username: 'photographer_tester',
      display_name: '테스트포토그래퍼',
      avatar_url: null,
      bio: '포토그래퍼 테스트 계정입니다.',
      is_photographer: true,
      is_admin: false,
      admin_role: null,
      ticket_balance: 500,
      my_team_id: 'lg',
      created_at: new Date().toISOString(),
    },
    isPhotographer: true,
  },
  'admin@udamon.com': {
    password: 'admin1234',
    profile: {
      id: 'admin-001',
      email: 'admin@udamon.com',
      username: 'admin',
      display_name: '관리자',
      avatar_url: null,
      bio: '우다몬 관리자 계정입니다.',
      is_photographer: false,
      is_admin: true,
      admin_role: 'super_admin',
      ticket_balance: 0,
      my_team_id: null,
      created_at: new Date().toISOString(),
    },
    isPhotographer: false,
  },
};

// ─── Helpers ───

/** Promise with timeout — prevents DB queries from hanging indefinitely */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);

/** Build a minimal UserProfile from Supabase auth user metadata (no DB query) */
const buildProfileFromToken = (authUser: User): UserProfile => {
  const meta = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email ?? null,
    username: meta.preferred_username ?? meta.user_name ?? null,
    display_name: meta.full_name ?? meta.name ?? null,
    avatar_url: meta.avatar_url ?? null,
    bio: null,
    is_photographer: false,
    is_admin: false,
    admin_role: null,
    ticket_balance: 0,
    my_team_id: null,
    created_at: new Date().toISOString(),
  };
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
  // extractAndSetSession이 user를 설정한 직후 true → onAuthStateChange가 덮어쓰지 않도록
  const oauthSessionJustSet = useRef(false);

  const fetchUserProfile = async (authUser: User): Promise<UserProfile | null> => {
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.from('users').select('*').eq('id', authUser.id).single()),
        5000,
      );
      if (error) { console.error('fetchUserProfile error:', error); return null; }
      return data as UserProfile;
    } catch (e) {
      console.warn('[Auth] fetchUserProfile timeout:', e instanceof Error ? e.message : 'unknown');
      return null;
    }
  };

  const ensureUserProfile = async (authUser: User): Promise<UserProfile | null> => {
    const existing = await fetchUserProfile(authUser);
    if (existing) return existing;

    console.log('[Auth] Profile not found, creating from user_metadata:', authUser.id);

    const meta = authUser.user_metadata ?? {};
    try {
      const { error: upsertError } = await withTimeout(
        Promise.resolve(supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email ?? null,
          nickname: meta.preferred_username ?? meta.user_name ?? meta.name ?? (authUser.email ? authUser.email.split('@')[0] : 'user_' + authUser.id.replace(/-/g, '').slice(0, 8)),
          username: meta.preferred_username ?? meta.user_name ?? (authUser.email ? authUser.email.split('@')[0] : null),
          display_name: meta.full_name ?? meta.name ?? (authUser.email ? authUser.email.split('@')[0] : null),
          avatar_url: meta.avatar_url ?? null,
          role: 'user',
        }, { onConflict: 'id' })),
        5000,
      );

      if (upsertError) {
        console.error('[Auth] ensureUserProfile upsert error:', upsertError);
        return null;
      }
    } catch (e) {
      console.warn('[Auth] ensureUserProfile upsert timeout:', e instanceof Error ? e.message : 'unknown');
      return null;
    }

    const profile = await fetchUserProfile(authUser);
    if (!profile) {
      console.error('[Auth] Profile still null after upsert for user:', authUser.id);
    }
    return profile;
  };

  /** Extract tokens from an OAuth redirect URL and establish session + user */
  const extractAndSetSession = async (url: string) => {
    console.log('[OAuth] extractAndSetSession called');
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
      if (error) console.error('[OAuth] Code exchange error:', error);
      else if (provider) setLoginProvider(provider);
    } else if (accessToken && refreshToken) {
      // onAuthStateChange가 setSession 도중 발생 → ensureUserProfile(느린 DB 쿼리) 실행 방지
      // 플래그를 setSession 호출 전에 설정해야 onAuthStateChange 핸들러가 스킵함
      oauthSessionJustSet.current = true;
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('[OAuth] Set session error:', error);
        oauthSessionJustSet.current = false;
      } else if (data.session?.user) {
        console.log('[OAuth] setSession success, setting user immediately');
        if (provider) setLoginProvider(provider);
        const authUser = data.session.user;
        // JWT 토큰 데이터로 즉시 user 설정 → 메인화면 즉시 진입
        setSession(data.session);
        setUser(buildProfileFromToken(authUser));
        setGuestMode(false);
        console.log('[OAuth] immediate user set:', authUser.id);
        // 백그라운드에서 DB 프로필 로드
        ensureUserProfile(authUser).then((dbProfile) => {
          if (dbProfile) {
            console.log('[OAuth] DB profile loaded, updating user');
            setUser(dbProfile);
            if (dbProfile.is_photographer) { setIsPhotographer(true); setPhotographerId(dbProfile.id); }
          }
        }).catch(() => {});
      }
    } else {
      console.warn('[OAuth] No code or tokens found in URL');
    }

    pendingOAuthProvider.current = null;
    await AsyncStorage.removeItem(PENDING_OAUTH_KEY).catch(() => {});
  };

  useEffect(() => {
    const init = async () => {
      // 1) Check for persisted test account first
      try {
        const savedEmail = await AsyncStorage.getItem(TEST_ACCOUNT_KEY);
        if (savedEmail && TEST_ACCOUNTS[savedEmail]) {
          const acct = TEST_ACCOUNTS[savedEmail];
          setUser(acct.profile);
          setLoginProvider('email');
          setIsPhotographer(acct.isPhotographer);
          setPhotographerId(acct.isPhotographer ? acct.profile.id : null);
          setGuestMode(false);
          setLoading(false);
          return;
        }
      } catch { /* AsyncStorage not available, continue */ }

      // 2) Normal Supabase session restore
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const profile = await ensureUserProfile(session.user);
          setUser(profile);
          if (profile?.is_photographer) { setIsPhotographer(true); setPhotographerId(profile.id); }
        }
      } catch { /* Supabase unreachable */ }

      // 3) Cold-start deep link 처리: Android에서 앱이 kill된 후 OAuth 콜백으로 재시작된 경우
      //    addEventListener('url')은 cold-start launch URL을 못 잡음 → getInitialURL() 필요
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('auth/callback')) {
          console.log('[Auth] Cold-start OAuth callback detected');
          // kill된 앱에서는 useRef가 초기화됨 → AsyncStorage에서 provider 복원
          const savedProvider = await AsyncStorage.getItem(PENDING_OAUTH_KEY).catch(() => null);
          if (savedProvider) pendingOAuthProvider.current = savedProvider as LoginProvider;
          await extractAndSetSession(initialUrl);
        }
      } catch (e) {
        console.warn('[Auth] getInitialURL error:', e);
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // extractAndSetSession이 방금 user를 JWT에서 설정한 경우 스킵
        // (백그라운드 DB 로드가 별도로 진행 중)
        if (oauthSessionJustSet.current) {
          console.log('[Auth] onAuthStateChange: skipping (OAuth session just set)');
          oauthSessionJustSet.current = false;
          return;
        }
        const profile = await ensureUserProfile(session.user);
        setUser(profile);
        if (profile?.is_photographer) { setIsPhotographer(true); setPhotographerId(profile.id); }
      } else {
        // session null 이벤트(SIGNED_OUT 등)에서 user를 wipe하지 않음.
        // logout()이 직접 setUser(null)을 처리함.
        // signInWithOAuth가 내부적으로 SIGNED_OUT을 발생시키므로 여기서 wipe하면
        // OAuth 플로우 중 로그인 화면으로 돌아가는 버그 발생.
      }
    });

    // Deep link fallback — warm-start 시 OAuth redirect 캐치
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('auth/callback')) {
        extractAndSetSession(url);
        WebBrowser.dismissBrowser();
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const login = async (provider: LoginProvider) => {
    if (provider === 'email') return;
    if (provider === 'naver') return;

    const providerMap = { google: 'google', apple: 'apple', kakao: 'kakao' } as const;
    const redirectUrl = Linking.createURL('auth/callback');
    pendingOAuthProvider.current = provider;
    // Android cold-start 시 provider를 복원할 수 있도록 AsyncStorage에 저장
    await AsyncStorage.setItem(PENDING_OAUTH_KEY, provider).catch(() => {});

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: providerMap[provider],
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error) {
      console.error('[OAuth] signInWithOAuth error:', error);
      pendingOAuthProvider.current = null;
      await AsyncStorage.removeItem(PENDING_OAUTH_KEY).catch(() => {});
      return;
    }

    if (data?.url) {
      if (Platform.OS === 'android') {
        await Linking.openURL(data.url);
      } else {
        try {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (result.type === 'success' && result.url && pendingOAuthProvider.current) {
            await extractAndSetSession(result.url);
          }
        } catch (err) {
          console.error('[OAuth] WebBrowser error:', err);
          pendingOAuthProvider.current = null;
          await AsyncStorage.removeItem(PENDING_OAUTH_KEY).catch(() => {});
        }
      }
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const testAcct = TEST_ACCOUNTS[email];
    if (testAcct && password === testAcct.password) {
      setUser(testAcct.profile);
      setLoginProvider('email');
      setIsPhotographer(testAcct.isPhotographer);
      setPhotographerId(testAcct.isPhotographer ? testAcct.profile.id : null);
      setGuestMode(false);
      setLoading(false);
      await AsyncStorage.setItem(TEST_ACCOUNT_KEY, email).catch(() => {});
      return { success: true };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    setLoginProvider('email');
    return { success: true };
  };

  const signUpWithEmail = async (email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, display_name: username } },
    });
    if (error) return { success: false, error: error.message };
    setLoginProvider('email');
    return { success: true };
  };

  const loginAsGuest = () => {
    setGuestMode(true);
    setLoading(false);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TEST_ACCOUNT_KEY).catch(() => {});
    await AsyncStorage.removeItem(PENDING_OAUTH_KEY).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    setUser(null); setSession(null); setLoginProvider(null);
    setIsPhotographer(false); setPhotographerId(null); setGuestMode(false);
  };

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const isTestAccount = user.id.startsWith('test-user-');
    if (!isTestAccount) {
      const { error } = await supabase.from('users').update(updates).eq('id', user.id);
      if (error) { console.error('updateUserProfile error:', error); return; }
    }
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!session?.user) return;
    const profile = await ensureUserProfile(session.user);
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
