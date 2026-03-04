import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';

const STORAGE_KEY_ASKED_AT = '@mody_driver_notification_permission_asked_at';
const REASK_AFTER_DAYS = 7;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function DriverNotificationPermissionModal({ visible, onClose }: Props) {
  const [requesting, setRequesting] = useState(false);

  const requestPermission = useCallback(async () => {
    setRequesting(true);
    const now = Date.now();
    await AsyncStorage.setItem(STORAGE_KEY_ASKED_AT, String(now));

    if (Platform.OS === 'android') {
      const PermissionsAndroid = require('react-native').PermissionsAndroid;
      const perm = (PermissionsAndroid.PERMISSIONS && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) || 'android.permission.POST_NOTIFICATIONS';
      try {
        const granted = await PermissionsAndroid.request(perm, {
          title: '系统通知权限',
          message: '需要开启系统通知权限后，才能及时收到乘客联系，不错过每一单',
          buttonNeutral: '稍后',
          buttonNegative: '拒绝',
          buttonPositive: '允许',
        });
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // 已授权
        }
      } catch (_) {}
    } else if (Platform.OS === 'ios') {
      try {
        const notifee = require('@notifee/react-native').default;
        await notifee.requestPermission();
      } catch (_) {}
    }
    setRequesting(false);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>开启系统通知</Text>
          <Text style={styles.hint}>
            需要开启系统通知权限后，才能及时收到乘客联系，不错过每一单
          </Text>
          <View style={styles.buttons}>
            <Pressable
              style={styles.btnSecondary}
              onPress={onClose}
              disabled={requesting}
            >
              <Text style={styles.btnSecondaryText}>稍后</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, requesting && styles.btnDisabled]}
              onPress={requestPermission}
              disabled={requesting}
            >
              <Text style={styles.btnPrimaryText}>
                {requesting ? '请求中…' : '开启'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export async function shouldShowNotificationPermissionModal(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ASKED_AT);
    if (raw == null) return true;
    const askedAt = parseInt(raw, 10);
    if (!Number.isFinite(askedAt)) return true;
    const daysSince = (Date.now() - askedAt) / (24 * 60 * 60 * 1000);
    return daysSince >= REASK_AFTER_DAYS;
  } catch {
    return true;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadiusSm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textMuted,
  },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadiusSm,
    backgroundColor: theme.accent,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
