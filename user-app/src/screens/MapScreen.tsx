import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { AMapSdk, MapView, Marker } from 'react-native-amap3d';
import Geolocation from '@react-native-community/geolocation';
import { getNearbyDrivers, NearbyDriverItem } from '../services/api';
import { colors } from '../theme/colors';

const amapConfig = require('../config/amap.js');

const DEFAULT_CENTER = { latitude: 31.2304, longitude: 121.4737 };
const DEFAULT_ZOOM = 14;

export function MapScreen() {
  const [cameraPosition, setCameraPosition] = useState({
    target: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [drivers, setDrivers] = useState<NearbyDriverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriverItem | null>(null);
  const [amapInited, setAmapInited] = useState(false);
  const [hasAmapKey, setHasAmapKey] = useState(true);
  const mapRef = useRef<MapView | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const androidKey = amapConfig.android || '';
    const iosKey = amapConfig.ios || '';
    if (androidKey || iosKey) {
      AMapSdk.init(Platform.select({ android: androidKey, ios: iosKey }) || '');
      setAmapInited(true);
    } else {
      setHasAmapKey(false);
      setAmapInited(true);
      setLocationError('未配置高德地图 Key，请在 src/config/amap.js 中填写');
    }
  }, []);

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await getNearbyDrivers({ lat, lng, radius_km: 10 });
      setDrivers(res.data || []);
    } catch (e: any) {
      setDrivers([]);
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '位置权限',
          message: '需要获取您的位置以显示附近司机并在地图上标注',
          buttonNeutral: '稍后',
          buttonNegative: '拒绝',
          buttonPositive: '允许',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  const updateLocation = useCallback(async () => {
    setLocationError(null);
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setLocationError('未授予位置权限，无法获取附近司机。请到系统设置中允许本应用使用位置。');
      setUserLocation(null);
      return;
    }
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setCameraPosition((prev) => ({ ...prev, target: { latitude, longitude }, zoom: DEFAULT_ZOOM }));
        const map = mapRef.current as any;
        if (map?.moveCamera) {
          map.moveCamera({ target: { latitude, longitude }, zoom: DEFAULT_ZOOM }, 300);
        }
        setLoading(true);
        fetchNearby(latitude, longitude).finally(() => setLoading(false));
      },
      (err) => {
        const msg = err?.message || err?.code === 1 ? '未授予位置权限' : '获取定位失败';
        setLocationError(msg === '未授予位置权限' ? '未授予位置权限，请到设置中允许本应用使用位置。' : msg);
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [fetchNearby, requestLocationPermission]);

  useEffect(() => {
    if (amapInited) updateLocation();
  }, [amapInited, updateLocation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userLocation) {
      fetchNearby(userLocation.latitude, userLocation.longitude).finally(() => setRefreshing(false));
    } else {
      updateLocation();
      setTimeout(() => setRefreshing(false), 1500);
    }
  }, [userLocation, fetchNearby, updateLocation]);

  const onCameraIdle = useCallback(
    (e: { nativeEvent: { cameraPosition?: { target?: { latitude: number; longitude: number } } } }) => {
      const target = e?.nativeEvent?.cameraPosition?.target;
      if (!target) return;
      if (fetchTimeoutRef.current != null) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchNearby(target.latitude, target.longitude);
      }, 500);
    },
    [fetchNearby]
  );

  const onCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('提示', '无法拨打电话'));
  };

  if (!amapInited) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>正在初始化地图…</Text>
      </View>
    );
  }

  if (!hasAmapKey) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>未配置高德地图 Key</Text>
        <Text style={styles.emptyHint}>请在 src/config/amap.js 中填写 Android / iOS Key</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={(ref) => ((mapRef as React.MutableRefObject<MapView | null>).current = ref)}
        style={StyleSheet.absoluteFill}
        initialCameraPosition={cameraPosition}
        myLocationButtonEnabled={Platform.OS === 'android'}
        compassEnabled
        scaleControlsEnabled
        onCameraIdle={onCameraIdle}
      >
        {userLocation && <Marker position={userLocation} zIndex={100} />}
        {drivers.map((item) => (
          <Marker
            key={item.driver.id}
            position={{
              latitude: item.location.latitude,
              longitude: item.location.longitude,
            }}
            onPress={() => setSelectedDriver(item)}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载附近司机…</Text>
        </View>
      )}

      {locationError && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>⚠️ {locationError}</Text>
          <View style={styles.bannerBtns}>
            {locationError.includes('位置权限') ? (
              <Pressable onPress={() => Linking.openSettings()} style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>去设置</Text>
              </Pressable>
            ) : null}
            {!locationError.includes('高德') ? (
              <Pressable onPress={updateLocation} style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>重试</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {!loading && !locationError && drivers.length === 0 && userLocation && (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyText}>附近暂无可用司机</Text>
          <Text style={styles.emptyHint}>稍后刷新或扩大范围</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <Text style={styles.countText}>附近司机：{drivers.length} 位</Text>
        <Pressable onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.refreshBtnText}>刷新</Text>}
        </Pressable>
      </View>

      <Modal visible={!!selectedDriver} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDriver(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedDriver && (
              <>
                <Text style={styles.modalTitle}>{selectedDriver.driver.name || `司机 ${selectedDriver.driver.id}`}</Text>
                <Text style={styles.modalDistance}>距离约 {selectedDriver.distance_km.toFixed(1)} 公里</Text>
                {selectedDriver.driver.vehicle_type ? (
                  <Text style={styles.modalMeta}>{selectedDriver.driver.vehicle_type}</Text>
                ) : null}
                <Pressable
                  onPress={() => onCall(selectedDriver.driver.phone)}
                  style={styles.callBtn}
                >
                  <Text style={styles.callBtnText}>📞 拨打电话</Text>
                </Pressable>
                <Pressable onPress={() => setSelectedDriver(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>关闭</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 15, color: colors.textSecondary },
  banner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerText: { flex: 1, fontSize: 14, color: colors.text },
  bannerBtns: { flexDirection: 'row', gap: 12 },
  bannerBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  bannerBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  emptyBanner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: colors.backgroundCard,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  countText: { fontSize: 16, fontWeight: '600', color: colors.text },
  refreshBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primaryLight, minWidth: 72, alignItems: 'center' },
  refreshBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  modalCard: {
    marginHorizontal: 24,
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'stretch',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  modalDistance: { fontSize: 15, color: colors.textSecondary, marginBottom: 4, textAlign: 'center' },
  modalMeta: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  callBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  callBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  closeBtn: { paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 16, color: colors.textSecondary },
});
