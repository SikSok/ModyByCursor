import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface RoleHeaderProps {
  role: string;
}

export const RoleHeader: React.FC<RoleHeaderProps> = ({ role }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.gradient} />
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>摩迪</Text>
        </View>
        <Text style={styles.title}>{role}</Text>
        <Text style={styles.subtitle}>乘客 / 司机 · 一体化</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.bgGradientEnd,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.bg,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.accent,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.02,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textMuted,
  },
});
