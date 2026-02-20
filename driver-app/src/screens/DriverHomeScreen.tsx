import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { setAvailability } from '../services/api';
import { colors } from '../theme/colors';

export function DriverHomeScreen() {
  const { token, driver } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(driver?.is_available ?? false);

  const {
    coords,
    permissionGranted,
    error: locationError,
    requestPermission,
    updateLocation,
  } = useLocation(token, driver?.status === 'approved');

  useEffect(() => {
    setIsAvailable(driver?.is_available ?? false);
  }, [driver?.is_available]);

  const onToggleAvailability = async () => {
    if (!token || availabilityLoading) return;
    setAvailabilityLoading(true);
    try {
      await setAvailability(token, !isAvailable);
      setIsAvailable(!isAvailable);
    } catch (e: any) {
      Alert.alert('提示', e.message || '状态更新失败');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    updateLocation();
    setTimeout(() => setRefreshing(false), 800);
  };

  const needPermission = permissionGranted === false && !coords;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {driver?.status === 'pending' && (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>⏳ 待审核</Text>
          <Text style={styles.pendingDesc}>您的资料正在审核中，通过后可接单并上报定位</Text>
        </View>
      )}

      {driver?.status === 'approved' && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>我的位置</Text>
            {needPermission && (
              <Pressable onPress={requestPermission} style={styles.permissionBtn}>
                <Text style={styles.permissionBtnText}>开启定位权限</Text>
              </Pressable>
            )}
            {locationError && (
              <Text style={styles.errorText}>{locationError}</Text>
            )}
            {coords && (
              <View style={styles.coordsRow}>
                <Text style={styles.coordsLabel}>经度</Text>
                <Text style={styles.coordsValue}>{coords.longitude.toFixed(6)}</Text>
              </View>
            )}
            {coords && (
              <View style={styles.coordsRow}>
                <Text style={styles.coordsLabel}>纬度</Text>
                <Text style={styles.coordsValue}>{coords.latitude.toFixed(6)}</Text>
              </View>
            )}
            {coords && (
              <Text style={styles.hint}>每 30 秒自动上报，乘客可见您的位置</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>接客状态</Text>
            <Pressable
              onPress={onToggleAvailability}
              style={[
                styles.availabilityBtn,
                isAvailable ? styles.availabilityBtnOn : styles.availabilityBtnOff,
              ]}
              disabled={availabilityLoading}
            >
              <Text style={styles.availabilityBtnText}>
                {isAvailable ? '🟢 空闲可接客' : '⚪ 暂不接客'}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>摩迪 · 司机端</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  pendingCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pendingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  pendingDesc: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  permissionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  permissionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  coordsLabel: {
    width: 48,
    fontSize: 14,
    color: colors.textSecondary,
  },
  coordsValue: {
    fontSize: 15,
    fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
  },
  availabilityBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  availabilityBtnOn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  availabilityBtnOff: {
    backgroundColor: colors.divider,
    borderWidth: 1,
    borderColor: colors.border,
  },
  availabilityBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
