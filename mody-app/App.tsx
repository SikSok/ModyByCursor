import React, { useState, useCallback } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, Pressable, LogBox } from 'react-native';
import { IdentityProvider, useIdentity } from './src/context/IdentityContext';
import { DriverNotificationProvider, useDriverNotifications } from './src/context/DriverNotificationContext';
import { ToastProvider } from './src/context/ToastContext';
import { RoleHeader } from './src/components/RoleHeader';
import { IdentitySelectScreen } from './src/screens/IdentitySelectScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PassengerHomeScreen } from './src/screens/PassengerHomeScreen';
import { DriverHomeScreen } from './src/screens/DriverHomeScreen';
import { NotificationHistoryScreen } from './src/screens/NotificationHistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { DriverVerificationScreen } from './src/screens/DriverVerificationScreen';
import type { Identity } from './src/context/IdentityContext';
import { theme } from './src/theme';

type TabId = 'home' | 'messages' | 'profile';

function AppContent() {
  const {
    ready,
    currentIdentity,
    token,
    setToken,
    setDriverInfo,
    setIdentity,
  } = useIdentity();
  const { unreadCount } = useDriverNotifications();

  const [loginRole, setLoginRole] = useState<Identity | null>(null);
  const [tab, setTab] = useState<TabId>('home');
  const [showVerification, setShowVerification] = useState(false);

  const hasAnyToken = !!token;
  const isDriver = currentIdentity === 'driver';

  const openVerification = useCallback(() => setShowVerification(true), []);
  const closeVerification = useCallback(() => setShowVerification(false), []);
  const openDriverNotifications = useCallback(() => setTab('messages'), []);
  const onSwitchIdentityToHome = useCallback(() => setTab('home'), []);
  const handleLoginAs = useCallback((role: Identity) => setLoginRole(role), []);
  const openProfile = useCallback(() => setTab('profile'), []);

  if (ready && hasAnyToken && loginRole === null && currentIdentity === 'driver' && showVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <RoleHeader role="身份认证" />
        <View style={styles.content}>
          <DriverVerificationScreen onBack={closeVerification} />
        </View>
      </SafeAreaView>
    );
  }

  if (ready && hasAnyToken && loginRole === null) {
    const roleLabel = currentIdentity === 'passenger' ? '乘客' : '司机';
    const showMessagesTab = isDriver;
    const activeTab = showMessagesTab ? tab : (tab === 'messages' ? 'home' : tab);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <RoleHeader role={roleLabel} />
        <View style={styles.content}>
          <View style={[styles.tabPanel, activeTab !== 'home' && styles.tabPanelHidden]} pointerEvents={activeTab === 'home' ? 'auto' : 'none'}>
            <View style={styles.identityPanel} pointerEvents={currentIdentity === 'passenger' ? 'auto' : 'none'}>
              <PassengerHomeScreen />
            </View>
            <View
              style={[styles.identityPanelOverlay, currentIdentity !== 'driver' && styles.tabPanelHidden]}
              pointerEvents={currentIdentity === 'driver' ? 'auto' : 'none'}
            >
              <DriverHomeScreen
                currentIdentity={currentIdentity}
                onOpenVerification={openVerification}
                onOpenNotifications={openDriverNotifications}
                onOpenProfile={openProfile}
              />
            </View>
          </View>

          {showMessagesTab && activeTab === 'messages' && token ? (
            <View style={styles.tabPanel} pointerEvents="auto">
              <NotificationHistoryScreen token={token} onBack={() => setTab('home')} />
            </View>
          ) : showMessagesTab && activeTab === 'messages' ? (
            <View style={[styles.tabPanel, styles.tabPanelHidden]} pointerEvents="none" />
          ) : null}

          {activeTab === 'profile' ? (
            <View style={styles.tabPanel} pointerEvents="auto">
              <ProfileScreen
                onSwitchIdentity={onSwitchIdentityToHome}
                onLoginAs={handleLoginAs}
                onOpenVerification={openVerification}
              />
            </View>
          ) : (
            <View style={[styles.tabPanel, styles.tabPanelHidden]} pointerEvents="none" />
          )}
        </View>

        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setTab('home')}
            style={[styles.tab, (activeTab === 'home') && styles.tabActive]}
            android_ripple={null}
          >
            <Text style={styles.tabIcon}>🏠</Text>
            <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>首页</Text>
          </Pressable>
          {showMessagesTab && (
            <Pressable
              onPress={() => setTab('messages')}
              style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
              android_ripple={null}
            >
              <View style={styles.tabIconWrap}>
                <Text style={styles.tabIcon}>💬</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>消息</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setTab('profile')}
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            android_ripple={null}
          >
            <Text style={styles.tabIcon}>👤</Text>
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>我的</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (ready && loginRole !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <LoginScreen
          role={loginRole}
          onBack={() => setLoginRole(null)}
          onSuccess={(authToken, driverInfo) => {
            setToken(authToken);
            if (driverInfo) {
              setDriverInfo(driverInfo.hasDriver, driverInfo.driverStatus ?? null, driverInfo.isAvailable);
            }
            setLoginRole(null);
            setIdentity(loginRole);
            setTab('home');
          }}
        />
      </SafeAreaView>
    );
  }

  if (ready && !hasAnyToken && loginRole === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <RoleHeader role="请选择身份" />
        <IdentitySelectScreen onSelect={(role) => setLoginRole(role)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>⏳</Text>
        <Text style={styles.placeholderText}>加载中…</Text>
      </View>
    </SafeAreaView>
  );
}

function App(): JSX.Element {
  React.useEffect(() => {
    LogBox.ignoreAllLogs(true);
  }, []);
  return (
    <ToastProvider>
      <IdentityProvider>
        <DriverNotificationProvider>
          <AppContent />
        </DriverNotificationProvider>
      </IdentityProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  tabPanel: {
    ...StyleSheet.absoluteFillObject,
  },
  identityPanel: {
    flex: 1,
  },
  identityPanelOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.bg,
  },
  tabPanelHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: {},
  tabIconWrap: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textMuted,
  },
  tabTextActive: {
    color: theme.accent,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderIcon: {
    fontSize: 32,
  },
  placeholderText: {
    fontSize: 16,
    color: theme.textMuted,
  },
});

export default App;
