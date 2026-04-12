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
  nickname: string | null;
  nickname_changed_at: string | null;
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
  signupInProgress: boolean;
  profileReady: boolean;
  isPhotographer: boolean;
  photographerId: string | null;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  login: (provider: LoginProvider) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, username: string, teamId?: string) => Promise<{ success: boolean; error?: string }>;
  completeSignup: () => void;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
  activatePhotographerMode: (teamId: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const PENDING_OAUTH_KEY = 'pending_oauth_provider';

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
    nickname: meta.preferred_username ?? meta.user_name ?? null,
    nickname_changed_at: null,
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
  const [profileReady, setProfileReady] = useState(false);
  const [signupInProgress, _setSignupInProgress] = useState(false);
  const signupInProgressRef = useRef(false);
  const setSignupInProgress = (v: boolean) => { signupInProgressRef.current = v; _setSignupInProgress(v); };

  const isAuthenticated = user !== null;
  const isGuest = !isAuthenticated;
  const pendingOAuthProvider = useRef<LoginProvider | null>(null);
  // extractAndSetSession이 user를 설정한 직후 true → onAuthStateChange가 덮어쓰지 않도록
  const oauthSessionJustSet = useRef(false);
  // signUpWithEmail/loginWithEmail이 직접 세션을 설정한 직후 → onAuthStateChange 스킵
  const emailAuthJustSet = useRef(false);
  // completeSignup 직후 onAuthStateChange가 user를 덮어쓰는 것 방지
  const signupJustCompleted = useRef(false);

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
        // 백그라운드에서 DB 프로필 로드 — JWT 데이터와 병합 (DB에 없는 필드 보존)
        const tokenProfile = buildProfileFromToken(authUser);
        ensureUserProfile(authUser).then((dbProfile) => {
          if (dbProfile) {
            // DB에 display_name/username 컬럼이 없을 수 있음 → JWT 값으로 fallback
            const merged: UserProfile = {
              ...tokenProfile,
              ...dbProfile,
              display_name: dbProfile.display_name ?? tokenProfile.display_name,
              username: dbProfile.username ?? tokenProfile.username,
              avatar_url: dbProfile.avatar_url ?? tokenProfile.avatar_url,
            };
            setUser(merged);
            if (merged.is_photographer) { setIsPhotographer(true); setPhotographerId(merged.id); }
          }
          setProfileReady(true);
        }).catch(() => { setProfileReady(true); });
      }
    } else {
      console.warn('[OAuth] No code or tokens found in URL');
    }

    pendingOAuthProvider.current = null;
    await AsyncStorage.removeItem(PENDING_OAUTH_KEY).catch(() => {});
  };

  useEffect(() => {
    const init = async () => {
      // Supabase session restore
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const profile = await ensureUserProfile(session.user);
          setUser(profile);
          setProfileReady(true);
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
      console.log('[Auth] onAuthStateChange:', _event, 'signupInProgressRef:', signupInProgressRef.current, 'emailAuthJustSet:', emailAuthJustSet.current, 'oauthSessionJustSet:', oauthSessionJustSet.current);
      setSession(session);
      if (session?.user) {
        // extractAndSetSession이 방금 user를 JWT에서 설정한 경우 스킵
        // (백그라운드 DB 로드가 별도로 진행 중)
        if (oauthSessionJustSet.current) {
          console.log('[Auth] onAuthStateChange: skipping (OAuth session just set)');
          oauthSessionJustSet.current = false;
          return;
        }
        if (emailAuthJustSet.current) {
          console.log('[Auth] onAuthStateChange: skipping (email auth just set)');
          emailAuthJustSet.current = false;
          return;
        }
        // 회원가입 진행 중에는 프로필 덮어쓰기 방지 — signUpWithEmail이 직접 관리
        if (signupInProgressRef.current) {
          console.log('[Auth] onAuthStateChange: skipping (signup in progress)');
          return;
        }
        // completeSignup 직후 onAuthStateChange가 stale DB 데이터로 user를 덮어쓰면
        // needsProfileSetup=true 또는 isAuthenticated=false가 되어 navigator가 'auth'로 돌아감
        if (signupJustCompleted.current) {
          console.log('[Auth] onAuthStateChange: skipping (signup just completed)');
          signupJustCompleted.current = false;
          return;
        }
        const profile = await ensureUserProfile(session.user);
        console.log('[Auth] onAuthStateChange: ensureUserProfile result — nickname:', profile?.nickname, 'team:', profile?.my_team_id, 'isNull:', profile === null);
        setUser(profile);
        setProfileReady(true);
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    setLoginProvider('email');

    // 세션과 프로필을 직접 설정 — onAuthStateChange 레이스 방지
    emailAuthJustSet.current = true;
    if (data.session) {
      setSession(data.session);
      const profile = await ensureUserProfile(data.session.user);
      if (profile) {
        setUser(profile);
        setProfileReady(true);
        console.log('[Auth] loginWithEmail: user set directly', profile.nickname);
      }
    }

    return { success: true };
  };

  const signUpWithEmail = async (email: string, password: string, username: string, teamId?: string): Promise<{ success: boolean; error?: string }> => {
    setSignupInProgress(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { preferred_username: username, user_name: username, name: username, display_name: username } },
    });
    if (error) { setSignupInProgress(false); return { success: false, error: error.message }; }
    setLoginProvider('email');

    // 세션과 프로필을 직접 설정 — onAuthStateChange 레이스 방지
    emailAuthJustSet.current = true;

    let activeSession = data.session;

    // Supabase가 이메일 확인을 요구하면 signUp이 session=null을 반환함.
    // 개발 환경에서 autoconfirm이 켜져 있으면 바로 로그인 시도로 세션 확보.
    if (!activeSession) {
      console.log('[Auth] signUpWithEmail: no session from signUp, trying signInWithPassword fallback');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError || !loginData.session) {
        console.warn('[Auth] signUpWithEmail: login fallback failed:', loginError?.message ?? 'no session');
        setSignupInProgress(false);
        return { success: false, error: loginError?.message ?? 'Email confirmation required. Please check your email.' };
      }
      activeSession = loginData.session;
    }

    setSession(activeSession);
    const profile = await ensureUserProfile(activeSession.user);
    if (profile) {
      // 회원가입 시 선택한 구단을 DB에 저장 — needsProfileSetup 조건 충족 방지
      if (teamId) {
        await supabase.from('users').update({ my_team_id: teamId }).eq('id', profile.id);
        profile.my_team_id = teamId;
      }
      setUser(profile);
      setProfileReady(true);
      console.log('[Auth] signUpWithEmail: user set directly', profile.nickname, 'team:', profile.my_team_id);
    } else {
      console.error('[Auth] signUpWithEmail: ensureUserProfile returned null');
      setSignupInProgress(false);
      return { success: false, error: 'Failed to create user profile' };
    }

    setSignupInProgress(false);
    return { success: true };
  };

  const completeSignup = useCallback(() => {
    console.log('[Auth] completeSignup called — current user:', user?.nickname, 'team:', user?.my_team_id, 'isAuthenticated:', user !== null);
    // onAuthStateChange가 stale 데이터로 user를 덮어쓰는 것 방지
    signupJustCompleted.current = true;
    setSignupInProgress(false);
    console.log('[Auth] completeSignup done — signupInProgressRef:', signupInProgressRef.current);
  }, [user]);

  const loginAsGuest = () => {
    setGuestMode(true);
    setLoading(false);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(PENDING_OAUTH_KEY).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    setUser(null); setSession(null); setLoginProvider(null);
    setIsPhotographer(false); setPhotographerId(null); setGuestMode(false); setProfileReady(false);
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
      guestMode, signupInProgress, profileReady, isPhotographer, photographerId,
      isAdmin: user?.is_admin ?? false,
      adminRole: user?.admin_role ?? null,
      login, loginWithEmail, signUpWithEmail, completeSignup, loginAsGuest, logout,
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
