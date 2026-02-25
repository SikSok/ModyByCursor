import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  message: string;
  /** 简要说明错误类型，方便用户判断是没网还是服务问题 */
  hint?: 'network' | 'server' | null;
};

export function ErrorBanner({ message, hint }: Props) {
  if (!message || !message.trim()) return null;

  const hintText =
    hint === 'network'
      ? '（网络问题：请检查手机网络或稍后重试）'
      : hint === 'server'
        ? '（服务端返回错误，开发时请查看 Metro 终端报错详情）'
        : '';

  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>⚠️</Text>
      <View style={styles.textWrap}>
        <Text style={styles.message}>{message}</Text>
        {hintText ? <Text style={styles.hint}>{hintText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  textWrap: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 4,
    opacity: 0.9,
  },
});
