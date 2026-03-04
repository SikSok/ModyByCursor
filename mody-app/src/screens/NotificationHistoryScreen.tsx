import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  ListRenderItem,
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
        const items = (res.data?.list ?? []) as NotificationRow[];
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

  const renderItem: ListRenderItem<NotificationRow> = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.rowContent}>{item.content}</Text>
      <Text style={styles.rowTime}>{formatRelativeTime(item.created_at)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>通知历史</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyText}>
            暂无通知，乘客通过平台联系您时会在这里显示
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={theme.accent} />
              </View>
            ) : null
          }
        />
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: theme.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: theme.borderRadiusSm,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  rowContent: {
    fontSize: 15,
    color: theme.text,
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
