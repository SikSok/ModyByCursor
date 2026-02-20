import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

type LoginScreenProps = { navigation: any };

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = phone.length >= 11 && password.length >= 6;

  const onLogin = async () => {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (e: any) {
      setError(e.message || '登录失败，请检查手机号与密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>司机登录</Text>
        <Text style={styles.subtitle}>登录后即可接单</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="请输入手机号"
          placeholderTextColor={colors.textPlaceholder}
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={11}
          editable={!loading}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="请输入密码（至少 6 位）"
          placeholderTextColor={colors.textPlaceholder}
          style={styles.input}
          secureTextEntry
          editable={!loading}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          onPress={onLogin}
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>登录</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => navigation.replace('Register')}
          style={styles.linkWrap}
          disabled={loading}
        >
          <Text style={styles.linkText}>还没有账号？立即注册</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: -4,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  linkWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
});
