import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Identity } from '../context/IdentityContext';
import {
  sendCode,
  userRegister,
  driverRegister,
  unifiedLogin,
  resetPassword,
  getUserFacingMessage,
} from '../services/api';
import { theme } from '../theme';
import { useToast } from '../context/ToastContext';

const STORAGE_KEY_REMEMBERED_PHONE = '@mody_remembered_phone';

type Props = {
  role: Identity;
  onSuccess: (token: string | null, driverInfo?: { hasDriver: boolean; driverStatus?: 'pending' | 'approved' | 'rejected'; isAvailable?: boolean }) => void;
  onBack?: () => void;
};

type LoginErrorCode = 'PHONE_NOT_REGISTERED' | 'WRONG_PASSWORD' | null;

export function LoginScreen({ role, onSuccess, onBack }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneLoaded, setPhoneLoaded] = useState(false);

  const { showToast } = useToast();
  const [loginErrorCode, setLoginErrorCode] = useState<LoginErrorCode>(null);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isPassenger = role === 'passenger';
  const canAuth = useMemo(
    () => phone.length >= 6 && password.length >= 6,
    [phone, password]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_REMEMBERED_PHONE);
        if (!cancelled && saved && saved.trim()) {
          setPhone(saved.trim());
        }
      } catch (_) {}
      if (!cancelled) setPhoneLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveRememberedPhone(phoneNumber: string) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_REMEMBERED_PHONE, phoneNumber.trim());
    } catch (_) {}
  }

  async function onSendCode(type: 'register' | 'login' | 'reset_password') {
    const targetPhone = type === 'reset_password' ? resetPhone.trim() : phone.trim();
    if (!targetPhone || targetPhone.length < 6) {
      showToast('请先输入手机号', 'error');
      return;
    }
    try {
      const res = await sendCode(targetPhone, type);
      const devCode = (res.data as { code?: string })?.code;
      showToast(devCode ? `验证码已发送（开发：${devCode}）` : '验证码已发送', 'success');
    } catch (e: any) {
      showToast(getUserFacingMessage(e, '发送失败'), 'error');
    }
  }

  async function onSendResetCode() {
    if (!resetPhone.trim() || resetPhone.length < 6) {
      showToast('请先输入手机号', 'error');
      return;
    }
    try {
      const res = await sendCode(resetPhone.trim(), 'reset_password');
      const devCode = (res.data as { code?: string })?.code;
      showToast(devCode ? `验证码已发送（开发：${devCode}）` : '验证码已发送', 'success');
    } catch (e: any) {
      showToast(getUserFacingMessage(e, '发送失败'), 'error');
    }
  }

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      showToast('请求未返回，请检查网络或稍后重试', 'error');
    }, 8000);
    return () => clearTimeout(t);
  }, [loading]);

  async function onLogin() {
    if (loading) return;
    setLoading(true);
    setLoginErrorCode(null);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('请求超时，请检查网络')), 7000)
      );
      const res = await Promise.race([
        unifiedLogin({ phone, password }),
        timeoutPromise,
      ]);
      const data = res.data as {
        user?: { token: string };
        hasDriver?: boolean;
        driverStatus?: 'pending' | 'approved' | 'rejected';
        isAvailable?: boolean;
      };
      saveRememberedPhone(phone);
      const token = data.user?.token ?? null;
      onSuccess(token, {
        hasDriver: data.hasDriver ?? false,
        driverStatus: data.driverStatus,
        isAvailable: data.isAvailable,
      });
      showToast('登录成功', 'success');
    } catch (e: any) {
      const code = (e as { code?: string }).code;
      const msg = getUserFacingMessage(e, '登录失败') || '请求失败，请稍后重试';
      if (code === 'PHONE_NOT_REGISTERED') {
        setLoginErrorCode('PHONE_NOT_REGISTERED');
        showToast('该手机号未注册', 'error');
      } else if (code === 'WRONG_PASSWORD') {
        setLoginErrorCode('WRONG_PASSWORD');
        showToast('密码错误', 'error');
      } else if (code === 'DRIVER_NOT_APPROVED') {
        setLoginErrorCode(null);
        showToast(msg, 'error');
      } else {
        setLoginErrorCode(null);
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    if (loading) return;
    setLoading(true);
    setLoginErrorCode(null);
    try {
      if (isPassenger) {
        const res = await userRegister({ phone, password, name, code });
        saveRememberedPhone(phone);
        const data = res.data as { token?: string; user?: { token?: string } };
        const token = data.token ?? data.user?.token ?? null;
        onSuccess(token, { hasDriver: false });
        showToast('注册成功', 'success');
      } else {
        const res = await driverRegister({ phone, password, name, code });
        saveRememberedPhone(phone);
        const data = res.data as {
          user?: { token: string };
          hasDriver?: boolean;
          driverStatus?: 'pending' | 'approved' | 'rejected';
          isAvailable?: boolean;
        };
        const token = data.user?.token ?? null;
        onSuccess(token, {
          hasDriver: data.hasDriver ?? true,
          driverStatus: data.driverStatus,
          isAvailable: data.isAvailable,
        });
        showToast('注册成功（待审核）', 'success');
      }
    } catch (e: any) {
      showToast(getUserFacingMessage(e, '注册失败') || '请求失败，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitResetPassword() {
    if (resetLoading) return;
    if (!resetPhone.trim() || !resetCode.trim() || !resetNewPassword.trim()) {
      showToast('请填写手机号、验证码和新密码', 'error');
      return;
    }
    if (resetNewPassword.length < 6) {
      showToast('新密码至少 6 位', 'error');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword({
        phone: resetPhone.trim(),
        code: resetCode.trim(),
        new_password: resetNewPassword,
      });
      showToast('密码已重置，请使用新密码登录', 'success');
      setShowForgotPassword(false);
      setResetCode('');
      setResetNewPassword('');
    } catch (e: any) {
      showToast(getUserFacingMessage(e, '重置失败'), 'error');
    } finally {
      setResetLoading(false);
    }
  }

  const roleLabel = isPassenger ? '乘客' : '司机';
  const submitDisabled =
    !canAuth ||
    (mode === 'register' && !code) ||
    (mode === 'register' && !isPassenger && !name.trim()) ||
    loading;

  const resetPasswordForm = (
    <Modal
      visible={showForgotPassword}
      animationType="slide"
      transparent
      onRequestClose={() => setShowForgotPassword(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>忘记密码</Text>
            <Pressable onPress={() => setShowForgotPassword(false)} hitSlop={12}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.modalHint}>通过手机验证码重置密码</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>手机号</Text>
            <TextInput
              value={resetPhone}
              onChangeText={setResetPhone}
              placeholder="请输入手机号"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
              keyboardType="phone-pad"
              editable={!resetLoading}
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>验证码</Text>
            <View style={styles.row}>
              <TextInput
                value={resetCode}
                onChangeText={setResetCode}
                placeholder="验证码"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, styles.inputFlex]}
                editable={!resetLoading}
              />
              <Pressable onPress={onSendResetCode} style={styles.btnMinor} disabled={resetLoading}>
                <Text style={styles.btnMinorText}>获取验证码</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>新密码（≥6位）</Text>
            <TextInput
              value={resetNewPassword}
              onChangeText={setResetNewPassword}
              placeholder="请输入新密码"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
              secureTextEntry
              editable={!resetLoading}
            />
          </View>
          <Pressable
            onPress={onSubmitResetPassword}
            style={[styles.btn, (resetLoading || !resetPhone || !resetCode || resetNewPassword.length < 6) && styles.btnDisabled]}
            disabled={resetLoading || !resetPhone.trim() || !resetCode.trim() || resetNewPassword.length < 6}
          >
            {resetLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>确认重置</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backBtn} disabled={loading}>
            <Text style={styles.backBtnText}>‹ 返回</Text>
          </Pressable>
        )}
        <View style={styles.headerRow}>
          <View style={[styles.roleIcon, isPassenger ? styles.roleIconP : styles.roleIconD]}>
            <Text style={styles.roleIconText}>{isPassenger ? '👤' : '🏍️'}</Text>
          </View>
          <Text style={styles.title}>以{roleLabel}身份登录</Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => {
              if (!loading) {
                setMode('login');
                setLoginErrorCode(null);
              }
            }}
            style={[styles.tab, mode === 'login' && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>登录</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!loading) {
                setMode('register');
                setLoginErrorCode(null);
              }
            }}
            style={[styles.tab, mode === 'register' && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>注册</Text>
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>📱 手机号</Text>
          <TextInput
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setLoginErrorCode(null);
            }}
            placeholder="请输入手机号"
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            keyboardType="phone-pad"
            editable={!loading}
          />
          {!phoneLoaded ? (
            <Text style={styles.hintSmall}>加载已记住的账号…</Text>
          ) : null}
        </View>

        {mode === 'register' && (
          <>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{isPassenger ? '✏️ 昵称（可选）' : '✏️ 姓名'}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={isPassenger ? '昵称' : '姓名（必填）'}
                placeholderTextColor={theme.textMuted}
                style={styles.input}
                editable={!loading}
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>✉️ 验证码</Text>
              <View style={styles.row}>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="验证码"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, styles.inputFlex]}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => onSendCode('register')}
                  style={styles.btnMinor}
                  disabled={loading}
                >
                  <Text style={styles.btnMinorText}>发送</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>🔒 密码（≥6位）</Text>
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setLoginErrorCode(null);
            }}
            placeholder="密码"
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            secureTextEntry
            editable={!loading}
          />
          {mode === 'login' && (
            <Pressable
              onPress={() => {
                setLoginErrorCode(null);
                setResetPhone(phone.trim() || '');
                setShowForgotPassword(true);
              }}
              style={styles.linkWrap}
            >
              <Text style={styles.link}>忘记密码？</Text>
            </Pressable>
          )}
        </View>

        {loginErrorCode === 'PHONE_NOT_REGISTERED' && (
          <Pressable
            onPress={() => {
              setLoginErrorCode(null);
              setMode('register');
            }}
            style={styles.actionWrap}
          >
            <Text style={styles.actionLink}>该手机号未注册，去注册</Text>
          </Pressable>
        )}
        {loginErrorCode === 'WRONG_PASSWORD' && (
          <Pressable
            onPress={() => {
              setLoginErrorCode(null);
              setResetPhone(phone.trim() || '');
              setShowForgotPassword(true);
            }}
            style={styles.actionWrap}
          >
            <Text style={styles.actionLink}>忘记密码？通过验证码重置</Text>
          </Pressable>
        )}

        <Pressable
          onPress={mode === 'login' ? onLogin : onRegister}
          style={[styles.btn, submitDisabled && styles.btnDisabled]}
          disabled={submitDisabled}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>{mode === 'login' ? '登录' : '注册'}</Text>
          )}
        </Pressable>
      </ScrollView>
      {resetPasswordForm}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: theme.bg,
    paddingBottom: 40,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 16 },
  backBtnText: { fontSize: 16, color: theme.accent, fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconText: { fontSize: 22 },
  roleIconP: { backgroundColor: theme.blueSoft },
  roleIconD: { backgroundColor: theme.greenSoft },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.02,
  },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: theme.surface2,
  },
  tabActive: { backgroundColor: theme.accent },
  tabText: { color: theme.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },
  inputWrap: { marginBottom: 16 },
  inputLabel: {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  hintSmall: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.borderRadiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    color: theme.text,
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputFlex: { flex: 1 },
  linkWrap: { marginTop: 8 },
  link: { fontSize: 14, color: theme.accent, fontWeight: '600' },
  actionWrap: { marginBottom: 8 },
  actionLink: { fontSize: 14, color: theme.accent, fontWeight: '600' },
  btn: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  btnMinor: {
    backgroundColor: theme.surface2,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  btnMinorText: { color: theme.text, fontWeight: '600', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  modalClose: { fontSize: 20, color: theme.textMuted },
  modalHint: { fontSize: 13, color: theme.textMuted, marginBottom: 16 },
});
