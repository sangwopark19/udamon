import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
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

  const fetchUserProfile = async (authUser: User): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    if (error) { console.error('fetchUserProfile error:', error); return null; }
    return data as UserProfile;
  };

  /** Extract code or tokens from an OAuth redirect URL and establish session */
  const extractAndSetSession = async (url: string) => {
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
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) console.error('[OAuth] Set session error:', error);
      else if (provider) setLoginProvider(provider);
    } else {
      console.warn('[OAuth] No code or tokens found in URL');
    }

    pendingOAuthProvider.current = null;
  };

  useEffect(() => {
    const init = async () => {
      // Supabase session restore
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
        if (profile?.is_photographer) { setIsPhotographer(true); setPhotographerId(profile.id); }
      } else {
        setUser(null);
        setIsPhotographer(false);
        setPhotographerId(null);
      }
    });

    // Deep link fallback -- catches OAuth redirect when openAuthSessionAsync misses it
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
    // TODO: implement naver native OAuth
    if (provider === 'naver') return;

    const providerMap = { google: 'google', apple: 'apple', kakao: 'kakao' } as const;
    const redirectUrl = Linking.createURL('auth/callback');
    pendingOAuthProvider.current = provider;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: providerMap[provider],
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error) {
      console.error('[OAuth] signInWithOAuth error:', error);
      pendingOAuthProvider.current = null;
      return;
    }

    if (data?.url) {
      if (Platform.OS === 'android') {
        // Android Custom Tabs can't reliably detect scheme redirects in Expo Go.
        // Open in system browser and let deep link listener handle the callback.
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
        }
      }
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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
    await supabase.auth.signOut().catch(() => {});
    setUser(null); setSession(null); setLoginProvider(null);
    setIsPhotographer(false); setPhotographerId(null); setGuestMode(false);
  };

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const { error } = await supabase.from('users').update(updates).eq('id', user.id);
    if (error) { console.error('updateUserProfile error:', error); return; }
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, [user]);

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
