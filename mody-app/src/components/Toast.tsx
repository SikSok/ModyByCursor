import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

const TOAST_DURATION_MS = 2500;

type Props = {
  visible: boolean;
  message: string;
  /** success 绿色，error 红色，默认中性灰 */
  variant?: 'success' | 'error' | 'default';
  onDismiss?: () => void;
};

export function Toast({ visible, message, variant = 'default', onDismiss }: Props) {
  useEffect(() => {
    if (!visible || !message.trim()) return;
    const t = setTimeout(() => {
      onDismiss?.();
    }, TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [visible, message, onDismiss]);

  if (!visible || !message.trim()) return null;

  const bg =
    variant === 'success'
      ? theme.green
      : variant === 'error'
        ? '#dc2626'
        : theme.text;

  return (
    <View style={styles.wrap}>
      <View style={[styles.box, { backgroundColor: bg }]}>
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 52,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  box: {
    maxWidth: '86%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  text: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
