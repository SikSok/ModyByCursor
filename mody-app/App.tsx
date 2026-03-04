import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, Pressable, LogBox } from 'react-native';
import { IdentityProvider, useIdentity } from './src/context/IdentityContext';
import { DriverNotificationProvider } from './src/context/DriverNotificationContext';
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

function AppContent() {
  const {
    ready,
    currentIdentity,
    token,
    setToken,
    setDriverInfo,
    setIdentity,
  } = useIdentity();

  const [loginRole, setLoginRole] = useState<Identity | null>(null);
  const [tab, setTab] = useState<'home' | 'profile'>('home');
  const [showVerification, setShowVerification] = useState(false);
  const [showDriverNotifications, setShowDriverNotifications] = useState(false);

  const hasAnyToken = !!token;

  const openVerification = () => setShowVerification(true);
  const closeVerification = () => setShowVerification(false);

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

  if (ready && hasAnyToken && loginRole === null && currentIdentity === 'driver' && showDriverNotifications && token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <View style={styles.content}>
          <NotificationHistoryScreen
            token={token}
            onBack={() => setShowDriverNotifications(false)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (ready && hasAnyToken && loginRole === null) {
    const roleLabel = currentIdentity === 'passenger' ? '乘客' : '司机';
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <RoleHeader role={roleLabel} />
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('home')}
            style={[styles.tab, tab === 'home' && styles.tabActive]}
          >
            <Text style={styles.tabIcon}>🏠</Text>
            <Text style={[styles.tabText, tab === 'home' && styles.tabTextActive]}>
              首页
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('profile')}
            style={[styles.tab, tab === 'profile' && styles.tabActive]}
          >
            <Text style={styles.tabIcon}>👤</Text>
            <Text style={[styles.tabText, tab === 'profile' && styles.tabTextActive]}>
              个人中心
            </Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          {/* 首页与个人中心同时挂载，仅隐藏非当前 Tab，避免卸载 MapView 导致原生层闪退 */}
          <View style={[styles.tabPanel, tab !== 'home' && styles.tabPanelHidden]} pointerEvents={tab === 'home' ? 'auto' : 'none'}>
            {/* 乘客首页（含地图）始终作为底层、不设 opacity:0，司机首页作为覆盖层叠在上方，避免地图从“隐藏→显示”时原生层闪退 */}
            <View style={styles.identityPanel} pointerEvents={currentIdentity === 'passenger' ? 'auto' : 'none'}>
              <PassengerHomeScreen />
            </View>
            <View
              style={[styles.identityPanelOverlay, currentIdentity !== 'driver' && styles.tabPanelHidden]}
              pointerEvents={currentIdentity === 'driver' ? 'auto' : 'none'}
            >
              <DriverHomeScreen
                onOpenVerification={openVerification}
                onOpenNotifications={() => setShowDriverNotifications(true)}
              />
            </View>
          </View>
          <View style={[styles.tabPanel, tab !== 'profile' && styles.tabPanelHidden]} pointerEvents={tab === 'profile' ? 'auto' : 'none'}>
            <ProfileScreen
              onSwitchIdentity={() => setTab('home')}
              onLoginAs={(role) => setLoginRole(role)}
              onOpenVerification={openVerification}
            />
          </View>
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
  // 不在应用内显示底部错误/警告条，日志在 Metro 终端查看即可
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.accent,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMuted,
  },
  tabTextActive: {
    color: theme.accent,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  tabPanel: {
    flex: 1,
  },
  identityPanel: {
    flex: 1,
  },
  /** 司机首页叠在乘客首页之上，用绝对定位覆盖；切换为乘客时仅将此层设为透明，不碰地图层 */
  identityPanelOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.bg,
  },
  tabPanelHidden: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
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
