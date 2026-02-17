import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { driverLogin, driverRegister, reportLocation, sendCode, setAvailability } from '../services/api';

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);

  const canAuth = useMemo(() => phone.length >= 6 && password.length >= 6, [phone, password]);

  async function onSendCode(type: 'register' | 'login') {
    try {
      const res = await sendCode(phone, type);
      const devCode = (res.data as any)?.code;
      setLog(`验证码已发送，过期时间：${res.data.expires_at}${devCode ? `（开发环境验证码：${devCode}）` : ''}`);
    } catch (e: any) {
      setLog(e.message || '发送失败');
    }
  }

  async function onLogin() {
    try {
      const res = await driverLogin({ phone, password });
      setToken(res.data.token);
      setLog(`登录成功，司机状态：${res.data.driver.status}`);
    } catch (e: any) {
      setLog(e.message || '登录失败');
    }
  }

  async function onRegister() {
    try {
      const res = await driverRegister({ phone, password, name, code });
      setToken(res.data.token);
      setLog(`注册成功（默认待审核），司机ID：${res.data.driver.id}`);
    } catch (e: any) {
      setLog(e.message || '注册失败');
    }
  }

  async function onToggleAvailable() {
    if (!token) return;
    try {
      const next = !isAvailable;
      await setAvailability(token, next);
      setIsAvailable(next);
      setLog(`接客状态已更新：${next ? '空闲可接客' : '不可接客'}`);
    } catch (e: any) {
      setLog(e.message || '更新失败');
    }
  }

  async function onReportMockLocation() {
    if (!token) return;
    try {
      // 简易联调用固定坐标（可后续替换为定位权限与真实定位）
      await reportLocation(token, { latitude: 31.2304, longitude: 121.4737, accuracy: 15 });
      setLog('已上报定位（示例坐标：上海）');
    } catch (e: any) {
      setLog(e.message || '上报失败');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>摩的 · 司机端（重构后骨架）</Text>

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
        <>
          <TextInput value={name} onChangeText={setName} placeholder="姓名" style={styles.input} />
          <View style={styles.row}>
            <TextInput value={code} onChangeText={setCode} placeholder="验证码" style={[styles.input, styles.inputFlex]} />
            <Pressable onPress={() => onSendCode('register')} style={styles.btnMinor}>
              <Text style={styles.btnMinorText}>发验证码</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <Text style={styles.hint}>登录使用密码（需管理员审核通过后可登录）</Text>
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
        disabled={!canAuth || (mode === 'register' && (!name || !code))}
      >
        <Text style={styles.btnText}>{mode === 'login' ? '登录' : '注册'}</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>登录后功能（联调用）</Text>
        <Text style={styles.small}>token：{token ? token.slice(0, 24) + '…' : '未登录'}</Text>
        <View style={styles.row}>
          <Pressable onPress={onToggleAvailable} style={[styles.btnMinor, !token && styles.btnMinorDisabled]} disabled={!token}>
            <Text style={styles.btnMinorText}>{isAvailable ? '设为不可接客' : '设为空闲可接客'}</Text>
          </Pressable>
          <Pressable onPress={onReportMockLocation} style={[styles.btnMinor, !token && styles.btnMinorDisabled]} disabled={!token}>
            <Text style={styles.btnMinorText}>上报定位(示例)</Text>
          </Pressable>
        </View>
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
  btnMinor: { backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  btnMinorDisabled: { opacity: 0.4 },
  btnMinorText: { color: '#111827', fontWeight: '600', fontSize: 12 },
  hint: { color: '#6B7280', fontSize: 12, flex: 1 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, gap: 10 },
  cardTitle: { fontWeight: '700', color: '#111827' },
  small: { fontSize: 12, color: '#6B7280' },
  log: { marginTop: 6, fontSize: 12, color: '#374151' }
});


