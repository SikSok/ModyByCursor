import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { userRegister, sendCode } from '../services/api';
import { storage } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const schema = z.object({
  phone: z.string().min(11, '请输入11位手机号').max(11),
  name: z.string().max(50).optional(),
  code: z.string().min(4, '请输入验证码').max(6),
  password: z.string().min(6, '密码至少6位'),
});

type FormData = z.infer<typeof schema>;

type RegisterScreenProps = { navigation: any };

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { setToken, setUser } = useAuth();
  const [codeLoading, setCodeLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', name: '', code: '', password: '' },
  });

  const onSendCode = async () => {
    const phone = getValues('phone').trim();
    if (phone.length !== 11) {
      setError('phone', { message: '请先输入正确手机号' });
      return;
    }
    setCodeLoading(true);
    try {
      await sendCode(phone, 'register');
    } catch (e: any) {
      setError('phone', { message: e.message || '发送失败' });
    } finally {
      setCodeLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitError('');
    try {
      const res = await userRegister({
        phone: data.phone.trim(),
        password: data.password,
        name: data.name?.trim() || undefined,
        code: data.code.trim(),
      });
      await storage.setToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (e: any) {
      setSubmitError(e.message || '注册失败');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>注册账号</Text>
          <Text style={styles.subtitle}>昵称可选，注册后即可叫车</Text>
        </View>
        <View style={styles.form}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                placeholder="手机号"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.input, errors.phone && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
                maxLength={11}
              />
            )}
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone.message}</Text> : null}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                placeholder="昵称（选填）"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value || ''}
              />
            )}
          />
          <View style={styles.row}>
            <Controller
              control={control}
              name="code"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="验证码"
                  placeholderTextColor={colors.textPlaceholder}
                  style={[styles.input, styles.inputFlex, errors.code && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              )}
            />
            <Pressable onPress={onSendCode} style={[styles.codeBtn, codeLoading && styles.codeBtnDisabled]} disabled={codeLoading}>
              {codeLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.codeBtnText}>获取验证码</Text>}
            </Pressable>
          </View>
          {errors.code ? <Text style={styles.errorText}>{errors.code.message}</Text> : null}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                placeholder="设置密码（至少6位）"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.input, errors.password && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                secureTextEntry
              />
            )}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}
          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          <Pressable onPress={handleSubmit(onSubmit)} style={styles.btn}>
            <Text style={styles.btnText}>注册</Text>
          </Pressable>
          <Pressable onPress={() => navigation.replace('Login')} style={styles.linkWrap}>
            <Text style={styles.linkText}>已有账号？去登录</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  form: { gap: 12 },
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
  inputError: { borderColor: colors.error },
  inputFlex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    minWidth: 110,
    alignItems: 'center',
  },
  codeBtnDisabled: { opacity: 0.6 },
  codeBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  errorText: { fontSize: 13, color: colors.error, marginTop: -4 },
  btn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  linkWrap: { alignItems: 'center', paddingVertical: 12 },
  linkText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
});
