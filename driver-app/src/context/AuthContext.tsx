import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { driverLogin, getDriverProfile, DriverProfile } from '../services/api';
import { storage } from '../utils/storage';

type AuthState = {
  token: string | null;
  driver: DriverProfile | null;
  isLoading: boolean;
  isRestored: boolean;
};

type AuthContextValue = AuthState & {
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setDriver: (d: DriverProfile | null) => void;
  setToken: (t: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    driver: null,
    isLoading: true,
    isRestored: false,
  });

  const restoreToken = useCallback(async () => {
    try {
      const token = await storage.getToken();
      if (!token) {
        setState(s => ({ ...s, token: null, driver: null, isLoading: false, isRestored: true }));
        return;
      }
      const res = await getDriverProfile(token);
      setState({
        token,
        driver: res.data,
        isLoading: false,
        isRestored: true,
      });
    } catch {
      await storage.removeToken();
      setState(s => ({ ...s, token: null, driver: null, isLoading: false, isRestored: true }));
    }
  }, []);

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await driverLogin({ phone, password });
    await storage.setToken(res.data.token);
    setState({
      token: res.data.token,
      driver: res.data.driver,
      isLoading: false,
      isRestored: true,
    });
  }, []);

  const logout = useCallback(async () => {
    await storage.removeToken();
    setState(s => ({ ...s, token: null, driver: null }));
  }, []);

  const setDriver = useCallback((driver: DriverProfile | null) => {
    setState(s => ({ ...s, driver }));
  }, []);

  const setToken = useCallback((token: string | null) => {
    setState(s => ({ ...s, token }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    setDriver,
    setToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
