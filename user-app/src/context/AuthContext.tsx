import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { userLogin, getUserProfile, UserProfile } from '../services/api';
import { storage } from '../utils/storage';

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isRestored: boolean;
};

type AuthContextValue = AuthState & {
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: UserProfile | null) => void;
  setToken: (t: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    isRestored: false,
  });

  const restoreToken = useCallback(async () => {
    try {
      const token = await storage.getToken();
      if (!token) {
        setState((s) => ({ ...s, token: null, user: null, isLoading: false, isRestored: true }));
        return;
      }
      const res = await getUserProfile(token);
      setState({ token, user: res.data, isLoading: false, isRestored: true });
    } catch {
      await storage.removeToken();
      setState((s) => ({ ...s, token: null, user: null, isLoading: false, isRestored: true }));
    }
  }, []);

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await userLogin({ phone, password });
    await storage.setToken(res.data.token);
    setState({
      token: res.data.token,
      user: res.data.user,
      isLoading: false,
      isRestored: true,
    });
  }, []);

  const logout = useCallback(async () => {
    await storage.removeToken();
    setState((s) => ({ ...s, token: null, user: null }));
  }, []);

  const setUser = useCallback((user: UserProfile | null) => {
    setState((s) => ({ ...s, user }));
  }, []);

  const setToken = useCallback((token: string | null) => {
    setState((s) => ({ ...s, token }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
