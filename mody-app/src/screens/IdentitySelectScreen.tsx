import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Identity } from '../context/IdentityContext';
import { theme } from '../theme';

type Props = {
  onSelect: (identity: Identity) => void;
};

const ICONS = { passenger: '👤', driver: '🏍️' };

export function IdentitySelectScreen({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>选择身份</Text>
      <Text style={styles.subtitle}>请选择以乘客或司机身份使用摩的</Text>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onSelect('passenger')}
      >
        <View style={[styles.cardIcon, styles.cardIconPassenger]}>
          <Text style={styles.cardIconText}>{ICONS.passenger}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>乘客</Text>
          <Text style={styles.cardDesc}>叫车、查看附近司机、个人中心</Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onSelect('driver')}
      >
        <View style={[styles.cardIcon, styles.cardIconDriver]}>
          <Text style={styles.cardIconText}>{ICONS.driver}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>司机</Text>
          <Text style={styles.cardDesc}>上报定位、接客状态、我的</Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
    backgroundColor: theme.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
    letterSpacing: -0.02,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: theme.borderRadius,
    padding: 20,
    marginBottom: 16,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    borderColor: theme.accent,
    backgroundColor: theme.accentSoft,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardIconPassenger: {
    backgroundColor: theme.blueSoft,
  },
  cardIconDriver: {
    backgroundColor: theme.greenSoft,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: theme.textMuted,
  },
  cardArrow: {
    fontSize: 24,
    color: theme.textMuted,
    fontWeight: '300',
  },
});
