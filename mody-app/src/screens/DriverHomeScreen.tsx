import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import {
  reportLocation,
  setAvailability,
  getDriverProfile,
  getDriverNotifications,
  getUserFacingMessage,
} from '../services/api';
import { useIdentity } from '../context/IdentityContext';
import type { Identity } from '../context/IdentityContext';
import { useToast } from '../context/ToastContext';
import { useDriverNotifications } from '../context/DriverNotificationContext';
import { theme } from '../theme';
import { DriverTutorial } from '../components/DriverTutorial';
import {
  DriverNotificationPermissionModal,
  shouldShowNotificationPermissionModal,
} from '../components/DriverNotificationPermissionModal';
import { STORAGE_KEY_PAYMENT_QR_URI } from '../constants/storageKeys';
import { fetchWeather } from '../utils/weather';

const STORAGE_KEY_TUTORIAL_DONE = '@mody_driver_tutorial_done';

/** 闽清县梅城镇默认坐标（无定位时天气与占位） */
const DEFAULT_LAT = 26.2234;
const DEFAULT_LNG = 118.8634;

/** 天气刷新间隔（毫秒） */
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
/** 接单状态下定位上报间隔（毫秒） */
const LOCATION_REPORT_INTERVAL_MS = 45 * 1000;

type Props = {
  currentIdentity?: Identity;
  onOpenVerification?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
};

function getTimeGreeting(): { timeStr: string; greeting: string } {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  let greeting = '晚上好';
  if (h >= 5 && h < 12) greeting = '上午好';
  else if (h >= 12 && h < 18) greeting = '下午好';
  return { timeStr, greeting };
}

