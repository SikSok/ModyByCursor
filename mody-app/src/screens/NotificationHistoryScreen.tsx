import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  getDriverNotifications,
  markDriverNotificationsRead,
} from '../services/api';
import { useDriverNotifications } from '../context/DriverNotificationContext';
import { theme } from '../theme';

function formatRelativeTime(created_at: string): string {
  const date = new Date(created_at);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 2 * 24 * 60 * 60 * 1000) return '昨天';
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}天前`;
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type NotificationRow = {
  id: number;
  content: string;
  created_at: string;
  read: boolean;
};

type Props = {
  token: string;
  onBack: () => void;
};

export function NotificationHistoryScreen({ token, onBack }: Props) {
  const { setUnreadCount, clearPendingSummary } = useDriverNotifications();
  const [list, setList] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCountLocal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await getDriverNotifications(token, pageNum, 20);
        const raw = res.data?.list ?? [];
        const items = Array.isArray(raw) ? [...raw] : [];
        if (append) {
          setList((prev) => [...prev, ...items]);
        } else {
          setList(items);
        }
        setUnreadCountLocal(res.data?.unreadCount ?? 0);
        setHasMore(items.length >= 20);
      } catch (_) {
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      await markDriverNotificationsRead(token);
      setUnreadCount(0);
      clearPendingSummary();
      await loadPage(1, false);
    })();
  }, [token]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || list.length === 0) return;
    const next = page + 1;
    setPage(next);
    loadPage(next, true);
  }, [page, loadPage, loadingMore, hasMore, list.length]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const padding = 80;
      if (contentSize.height - layoutMeasurement.height - contentOffset.y < padding) {
        loadMore();
      }
    },
    [loadMore]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backArea}
          hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
        >
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          通知历史
        </Text>
        <View style={styles.headerRight} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>📬</Text>
          </View>
          <Text style={styles.emptyTitle}>暂无通知</Text>
          <Text style={styles.emptyText}>
            乘客通过平台联系您时，会在这里显示
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          showsVerticalScrollIndicator={false}
        >
          {list.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowDot} />
              <View style={styles.rowBody}>
                <Text style={styles.rowContent}>{item.content}</Text>
                <Text style={styles.rowTime}>{formatRelativeTime(item.created_at)}</Text>
              </View>
            </View>
          ))}
          {loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  /** 左侧整块可点返回，不与标题重叠，避免 Android 上点击被拦截 */
  backArea: {
    minWidth: 120,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingRight: 16,
  },
  backText: {
    fontSize: 16,
    color: theme.accent,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 120,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: theme.borderRadiusSm,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.accent,
    marginTop: 6,
    marginRight: 12,
  },
  rowBody: {
    flex: 1,
  },
  rowContent: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  rowTime: {
    fontSize: 12,
    color: theme.textMuted,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
