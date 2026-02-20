import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const onLogout = () => {
    Alert.alert('退出登录', '确定要退出吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: logout },
    ]);
  };

  const verifiedText = user?.status === 1 ? '已认证' : '未认证';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>个人信息</Text>
        <View style={styles.row}>
          <Text style={styles.label}>昵称</Text>
          <Text style={styles.value}>{user?.name || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>手机号</Text>
          <Text style={styles.value}>{user?.phone || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>实名认证</Text>
          <Text style={[styles.value, user?.status === 1 ? styles.verified : styles.unverified]}>{verifiedText}</Text>
        </View>
      </View>
      <Pressable onPress={onLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>退出登录</Text>
      </Pressable>
      <View style={styles.footer}>
        <Text style={styles.footerText}>摩迪乘客端 v1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  label: { width: 80, fontSize: 15, color: colors.textSecondary },
  value: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  verified: { color: colors.success },
  unverified: { color: colors.textSecondary },
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  logoutBtnText: { fontSize: 16, fontWeight: '600', color: colors.error },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 12, color: colors.textSecondary },
});
