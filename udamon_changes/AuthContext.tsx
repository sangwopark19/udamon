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

const ADMIN_ACCOUNTS: Record<string, { password: string; user: AdminUser }> = {
  'admin@udamon.com': {
    password: 'admin1234',
    user: {
      id: 'admin-001',
      email: 'admin@udamon.com',
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
