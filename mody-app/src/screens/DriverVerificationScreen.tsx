import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getDriverProfile, submitVerification } from '../services/api';
import { useIdentity } from '../context/IdentityContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';

type DriverStatus = 'pending' | 'approved' | 'rejected';

function statusLabel(s: DriverStatus): string {
  if (s === 'approved') return '已通过';
  if (s === 'rejected') return '已驳回';
  return '认证中';
}

type Props = {
  onBack: () => void;
};

export function DriverVerificationScreen({ onBack }: Props) {
  const { token } = useIdentity();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<DriverStatus | null>(null);
  const [idCardFront, setIdCardFront] = useState('');
  const [idCardBack, setIdCardBack] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licensePlatePhoto, setLicensePlatePhoto] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  const loadProfile = React.useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoadFailed(false);
    setLoading(true);
    getDriverProfile(token)
      .then((res) => {
        if (res?.data) {
          setStatus(res.data.status as DriverStatus);
          setIdCardFront(res.data.id_card_front || '');
          setIdCardBack(res.data.id_card_back || '');
          setLicensePlate(res.data.license_plate || '');
          setLicensePlatePhoto(res.data.license_plate_photo || '');
        }
      })
      .catch(() => {
        setLoadFailed(true);
        showToast('获取资料失败', 'error');
      })
      .finally(() => setLoading(false));
  }, [token, showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSubmit() {
    if (!token) return;
    const front = idCardFront.trim();
    const back = idCardBack.trim();
    const plate = licensePlate.trim();
    if (!front || !back || !plate) {
      showToast('请填写身份证正反面 URL 与车牌号', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitVerification(token, {
        id_card_front: front,
        id_card_back: back,
        license_plate: plate,
        license_plate_photo: licensePlatePhoto.trim() || undefined,
      });
      const newStatus = (res?.data as any)?.status as DriverStatus | undefined;
      if (newStatus) setStatus(newStatus);
      if (newStatus === 'approved') {
        Alert.alert('认证成功', '您已完成身份认证，可以接单了。', [
          { text: '确定', onPress: onBack },
        ]);
      } else if (status === 'rejected') {
        Alert.alert('已提交', '您的认证材料已提交，请等待管理员审核。');
      } else {
        Alert.alert('认证成功', '您已完成身份认证，可以接单了。', [
          { text: '确定', onPress: onBack },
        ]);
      }
    } catch (e: any) {
      showToast(e?.message || '提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={styles.loadingText}>加载中…</Text>
      </View>
    );
  }

  const canEdit = status !== 'approved';
  const showSubmit = status === null || status === 'pending' || status === 'rejected';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Pressable
        style={styles.backBtn}
        onPress={onBack}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Text style={styles.backBtnText}>← 返回</Text>
      </Pressable>

      {loadFailed && (
        <Pressable style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>点击重试加载</Text>
        </Pressable>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>认证状态</Text>
        <Text style={[styles.statusBadge, status === 'approved' && styles.statusApproved, status === 'rejected' && styles.statusRejected]}>
          {status != null ? statusLabel(status) : '未认证'}
        </Text>
        {status === 'pending' && (
          <Text style={styles.statusHint}>审核需要一定时间，请耐心等候。</Text>
        )}
        {status === 'rejected' && (
          <Text style={styles.statusHint}>已被禁用，请重新认证。</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>身份证信息</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>身份证正面</Text>
        <TextInput
          style={styles.input}
          value={idCardFront}
          onChangeText={(t) => setIdCardFront(t)}
          placeholder="请输入图片链接（后续支持拍照上传）"
          placeholderTextColor={theme.textMuted}
          editable={canEdit}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>身份证反面</Text>
        <TextInput
          style={styles.input}
          value={idCardBack}
          onChangeText={(t) => setIdCardBack(t)}
          placeholder="请输入图片链接（后续支持拍照上传）"
          placeholderTextColor={theme.textMuted}
          editable={canEdit}
        />
      </View>

      <Text style={styles.sectionTitle}>车辆信息</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>车牌号 *</Text>
        <TextInput
          style={styles.input}
          value={licensePlate}
          onChangeText={(t) => setLicensePlate(t)}
          placeholder="如 京A12345"
          placeholderTextColor={theme.textMuted}
          editable={canEdit}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>车牌照片（选填）</Text>
        <TextInput
          style={styles.input}
          value={licensePlatePhoto}
          onChangeText={setLicensePlatePhoto}
          placeholder="可选，可输入图片链接"
          placeholderTextColor={theme.textMuted}
          editable={canEdit}
        />
      </View>

      {showSubmit && (
        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>提交认证</Text>
          )}
        </Pressable>
      )}

      {status === 'approved' && (
        <Text style={styles.approvedHint}>您已通过认证，可正常接单。</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: theme.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: theme.textMuted },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  backBtnText: { fontSize: 16, color: theme.accent, fontWeight: '600' },
  retryBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: theme.accentSoft,
    borderRadius: theme.borderRadiusSm,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: theme.accent },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadiusSm,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMuted,
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  statusApproved: { color: theme.green },
  statusRejected: { color: '#dc2626' },
  statusHint: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
  },
  error: {
    fontSize: 13,
    color: '#dc2626',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: theme.borderRadiusSm,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  approvedHint: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
});
