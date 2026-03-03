import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { AMapSdk, MapView, Marker } from 'react-native-amap3d';
import type { CameraPosition } from 'react-native-amap3d';
import Geolocation from '@react-native-community/geolocation';
import {
  getNearbyDrivers,
  getUserProfile,
  updateUserLastLocation,
  getLocationHistory,
  addLocationHistory,
  getUserFacingMessage,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { useIdentity } from '../context/IdentityContext';
import { theme } from '../theme';
import { AMAP_KEY } from '../config/amapKey';
import { reverseGeocode } from '../utils/amapRegeo';

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
  driver: { id: number; phone?: string; name: string; vehicle_type?: string };
  location: { latitude: number; longitude: number };
  distance_km: number;
};

type LocationHistoryItem = {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  created_at: string;
};

function getMockDrivers(centerLat: number, centerLng: number): NearbyItem[] {
  const names = ['张师傅', '李师傅', '王师傅', '刘师傅', '陈师傅'];
  const phones = ['13800001001', '13800001002', '13800001003', '13800001004', '13800001005'];
  const count = 2 + Math.floor(Math.random() * 4);
  const items: NearbyItem[] = [];
  for (let i = 0; i < count; i++) {
    const lat = centerLat + (Math.random() - 0.5) * 0.04;
    const lng = centerLng + (Math.random() - 0.5) * 0.04;
    const distance_km = Math.round((Math.random() * 5 + 0.5) * 10) / 10;
    items.push({
      driver: {
        id: 9000 + i,
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

export function PassengerHomeScreen() {
  const { showToast } = useToast();
  const { userToken } = useIdentity();
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });
  const [locationLabel, setLocationLabel] = useState<string>(DEFAULT_LABEL);
  const [drivers, setDrivers] = useState<NearbyItem[]>([]);
  const [selected, setSelected] = useState<NearbyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [relocateLoading, setRelocateLoading] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
  const mapRef = useRef<any>(null);
  const lastLocationSentAt = useRef<number>(0);
  const lastRelocateTapAt = useRef<number>(0);

  useEffect(() => {
    const key = Platform.select({ android: AMAP_KEY, ios: AMAP_KEY });
    if (key && key !== 'YOUR_AMAP_KEY') {
      AMapSdk.init(key);
    }
  }, []);

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
      if (!userToken) return;
      const now = Date.now();
      if (now - lastLocationSentAt.current < LAST_LOCATION_THROTTLE_MS) return;
      lastLocationSentAt.current = now;
      updateUserLastLocation(userToken, { latitude: lat, longitude: lng, name }).catch(() => {
        // 静默失败，不影响使用
      });
    },
    [userToken]
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
      if (userToken) {
        addLocationHistory(userToken, { latitude: lat, longitude: lng, name: placeName }).catch(() => {});
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
  }, [showToast, userToken, fetchNearbyWithCenter, tryUpdateLastLocation]);

  /** 打开抽屉时拉取常用/历史定位列表 */
  useEffect(() => {
    if (!locationSheetVisible || !userToken) return;
    getLocationHistory(userToken)
      .then((res) => setLocationHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLocationHistory([]));
  }, [locationSheetVisible, userToken]);

  /** 选择「闽清县梅城镇（默认）」 */
  const handleSelectDefault = useCallback(async () => {
    if (!userToken) {
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
    updateUserLastLocation(userToken, {
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LNG,
      name: DEFAULT_LABEL,
    }).catch(() => {});
    setLocationSheetVisible(false);
  }, [userToken, fetchNearbyWithCenter]);

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
      if (userToken) {
        updateUserLastLocation(userToken, { latitude: lat, longitude: lng, name }).catch(() => {});
      }
      setLocationSheetVisible(false);
    },
    [userToken, fetchNearbyWithCenter]
  );

  useEffect(() => {
    let cancelled = false;
    let lat = DEFAULT_LAT;
    let lng = DEFAULT_LNG;
    let label = DEFAULT_LABEL;

    async function run() {
      // 不自动请求 GPS，仅使用「上次定位」或默认闽清县梅城镇
      if (userToken) {
        try {
          const res = await getUserProfile(userToken);
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
  }, [userToken, fetchNearbyWithCenter]);

  const cameraPosition: CameraPosition = {
    target: { latitude: center.lat, longitude: center.lng },
    zoom: 14,
  };

  return (
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
                  <Pressable onPress={() => setSelected(null)} hitSlop={12}>
                    <Text style={styles.modalClose}>关闭</Text>
                  </Pressable>
                </View>
                <Text style={styles.modalName}>{selected.driver.name}</Text>
                <Text style={styles.modalDistance}>
                  约 {selected.distance_km.toFixed(1)} km
                </Text>
                {selected.driver.vehicle_type ? (
                  <Text style={styles.modalMeta}>{selected.driver.vehicle_type}</Text>
                ) : null}
                {selected.driver.phone ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.callBtn,
                      pressed && styles.callBtnPressed,
                    ]}
                    onPress={() =>
                      Linking.openURL('tel:' + selected.driver.phone)
                    }
                  >
                    <Text style={styles.callBtnText}>拨打电话</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.noPhone}>暂无法拨号</Text>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 16,
    marginRight: 8,
  },
  locationEntryText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
    maxWidth: 180,
  },
  locationEntryArrow: {
    fontSize: 18,
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
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 4,
  },
  sheetCurrent: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  sheetHint: {
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: '600',
  },
  sheetSectionTitle: {
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 14,
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
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  modalClose: {
    fontSize: 15,
    color: theme.accent,
    fontWeight: '600',
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 6,
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
  callBtn: {
    backgroundColor: theme.green,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
    alignItems: 'center',
  },
  callBtnPressed: { opacity: 0.9 },
  callBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noPhone: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 8,
  },
});
