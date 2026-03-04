import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Identity = 'passenger' | 'driver';

const STORAGE_KEY_IDENTITY = '@mody_identity';
const STORAGE_KEY_TOKEN = '@mody_token';
/** 兼容旧版：若存在则迁移到单 token 后删除 */
const STORAGE_KEY_USER_TOKEN = '@mody_user_token';
const STORAGE_KEY_DRIVER_TOKEN = '@mody_driver_token';

type IdentityState = {
  currentIdentity: Identity;
  token: string | null;
  hasDriver: boolean;
  driverStatus: 'pending' | 'approved' | 'rejected' | null;
  isAvailable: boolean;
  ready: boolean;
};

type IdentityContextValue = IdentityState & {
  setIdentity: (identity: Identity) => void;
  setToken: (token: string | null) => void;
  setDriverInfo: (hasDriver: boolean, driverStatus?: 'pending' | 'approved' | 'rejected' | null, isAvailable?: boolean) => void;
  logout: () => void;
  currentToken: string | null;
};

const defaultState: IdentityState = {
  currentIdentity: 'passenger',
  token: null,
  hasDriver: false,
  driverStatus: null,
  isAvailable: false,
  ready: false,
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<IdentityState>(defaultState);

  const loadStored = useCallback(async () => {
    try {
      const [identity, token, userToken, driverToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_IDENTITY),
        AsyncStorage.getItem(STORAGE_KEY_TOKEN),
        AsyncStorage.getItem(STORAGE_KEY_USER_TOKEN),
        AsyncStorage.getItem(STORAGE_KEY_DRIVER_TOKEN),
      ]);
      let finalToken = token || null;
      if (!finalToken && (userToken || driverToken)) {
        finalToken = userToken || driverToken;
        await AsyncStorage.setItem(STORAGE_KEY_TOKEN, finalToken);
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEY_USER_TOKEN),
          AsyncStorage.removeItem(STORAGE_KEY_DRIVER_TOKEN),
        ]);
      }
      setState((s) => ({
        ...s,
        currentIdentity: (identity === 'driver' ? 'driver' : 'passenger') as Identity,
        token: finalToken,
        ready: true,
      }));
    } catch {
      setState((s) => ({ ...s, ready: true }));
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const setIdentity = useCallback(async (identity: Identity) => {
    setState((s) => ({ ...s, currentIdentity: identity }));
    await AsyncStorage.setItem(STORAGE_KEY_IDENTITY, identity);
  }, []);

  const setToken = useCallback(async (newToken: string | null) => {
    setState((s) => ({ ...s, token: newToken }));
    if (newToken) await AsyncStorage.setItem(STORAGE_KEY_TOKEN, newToken);
    else await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
  }, []);

  const setDriverInfo = useCallback((hasDriver: boolean, driverStatus?: 'pending' | 'approved' | 'rejected' | null, isAvailable?: boolean) => {
    setState((s) => ({
      ...s,
      hasDriver,
      driverStatus: driverStatus ?? null,
      isAvailable: isAvailable ?? false,
    }));
  }, []);

  const logout = useCallback(async () => {
    setState({
      currentIdentity: 'passenger',
      token: null,
      hasDriver: false,
      driverStatus: null,
      isAvailable: false,
      ready: true,
    });
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_IDENTITY),
      AsyncStorage.removeItem(STORAGE_KEY_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEY_USER_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEY_DRIVER_TOKEN),
    ]);
  }, []);

  const currentToken = state.token;

  const value: IdentityContextValue = {
    ...state,
    setIdentity,
    setToken,
    setDriverInfo,
    logout,
    currentToken,
  };

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider');
  return ctx;
}
