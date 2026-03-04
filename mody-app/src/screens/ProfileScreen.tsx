import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useIdentity } from '../context/IdentityContext';
import type { Identity } from '../context/IdentityContext';
import { getDriverProfile } from '../services/api';
import { theme } from '../theme';

type Props = {
  onSwitchIdentity: () => void;
  onLoginAs: (role: Identity) => void;
  onOpenVerification?: () => void;
};

export function ProfileScreen({ onSwitchIdentity, onLoginAs, onOpenVerification }: Props) {
  const {
    currentIdentity,
    token,
    hasDriver,
    driverStatus: contextDriverStatus,
    setIdentity,
    logout,
  } = useIdentity();
  const [driverStatus, setDriverStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => {
    if (currentIdentity !== 'driver' || !token) {
      setDriverStatus(contextDriverStatus ?? null);
      return;
    }
    getDriverProfile(token)
      .then((res) => {
        if (res?.data?.status) setDriverStatus(res.data.status as 'pending' | 'approved' | 'rejected');
        else setDriverStatus(contextDriverStatus ?? null);
      })
      .catch(() => setDriverStatus(contextDriverStatus ?? null));
  }, [currentIdentity, token, contextDriverStatus]);

  const roleLabel = currentIdentity === 'passenger' ? '乘客' : '司机';
  const otherIdentity: Identity = currentIdentity === 'passenger' ? 'driver' : 'passenger';
  const otherLabel = otherIdentity === 'passenger' ? '乘客' : '司机';

  function handleSwitchToOther() {
    setIdentity(otherIdentity);
    onSwitchIdentity();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, currentIdentity === 'passenger' ? styles.cardIconP : styles.cardIconD]}>
            <Text style={styles.cardIconText}>{currentIdentity === 'passenger' ? '👤' : '🏍️'}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>当前身份</Text>
            <Text style={styles.identityLabel}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {currentIdentity === 'driver' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, styles.cardIconVerify]}>
              <Text style={styles.cardIconText}>🪪</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>身份认证</Text>
              <Text style={styles.cardHint}>
                {driverStatus === 'approved'
                  ? '已通过'
                  : driverStatus === 'rejected'
                    ? '已驳回 / 已被禁用，请重新认证'
                    : driverStatus === 'pending'
                      ? '认证中（审核需要一定时间，请耐心等候）'
                      : '未认证'}
              </Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              onPress={onOpenVerification}
            >
              <Text style={styles.btnIcon}>→</Text>
              <Text style={styles.btnText}>
                {driverStatus === 'approved' ? '查看认证' : '去认证'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.cardIconSwitch]}>
            <Text style={styles.cardIconText}>🔄</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>切换身份</Text>
            <Text style={styles.cardHint}>
              切换为{otherLabel}后，主界面将显示{otherLabel}端功能。
              {otherIdentity === 'driver' && !hasDriver && ' 尚未申请司机身份，切换后需先完成认证。'}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={handleSwitchToOther}>
            <Text style={styles.btnIcon}>→</Text>
            <Text style={styles.btnText}>切换为{otherLabel}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.btnOutline, pressed && styles.btnPressed]} onPress={logout}>
        <Text style={styles.btnOutlineIcon}>🚪</Text>
        <Text style={styles.btnOutlineText}>退出登录</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: theme.bg,
    gap: 16,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 24 },
  cardIconP: { backgroundColor: theme.blueSoft },
  cardIconD: { backgroundColor: theme.greenSoft },
  cardIconSwitch: { backgroundColor: theme.accentSoft },
  cardIconVerify: { backgroundColor: 'rgba(217,119,6,0.15)' },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 4 },
  cardHint: { fontSize: 13, color: theme.textMuted, lineHeight: 20 },
  identityLabel: { fontSize: 16, color: theme.text },
  cardBody: { padding: 20 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
  },
  btnPressed: { opacity: 0.9 },
  btnIcon: { fontSize: 18, color: theme.text },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  btnOutlineIcon: { fontSize: 18 },
  btnOutlineText: { color: theme.textMuted, fontWeight: '600', fontSize: 15 },
});
