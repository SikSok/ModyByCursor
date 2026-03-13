import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import { useFontScale, scaledFontSize } from '../context/FontScaleContext';
import { theme } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POPUP_MAX_WIDTH = Math.min(340, SCREEN_WIDTH * 0.88);
const POPUP_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

const DRIVER_ITEMS: { icon: string; main: string; detail: string }[] = [
  { icon: '🟢', main: '开启营业，附近乘客可见', detail: '点击「开始营业」并保持定位开启，乘客即可在地图上看到您。' },
  { icon: '🌙', main: '收工切「休息」，不被打扰', detail: '下班后记得点击「休息」，避免非营业时段接到联系。' },
  { icon: '🤝', main: '费用当面商量，诚信更持久', detail: '车费与乘客友好协商，平台不抽成，做好服务口碑更长久。' },
];

type Props = {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

function createStyles(fontScale: number) {
  return StyleSheet.create({
    mask: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    popup: {
      width: POPUP_MAX_WIDTH,
      maxWidth: '100%',
      maxHeight: POPUP_MAX_HEIGHT,
      backgroundColor: theme.surface,
      borderRadius: theme.borderRadius,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    content: { paddingBottom: 8 },
    welcome: {
      fontSize: scaledFontSize(19, fontScale),
      fontWeight: '700',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    icon: {
      fontSize: scaledFontSize(18, fontScale),
      lineHeight: scaledFontSize(18, fontScale),
    },
    itemBody: { flex: 1 },
    itemMain: {
      fontSize: scaledFontSize(15, fontScale),
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
      lineHeight: scaledFontSize(15, fontScale) * 1.35,
    },
    itemDetail: {
      fontSize: scaledFontSize(13, fontScale),
      color: theme.textMuted,
      lineHeight: scaledFontSize(13, fontScale) * 1.5,
    },
    footer: { paddingTop: 16 },
    btnPrimary: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: theme.borderRadiusSm,
      backgroundColor: theme.accent,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    btnPrimaryText: {
      fontSize: scaledFontSize(15, fontScale),
      fontWeight: '700',
      color: '#fff',
    },
  });
}

export function DriverTutorial({ visible, onComplete, onSkip }: Props) {
  const { fontScale } = useFontScale();
  const styles = useMemo(() => createStyles(fontScale), [fontScale]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onSkip}>
      <Pressable style={styles.mask} onPress={onSkip}>
        <Pressable style={styles.popup} onPress={() => {}}>
          <View style={styles.content}>
            <Text style={styles.welcome}>欢迎使用摩迪司机端</Text>
            {DRIVER_ITEMS.map((item, i) => (
              <View key={i} style={styles.item}>
                <View style={styles.iconWrap}>
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemMain}>{item.main}</Text>
                  <Text style={styles.itemDetail}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <Pressable style={styles.btnPrimary} onPress={onComplete}>
              <Text style={styles.btnPrimaryText}>我知道了</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
