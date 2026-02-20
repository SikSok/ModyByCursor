import { useCallback, useEffect, useRef, useState } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';
import { reportLocation } from '../services/api';

const REPORT_INTERVAL_MS = 30 * 1000;
const DEBOUNCE_MS = 3000;

export type LocationCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number;
} | null;

export function useLocation(token: string | null, enabled: boolean) {
  const [coords, setCoords] = useState<LocationCoords>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReportRef = useRef<number>(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      // iOS 在 getCurrentPosition 时会自动弹系统授权
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '摩迪司机端需要获取位置',
          message: '用于向乘客展示您的位置并接单',
          buttonNeutral: '稍后',
          buttonNegative: '拒绝',
          buttonPositive: '允许',
        }
      );
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      setPermissionGranted(ok);
      return ok;
    } catch (e) {
      setPermissionGranted(false);
      setError('定位权限请求失败');
      return false;
    }
  }, []);

  const updateLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy ?? undefined;
        setCoords({ latitude, longitude, accuracy });
        setError(null);
      },
      (err) => {
        setError(err.message || '获取定位失败');
        setCoords(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  const reportWithDebounce = useCallback(
    async (latitude: number, longitude: number, accuracy?: number) => {
      if (!token) return;
      const now = Date.now();
      if (now - lastReportRef.current < DEBOUNCE_MS) return;
      lastReportRef.current = now;
      try {
        await reportLocation(token, { latitude, longitude, accuracy });
      } catch {
        // 静默失败，下次再报
      }
    },
    [token]
  );

  useEffect(() => {
    if (!enabled || !token) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const run = () => {
      updateLocation();
    };

    run();

    intervalRef.current = setInterval(() => {
      updateLocation();
    }, REPORT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, token, updateLocation]);

  useEffect(() => {
    if (!coords || !token || !enabled) return;
    reportWithDebounce(coords.latitude, coords.longitude, coords.accuracy);
  }, [coords, token, enabled, reportWithDebounce]);

  return {
    coords,
    permissionGranted,
    error,
    requestPermission,
    updateLocation,
  };
}
