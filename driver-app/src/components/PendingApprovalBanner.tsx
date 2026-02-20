import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const PendingApprovalBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>⏳</Text>
      <View style={styles.textWrap}>
        <Text style={styles.title}>待审核</Text>
        <Text style={styles.desc}>您的资料正在审核中，通过后即可接单</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