export const DriverHomeScreen = React.memo(function DriverHomeScreen({
  currentIdentity = 'driver',
  onOpenVerification,
  onOpenNotifications,
  onOpenProfile,
}: Props) {
  const { token } = useIdentity();
  const { showToast } = useToast();
  const { unreadCount, pendingCount, clearPendingSummary, setUnreadCount } = useDriverNotifications();
  const [showNotificationPermissionModal, setShowNotificationPermissionModal] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [tutorialDone, setTutorialDone] = useState<boolean | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState(getTimeGreeting);
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentQrUri, setPaymentQrUri] = useState<string | null>(null);
  const [showQrFullscreen, setShowQrFullscreen] = useState(false);
  const [todayContactCount, setTodayContactCount] = useState<number | null>(null);
  const reportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWeatherFetchRef = useRef<number>(0);

  const markTutorialDone = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY_TUTORIAL_DONE, '1');
    setTutorialDone(true);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTimeGreeting(getTimeGreeting()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) {
      setTutorialDone(true);
      return;
    }
    (async () => {
      try {
        const done = await AsyncStorage.getItem(STORAGE_KEY_TUTORIAL_DONE);
        setTutorialDone(done === '1');
        if (done !== '1') setShowTutorial(true);
      } catch {
        setTutorialDone(true);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getDriverProfile(token)
      .then((res) => {
        if (res?.data && typeof res.data.is_available === 'boolean') {
          setIsAvailable(res.data.is_available);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || currentIdentity !== 'driver') return;
    getDriverNotifications(token, 1, 1).then((res) => {
      if (res?.data?.unreadCount != null) setUnreadCount(res.data.unreadCount);
    }).catch(() => {});
  }, [token, currentIdentity, setUnreadCount]);

  useEffect(() => {
    if (!token) return;
    shouldShowNotificationPermissionModal().then((show) => {
      if (show) setShowNotificationPermissionModal(true);
    });
  }, [token]);

/** 天气请求超时（毫秒），超时或失败时显示「未知」 */
const WEATHER_TIMEOUT_MS = 10000;

  const loadWeather = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastWeatherFetchRef.current < WEATHER_REFRESH_MS && weather != null) return;
    lastWeatherFetchRef.current = now;
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('weather_timeout')), WEATHER_TIMEOUT_MS)
      );
      const result = await Promise.race([fetchWeather(lat, lng), timeoutPromise]);
      if (result) {
        setWeather({ temp: result.temp, desc: result.desc });
      } else {
        setWeatherError(true);
      }
    } catch {
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  }, [weather]);

  useEffect(() => {
    if (currentIdentity !== 'driver') return;
    const lat = driverCoords?.lat ?? DEFAULT_LAT;
    const lng = driverCoords?.lng ?? DEFAULT_LNG;
    loadWeather(lat, lng);
  }, [currentIdentity, driverCoords?.lat, driverCoords?.lng, loadWeather]);

  useEffect(() => {
    if (currentIdentity !== 'driver' || !token || !isAvailable) return;
    const authToken = token;
    let cancelled = false;
    function requestLocationAndReport() {
      if (cancelled) return;
      const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 };
      Geolocation.getCurrentPosition(
        (p) => {
          if (cancelled) return;
          const { latitude, longitude } = p.coords;
          setDriverCoords({ lat: latitude, lng: longitude });
          reportLocation(authToken, {
            latitude,
            longitude,
            accuracy: p.coords.accuracy ?? 15,
          }).catch(() => {});
        },
        () => {},
        opts
      );
    }
    requestLocationAndReport();
    const id = setInterval(requestLocationAndReport, LOCATION_REPORT_INTERVAL_MS);
    reportIntervalRef.current = id;
    return () => {
      cancelled = true;
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
        reportIntervalRef.current = null;
      }
    };
  }, [currentIdentity, token, isAvailable]);

  useEffect(() => {
    if (currentIdentity !== 'driver') return;
    (async () => {
      try {
        const uri = await AsyncStorage.getItem(STORAGE_KEY_PAYMENT_QR_URI);
        setPaymentQrUri(uri || null);
      } catch {
        setPaymentQrUri(null);
      }
    })();
  }, [currentIdentity]);

  useEffect(() => {
    if (!token || currentIdentity !== 'driver') return;
    getDriverNotifications(token, 1, 50)
      .then((res) => {
        const list = res?.data?.list ?? [];
        const today = new Date().toDateString();
        const count = list.filter((item) => new Date(item.created_at).toDateString() === today).length;
        setTodayContactCount(count);
      })
      .catch(() => setTodayContactCount(0));
  }, [token, currentIdentity]);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    markTutorialDone();
  }, [markTutorialDone]);

  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
    markTutorialDone();
  }, [markTutorialDone]);

  const onToggleAvailable = useCallback(async () => {
    if (!token) return;
    try {
      const next = !isAvailable;
      await setAvailability(token, next);
      setIsAvailable(next);
    } catch (e: any) {
      showToast(getUserFacingMessage(e, '更新失败'), 'error');
    }
  }, [token, isAvailable, showToast]);

  const openPaymentQR = useCallback(() => {
    if (paymentQrUri) {
      setShowQrFullscreen(true);
    } else {
      onOpenProfile?.();
    }
  }, [paymentQrUri, onOpenProfile]);

  return (
    <>
      <DriverTutorial
        visible={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
      <DriverNotificationPermissionModal
        visible={showNotificationPermissionModal}
        onClose={() => setShowNotificationPermissionModal(false)}
      />
      {pendingCount > 0 && (
        <Pressable
          style={styles.pendingBar}
          onPress={() => {
            clearPendingSummary();
            onOpenNotifications?.();
          }}
        >
          <Text style={styles.pendingBarText}>您有 {pendingCount} 条未读通知，点击查看</Text>
        </Pressable>
      )}

      <Modal
        visible={showQrFullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrFullscreen(false)}
      >
        <Pressable style={styles.qrFullscreenOverlay} onPress={() => setShowQrFullscreen(false)}>
          <Pressable style={styles.qrFullscreenContent} onPress={(e) => e.stopPropagation()}>
            {paymentQrUri ? (
              <Image source={{ uri: paymentQrUri }} style={styles.qrFullscreenImage} resizeMode="contain" />
            ) : null}
            <Text style={styles.qrFullscreenHint}>点击空白处关闭</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.timeText}>{timeGreeting.timeStr}</Text>
          <Text style={styles.greetingText}>{timeGreeting.greeting}</Text>
        </View>

        <View style={styles.mainCard}>
          <Pressable
            onPress={onToggleAvailable}
            style={[styles.mainBtn, isAvailable ? styles.mainBtnActive : styles.mainBtnInactive]}
            disabled={!token}
          >
            <Text style={styles.mainBtnIcon}>{isAvailable ? '🟢' : '🔴'}</Text>
            <Text style={[styles.mainBtnText, isAvailable ? styles.mainBtnTextActive : styles.mainBtnTextInactive]}>
              {isAvailable ? '停止接单' : '开始接单'}
            </Text>
          </Pressable>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>{isAvailable ? '👁' : '—'}</Text>
            <Text style={styles.statusText}>
              {isAvailable ? '正在接单 · 附近乘客可见' : '已停止接单 · 暂不展示'}
            </Text>
          </View>
        </View>

        <View style={styles.twoCards}>
          <Pressable style={styles.smallCard} onPress={() => loadWeather(driverCoords?.lat ?? DEFAULT_LAT, driverCoords?.lng ?? DEFAULT_LNG)}>
            <Text style={styles.smallCardIcon}>🌤</Text>
            {weatherLoading ? (
              <ActivityIndicator size="small" color={theme.textMuted} />
            ) : weatherError || weather == null ? (
              <Text style={styles.smallCardUnknown}>未知</Text>
            ) : (
              <>
                <Text style={styles.smallCardValue}>{weather.temp}°</Text>
                <Text style={styles.smallCardLabel}>{weather.desc}</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.smallCard} onPress={openPaymentQR}>
            <Text style={styles.smallCardIcon}>💳</Text>
            <Text style={styles.smallCardLabel}>{paymentQrUri ? '点击出示' : '收款码'}</Text>
            {!paymentQrUri && <Text style={styles.smallCardHint}>去设置</Text>}
          </Pressable>
        </View>

        {(todayContactCount != null && todayContactCount > 0) && (
          <View style={styles.tipRow}>
            <Text style={styles.tipText}>今日 {todayContactCount} 位乘客通过平台联系您</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
});

/** 司机端字体放大系数，便于中年用户阅读 */
const DRIVER_FONT_SCALE = 1.2;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 24,
    backgroundColor: theme.bg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
  },
  timeText: {
    fontSize: Math.round(15 * DRIVER_FONT_SCALE),
    color: theme.textMuted,
    fontWeight: '500',
  },
  greetingText: {
    fontSize: Math.round(16 * DRIVER_FONT_SCALE),
    color: theme.text,
    fontWeight: '600',
  },
  mainCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    alignItems: 'center',
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius,
    width: '100%',
    maxWidth: 280,
  },
  mainBtnActive: {
    backgroundColor: theme.green,
  },
  mainBtnInactive: {
    backgroundColor: theme.accent,
  },
  mainBtnIcon: {
    fontSize: Math.round(20 * DRIVER_FONT_SCALE),
  },
  mainBtnText: {
    fontSize: Math.round(18 * DRIVER_FONT_SCALE),
    fontWeight: '700',
  },
  mainBtnTextActive: {
    color: '#fff',
  },
  mainBtnTextInactive: {
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  statusIcon: {
    fontSize: Math.round(14 * DRIVER_FONT_SCALE),
  },
  statusText: {
    fontSize: Math.round(13 * DRIVER_FONT_SCALE),
    color: theme.textMuted,
  },
  twoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  smallCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadiusSm,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    alignItems: 'center',
    minHeight: 88,
  },
  smallCardIcon: {
    fontSize: Math.round(24 * DRIVER_FONT_SCALE),
    marginBottom: 6,
  },
  smallCardValue: {
    fontSize: Math.round(18 * DRIVER_FONT_SCALE),
    fontWeight: '700',
    color: theme.text,
  },
  /** 天气获取失败时的「未知」占位，与卡片副文案风格一致 */
  smallCardUnknown: {
    fontSize: Math.round(14 * DRIVER_FONT_SCALE),
    fontWeight: '500',
    color: theme.textMuted,
  },
  smallCardLabel: {
    fontSize: Math.round(13 * DRIVER_FONT_SCALE),
    color: theme.textMuted,
    marginTop: 2,
  },
  smallCardHint: {
    fontSize: Math.round(11 * DRIVER_FONT_SCALE),
    color: theme.accent,
    marginTop: 2,
  },
  tipRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tipText: {
    fontSize: Math.round(13 * DRIVER_FONT_SCALE),
    color: theme.textMuted,
  },
  pendingBar: {
    backgroundColor: theme.accentSoft,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  pendingBarText: {
    fontSize: Math.round(14 * DRIVER_FONT_SCALE),
    color: theme.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
  qrFullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrFullscreenContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFullscreenImage: {
    width: 280,
    height: 280,
    maxWidth: '100%',
  },
  qrFullscreenHint: {
    marginTop: 24,
    fontSize: Math.round(14 * DRIVER_FONT_SCALE),
    color: 'rgba(255,255,255,0.8)',
  },
});
