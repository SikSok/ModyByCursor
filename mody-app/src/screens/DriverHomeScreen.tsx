import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
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
import { useFontScale, scaledFontSize } from '../context/FontScaleContext';
import { theme } from '../theme';
import { DriverTutorial } from '../components/DriverTutorial';
import {
  DriverNotificationPermissionModal,
  shouldShowNotificationPermissionModal,
} from '../components/DriverNotificationPermissionModal';
import { STORAGE_KEY_PAYMENT_QR_URI, STORAGE_KEY_ONBOARDING_DRIVER_DONE } from '../constants/storageKeys';
import { fetchWeather } from '../utils/weather';
import { track } from '../utils/analytics';

const STORAGE_KEY_TUTORIAL_DONE_LEGACY = '@mody_driver_tutorial_done';

/** 闽清县梅城镇默认坐标（无定位时天气与占位） */
const DEFAULT_LAT = 26.2234;
const DEFAULT_LNG = 118.8634;

/** 天气刷新间隔（毫秒） */
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
/** 营业中状态下定位上报间隔（毫秒） */
const LOCATION_REPORT_INTERVAL_MS = 45 * 1000;

type Props = {
  currentIdentity?: Identity;
  onOpenVerification?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
};

function getTimeGreeting(): { timeStr: string; greeting: string; subtitle: string } {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  let greeting = '晚上好';
  let subtitle = '收工注意休息';
  if (h >= 0 && h < 5) {
    greeting = '早上好';
    subtitle = '注意安全';
  } else if (h >= 5 && h < 9) {
    greeting = '早上好';
    subtitle = '注意安全';
  } else if (h >= 9 && h < 12) {
    greeting = '上午好';
    subtitle = '路上顺利';
  } else if (h >= 12 && h < 18) {
    greeting = '下午好';
    subtitle = '';
  } else {
    greeting = '晚上好';
    subtitle = '收工注意休息';
  }
  return { timeStr, greeting, subtitle };
}

