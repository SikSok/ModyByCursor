import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Identity = 'passenger' | 'driver';

const STORAGE_KEY_IDENTITY = '@mody_identity';
const STORAGE_KEY_USER_TOKEN = '@mody_user_token';
const STORAGE_KEY_DRIVER_TOKEN = '@mody_driver_token';

type IdentityState = {
  currentIdentity: Identity;
  userToken: string | null;
  driverToken: string | null;
  ready: boolean;
};

type IdentityContextValue = IdentityState & {
  setIdentity: (identity: Identity) => void;
  setUserToken: (token: string | null) => void;
  setDriverToken: (token: string | null) => void;
  logout: () => void;
  currentToken: string | null;
};

const defaultState: IdentityState = {
  currentIdentity: 'passenger',
  userToken: null,
  driverToken: null,
  ready: false,
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<IdentityState>(defaultState);

  const loadStored = useCallback(async () => {
    try {
      const [identity, userToken, driverToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_IDENTITY),
        AsyncStorage.getItem(STORAGE_KEY_USER_TOKEN),
        AsyncStorage.getItem(STORAGE_KEY_DRIVER_TOKEN),
      ]);
      setState(s => ({
        ...s,
        currentIdentity: (identity === 'driver' ? 'driver' : 'passenger') as Identity,
        userToken: userToken || null,
        driverToken: driverToken || null,
        ready: true,
      }));
    } catch {
      setState(s => ({ ...s, ready: true }));
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const setIdentity = useCallback(async (identity: Identity) => {
    setState(s => ({ ...s, currentIdentity: identity }));
    await AsyncStorage.setItem(STORAGE_KEY_IDENTITY, identity);
  }, []);

  const setUserToken = useCallback(async (token: string | null) => {
    setState(s => ({ ...s, userToken: token }));
    if (token) await AsyncStorage.setItem(STORAGE_KEY_USER_TOKEN, token);
    else await AsyncStorage.removeItem(STORAGE_KEY_USER_TOKEN);
  }, []);

  const setDriverToken = useCallback(async (token: string | null) => {
    setState(s => ({ ...s, driverToken: token }));
    if (token) await AsyncStorage.setItem(STORAGE_KEY_DRIVER_TOKEN, token);
    else await AsyncStorage.removeItem(STORAGE_KEY_DRIVER_TOKEN);
  }, []);

  const logout = useCallback(async () => {
    setState({
      currentIdentity: 'passenger',
      userToken: null,
      driverToken: null,
      ready: true,
    });
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_IDENTITY),
      AsyncStorage.removeItem(STORAGE_KEY_USER_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEY_DRIVER_TOKEN),
    ]);
  }, []);

  const currentToken = state.currentIdentity === 'passenger' ? state.userToken : state.driverToken;

  const value: IdentityContextValue = {
    ...state,
    setIdentity,
    setUserToken,
    setDriverToken,
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
