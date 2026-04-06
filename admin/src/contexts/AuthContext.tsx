import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AdminRole } from '../types';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    'Missing admin credentials. Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in admin/.env'
  );
}

const ADMIN_ACCOUNTS: Record<string, { password: string; user: AdminUser }> = {
  [ADMIN_EMAIL]: {
    password: ADMIN_PASSWORD,
    user: {
      id: 'admin-001',
      email: ADMIN_EMAIL,
      displayName: '관리자',
      role: 'super_admin',
    },
  },
};

const STORAGE_KEY = 'udamon_admin_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (admin) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(admin));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [admin]);

  const login = useCallback((email: string, password: string): boolean => {
    const account = ADMIN_ACCOUNTS[email];
    if (account && account.password === password) {
      setAdmin(account.user);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!admin, admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
