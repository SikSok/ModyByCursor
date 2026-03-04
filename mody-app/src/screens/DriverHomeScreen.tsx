import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportLocation, setAvailability, getDriverProfile, getDriverNotifications, getUserFacingMessage } from '../services/api';
import { useIdentity } from '../context/IdentityContext';
import { useToast } from '../context/ToastContext';
import { useDriverNotifications } from '../context/DriverNotificationContext';
import { theme } from '../theme';
import { DriverTutorial } from '../components/DriverTutorial';
import { DriverNotificationPermissionModal, shouldShowNotificationPermissionModal } from '../components/DriverNotificationPermissionModal';

const STORAGE_KEY_TUTORIAL_DONE = '@mody_driver_tutorial_done';

type Props = {
  onOpenVerification?: () => void;
  onOpenNotifications?: () => void;
};

export function DriverHomeScreen({ onOpenVerification, onOpenNotifications }: Props) {
  const { token } = useIdentity();
  const { showToast } = useToast();
  const { unreadCount, pendingCount, clearPendingSummary, setUnreadCount } = useDriverNotifications();
  const [showNotificationPermissionModal, setShowNotificationPermissionModal] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [tutorialDone, setTutorialDone] = useState<boolean | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAuthPromptAfterTutorial, setShowAuthPromptAfterTutorial] = useState(false);
  const [showNotVerifiedModal, setShowNotVerifiedModal] = useState(false);

  const markTutorialDone = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY_TUTORIAL_DONE, '1');
    setTutorialDone(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setTutorialDone(true);
      return;
    }
    (async () => {
      try {
        const done = await AsyncStorage.getItem(STORAGE_KEY_TUTORIAL_DONE);
        setTutorialDone(done === '1');
        if (done !== '1') setShowTutorial(true);
      } catch {
        setTutorialDone(true);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getDriverProfile(token)
      .then((res) => {
        if (res?.data?.is_available) setIsAvailable(true);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getDriverNotifications(token, 1, 1)
      .then((res) => {
        if (res?.data?.unreadCount != null) setUnreadCount(res.data.unreadCount);
      })
      .catch(() => {});
  }, [token, setUnreadCount]);

  useEffect(() => {
    if (!token) return;
    shouldShowNotificationPermissionModal().then((show) => {
      if (show) setShowNotificationPermissionModal(true);
    });
  }, [token]);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    markTutorialDone();
    setShowAuthPromptAfterTutorial(true);
  }, [markTutorialDone]);

  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
    markTutorialDone();
    setShowAuthPromptAfterTutorial(true);
  }, [markTutorialDone]);

  async function onToggleAvailable() {
    if (!token) return;
    setShowNotVerifiedModal(false);
    try {
      const next = !isAvailable;
      await setAvailability(token, next);
      setIsAvailable(next);
    } catch (e: any) {
      if ((e as any)?.code === 'DRIVER_NOT_VERIFIED') {
        setShowNotVerifiedModal(true);
        return;
      }
      showToast(getUserFacingMessage(e, '更新失败'), 'error');
    }
  }

  async function onReportMockLocation() {
    if (!token) return;
    try {
      await reportLocation(token, {
        latitude: 31.2304,
        longitude: 121.4737,
        accuracy: 15,
      });
    } catch (e: any) {
      showToast(getUserFacingMessage(e, '上报失败'), 'error');
    }
  }

  return (
    <>
      <DriverTutorial
        visible={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
      <DriverNotificationPermissionModal
        visible={showNotificationPermissionModal}
        onClose={() => setShowNotificationPermissionModal(false)}
      />
      {pendingCount > 0 && (
        <Pressable
          style={styles.pendingBar}
          onPress={() => {
            clearPendingSummary();
            onOpenNotifications?.();
          }}
        >
          <Text style={styles.pendingBarText}>
            您有 {pendingCount} 条未读通知，点击查看
          </Text>
        </Pressable>
      )}
      <Modal
        visible={showAuthPromptAfterTutorial}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuthPromptAfterTutorial(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>去完成身份认证才能接单</Text>
            <Text style={styles.modalHint}>完成认证后即可设为可接客。</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalBtnSecondary}
                onPress={() => setShowAuthPromptAfterTutorial(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>暂不，稍后再说</Text>
              </Pressable>
              <Pressable
                style={styles.modalBtnPrimary}
                onPress={() => {
                  setShowAuthPromptAfterTutorial(false);
                  onOpenVerification?.();
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>去认证</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showNotVerifiedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotVerifiedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>请先完成身份认证</Text>
            <Text style={styles.modalHint}>未认证司机无法接单，请到个人中心完成身份认证。</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalBtnSecondary}
                onPress={() => setShowNotVerifiedModal(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>稍后</Text>
              </Pressable>
              <Pressable
                style={styles.modalBtnPrimary}
                onPress={() => {
                  setShowNotVerifiedModal(false);
                  onOpenVerification?.();
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>去认证</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.cardIconDriver]}>
            <Text style={styles.cardIconText}>🏍️</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>接客与定位</Text>
            <Text style={styles.cardHint}>
              {token ? '已登录' : '未登录'}
            </Text>
          </View>
          {token ? (
            <Pressable
              onPress={onOpenNotifications}
              style={styles.msgIconWrap}
              hitSlop={8}
            >
              <Text style={styles.msgIcon}>💬</Text>
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
        <View style={styles.cardBody}>
          <Pressable
            onPress={onToggleAvailable}
            style={[styles.btn, !token && styles.btnDisabled]}
            disabled={!token}
          >
            <Text style={styles.btnIcon}>{isAvailable ? '🔴' : '🟢'}</Text>
            <Text style={styles.btnText}>
              {isAvailable ? '设为不可接客' : '设为空闲可接客'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onReportMockLocation}
            style={[styles.btnOutline, !token && styles.btnDisabled]}
            disabled={!token}
          >
            <Text style={styles.btnOutlineIcon}>📍</Text>
            <Text style={styles.btnOutlineText}>上报定位（示例）</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: theme.bg,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 24 },
  cardIconDriver: { backgroundColor: theme.greenSoft },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 4 },
  cardHint: { fontSize: 12, color: theme.textMuted },
  cardBody: { padding: 20, gap: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
  },
  btnDisabled: { opacity: 0.4 },
  btnIcon: { fontSize: 16 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
  },
  btnOutlineIcon: { fontSize: 16 },
  btnOutlineText: { color: theme.text, fontWeight: '600', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  modalBtnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadiusSm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: theme.textMuted },
  modalBtnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadiusSm,
    backgroundColor: theme.accent,
  },
  modalBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  pendingBar: {
    backgroundColor: theme.accentSoft,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  pendingBarText: {
    fontSize: 14,
    color: theme.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
  msgIconWrap: {
    position: 'relative',
    padding: 8,
  },
  msgIcon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
