import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { getNearbyDrivers, userLogin, userRegister } from '../services/api';

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');
  const [lat, setLat] = useState('31.2304');
  const [lng, setLng] = useState('121.4737');
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);

  const canAuth = useMemo(() => phone.length >= 6 && password.length >= 6, [phone, password]);

  async function onLogin() {
    try {
      const res = await userLogin({ phone, password });
      setToken(res.data.token);
      setLog('登录成功');
    } catch (e: any) {
      setLog(e.message || '登录失败');
    }
  }

  async function onRegister() {
    try {
      const res = await userRegister({ phone, password, name });
      setToken(res.data.token);
      setLog('注册成功');
    } catch (e: any) {
      setLog(e.message || '注册失败');
    }
  }

  async function onNearby() {
    try {
      const res = await getNearbyDrivers({ lat: Number(lat), lng: Number(lng), radius_km: 10 });
      setNearbyCount(res.data.length);
      setLog(`附近司机数量：${res.data.length}`);
    } catch (e: any) {
      setLog(e.message || '获取失败');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>摩迪 · 用户端（重构后骨架）</Text>

      <View style={styles.tabs}>
        <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.tabActive]}>
          <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>登录</Text>
        </Pressable>
        <Pressable onPress={() => setMode('register')} style={[styles.tab, mode === 'register' && styles.tabActive]}>
          <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>注册</Text>
        </Pressable>
      </View>

      <TextInput value={phone} onChangeText={setPhone} placeholder="手机号" style={styles.input} keyboardType="phone-pad" />

      {mode === 'register' ? (
        <TextInput value={name} onChangeText={setName} placeholder="昵称（可选）" style={styles.input} />
      ) : (
        <View style={styles.row}>
          <Text style={styles.hint}>使用手机号+密码登录</Text>
        </View>
      )}

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="密码（>=6位）"
        style={styles.input}
        secureTextEntry
      />

      <Pressable
        onPress={mode === 'login' ? onLogin : onRegister}
        style={[styles.btn, !canAuth && styles.btnDisabled]}
        disabled={!canAuth}
      >
        <Text style={styles.btnText}>{mode === 'login' ? '登录' : '注册'}</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>附近司机（联调用）</Text>
        <Text style={styles.small}>token：{token ? token.slice(0, 24) + '…' : '未登录（此接口无需登录）'}</Text>
        <View style={styles.row}>
          <TextInput value={lat} onChangeText={setLat} placeholder="lat" style={[styles.input, styles.inputFlex]} />
          <TextInput value={lng} onChangeText={setLng} placeholder="lng" style={[styles.input, styles.inputFlex]} />
        </View>
        <Pressable onPress={onNearby} style={styles.btnMinor}>
          <Text style={styles.btnMinorText}>查询 10km 内可接客司机</Text>
        </Pressable>
        <Text style={styles.small}>最近一次查询结果：{nearbyCount == null ? '-' : `${nearbyCount} 个`}</Text>
      </View>

      <Text style={styles.log}>日志：{log || '—'}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#E5E7EB' },
  tabActive: { backgroundColor: '#111827' },
  tabText: { color: '#111827', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputFlex: { flex: 1 },
  btn: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
  btnMinor: { backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  btnMinorText: { color: '#111827', fontWeight: '600', fontSize: 12 },
  hint: { color: '#6B7280', fontSize: 12, flex: 1 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, gap: 10 },
  cardTitle: { fontWeight: '700', color: '#111827' },
  small: { fontSize: 12, color: '#6B7280' },
  log: { marginTop: 6, fontSize: 12, color: '#374151' }
});


