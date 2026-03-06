import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TUTORIAL_PAGES = [
  { title: '欢迎使用摩迪司机端', body: '在这里您可以营业接客、上报定位，方便乘客找到您。' },
  { title: '如何营业', body: '在首页点击「开始营业」即可进入营业状态，乘客将能看到您的位置。' },
  { title: '定位上报', body: '请定期上报定位，以便乘客看到您的实时位置。' },
  { title: '注意事项', body: '请先完成身份认证后再营业；营业中请及时联系乘客。' },
  { title: '开始使用', body: '教程结束，请完成身份认证后即可营业。' },
];

type Props = {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

export function DriverTutorial({ visible, onComplete, onSkip }: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index >= TUTORIAL_PAGES.length - 1;

  const goNext = () => {
    if (isLast) onComplete();
    else {
      const next = index + 1;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    }
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(i);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onSkip}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {TUTORIAL_PAGES.map((item, i) => (
            <View key={i} style={styles.page}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.dots}>
            {TUTORIAL_PAGES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.buttons}>
            <Pressable style={styles.btnOutline} onPress={onSkip}>
              <Text style={styles.btnOutlineText}>跳过</Text>
            </Pressable>
            <Pressable style={styles.btnPrimary} onPress={goNext}>
              <Text style={styles.btnPrimaryText}>
                {isLast ? '完成' : '下一步'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {},
  page: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 32,
    paddingTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: theme.textMuted,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.border,
  },
  dotActive: {
    backgroundColor: theme.accent,
    width: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  btnOutline: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadiusSm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textMuted,
  },
  btnPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: theme.borderRadiusSm,
    backgroundColor: theme.accent,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
