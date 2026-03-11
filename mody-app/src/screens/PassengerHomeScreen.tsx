import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Linking,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AMapSdk, MapView, Marker } from 'react-native-amap3d';
import type { CameraPosition } from 'react-native-amap3d';
import Geolocation from '@react-native-community/geolocation';
import {
  getNearbyDrivers,
  getUserProfile,
  updateUserLastLocation,
  getLocationHistory,
  addLocationHistory,
  contactDriver,
  getUserFacingMessage,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { useIdentity } from '../context/IdentityContext';
import { theme } from '../theme';
import { AMAP_KEY } from '../config/amapKey';
import { reverseGeocode } from '../utils/amapRegeo';
import { maskPhone } from '../utils/phone';
import {
  STORAGE_KEY_DEFAULT_DRIVER,
  STORAGE_KEY_RECENT_CONTACTED_DRIVERS,
  STORAGE_KEY_ONBOARDING_PASSENGER_DONE,
} from '../constants/storageKeys';
import { GradientCallButton } from '../components/GradientCallButton';
import { track } from '../utils/analytics';
import { PassengerTutorial } from '../components/PassengerTutorial';
import { useFontScale, scaledFontSize, FONT_SCALE_VALUES, type FontScaleLevel } from '../context/FontScaleContext';

/** 弹窗内默认头像直接 require，避免跨模块引用在部分 Android 上不解析 */
const FALLBACK_AVATAR_IMG = require('../assets/default-avatars/default-driver-1.png');

/** 闽清县梅城镇默认坐标（无定位且无上次定位时使用） */
const DEFAULT_LAT = 26.2234;
const DEFAULT_LNG = 118.8634;
const DEFAULT_LABEL = '闽清县梅城镇';

/** 上次定位上报节流：最小间隔（毫秒） */
const LAST_LOCATION_THROTTLE_MS = 2 * 60 * 1000;

/** 重新定位按钮防连点：最小间隔（毫秒） */
const RELOCATE_COOLDOWN_MS = 1000;

/** 重新定位：GPS 最大等待时间（毫秒），避免永不回调 */
const RELOCATE_GPS_TIMEOUT_MS = 12000;

/** 逆地理请求最大等待时间（毫秒），超时则用「当前位置」 */
const REGEO_TIMEOUT_MS = 8000;

type NearbyItem = {
  driver: { id: number; phone?: string; name: string; avatar?: string; vehicle_type?: string };
  location: { latitude: number; longitude: number };
  distance_km: number;
};

/** 本地存储的默认司机快照 */
type DefaultDriverSnapshot = {
  id: number;
  name: string;
  phone: string;
  vehicle_type?: string;
};

/** 用于底部 CTA 的列表项，可为虚拟（默认司机不在本次结果中） */
type CTADriverItem = NearbyItem & { isVirtual?: boolean };

/**
 * 得到用于底部 CTA 的司机列表：默认司机在第一位（若在列表中则提至首位，否则插入虚拟条），其余按 distance_km 升序。
 * 不限制数量，展示全部附近司机。
 */
function getSortedDriversForCTA(
  drivers: NearbyItem[],
  defaultDriver: DefaultDriverSnapshot | null
): CTADriverItem[] {
  const byDistance = [...drivers].sort((a, b) => a.distance_km - b.distance_km);
  let list: CTADriverItem[];
  if (!defaultDriver) {
    list = byDistance;
  } else {
    const idx = byDistance.findIndex((d) => d.driver.id === defaultDriver.id);
    if (idx >= 0) {
      const item = byDistance[idx];
      const rest = byDistance.filter((_, i) => i !== idx);
      list = [{ ...item } as CTADriverItem, ...rest];
    } else {
      const virtual: CTADriverItem = {
        driver: {
          id: defaultDriver.id,
          name: defaultDriver.name,
          phone: defaultDriver.phone,
          vehicle_type: defaultDriver.vehicle_type,
        },
        location: { latitude: 0, longitude: 0 },
        distance_km: 0,
        isVirtual: true,
      };
      list = [virtual, ...byDistance];
    }
  }
  return list;
}

type LocationHistoryItem = {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  created_at: string;
};

type RecentContactItem = {
  driverId: number;
  name: string;
  phone?: string;
  contactedAt: number;
};

const RECENT_CONTACTS_MAX = 5;
const RECENT_CONTACTS_SHOW = 3;

function getMockDrivers(centerLat: number, centerLng: number): NearbyItem[] {
  const names = ['张师傅', '李师傅', '王师傅', '刘师傅', '陈师傅'];
  const phones = ['17710222617', '17710222617', '17710222617', '17710222617', '17710222617'];
  const count = 2 + Math.floor(Math.random() * 4);
  const items: NearbyItem[] = [];
  for (let i = 0; i < count; i++) {
    const lat = centerLat + (Math.random() - 0.5) * 0.04;
    const lng = centerLng + (Math.random() - 0.5) * 0.04;
    const distance_km = Math.round((Math.random() * 5 + 0.5) * 10) / 10;
    items.push({
      driver: {
        id: 1,// 目前自测先写死1 后续根据真实数据赋值
        name: names[i % names.length],
        phone: phones[i % phones.length],
        vehicle_type: '摩托车',
      },
      location: { latitude: lat, longitude: lng },
      distance_km,
    });
  }
  return items;
}

export const PassengerHomeScreen = React.memo(function PassengerHomeScreen() {
  const { showToast } = useToast();
  const { token } = useIdentity();
  const { fontScaleLevel } = useFontScale();
  const styles = STYLES_CACHE[fontScaleLevel] ?? STYLES_CACHE.standard;
  const [showTutorial, setShowTutorial] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });
  const [locationLabel, setLocationLabel] = useState<string>(DEFAULT_LABEL);
  const [drivers, setDrivers] = useState<NearbyItem[]>([]);
  const [selected, setSelected] = useState<CTADriverItem | null>(null);
  const [defaultDriver, setDefaultDriver] = useState<DefaultDriverSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [relocateLoading, setRelocateLoading] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
  const [recentContacts, setRecentContacts] = useState<RecentContactItem[]>([]);
  const mapRef = useRef<any>(null);
  const lastLocationSentAt = useRef<number>(0);
  const lastRelocateTapAt = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(STORAGE_KEY_ONBOARDING_PASSENGER_DONE);
        if (!cancelled && done !== '1') setShowTutorial(true);
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markTutorialDone = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING_PASSENGER_DONE, '1');
    } catch (_) {}
  }, []);

  /** 稳定列表数据引用，且每项为纯对象拷贝，避免 FlatList/VirtualizedList 内部对 data 的 property 操作报错 */
  const ctaListData = useMemo(() => {
    const raw = getSortedDriversForCTA(drivers, defaultDriver);
    return raw.map((item) => ({
      ...item,
      driver: { ...item.driver },
      location: { ...item.location },
    }));
  }, [drivers, defaultDriver]);

  useEffect(() => {
    const key = Platform.select({ android: AMAP_KEY, ios: AMAP_KEY });
    if (key && key !== 'YOUR_AMAP_KEY') {
      AMapSdk.init(key);
    }
  }, []);

  /** 从 AsyncStorage 读取默认司机，供排序与 CTA 展示使用 */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_DEFAULT_DRIVER)
      .then((raw) => {
        if (!raw) {
          setDefaultDriver(null);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as DefaultDriverSnapshot;
          if (parsed && typeof parsed.id === 'number' && typeof parsed.name === 'string' && typeof parsed.phone === 'string') {
            setDefaultDriver(parsed);
          } else {
            setDefaultDriver(null);
          }
        } catch {
          setDefaultDriver(null);
        }
      })
      .catch(() => setDefaultDriver(null));
  }, []);

  /** 从 AsyncStorage 读取最近联系的司机 */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_RECENT_CONTACTED_DRIVERS)
      .then((raw) => {
        if (!raw) {
          setRecentContacts([]);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as RecentContactItem[];
          if (Array.isArray(parsed)) {
            const sorted = [...parsed]
              .filter((x) => x && typeof x.driverId === 'number' && typeof x.name === 'string')
              .sort((a, b) => (b.contactedAt ?? 0) - (a.contactedAt ?? 0))
              .slice(0, RECENT_CONTACTS_MAX);
            setRecentContacts(sorted);
          } else {
            setRecentContacts([]);
          }
        } catch {
          setRecentContacts([]);
        }
      })
      .catch(() => setRecentContacts([]));
  }, []);

  const addToRecentContacts = useCallback(
    async (driverId: number, name: string, phone?: string) => {
      const item: RecentContactItem = { driverId, name, phone, contactedAt: Date.now() };
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_RECENT_CONTACTED_DRIVERS);
        let list: RecentContactItem[] = raw ? (() => {
          try {
            const p = JSON.parse(raw);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })() : [];
        list = list.filter((x) => x.driverId !== driverId);
        list.unshift(item);
        list = list.slice(0, RECENT_CONTACTS_MAX);
        await AsyncStorage.setItem(STORAGE_KEY_RECENT_CONTACTED_DRIVERS, JSON.stringify(list));
        setRecentContacts(list);
      } catch (_) {}
    },
    []
  );

  const fetchNearbyWithCenter = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await getNearbyDrivers({ lat, lng, radius_km: 10 });
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length === 0) {
          setDrivers(getMockDrivers(lat, lng));
        } else {
          setDrivers(list);
        }
      } catch (e: any) {
        showToast(getUserFacingMessage(e, '获取附近司机失败'), 'error');
        setDrivers(getMockDrivers(lat, lng));
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const tryUpdateLastLocation = useCallback(
    (lat: number, lng: number, name?: string) => {
      if (!token) return;
      const now = Date.now();
      if (now - lastLocationSentAt.current < LAST_LOCATION_THROTTLE_MS) return;
      lastLocationSentAt.current = now;
      updateUserLastLocation(token, { latitude: lat, longitude: lng, name }).catch(() => {
        // 静默失败，不影响使用
      });
    },
    [token]
  );

  /** 抽屉内「重新定位」：权限 → getCurrentPosition → 更新地图并关闭抽屉 */
  const handleRelocateInSheet = useCallback(async () => {
    const now = Date.now();
    if (now - lastRelocateTapAt.current < RELOCATE_COOLDOWN_MS) return;
    lastRelocateTapAt.current = now;

    if (Platform.OS === 'android') {
      const perm = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
      let granted = false;
      try {
        const check = await PermissionsAndroid.check(perm);
        if (check) {
          granted = true;
        } else {
          const result = await PermissionsAndroid.request(perm, {
            title: '定位权限',
            message: '用于展示您附近的可接客司机',
            buttonNeutral: '稍后',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          });
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
          if (!granted) {
            Alert.alert(
              '需要定位权限',
              '请打开手机定位并在系统设置中允许摩迪访问位置信息，以便展示附近司机。',
              [
                { text: '取消', style: 'cancel' },
                { text: '去设置', onPress: () => Linking.openSettings() },
              ]
            );
            return;
          }
        }
      } catch (_) {
        Alert.alert(
          '需要定位权限',
          '请在设置中允许摩迪使用您的位置。',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    setRelocateLoading(true);
    try {
      const pos = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(
            Object.assign(new Error('定位超时'), {
              code: 3,
              message: '定位超时，请检查 GPS 或网络后重试',
            })
          );
        }, RELOCATE_GPS_TIMEOUT_MS);
        Geolocation.getCurrentPosition(
          (p) => {
            clearTimeout(timeoutId);
            resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
          },
          (e) => {
            clearTimeout(timeoutId);
            reject(e);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
      const { lat, lng } = pos;
      const placeName = await Promise.race([
        reverseGeocode(lat, lng, AMAP_KEY),
        new Promise<string>((resolve) =>
          setTimeout(() => resolve('当前位置'), REGEO_TIMEOUT_MS)
        ),
      ]);
      setCenter({ lat, lng });
      setLocationLabel(placeName);
      if (mapRef.current) {
        mapRef.current.moveCamera(
          { target: { latitude: lat, longitude: lng }, zoom: 14 },
          300
        );
      }
      tryUpdateLastLocation(lat, lng, placeName);
      setRelocateLoading(false);
      setLoading(true);
      await fetchNearbyWithCenter(lat, lng);
      if (token) {
        addLocationHistory(token, { latitude: lat, longitude: lng, name: placeName }).catch(() => {});
      }
      showToast('已更新为当前位置', 'success');
      setLocationSheetVisible(false);
    } catch (err: any) {
      const code = err?.code;
      const isPermissionDenied = code === 1;
      const isTimeout = code === 3 || err?.message === '定位超时';
      const isUnavailable = code === 2;

      if (isPermissionDenied && Platform.OS === 'ios') {
        Alert.alert(
          '需要定位权限',
          '请打开手机定位并在系统设置中允许摩迪访问位置信息，以便展示附近司机。',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => Linking.openSettings() },
          ]
        );
      } else if (isTimeout) {
        showToast('定位超时，请到空旷处或稍后再试', 'error');
      } else if (isUnavailable) {
        showToast('暂时无法获取位置，请检查 GPS 或到空旷处重试', 'error');
      } else {
        showToast(err?.message || '定位失败，请稍后再试', 'error');
      }
    } finally {
      setRelocateLoading(false);
    }
  }, [showToast, token, fetchNearbyWithCenter, tryUpdateLastLocation]);

  /** 打开抽屉时拉取常用/历史定位列表 */
  useEffect(() => {
    if (!locationSheetVisible || !token) return;
    getLocationHistory(token)
      .then((res) => setLocationHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLocationHistory([]));
  }, [locationSheetVisible, token]);

  /** 选择「闽清县梅城镇（默认）」 */
  const handleSelectDefault = useCallback(async () => {
    if (!token) {
      setCenter({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      setLocationLabel(DEFAULT_LABEL);
      if (mapRef.current) {
        mapRef.current.moveCamera(
          { target: { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG }, zoom: 14 },
          300
        );
      }
      setLoading(true);
      await fetchNearbyWithCenter(DEFAULT_LAT, DEFAULT_LNG);
      setLocationSheetVisible(false);
      return;
    }
    setCenter({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    setLocationLabel(DEFAULT_LABEL);
    if (mapRef.current) {
      mapRef.current.moveCamera(
        { target: { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG }, zoom: 14 },
        300
      );
    }
    setLoading(true);
    await fetchNearbyWithCenter(DEFAULT_LAT, DEFAULT_LNG);
    updateUserLastLocation(token, {
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LNG,
      name: DEFAULT_LABEL,
    }).catch(() => {});
    setLocationSheetVisible(false);
  }, [token, fetchNearbyWithCenter]);

  /** 选择某条历史定位 */
  const handleSelectHistoryItem = useCallback(
    async (item: LocationHistoryItem) => {
      const { latitude: lat, longitude: lng, name } = item;
      setCenter({ lat, lng });
      setLocationLabel(name);
      if (mapRef.current) {
        mapRef.current.moveCamera(
          { target: { latitude: lat, longitude: lng }, zoom: 14 },
          300
        );
      }
      setLoading(true);
      await fetchNearbyWithCenter(lat, lng);
      if (token) {
        updateUserLastLocation(token, { latitude: lat, longitude: lng, name }).catch(() => {});
      }
      setLocationSheetVisible(false);
    },
    [token, fetchNearbyWithCenter]
  );

  useEffect(() => {
    let cancelled = false;
    let lat = DEFAULT_LAT;
    let lng = DEFAULT_LNG;
    let label = DEFAULT_LABEL;

    async function run() {
      // 不自动请求 GPS，仅使用「上次定位」或默认闽清县梅城镇
      if (token) {
        try {
          const res = await getUserProfile(token);
          const data = res.data as any;
          const lastLat = data?.last_latitude;
          const lastLng = data?.last_longitude;
          if (
            !cancelled &&
            Number.isFinite(lastLat) &&
            Number.isFinite(lastLng)
          ) {
            lat = lastLat;
            lng = lastLng;
            label = (data?.last_location_name && String(data.last_location_name).trim()) || '上次位置';
            setCenter({ lat, lng });
            setLocationLabel(label);
            if (mapRef.current) {
              mapRef.current.moveCamera(
                { target: { latitude: lat, longitude: lng }, zoom: 14 },
                300
              );
            }
          }
        } catch (_) {
          // 无上次定位，保持默认
        }
      }
      if (!cancelled && label === DEFAULT_LABEL) {
        setCenter({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        setLocationLabel(DEFAULT_LABEL);
        if (mapRef.current) {
          mapRef.current.moveCamera(
            {
              target: { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG },
              zoom: 14,
            },
            300
          );
        }
      }

      try {
        await fetchNearbyWithCenter(lat, lng);
      } catch (_) {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, fetchNearbyWithCenter]);

  const cameraPosition: CameraPosition = {
    target: { latitude: center.lat, longitude: center.lng },
    zoom: 14,
  };

  return (
    <>
      <PassengerTutorial
        visible={showTutorial}
        onSkip={() => {
          setShowTutorial(false);
          markTutorialDone();
        }}
        onComplete={() => {
          setShowTutorial(false);
          markTutorialDone();
        }}
      />
      <View style={styles.container}>
      {/* App 顶部：定位入口（图标 + 文案 + 右箭头），点击打开底部抽屉 */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [
            styles.locationEntry,
            pressed && styles.locationEntryPressed,
          ]}
          onPress={() => setLocationSheetVisible(true)}
        >
          <Text style={styles.locationEntryIcon}>📍</Text>
          <Text style={styles.locationEntryText} numberOfLines={1}>
            {locationLabel}
          </Text>
          <Text style={styles.locationEntryArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialCameraPosition={cameraPosition}
          myLocationEnabled
          myLocationButtonEnabled
          scaleControlsEnabled
          compassEnabled
          onLoad={() => {
            if (
              mapRef.current &&
              (center.lat !== DEFAULT_LAT || center.lng !== DEFAULT_LNG)
            ) {
              mapRef.current.moveCamera(
                {
                  target: { latitude: center.lat, longitude: center.lng },
                  zoom: 14,
                },
                0
              );
            }
          }}
        >
          {drivers.map((item) => (
            <Marker
              key={item.driver.id}
              position={{
                latitude: item.location.latitude,
                longitude: item.location.longitude,
              }}
              onPress={() => setSelected(item)}
            />
          ))}
        </MapView>

        {loading && (
          <View style={styles.loadingMask}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.loadingText}>加载附近司机…</Text>
          </View>
        )}
      </View>

      {/* 底部常驻：最近联系 + 附近司机 CTA */}
      <View style={styles.ctaSection}>
        {recentContacts.length > 0 ? (
          <View style={styles.recentSection}>
            <Text style={styles.recentSectionTitle}>最近联系</Text>
            {recentContacts.slice(0, RECENT_CONTACTS_SHOW).map((rc) => (
              <Pressable
                key={rc.driverId}
                style={({ pressed }) => [styles.recentRow, pressed && styles.ctaRowPressed]}
              >
                <View style={styles.recentRowCenter}>
                  <Text style={styles.ctaCardName} numberOfLines={1}>{rc.name}</Text>
                  <Text style={styles.recentRowPhone}>{rc.phone ? maskPhone(rc.phone) : '—'}</Text>
                </View>
                {rc.phone ? (
                  <GradientCallButton
                    onPress={async () => {
                      if (token) {
                        contactDriver(token, rc.driverId).then(
                          () => {
                            showToast('已通知司机', 'success');
                            addToRecentContacts(rc.driverId, rc.name, rc.phone);
                            track('passenger_contact_driver', { driverId: rc.driverId, source: 'recent' }).catch(() => {});
                          },
                          () => {}
                        );
                      }
                      Linking.openURL('tel:' + rc.phone!);
                    }}
                    style={styles.ctaCallBtn}
                  />
                ) : (
                  <Text style={styles.ctaNoPhone}>暂无法拨号</Text>
                )}
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.ctaHeaderRow}>
          <Text style={styles.ctaTitle}>附近司机</Text>
          {defaultDriver ? (
            <Text style={styles.ctaSubtitle}>默认司机排在最前</Text>
          ) : null}
        </View>
        {loading ? (
          <View style={styles.ctaLoading}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={styles.ctaLoadingText}>加载附近司机…</Text>
          </View>
        ) : ctaListData.length === 0 ? (
          <View style={styles.ctaEmpty}>
            <Text style={styles.ctaEmptyIcon}>🏍️</Text>
            <Text style={styles.ctaEmptyTitle}>暂无附近司机，试试扩大范围或稍后再看</Text>
            <Text style={styles.ctaEmptyHint}>可尝试重新定位或选择其他地点</Text>
            <Pressable
              style={[styles.ctaRelocateBtn, relocateLoading && styles.ctaRelocateBtnDisabled]}
              onPress={handleRelocateInSheet}
              disabled={relocateLoading}
            >
              {relocateLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.ctaRelocateBtnText}>重新定位</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.ctaListScroll}
            contentContainerStyle={styles.ctaListContent}
            showsVerticalScrollIndicator={false}
          >
            {ctaListData.map((item) => {
              const isDefault =
                defaultDriver && item.driver.id === defaultDriver.id;
              const canCall = !!item.driver.phone;
              const avatarSource = item.driver.avatar
                ? { uri: item.driver.avatar }
                : FALLBACK_AVATAR_IMG;
              const itemCopy: CTADriverItem = {
                ...item,
                driver: { ...item.driver },
              };
              return (
                <Pressable
                  key={`cta-${item.driver.id}-${item.isVirtual ? 'v' : 'r'}`}
                  style={({ pressed }) => [styles.ctaRow, pressed && styles.ctaRowPressed]}
                  onPress={() => setSelected(itemCopy)}
                >
                  <Image source={avatarSource} style={styles.ctaAvatar} />
                  <View style={styles.ctaRowCenter}>
                    <View style={styles.ctaCardNameRow}>
                      <Text style={styles.ctaCardName} numberOfLines={1}>
                        {item.driver.name}
                      </Text>
                      {isDefault ? (
                        <View style={styles.ctaDefaultTag}>
                          <Text style={styles.ctaDefaultTagText}>默认</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.ctaCardDistance}>
                      {item.isVirtual ? '当前较远' : `约 ${item.distance_km.toFixed(1)} km`}
                    </Text>
                    <Text style={styles.ctaCardPhone}>
                      {item.driver.phone ? maskPhone(item.driver.phone) : '—'}
                    </Text>
                  </View>
                  <View style={styles.ctaRowRight}>
                    {canCall ? (
                      <GradientCallButton
                        onPress={async () => {
                          if (token) {
                            contactDriver(token, item.driver.id).then(
                              () => {
                                showToast('已通知司机', 'success');
                                addToRecentContacts(item.driver.id, item.driver.name, item.driver.phone);
                                track('passenger_contact_driver', { driverId: item.driver.id, source: 'nearby_cta' }).catch(() => {});
                              },
                              () => {}
                            );
                          }
                          if (item.driver.phone) {
                            Linking.openURL('tel:' + item.driver.phone);
                          }
                        }}
                        style={styles.ctaCallBtn}
                      />
                    ) : (
                      <Text style={styles.ctaNoPhone}>暂无法拨号</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 底部抽屉：当前选择 + 说明 + 重新定位 */}
      <Modal
        visible={locationSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setLocationSheetVisible(false)}
        >
          <Pressable
            style={styles.sheetPanel}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>当前选择</Text>
            <Text style={styles.sheetCurrent}>{locationLabel}</Text>
            <Text style={styles.sheetHint}>
              点击下方按钮将使用您当前所在位置更新定位
            </Text>
            <Pressable
              style={[
                styles.relocateBtn,
                relocateLoading && styles.relocateBtnDisabled,
              ]}
              onPress={handleRelocateInSheet}
              disabled={relocateLoading}
            >
              {relocateLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.relocateBtnText}>重新定位</Text>
              )}
            </Pressable>

            <Text style={styles.sheetSectionTitle}>常用/历史定位</Text>
            <Pressable
              style={({ pressed }) => [styles.historyRow, pressed && styles.historyRowPressed]}
              onPress={handleSelectDefault}
            >
              <Text style={styles.historyRowName}>闽清县梅城镇（默认）</Text>
            </Pressable>
            {locationHistory.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.historyRow, pressed && styles.historyRowPressed]}
                onPress={() => handleSelectHistoryItem(item)}
              >
                <Text style={styles.historyRowName}>{item.name}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>司机信息</Text>
                  <Pressable onPress={() => setSelected(null)} hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}>
                    <Text style={styles.modalClose}>关闭</Text>
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalTopBlock}>
                    <Image
                      source={
                        selected.driver.avatar
                          ? { uri: selected.driver.avatar }
                          : FALLBACK_AVATAR_IMG
                      }
                      style={styles.modalAvatar}
                    />
                    <Text style={styles.modalName}>{selected.driver.name}</Text>
                    <Text style={styles.modalDistanceVehicle}>
                      {selected.isVirtual ? '当前较远' : `约 ${selected.distance_km.toFixed(1)} km`}
                      {selected.driver.vehicle_type ? ` · ${selected.driver.vehicle_type}` : ''}
                    </Text>
                    {selected.driver.phone ? (
                      <Text style={styles.modalPhone}>联系电话：{maskPhone(selected.driver.phone)}</Text>
                    ) : null}
                  </View>
                  <View style={styles.modalDefaultBlock}>
                    {defaultDriver && defaultDriver.id === selected.driver.id ? (
                      <View style={styles.modalDefaultRow}>
                        <Text style={styles.modalDefaultLabel}>已设为默认</Text>
                        <Pressable
                          style={({ pressed }) => [styles.modalDefaultBtn, pressed && styles.modalDefaultBtnPressed]}
                          onPress={async () => {
                            await AsyncStorage.removeItem(STORAGE_KEY_DEFAULT_DRIVER);
                            setDefaultDriver(null);
                            showToast('已取消默认司机', 'success');
                          }}
                        >
                          <Text style={styles.modalDefaultBtnText}>取消默认</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.modalDefaultBtn, pressed && styles.modalDefaultBtnPressed]}
                        onPress={async () => {
                          const payload = {
                            id: selected.driver.id,
                            name: selected.driver.name,
                            phone: selected.driver.phone || '',
                          };
                          await AsyncStorage.setItem(STORAGE_KEY_DEFAULT_DRIVER, JSON.stringify(payload));
                          setDefaultDriver(payload);
                          showToast('已设为默认司机，将优先显示在下方', 'success');
                        }}
                      >
                        <Text style={styles.modalDefaultBtnText}>设为默认司机</Text>
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
                <View style={styles.modalCtaBlock}>
                  {selected.driver.phone ? (
                    <GradientCallButton
                      large
                      onPress={async () => {
                        if (token) {
                          contactDriver(token, selected.driver.id).then(
                            () => {
                              showToast('已通知司机', 'success');
                              addToRecentContacts(selected.driver.id, selected.driver.name, selected.driver.phone);
                              track('passenger_contact_driver', { driverId: selected.driver.id, source: 'modal' }).catch(() => {});
                            },
                            () => {}
                          );
                        }
                        Linking.openURL('tel:' + selected.driver.phone);
                      }}
                      style={styles.modalCallBtn}
                    />
                  ) : (
                    <Text style={styles.noPhone}>暂无法拨号</Text>
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      </View>
    </>
  );
});

function createStyles(fontScaleLevel: FontScaleLevel) {
  const fontScale = FONT_SCALE_VALUES[fontScaleLevel] ?? 1;
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  topBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  locationEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadiusSm,
    backgroundColor: 'rgba(248,250,252,0.98)',
    maxWidth: '85%',
  },
  locationEntryPressed: {
    opacity: 0.85,
  },
  locationEntryIcon: {
    fontSize: scaledFontSize(16, fontScale),
    marginRight: 8,
  },
  locationEntryText: {
    fontSize: scaledFontSize(14, fontScale),
    color: theme.text,
    fontWeight: '500',
    maxWidth: 180,
  },
  locationEntryArrow: {
    fontSize: scaledFontSize(18, fontScale),
    color: theme.textMuted,
    marginLeft: 4,
    fontWeight: '300',
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetPanel: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: theme.borderRadius,
    borderTopRightRadius: theme.borderRadius,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: scaledFontSize(13, fontScale),
    color: theme.textMuted,
    marginBottom: 4,
  },
  sheetCurrent: {
    fontSize: scaledFontSize(18, fontScale),
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  sheetHint: {
    fontSize: scaledFontSize(13, fontScale),
    color: theme.textMuted,
    marginBottom: 20,
    lineHeight: 20,
  },
  relocateBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
    alignItems: 'center',
  },
  relocateBtnDisabled: {
    opacity: 0.7,
  },
  relocateBtnText: {
    color: '#fff',
    fontSize: scaledFontSize(16, fontScale),
    fontWeight: '600',
  },
  sheetSectionTitle: {
    fontSize: scaledFontSize(13, fontScale),
    color: theme.textMuted,
    marginTop: 24,
    marginBottom: 8,
  },
  historyRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderLight,
  },
  historyRowPressed: {
    backgroundColor: theme.surface2,
  },
  historyRowName: {
    fontSize: scaledFontSize(15, fontScale),
    color: theme.text,
    fontWeight: '500',
  },
  loadingMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: scaledFontSize(14, fontScale),
    color: theme.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: theme.borderRadius,
    borderTopRightRadius: theme.borderRadius,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: scaledFontSize(18, fontScale),
    fontWeight: '700',
    color: theme.text,
  },
  modalClose: {
    fontSize: scaledFontSize(15, fontScale),
    color: theme.accent,
    fontWeight: '600',
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: 320,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalTopBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: theme.borderLight,
  },
  modalName: {
    fontSize: scaledFontSize(20, fontScale),
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  modalDistanceVehicle: {
    fontSize: scaledFontSize(14, fontScale),
    color: theme.textMuted,
  },
  modalPhone: {
    fontSize: scaledFontSize(14, fontScale),
    color: theme.textMuted,
    marginTop: 4,
  },
  modalDefaultBlock: {
    backgroundColor: theme.surface2,
    borderRadius: theme.borderRadiusSm,
    padding: 14,
    marginBottom: 20,
  },
  modalCtaBlock: {
    paddingTop: 8,
  },
  modalCallBtn: {
    width: '100%',
  },
  modalDistance: {
    fontSize: 15,
    color: theme.textMuted,
    marginBottom: 4,
  },
  modalMeta: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 16,
  },
  noPhone: {
    fontSize: scaledFontSize(14, fontScale),
    color: theme.textMuted,
    marginTop: 8,
  },
  /* 底部 CTA 区域 */
  ctaSection: {
    minHeight: 110,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  recentSection: {
    marginBottom: 10,
  },
  recentSectionTitle: {
    fontSize: scaledFontSize(13, fontScale),
    color: theme.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: theme.surface2,
    borderRadius: 8,
  },
  recentRowCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  recentRowPhone: {
    fontSize: scaledFontSize(12, fontScale),
    color: theme.textMuted,
    marginTop: 2,
  },
  ctaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ctaTitle: {
    fontSize: scaledFontSize(16, fontScale),
    fontWeight: '600',
    color: theme.text,
  },
  ctaSubtitle: {
    fontSize: scaledFontSize(12, fontScale),
    color: theme.textMuted,
  },
  ctaLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  ctaLoadingText: {
    fontSize: scaledFontSize(14, fontScale),
    color: theme.textMuted,
  },
  ctaEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  ctaEmptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  ctaEmptyTitle: {
    fontSize: scaledFontSize(15, fontScale),
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  ctaEmptyHint: {
    fontSize: scaledFontSize(13, fontScale),
    color: theme.textMuted,
    marginBottom: 12,
  },
  ctaRelocateBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadiusSm,
    alignSelf: 'center',
  },
  ctaRelocateBtnDisabled: {
    opacity: 0.7,
  },
  ctaRelocateBtnText: {
    color: '#fff',
    fontSize: scaledFontSize(14, fontScale),
    fontWeight: '600',
  },
  ctaListScroll: {
    maxHeight: 320,
  },
  ctaListContent: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.surface2,
    borderRadius: 8,
  },
  ctaRowPressed: {
    opacity: 0.95,
  },
  ctaAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: theme.borderLight,
  },
  ctaRowCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  ctaRowRight: {
    marginLeft: 8,
    minWidth: 88,
    alignItems: 'flex-end',
  },
  ctaCallBtn: {
    minHeight: 48,
    alignSelf: 'stretch',
  },
  /* 原 ctaCard 内文案样式复用 */
  ctaScrollContent: {
    paddingRight: 12,
    paddingLeft: 4,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 180,
    height: 60,
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.surface2,
    borderRadius: 8,
  },
  ctaCardLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  ctaCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  ctaCardName: {
    fontSize: scaledFontSize(16, fontScale),
    fontWeight: '700',
    color: theme.text,
  },
  ctaDefaultTag: {
    backgroundColor: theme.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ctaDefaultTagText: {
    fontSize: scaledFontSize(11, fontScale),
    fontWeight: '600',
    color: theme.accent,
  },
  ctaCardDistance: {
    fontSize: scaledFontSize(12, fontScale),
    color: theme.textMuted,
  },
  ctaCardPhone: {
    fontSize: scaledFontSize(12, fontScale),
    color: theme.textMuted,
    marginTop: 2,
  },
  ctaCardRight: {
    marginLeft: 8,
  },
  ctaNoPhone: {
    fontSize: scaledFontSize(12, fontScale),
    color: theme.textMuted,
  },
  modalDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  modalDefaultLabel: {
    fontSize: scaledFontSize(14, fontScale),
    color: theme.textMuted,
  },
  modalDefaultBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadiusSm,
    backgroundColor: theme.accentSoft,
    alignSelf: 'flex-start',
  },
  modalDefaultBtnPressed: {
    opacity: 0.9,
  },
  modalDefaultBtnText: {
    fontSize: scaledFontSize(14, fontScale),
    fontWeight: '600',
    color: theme.accent,
  },
});
}

const STYLES_CACHE: Record<FontScaleLevel, ReturnType<typeof createStyles>> = {
  small: createStyles('small'),
  standard: createStyles('standard'),
  large: createStyles('large'),
};
