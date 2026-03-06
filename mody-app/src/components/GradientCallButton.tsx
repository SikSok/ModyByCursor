/**
 * 渐变紫色「叫车」按钮（#6366f1 → #5b21b6），用于司机卡片与司机信息弹窗
 */
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../theme';

const GRADIENT_COLORS = ['#6366f1', '#5b21b6'] as const;

type Props = {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** 大号用于弹窗底部 CTA */
  large?: boolean;
};

export function GradientCallButton({
  onPress,
  label = '叫车',
  disabled = false,
  style,
  textStyle,
  large = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        large && styles.wrapLarge,
        disabled && styles.wrapDisabled,
        pressed && styles.wrapPressed,
        style,
      ]}
    >
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={[styles.text, large && styles.textLarge, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 48,
    borderRadius: theme.borderRadiusSm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  wrapLarge: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  wrapDisabled: {
    opacity: 0.6,
  },
  wrapPressed: {
    opacity: 0.9,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  textLarge: {
    fontSize: 18,
  },
});
