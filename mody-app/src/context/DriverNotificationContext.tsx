import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIdentity } from './IdentityContext';
import { showDriverContactNotification } from '../services/driverNotificationDisplay';

const API_BASE_URL = require('../config/apiBaseUrl').url;

function getWsUrl(token: string): string {
  const base = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}/ws/driver${sep}token=${encodeURIComponent(token)}`;
}

export type NotificationItem = {
  id: number;
  content: string;
  created_at: string;
  read?: boolean;
};

type DriverNotificationState = {
  /** 补发条数，用于「您有 N 条未读，点击查看」 */
  pendingCount: number;
  /** 未读数（从列表接口或推送更新） */
  unreadCount: number;
  connected: boolean;
};

type DriverNotificationContextValue = DriverNotificationState & {
  setUnreadCount: (n: number) => void;
  clearBanner: () => void;
  clearPendingSummary: () => void;
};

const defaultState: DriverNotificationState = {
  pendingCount: 0,
  unreadCount: 0,
  connected: false,
};

const Context = createContext<DriverNotificationContextValue | null>(null);

const RECONNECT_INITIAL_MS = 2000;
const RECONNECT_MAX_MS = 30000;
const BACKOFF_FACTOR = 1.5;

export function DriverNotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DriverNotificationState>(defaultState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_INITIAL_MS);
  const tokenRef = useRef<string | null>(null);

  const clearBanner = useCallback(() => {
    /* 已改为系统通知，不再使用 App 内条幅，保留空实现以兼容调用方 */
  }, []);

  const clearPendingSummary = useCallback(() => {
    setState((s) => (s.pendingCount > 0 ? { ...s, pendingCount: 0 } : s));
  }, []);

  const setUnreadCount = useCallback((n: number) => {
    setState((s) => ({ ...s, unreadCount: n }));
  }, []);

  const connect = useCallback((token: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const url = getWsUrl(token);
    const ws = new WebSocket(url);
    wsRef.current = ws;
    tokenRef.current = token;

    ws.onopen = () => {
      reconnectDelayRef.current = RECONNECT_INITIAL_MS;
      setState((s) => ({ ...s, connected: true }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'NOTIFICATION' && data.id != null) {
          const content = data.content ?? '有乘客正在通过摩迪联系您，请接听来电';
          showDriverContactNotification({ body: content });
          setState((s) => ({
            ...s,
            unreadCount: s.unreadCount + 1,
          }));
        } else if (data.type === 'PENDING_LIST' && Array.isArray(data.list)) {
          const n = data.list.length;
          if (n > 0) {
            showDriverContactNotification({
              body: `您有 ${n} 条未读通知，点击查看`,
            });
            setState((s) => ({
              ...s,
              pendingCount: n,
              unreadCount: s.unreadCount + n,
            }));
          }
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      wsRef.current = null;
      setState((s) => ({ ...s, connected: false }));
      if (!tokenRef.current) return;
      const delay = reconnectDelayRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(
          RECONNECT_MAX_MS,
          delay * BACKOFF_FACTOR
        );
        connect(tokenRef.current!);
      }, delay);
    };

    ws.onerror = () => {};
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    tokenRef.current = null;
    setState(defaultState);
  }, []);

  const value: DriverNotificationContextValue = {
    ...state,
    setUnreadCount,
    clearBanner,
    clearPendingSummary,
  };

  return (
    <Context.Provider value={value}>
      {children}
      <DriverWsConnector connect={connect} disconnect={disconnect} />
    </Context.Provider>
  );
}

function DriverWsConnector({
  connect,
  disconnect,
}: {
  connect: (token: string) => void;
  disconnect: () => void;
}) {
  const { token } = useIdentity();
  useEffect(() => {
    if (token) {
      connect(token);
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [token, connect, disconnect]);
  return null;
}

export function useDriverNotifications(): DriverNotificationContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    return {
      ...defaultState,
      setUnreadCount: () => {},
      clearBanner: () => {},
      clearPendingSummary: () => {},
    };
  }
  return ctx;
}