export const DriverHomeScreen = React.memo(function DriverHomeScreen({
  currentIdentity = 'driver',
  onOpenVerification,
  onOpenNotifications,
  onOpenProfile,
}: Props) {
  const { token } = useIdentity();
  const { showToast } = useToast();
  const { fontScale } = useFontScale();
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

  const winHeight = Dimensions.get('window').height;
  const greetingHeight = Math.max(winHeight * 0.10, 72);
  const mainCardHeight = Math.max(Math.min(winHeight * 0.45, 360), 280);
  const circleSize = Math.min(160, Math.max(120, winHeight * 0.2));

  /** 雷达波纹：仅营业中时 2～3 个圆环，stagger 循环 */
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const ringAnimsRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!isAvailable) {
      ring1.setValue(0);
      ring2.setValue(0);
      ring3.setValue(0);
      if (ringAnimsRef.current) ringAnimsRef.current.stop();
      return;
    }
    const duration = 1800;
    const runOne = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const a1 = runOne(ring1, 0);
    const a2 = runOne(ring2, 400);
    const a3 = runOne(ring3, 800);
    ringAnimsRef.current = Animated.parallel([a1, a2, a3]);
    ringAnimsRef.current.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [isAvailable, ring1, ring2, ring3]);

  /** 仅冷启动/首次进入司机首页时设为营业中，不持久化；后续可替换为渐变 */
  const hasSetDefaultAvailabilityThisSession = useRef(false);

  const markTutorialDone = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING_DRIVER_DONE, '1');
    // 兼容旧版本 key，避免后续版本重复弹出
    await AsyncStorage.setItem(STORAGE_KEY_TUTORIAL_DONE_LEGACY, '1');
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
        const done =
          (await AsyncStorage.getItem(STORAGE_KEY_ONBOARDING_DRIVER_DONE)) ??
          (await AsyncStorage.getItem(STORAGE_KEY_TUTORIAL_DONE_LEGACY));
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

  /**
   * 说明：原先这里在冷启动/首次进入司机首页且已绑定手机时，会自动将司机设为「营业中」，
   * 这会立刻触发定位权限请求，与「开始营业」按钮解耦，容易在身份认证等场景打扰用户。
   *
   * 当前改为：不再自动切换为营业中，只保留后端返回的 is_available。
   * 定位与上报仅在：
   * - 后端本身已将司机标记为营业中，或
   * - 司机在首页主动点击「开始营业」按钮
   * 时才会触发。
   */
  // useEffect(() => {
  //   if (!token || currentIdentity !== 'driver') return;
  //   if (hasSetDefaultAvailabilityThisSession.current) return;
  //   hasSetDefaultAvailabilityThisSession.current = true;
  //   getDriverProfile(token).then((res) => {
  //     const phone = res?.data?.phone;
  //     const hasValidPhone = typeof phone === 'string' && /^1\d{10}$/.test(phone.trim());
  //     if (hasValidPhone) {
  //       setAvailability(token, true).catch(() => {});
  //       setIsAvailable(true);
  //     }
  //   }).catch(() => {});
  // }, [token, currentIdentity]);

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
    if (!isAvailable) {
      try {
        const profileRes = await getDriverProfile(token);
        const phone = profileRes?.data?.phone;
        const hasValidPhone = typeof phone === 'string' && /^1\d{10}$/.test(phone.trim());
        if (!hasValidPhone) {
          showToast('请先绑定手机号', 'error');
          onOpenProfile?.();
          return;
        }
      } catch {
        showToast('请先绑定手机号', 'error');
        onOpenProfile?.();
        return;
      }
    }
    try {
      const next = !isAvailable;
      await setAvailability(token, next);
      setIsAvailable(next);
      track('driver_availability_change', { is_available: next }).catch(() => {});
      showToast(next ? '已开启营业' : '已休息', 'success');
    } catch (e: any) {
      if ((e as { code?: string }).code === 'NO_PHONE') {
        showToast('请先绑定手机号', 'error');
        onOpenProfile?.();
        return;
      }
      showToast(getUserFacingMessage(e, '更新失败'), 'error');
    }
  }, [token, isAvailable, showToast, onOpenProfile]);

  const openPaymentQR = useCallback(() => {
    if (paymentQrUri) {
      setShowQrFullscreen(true);
    } else {
      onOpenProfile?.();
    }
  }, [paymentQrUri, onOpenProfile]);

  const styles = useMemo(() => createStyles(fontScale), [fontScale]);

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
        <View style={[styles.greetingBlock, { minHeight: greetingHeight }]}>
          <Text style={styles.timeText}>{timeGreeting.timeStr}</Text>
          <Text style={styles.greetingText}>{timeGreeting.greeting}</Text>
          {timeGreeting.subtitle ? (
            <Text style={styles.greetingSubtitle}>{timeGreeting.subtitle}</Text>
          ) : null}
        </View>

        <View style={[styles.mainCard, { minHeight: mainCardHeight }]}>
          <View style={[styles.circleWrap, { width: circleSize + 80, height: circleSize + 80 }]}>
            {isAvailable && (
              <>
                <Animated.View
                  style={[
                    styles.radarRing,
                    {
                      width: circleSize + 40,
                      height: circleSize + 40,
                      borderRadius: (circleSize + 40) / 2,
                      borderWidth: 2,
                      borderColor: 'rgba(22, 163, 74, 0.4)',
                      position: 'absolute',
                    },
                    {
                      opacity: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                      transform: [
                        {
                          scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.8] }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.radarRing,
                    {
                      width: circleSize + 40,
                      height: circleSize + 40,
                      borderRadius: (circleSize + 40) / 2,
                      borderWidth: 2,
                      borderColor: 'rgba(22, 163, 74, 0.4)',
                      position: 'absolute',
                    },
                    {
                      opacity: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                      transform: [
                        {
                          scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.8] }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.radarRing,
                    {
                      width: circleSize + 40,
                      height: circleSize + 40,
                      borderRadius: (circleSize + 40) / 2,
                      borderWidth: 2,
                      borderColor: 'rgba(22, 163, 74, 0.4)',
                      position: 'absolute',
                    },
                    {
                      opacity: ring3.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                      transform: [
                        {
                          scale: ring3.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.8] }),
                        },
                      ],
                    },
                  ]}
                />
              </>
            )}
            <Pressable
              onPress={onToggleAvailable}
              style={[
                styles.circleBtn,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                },
                isAvailable ? styles.circleBtnActive : styles.circleBtnInactive,
              ]}
              disabled={!token}
            >
              <Text style={styles.circleBtnIcon}>{isAvailable ? '🟢' : '⚪'}</Text>
              <Text style={[styles.circleBtnText, isAvailable ? styles.circleBtnTextActive : styles.circleBtnTextInactive]}>
                {isAvailable ? '休息' : '开始营业'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>{isAvailable ? '👁' : '—'}</Text>
            <Text style={styles.statusText}>
              {isAvailable ? '营业中 · 附近乘客可见' : '休息中 · 暂不展示'}
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

function createStyles(fontScale: number) {
  return StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 24,
      backgroundColor: theme.bg,
    },
    greetingBlock: {
      justifyContent: 'center',
      paddingVertical: 16,
      marginBottom: 20,
    },
    timeText: {
      fontSize: scaledFontSize(30, fontScale),
      color: theme.textMuted,
      fontWeight: '600',
      marginBottom: 4,
    },
    greetingText: {
      fontSize: scaledFontSize(22, fontScale),
      color: theme.text,
      fontWeight: '600',
    },
    greetingSubtitle: {
      fontSize: scaledFontSize(16, fontScale),
      color: theme.textMuted,
      marginTop: 6,
      fontWeight: '500',
    },
    mainCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.borderRadius,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    circleWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    radarRing: {
      backgroundColor: 'transparent',
    },
    circleBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    circleBtnActive: {
      backgroundColor: theme.green,
    },
    circleBtnInactive: {
      backgroundColor: '#6b7280',
    },
    circleBtnIcon: {
      fontSize: scaledFontSize(28, fontScale),
      marginBottom: 4,
    },
    circleBtnText: {
      fontSize: scaledFontSize(16, fontScale),
      fontWeight: '700',
    },
    circleBtnTextActive: {
      color: '#fff',
    },
    circleBtnTextInactive: {
      color: '#fff',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      gap: 6,
    },
    statusIcon: {
      fontSize: scaledFontSize(14, fontScale),
    },
    statusText: {
      fontSize: scaledFontSize(13, fontScale),
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
      fontSize: scaledFontSize(24, fontScale),
      marginBottom: 6,
    },
    smallCardValue: {
      fontSize: scaledFontSize(18, fontScale),
      fontWeight: '700',
      color: theme.text,
    },
    smallCardUnknown: {
      fontSize: scaledFontSize(14, fontScale),
      fontWeight: '500',
      color: theme.textMuted,
    },
    smallCardLabel: {
      fontSize: scaledFontSize(13, fontScale),
      color: theme.textMuted,
      marginTop: 2,
    },
    smallCardHint: {
      fontSize: scaledFontSize(11, fontScale),
      color: theme.accent,
      marginTop: 2,
    },
    tipRow: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    tipText: {
      fontSize: scaledFontSize(13, fontScale),
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
      fontSize: scaledFontSize(14, fontScale),
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
      fontSize: scaledFontSize(14, fontScale),
      color: 'rgba(255,255,255,0.8)',
    },
  });
}
