import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RoleHeaderProps {
  role: string;
}

export const RoleHeader: React.FC<RoleHeaderProps> = ({ role }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>摩迪 · {role}</Text>
      <Text style={styles.subtitle}>React Native 应用骨架</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#4F46E5',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#E5E7EB',
  },
});


