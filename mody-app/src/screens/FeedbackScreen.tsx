import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFontScale, scaledFontSize, FONT_SCALE_VALUES, type FontScaleLevel } from '../context/FontScaleContext';
import { useIdentity } from '../context/IdentityContext';
import { useToast } from '../context/ToastContext';
import { submitFeedback } from '../services/api';
import { theme } from '../theme';

type FeedbackType = 'suggestion' | 'experience' | 'report';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'suggestion', label: '建议' },
  { value: 'experience', label: '体验反馈' },
  { value: 'report', label: '举报' },
];

/** 预创建三种字号的样式，避免切换类型时重复执行 StyleSheet.create 导致卡顿 */
function createStyles(fontScaleLevel: FontScaleLevel) {
  const fontScale = FONT_SCALE_VALUES[fontScaleLevel] ?? 1;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionTitle: {
      fontSize: scaledFontSize(16, fontScale),
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    typeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    typeOption: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: theme.borderRadiusSm,
      backgroundColor: theme.surface2,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    typeOptionActive: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accent,
    },
    typeOptionText: {
      fontSize: scaledFontSize(15, fontScale),
      fontWeight: '600',
      color: theme.textMuted,
    },
    typeOptionTextActive: {
      color: theme.accent,
    },
    textArea: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.borderRadiusSm,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: scaledFontSize(16, fontScale),
      color: theme.text,
      backgroundColor: theme.surface,
      minHeight: 120,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.borderRadiusSm,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: scaledFontSize(16, fontScale),
      color: theme.text,
      backgroundColor: theme.surface,
    },
    submitBtn: {
      backgroundColor: theme.accent,
      paddingVertical: 14,
      borderRadius: theme.borderRadiusSm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: {
      fontSize: scaledFontSize(16, fontScale),
      fontWeight: '700',
      color: '#fff',
    },
  });
}

const STYLES_CACHE: Record<FontScaleLevel, ReturnType<typeof createStyles>> = {
  small: createStyles('small'),
  standard: createStyles('standard'),
  large: createStyles('large'),
};

type Props = {
  onBack: () => void;
};

export const FeedbackScreen: React.FC<Props> = ({ onBack }) => {
  const { token } = useIdentity();
  const { showToast } = useToast();
  const { fontScaleLevel } = useFontScale();
  const styles = STYLES_CACHE[fontScaleLevel] ?? STYLES_CACHE.standard;

  const [type, setType] = useState<FeedbackType>('suggestion');
  const [content, setContent] = useState('');
  const [reportedUserInfo, setReportedUserInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      showToast('请详细描述您的问题或建议', 'error');
      return;
    }
    if (!token) {
      showToast('请先登录', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback(token, {
        type,
        content: trimmed,
        ...(type === 'report' && reportedUserInfo.trim() ? { reported_user_info: reportedUserInfo.trim() } : {}),
      });
      showToast('已提交，我们会在后台查看，必要时会通过消息回复您', 'success');
      onBack();
    } catch (e: any) {
      showToast(e?.message || '提交失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>类型</Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={({ pressed }) => [
                styles.typeOption,
                (type === opt.value || pressed) && styles.typeOptionActive,
              ]}
              onPress={() => setType(opt.value)}
            >
              {({ pressed }) => (
                <Text
                  style={[
                    styles.typeOptionText,
                    (type === opt.value || pressed) && styles.typeOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>内容</Text>
        <TextInput
          style={styles.textArea}
          value={content}
          onChangeText={setContent}
          placeholder="请详细描述您的问题或建议…"
          placeholderTextColor={theme.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          editable={!submitting}
        />
      </View>

      {type === 'report' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>被举报人信息（选填）</Text>
          <TextInput
            style={styles.input}
            value={reportedUserInfo}
            onChangeText={setReportedUserInfo}
            placeholder="如昵称、手机号后四位等"
            placeholderTextColor={theme.textMuted}
            editable={!submitting}
          />
        </View>
      )}

      <Pressable
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>提交</Text>
        )}
      </Pressable>
    </ScrollView>
  );
};
