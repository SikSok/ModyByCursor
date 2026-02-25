import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { AMapSdk, MapView, Marker } from 'react-native-amap3d';
import type { CameraPosition } from 'react-native-amap3d';
import Geolocation from '@react-native-community/geolocation';
import { getNearbyDrivers, getUserFacingMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';
import { AMAP_KEY } from '../config/amapKey';

const DEFAULT_LAT = 31.23;
const DEFAULT_LNG = 121.47;

type NearbyItem = {
  driver: { id: number; phone?: string; name: string; vehicle_type?: string };
  location: { latitude: number; longitude: number };
  distance_km: number;
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
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [drivers, setDrivers] = useState<NearbyItem[]>([]);
  const [selected, setSelected] = useState<NearbyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationFailed, setLocationFailed] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const key = Platform.select({ android: AMAP_KEY, ios: AMAP_KEY });
    if (key && key !== 'YOUR_AMAP_KEY') {
      AMapSdk.init(key);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let lat = DEFAULT_LAT;
    let lng = DEFAULT_LNG;

    async function run() {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            { title: '定位权限', message: '用于展示您附近的可接客司机', buttonNeutral: '稍后', buttonNegative: '拒绝', buttonPositive: '允许' }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            if (!cancelled) {
              showToast('未获取到定位，显示默认区域', 'info');
              setLocationFailed(true);
            }
          }
        } catch (_) {
          if (!cancelled) setLocationFailed(true);
        }
      }

      try {
        const pos = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            (e) => reject(e),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });
        lat = pos.lat;
        lng = pos.lng;
        if (!cancelled) setCenter({ lat, lng });
        if (mapRef.current && !cancelled) {
          mapRef.current.moveCamera({ target: { latitude: lat, longitude: lng }, zoom: 14 }, 300);
        }
      } catch (_) {
        if (!cancelled) {
          setLocationFailed(true);
          showToast('未获取到定位，显示默认区域', 'info');
        }
      }

      try {
        const res = await getNearbyDrivers({ lat, lng, radius_km: 10 });
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length === 0) {
          setDrivers(getMockDrivers(lat, lng));
        } else {
          setDrivers(list);
        }
      } catch (e: any) {
        if (!cancelled) {
          showToast(getUserFacingMessage(e, '获取附近司机失败'), 'error');
          setDrivers(getMockDrivers(lat, lng));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [showToast]);

  const cameraPosition: CameraPosition = {
    target: { latitude: center.lat, longitude: center.lng },
    zoom: 14,
  };

  return (
    <View style={styles.container}>
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
            if (mapRef.current && center.lat !== DEFAULT_LAT && center.lng !== DEFAULT_LNG) {
              mapRef.current.moveCamera({ target: { latitude: center.lat, longitude: center.lng }, zoom: 14 }, 0);
            }
          }}
        >
          {drivers.map((item) => (
            <Marker
              key={item.driver.id}
              position={{ latitude: item.location.latitude, longitude: item.location.longitude }}
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
        {locationFailed && (
          <View style={styles.hintBar}>
            <Text style={styles.hintText}>未获取到定位，显示默认区域</Text>
          </View>
        )}
      </View>

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
                <Text style={styles.modalDistance}>约 {selected.distance_km.toFixed(1)} km</Text>
                {selected.driver.vehicle_type ? (
                  <Text style={styles.modalMeta}>{selected.driver.vehicle_type}</Text>
                ) : null}
                {selected.driver.phone ? (
                  <Pressable
                    style={({ pressed }) => [styles.callBtn, pressed && styles.callBtnPressed]}
                    onPress={() => Linking.openURL('tel:' + selected.driver.phone)}
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
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
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
  hintBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
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
