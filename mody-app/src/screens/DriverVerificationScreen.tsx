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
  Image,
  Modal,
  Platform,
} from 'react-native';
import { getDriverProfile, submitVerification, uploadDriverImage } from '../services/api';
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
  const [idCardFront, setIdCardFront] = useState(''); // 服务端 URL
  const [idCardBack, setIdCardBack] = useState(''); // 服务端 URL
  const [licensePlate, setLicensePlate] = useState('');
  const [licensePlatePhoto, setLicensePlatePhoto] = useState(''); // 服务端 URL（选填）
  const [loadFailed, setLoadFailed] = useState(false);

  const [idCardFrontPreview, setIdCardFrontPreview] = useState<string | null>(null);
  const [idCardBackPreview, setIdCardBackPreview] = useState<string | null>(null);
  const [licensePlatePhotoPreview, setLicensePlatePhotoPreview] = useState<string | null>(null);

  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingPlatePhoto, setUploadingPlatePhoto] = useState(false);

  const [pickerTarget, setPickerTarget] = useState<'front' | 'back' | 'platePhoto' | null>(null);

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
          const front = res.data.id_card_front || '';
          const back = res.data.id_card_back || '';
          const platePhoto = res.data.license_plate_photo || '';
          setIdCardFront(front);
          setIdCardBack(back);
          setLicensePlate(res.data.license_plate || '');
          setLicensePlatePhoto(platePhoto);
          setIdCardFrontPreview(front || null);
          setIdCardBackPreview(back || null);
          setLicensePlatePhotoPreview(platePhoto || null);
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

  async function handlePickImage(
    target: 'front' | 'back' | 'platePhoto',
    source: 'camera' | 'library'
  ) {
    if (!token) {
      showToast('请先登录后再进行认证', 'error');
      return;
    }
    try {
      const picker = require('react-native-image-picker');
      const { launchCamera, launchImageLibrary } = picker;
      const fn = source === 'camera' ? launchCamera : launchImageLibrary;
      if (typeof fn !== 'function') {
        showToast('当前环境暂不支持图片选择，请稍后重试', 'error');
        return;
      }
      const result = await fn({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result?.didCancel || !result?.assets?.length) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      if (!uri) {
        showToast('未获取到图片地址，请重试', 'error');
        return;
      }

      if (target === 'front') {
        setIdCardFrontPreview(uri);
        setUploadingFront(true);
      } else if (target === 'back') {
        setIdCardBackPreview(uri);
        setUploadingBack(true);
      } else {
        setLicensePlatePhotoPreview(uri);
        setUploadingPlatePhoto(true);
      }

      try {
        const { url } = await uploadDriverImage(token, {
          uri,
          type: asset.type || null,
          fileName: asset.fileName || null,
        });
        if (target === 'front') {
          setIdCardFront(url);
          setIdCardFrontPreview(url);
        } else if (target === 'back') {
          setIdCardBack(url);
          setIdCardBackPreview(url);
        } else {
          setLicensePlatePhoto(url);
          setLicensePlatePhotoPreview(url);
        }
        showToast('上传成功', 'success');
      } catch (e: any) {
        const msg = e?.message || '上传失败，请重新选择';
        showToast(msg, 'error');
      } finally {
        if (target === 'front') setUploadingFront(false);
        else if (target === 'back') setUploadingBack(false);
        else setUploadingPlatePhoto(false);
      }
    } catch (e: any) {
      showToast(e?.message || '选择图片失败，请稍后重试', 'error');
    }
  }

  function openPicker(target: 'front' | 'back' | 'platePhoto') {
    if (!canEdit) return;
    setPickerTarget(target);
  }

  function closePicker() {
    setPickerTarget(null);
  }

  async function handleSubmit() {
    if (!token) return;
    const front = idCardFront.trim();
    const back = idCardBack.trim();
    const plate = licensePlate.trim();
    if (!front || !back || !plate) {
      showToast('请上传身份证正反面照片并填写车牌号', 'error');
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
        Alert.alert('认证成功', '您已完成身份认证，可以营业了。', [
          { text: '确定', onPress: onBack },
        ]);
      } else if (status === 'rejected') {
        Alert.alert('已提交', '您的认证材料已提交，请等待管理员审核。');
      } else {
        Alert.alert('认证成功', '您已完成身份认证，可以营业了。', [
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
        hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
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
        <Text style={styles.cardTitle}>身份证正面照片 *</Text>
        <Text style={styles.cardHint}>请上传清晰无遮挡的身份证正面，仅用于司机身份认证。</Text>
        <Pressable
          style={styles.uploadBox}
          onPress={() => openPicker('front')}
          disabled={!canEdit || uploadingFront}
        >
          {idCardFrontPreview ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: idCardFrontPreview }} style={styles.previewImage} resizeMode="cover" />
              <Text style={styles.previewText}>{uploadingFront ? '上传中…' : '点击重新选择'}</Text>
            </View>
          ) : (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>{uploadingFront ? '上传中…' : '点击上传'}</Text>
            </View>
          )}
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>身份证反面照片 *</Text>
        <Text style={styles.cardHint}>请上传清晰无遮挡的身份证反面，仅用于司机身份认证。</Text>
        <Pressable
          style={styles.uploadBox}
          onPress={() => openPicker('back')}
          disabled={!canEdit || uploadingBack}
        >
          {idCardBackPreview ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: idCardBackPreview }} style={styles.previewImage} resizeMode="cover" />
              <Text style={styles.previewText}>{uploadingBack ? '上传中…' : '点击重新选择'}</Text>
            </View>
          ) : (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>{uploadingBack ? '上传中…' : '点击上传'}</Text>
            </View>
          )}
        </Pressable>
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
        <Text style={styles.cardHint}>建议上传清晰车牌照片，便于审核。</Text>
        <Pressable
          style={styles.uploadBox}
          onPress={() => openPicker('platePhoto')}
          disabled={!canEdit || uploadingPlatePhoto}
        >
          {licensePlatePhotoPreview ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: licensePlatePhotoPreview }} style={styles.previewImage} resizeMode="cover" />
              <Text style={styles.previewText}>{uploadingPlatePhoto ? '上传中…' : '点击重新选择'}</Text>
            </View>
          ) : (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>{uploadingPlatePhoto ? '上传中…' : '点击上传（可选）'}</Text>
            </View>
          )}
        </Pressable>
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
        <Text style={styles.approvedHint}>您已通过认证，可正常营业。</Text>
      )}

      <Modal
        visible={pickerTarget != null}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.pickerOverlay} onPress={closePicker}>
          <Pressable
            style={styles.pickerSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.pickerTitle}>选择图片来源</Text>
            <Text style={styles.pickerHint}>
              仅用于司机身份认证，不会对外公开。
            </Text>
            <Pressable
              style={styles.pickerItem}
              onPress={() => {
                if (!pickerTarget) return;
                closePicker();
                handlePickImage(pickerTarget, 'camera');
              }}
            >
              <Text style={styles.pickerItemText}>拍照上传</Text>
            </Pressable>
            <Pressable
              style={styles.pickerItem}
              onPress={() => {
                if (!pickerTarget) return;
                closePicker();
                handlePickImage(pickerTarget, 'library');
              }}
            >
              <Text style={styles.pickerItemText}>从相册选择</Text>
            </Pressable>
            <Pressable style={styles.pickerCancel} onPress={closePicker}>
              <Text style={styles.pickerCancelText}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
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
  cardHint: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 10,
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
  uploadBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderIcon: {
    fontSize: 24,
  },
  placeholderText: {
    fontSize: 13,
    color: theme.textMuted,
  },
  previewWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  previewText: {
    fontSize: 13,
    color: theme.textMuted,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8 + 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  pickerHint: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 12,
  },
  pickerItem: {
    paddingVertical: 12,
  },
  pickerItemText: {
    fontSize: 15,
    color: theme.text,
  },
  pickerCancel: {
    marginTop: 4,
    paddingVertical: 12,
  },
  pickerCancelText: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
