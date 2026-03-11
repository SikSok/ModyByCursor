import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Alert, Modal, TextInput, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIdentity } from '../context/IdentityContext';
import type { Identity } from '../context/IdentityContext';
import { useFontScale, FONT_SCALE_LABELS, FONT_SCALE_VALUES, scaledFontSize, type FontScaleLevel } from '../context/FontScaleContext';
import { getDriverProfile, updateDriverProfile, getUserProfile, updateUserProfile } from '../services/api';
import { theme } from '../theme';
import { STORAGE_KEY_PAYMENT_QR_URI } from '../constants/storageKeys';
import { getDefaultDriverAvatarSource } from '../utils/defaultAvatars';
import { useToast } from '../context/ToastContext';
import { BASE_WEB_URL } from '../config/website';
import { track } from '../utils/analytics';
import { maskPhone } from '../utils/phone';

const DEFAULT_DRIVER_DISPLAY_NAME = '摩的师傅';

type Props = {
  onSwitchIdentity: () => void;
  onLoginAs: (role: Identity) => void;
  onOpenVerification?: () => void;
  onOpenFeedback?: () => void;
};

export const ProfileScreen = React.memo(function ProfileScreen({ onSwitchIdentity, onLoginAs, onOpenVerification, onOpenFeedback }: Props) {
  const {
    currentIdentity,
    token,
    hasDriver,
    driverStatus: contextDriverStatus,
    setIdentity,
    logout,
  } = useIdentity();
  const { fontScaleLevel, setFontScaleLevel } = useFontScale();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(fontScaleLevel), [fontScaleLevel]);
  const [driverStatus, setDriverStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [driverName, setDriverName] = useState<string>(DEFAULT_DRIVER_DISPLAY_NAME);
  const [driverAvatar, setDriverAvatar] = useState<string | null>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [paymentQrUri, setPaymentQrUri] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerAvatar, setPassengerAvatar] = useState<string | null>(null);
  const [passengerPhone, setPassengerPhone] = useState<string | null>(null);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [fontScaleModalVisible, setFontScaleModalVisible] = useState(false);

  useEffect(() => {
    if (currentIdentity !== 'driver' || !token) {
      setDriverStatus(contextDriverStatus ?? null);
      return;
    }
    getDriverProfile(token)
      .then((res) => {
        if (res?.data?.status) setDriverStatus(res.data.status as 'pending' | 'approved' | 'rejected');
        else setDriverStatus(contextDriverStatus ?? null);
        const data = res?.data;
        if (data) {
          setDriverName(data.name && String(data.name).trim() ? data.name : DEFAULT_DRIVER_DISPLAY_NAME);
          setDriverAvatar(data.avatar && String(data.avatar).trim() ? data.avatar : null);
          setDriverPhone(data.phone != null && String(data.phone).trim() ? String(data.phone).trim() : null);
        }
      })
      .catch(() => setDriverStatus(contextDriverStatus ?? null));
  }, [currentIdentity, token, contextDriverStatus]);

  useEffect(() => {
    if (currentIdentity !== 'passenger' || !token) return;
    getUserProfile(token)
      .then((res) => {
        const data = res?.data;
        if (data) {
          setPassengerName(data.name && String(data.name).trim() ? data.name : '');
          setPassengerAvatar(data.avatar && String(data.avatar).trim() ? data.avatar : null);
          setPassengerPhone(data.phone != null && String(data.phone).trim() ? String(data.phone).trim() : null);
        }
      })
      .catch(() => {});
  }, [currentIdentity, token]);

  useEffect(() => {
    if (currentIdentity !== 'driver') return;
    AsyncStorage.getItem(STORAGE_KEY_PAYMENT_QR_URI).then((uri) => setPaymentQrUri(uri || null)).catch(() => setPaymentQrUri(null));
  }, [currentIdentity]);

  const handleSetPaymentQR = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (result.didCancel || !result?.assets?.length) return;
      const uri = result.assets[0].uri;
      if (uri) {
        await AsyncStorage.setItem(STORAGE_KEY_PAYMENT_QR_URI, uri);
        setPaymentQrUri(uri);
      }
    } catch (e) {
      Alert.alert('提示', '选择图片需要安装 react-native-image-picker，请先执行 npm install 并重新编译。');
    }
  };

  const handleChangeAvatar = async () => {
    if (!token) return;
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (result.didCancel || !result?.assets?.length) return;
      const uri = result.assets[0].uri;
      if (!uri) return;
      setSavingProfile(true);
      await updateDriverProfile(token, { avatar: uri });
      setDriverAvatar(uri);
      showToast('头像已更新', 'success');
    } catch (e: any) {
      showToast(e?.message || '更新失败', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const openNicknameEdit = () => {
    setNicknameInput(driverName === DEFAULT_DRIVER_DISPLAY_NAME ? '' : driverName);
    setNicknameModalVisible(true);
  };

  const saveNickname = async () => {
    const name = nicknameInput.trim() || DEFAULT_DRIVER_DISPLAY_NAME;
    if (!token) return;
    setNicknameModalVisible(false);
    try {
      setSavingProfile(true);
      await updateDriverProfile(token, { name });
      setDriverName(name);
      showToast('昵称已更新', 'success');
    } catch (e: any) {
      showToast(e?.message || '更新失败', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const openPhoneModal = () => {
    const current = currentIdentity === 'driver' ? driverPhone : passengerPhone;
    setPhoneInput(current || '');
    setPhoneError(null);
    setPhoneModalVisible(true);
  };

  const validatePhone = (value: string): boolean => {
    const t = value.trim();
    if (!t) return true;
    if (!/^1\d{10}$/.test(t)) {
      setPhoneError('请输入正确的 11 位手机号');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const savePhone = async () => {
    const raw = phoneInput.trim();
    if (!/^1\d{10}$/.test(raw)) {
      setPhoneError('请输入正确的 11 位手机号');
      return;
    }
    if (!token) return;
    const current = (currentIdentity === 'driver' ? driverPhone : passengerPhone) || '';
    if (raw === current) {
      setPhoneError(null);
      setPhoneModalVisible(false);
      return;
    }
    setPhoneError(null);
    Alert.alert(
      '确认修改手机号',
      `确定将手机号改为 ${maskPhone(raw)}？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'default',
          onPress: async () => {
            setPhoneModalVisible(false);
            try {
              setSavingProfile(true);
              if (currentIdentity === 'driver') {
                await updateDriverProfile(token, { phone: raw });
                setDriverPhone(raw);
              } else {
                await updateUserProfile(token, { phone: raw });
                setPassengerPhone(raw);
              }
              track('profile_phone_updated', { identity: currentIdentity }).catch(() => {});
              showToast('手机号已更新', 'success');
            } catch (e: any) {
              showToast(e?.message || '更新失败', 'error');
            } finally {
              setSavingProfile(false);
            }
          },
        },
      ]
    );
  };

  const handleSelectFontScale = async (level: FontScaleLevel) => {
    await setFontScaleLevel(level);
    setFontScaleModalVisible(false);
  };

  const roleLabel = currentIdentity === 'passenger' ? '乘客' : '司机';
  const otherIdentity: Identity = currentIdentity === 'passenger' ? 'driver' : 'passenger';
  const otherLabel = otherIdentity === 'passenger' ? '乘客' : '司机';

  function handleSwitchToOther() {
    track('identity_switch', { from: currentIdentity, to: otherIdentity }).catch(() => {});
    setIdentity(otherIdentity);
    onSwitchIdentity();
  }

  async function openWebsitePath(path: string) {
    const url = `${BASE_WEB_URL}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        showToast('无法打开链接', 'error');
        return;
      }
      await Linking.openURL(url);
    } catch {
      showToast('打开失败，请稍后重试', 'error');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {currentIdentity === 'driver' && (
        <View style={styles.profileCard}>
          <Pressable
            style={styles.avatarWrap}
            onPress={handleChangeAvatar}
            disabled={savingProfile}
          >
            <Image
              source={driverAvatar ? { uri: driverAvatar } : getDefaultDriverAvatarSource()}
              style={styles.profileAvatar}
            />
            <Text style={styles.avatarHint}>点击更换头像</Text>
          </Pressable>
          <Pressable style={styles.nicknameRow} onPress={openNicknameEdit}>
            <Text style={styles.nicknameLabel}>昵称</Text>
            <Text style={styles.nicknameValue} numberOfLines={1}>{driverName}</Text>
            <Text style={styles.nicknameArrow}>›</Text>
          </Pressable>
          <Pressable style={styles.nicknameRow} onPress={openPhoneModal}>
            <Text style={styles.nicknameLabel}>手机号</Text>
            <Text style={styles.nicknameValue} numberOfLines={1}>{driverPhone || '未绑定'}</Text>
            <Text style={styles.nicknameArrow}>›</Text>
          </Pressable>
        </View>
      )}

      {currentIdentity === 'passenger' && (
        <View style={styles.profileCard}>
          <View style={styles.passengerHeader}>
            {passengerAvatar ? (
              <Image source={{ uri: passengerAvatar }} style={styles.passengerAvatar} />
            ) : (
              <View style={[styles.passengerAvatar, styles.passengerAvatarPlaceholder]}>
                <Text style={styles.passengerAvatarText}>👤</Text>
              </View>
            )}
            <Text style={styles.passengerName} numberOfLines={1}>{passengerName || '—'}</Text>
          </View>
          <Pressable style={styles.nicknameRow} onPress={openPhoneModal}>
            <Text style={styles.nicknameLabel}>手机号</Text>
            <Text style={styles.nicknameValue} numberOfLines={1}>{passengerPhone || '未绑定'}</Text>
            <Text style={styles.nicknameArrow}>›</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.fontScaleRow} onPress={() => setFontScaleModalVisible(true)}>
        <Text style={styles.fontScaleLabel}>字号大小</Text>
        <Text style={styles.fontScaleValue}>{FONT_SCALE_LABELS[fontScaleLevel]}</Text>
        <Text style={styles.fontScaleArrow}>›</Text>
      </Pressable>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, currentIdentity === 'passenger' ? styles.cardIconP : styles.cardIconD]}>
            <Text style={styles.cardIconText}>{currentIdentity === 'passenger' ? '👤' : '🏍️'}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>当前身份</Text>
            <Text style={styles.identityLabel}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {currentIdentity === 'driver' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, styles.cardIconVerify]}>
              <Text style={styles.cardIconText}>🪪</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>身份认证</Text>
              <Text style={styles.cardHint}>
                {driverStatus === 'approved'
                  ? '已通过'
                  : driverStatus === 'rejected'
                    ? '已驳回 / 已被禁用，请重新认证'
                    : driverStatus === 'pending'
                      ? '认证中（审核需要一定时间，请耐心等候）'
                      : '未认证'}
              </Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              onPress={onOpenVerification}
            >
              <Text style={styles.btnIcon}>→</Text>
              <Text style={styles.btnText}>
                {driverStatus === 'approved' ? '查看认证' : '去认证'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {currentIdentity === 'driver' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, styles.cardIconPayment]}>
              <Text style={styles.cardIconText}>💳</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>收款码</Text>
              <Text style={styles.cardHint}>
                {paymentQrUri ? '已设置，首页可点击出示' : '设置后乘客扫码付款'}
              </Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            {paymentQrUri ? (
              <View style={styles.paymentQrPreview}>
                <Image source={{ uri: paymentQrUri }} style={styles.paymentQrImage} resizeMode="cover" />
                <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={handleSetPaymentQR}>
                  <Text style={styles.btnIcon}>↻</Text>
                  <Text style={styles.btnText}>更换收款码</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={handleSetPaymentQR}>
                <Text style={styles.btnIcon}>+</Text>
                <Text style={styles.btnText}>设置收款码</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.cardIconSwitch]}>
            <Text style={styles.cardIconText}>🔄</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>切换身份</Text>
            <Text style={styles.cardHint}>
              切换为{otherLabel}后，主界面将显示{otherLabel}端功能。
              {otherIdentity === 'driver' && !hasDriver && ' 尚未申请司机身份，切换后需先完成认证。'}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={handleSwitchToOther}>
            <Text style={styles.btnIcon}>→</Text>
            <Text style={styles.btnText}>切换为{otherLabel}</Text>
          </Pressable>
        </View>
      </View>

      {onOpenFeedback && (
        <Pressable style={styles.card} onPress={onOpenFeedback}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, styles.cardIconFeedback]}>
              <Text style={styles.cardIconText}>💬</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>建议与反馈</Text>
              <Text style={styles.cardHint}>意见、体验问题或举报，我们会认真处理</Text>
            </View>
            <Text style={styles.nicknameArrow}>›</Text>
          </View>
        </Pressable>
      )}

      <Pressable style={styles.card} onPress={() => openWebsitePath('/promo.html')}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.cardIconPromo]}>
            <Text style={styles.cardIconText}>🎁</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>推荐有奖</Text>
            <Text style={styles.cardHint}>邀请好友、区域合作</Text>
          </View>
          <Text style={styles.nicknameArrow}>›</Text>
        </View>
      </Pressable>

      {currentIdentity === 'driver' && (
        <Pressable
          style={styles.card}
          onPress={() => {
            Alert.alert('邀请司机', '邀请司机功能即将上线，奖励规则敬请期待。');
          }}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, styles.cardIconInvite]}>
              <Text style={styles.cardIconText}>🧑‍🤝‍🧑</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>邀请司机</Text>
              <Text style={styles.cardHint}>生成邀请链接（即将上线）</Text>
            </View>
            <Text style={styles.nicknameArrow}>›</Text>
          </View>
        </Pressable>
      )}

      <Pressable style={styles.card} onPress={() => openWebsitePath('/contact.html')}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.cardIconAbout]}>
            <Text style={styles.cardIconText}>ℹ️</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>关于我们</Text>
            <Text style={styles.cardHint}>了解摩迪与合作方式</Text>
          </View>
          <Text style={styles.nicknameArrow}>›</Text>
        </View>
      </Pressable>

      <Pressable style={styles.card} onPress={() => openWebsitePath('/contact.html')}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.cardIconLegal]}>
            <Text style={styles.cardIconText}>📄</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>用户协议</Text>
            <Text style={styles.cardHint}>当前暂链至官网联系页</Text>
          </View>
          <Text style={styles.nicknameArrow}>›</Text>
        </View>
      </Pressable>

      <Pressable style={styles.card} onPress={() => openWebsitePath('/contact.html')}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.cardIconLegal]}>
            <Text style={styles.cardIconText}>🔒</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>隐私政策</Text>
            <Text style={styles.cardHint}>当前暂链至官网联系页</Text>
          </View>
          <Text style={styles.nicknameArrow}>›</Text>
        </View>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.btnOutline, pressed && styles.btnPressed]} onPress={logout}>
        <Text style={styles.btnOutlineIcon}>🚪</Text>
        <Text style={styles.btnOutlineText}>退出登录</Text>
      </Pressable>

      <Modal
        visible={nicknameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNicknameModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setNicknameModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>修改昵称</Text>
            <TextInput
              style={styles.modalInput}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder={DEFAULT_DRIVER_DISPLAY_NAME}
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.btnPressed]} onPress={() => setNicknameModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.modalBtn, styles.modalBtnOk, pressed && styles.btnPressed]} onPress={saveNickname}>
                <Text style={styles.modalBtnOkText}>保存</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={fontScaleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFontScaleModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFontScaleModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>字号大小</Text>
            {(['small', 'standard', 'large'] as const).map((level) => (
              <Pressable
                key={level}
                style={[styles.fontScaleOption, fontScaleLevel === level && styles.fontScaleOptionActive]}
                onPress={() => handleSelectFontScale(level)}
              >
                <Text style={[styles.fontScaleOptionText, fontScaleLevel === level && styles.fontScaleOptionTextActive]}>
                  {FONT_SCALE_LABELS[level]}
                </Text>
                {fontScaleLevel === level && <Text style={styles.fontScaleOptionCheck}>✓</Text>}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPhoneModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{currentIdentity === 'driver' ? (driverPhone ? '修改手机号' : '绑定手机号') : (passengerPhone ? '修改手机号' : '绑定手机号')}</Text>
            <TextInput
              style={styles.modalInput}
              value={phoneInput}
              onChangeText={(t) => { setPhoneInput(t); setPhoneError(null); }}
              onBlur={() => phoneInput.trim() && validatePhone(phoneInput)}
              placeholder="11 位手机号"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
              maxLength={11}
            />
            {phoneError ? <Text style={styles.phoneError}>{phoneError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.btnPressed]} onPress={() => setPhoneModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.modalBtn, styles.modalBtnOk, pressed && styles.btnPressed]} onPress={savePhone} disabled={savingProfile}>
                <Text style={styles.modalBtnOkText}>保存</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
});

function createStyles(fontScaleLevel: FontScaleLevel) {
  const fontScale = FONT_SCALE_VALUES[fontScaleLevel] ?? 1;
  return StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: theme.bg,
    gap: 16,
  },
  profileCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 20,
    alignItems: 'center',
  },
  passengerHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  passengerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.borderLight,
  },
  passengerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerAvatarText: { fontSize: 28 },
  passengerName: {
    fontSize: scaledFontSize(16, fontScale),
    fontWeight: '600',
    color: theme.text,
    marginTop: 8,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.borderLight,
  },
  avatarHint: {
    fontSize: scaledFontSize(13, fontScale),
    color: theme.textMuted,
    marginTop: 8,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  nicknameLabel: {
    fontSize: scaledFontSize(15, fontScale),
    color: theme.textMuted,
    marginRight: 12,
  },
  nicknameValue: {
    flex: 1,
    fontSize: scaledFontSize(16, fontScale),
    fontWeight: '600',
    color: theme.text,
  },
  nicknameArrow: {
    fontSize: scaledFontSize(18, fontScale),
    color: theme.textMuted,
  },
  fontScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    borderWidth: 1,
    borderColor: theme.borderLight,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  fontScaleLabel: {
    fontSize: scaledFontSize(16, fontScale),
    fontWeight: '600',
    color: theme.text,
    flex: 1,
  },
  fontScaleValue: {
    fontSize: scaledFontSize(15, fontScale),
    color: theme.textMuted,
    marginRight: 8,
  },
  fontScaleArrow: {
    fontSize: scaledFontSize(18, fontScale),
    color: theme.textMuted,
  },
  fontScaleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadiusSm,
    marginBottom: 8,
  },
  fontScaleOptionActive: {
    backgroundColor: theme.accentSoft,
  },
  fontScaleOptionText: {
    fontSize: scaledFontSize(16, fontScale),
    color: theme.text,
  },
  fontScaleOptionTextActive: {
    fontWeight: '700',
    color: theme.accent,
  },
  fontScaleOptionCheck: {
    fontSize: scaledFontSize(18, fontScale),
    color: theme.accent,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius,
    padding: 20,
  },
  modalTitle: {
    fontSize: scaledFontSize(18, fontScale),
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.borderRadiusSm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: scaledFontSize(16, fontScale),
    color: theme.text,
    marginBottom: 20,
  },
  phoneError: {
    fontSize: scaledFontSize(13, fontScale),
    color: '#dc2626',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadiusSm,
  },
  modalBtnCancel: {
    backgroundColor: theme.surface2,
  },
  modalBtnCancelText: {
    fontSize: scaledFontSize(15, fontScale),
    fontWeight: '600',
    color: theme.textMuted,
  },
  modalBtnOk: {
    backgroundColor: theme.accent,
  },
  modalBtnOkText: {
    fontSize: scaledFontSize(15, fontScale),
    fontWeight: '700',
    color: '#fff',
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
  cardIconText: { fontSize: scaledFontSize(24, fontScale) },
  cardIconP: { backgroundColor: theme.blueSoft },
  cardIconD: { backgroundColor: theme.greenSoft },
  cardIconSwitch: { backgroundColor: theme.accentSoft },
  cardIconVerify: { backgroundColor: 'rgba(217,119,6,0.15)' },
  cardIconPayment: { backgroundColor: theme.greenSoft },
  cardIconFeedback: { backgroundColor: theme.blueSoft },
  cardIconPromo: { backgroundColor: 'rgba(217,119,6,0.15)' },
  cardIconInvite: { backgroundColor: 'rgba(124,58,237,0.12)' },
  cardIconAbout: { backgroundColor: theme.accentSoft },
  cardIconLegal: { backgroundColor: theme.surface2 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: scaledFontSize(18, fontScale), fontWeight: '700', color: theme.text, marginBottom: 4 },
  cardHint: { fontSize: scaledFontSize(13, fontScale), color: theme.textMuted, lineHeight: 20 },
  identityLabel: { fontSize: scaledFontSize(16, fontScale), color: theme.text },
  cardBody: { padding: 20 },
  paymentQrPreview: { alignItems: 'center', gap: 12 },
  paymentQrImage: { width: 120, height: 120, borderRadius: theme.borderRadiusSm },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
  },
  btnPressed: { opacity: 0.9 },
  btnIcon: { fontSize: scaledFontSize(18, fontScale), color: theme.text },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: scaledFontSize(15, fontScale) },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  btnOutlineIcon: { fontSize: scaledFontSize(18, fontScale) },
  btnOutlineText: { color: theme.textMuted, fontWeight: '600', fontSize: scaledFontSize(15, fontScale) },
});
}
