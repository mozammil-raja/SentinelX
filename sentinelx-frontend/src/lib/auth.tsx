'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface UserSession {
  name: string;
  email: string;
  role: 'ROLE_ANALYST' | 'ROLE_ADMIN' | 'GUEST';
  token: string;
  avatar?: string;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  loginAsDemo: (role: 'ANALYST' | 'ADMIN') => void;
  loginWithGoogle: (token: string, email: string, name: string) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('sentinelx_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const loginAsDemo = useCallback((role: 'ANALYST' | 'ADMIN') => {
    const session: UserSession = role === 'ADMIN'
      ? {
          name: 'Sarah Connor',
          email: 'admin@sentinelx.io',
          role: 'ROLE_ADMIN',
          token: 'dev_admin_token',
        }
      : {
          name: 'Alex Vance',
          email: 'analyst@sentinelx.io',
          role: 'ROLE_ANALYST',
          token: 'dev_analyst_token',
        };

    setUser(session);
    localStorage.setItem('sentinelx_session', JSON.stringify(session));
    setIsAuthModalOpen(false);
  }, []);

  const loginWithGoogle = useCallback((token: string, email: string, name: string) => {
    const session: UserSession = {
      name,
      email,
      role: 'ROLE_ANALYST',
      token,
    };
    setUser(session);
    localStorage.setItem('sentinelx_session', JSON.stringify(session));
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('sentinelx_session');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginAsDemo,
        loginWithGoogle,
        logout,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
