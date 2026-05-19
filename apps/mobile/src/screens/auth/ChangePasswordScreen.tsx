import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import api from '../../libs/axios';
import { useTheme, Theme } from '../../theme';

function calcStrength(v: string) {
  const criteria = [v.length >= 8, /[A-Z]/.test(v), /[0-9]/.test(v), /[^a-zA-Z0-9]/.test(v)];
  const score = criteria.filter(Boolean).length;
  const levels = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const colors = ['#e5e7eb', '#ef4444', '#d97706', '#16a34a', '#059669'];
  return { score, label: levels[score] || '', color: colors[score] || '#e5e7eb' };
}

const RULES = (pw: string) => [
  { ok: pw.length >= 8, text: 'Ít nhất 8 ký tự' },
  { ok: /[A-Z]/.test(pw), text: 'Chữ hoa (A–Z)' },
  { ok: /[0-9]/.test(pw), text: 'Số (0–9)' },
  { ok: /[^a-zA-Z0-9]/.test(pw), text: 'Ký tự đặc biệt' },
];

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = calcStrength(newPw);
  const rules = RULES(newPw);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPw.trim()) { setError('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!newPw.trim() || newPw.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự'); return; }
    if (newPw !== confirmPw) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (currentPw === newPw) { setError('Mật khẩu mới phải khác mật khẩu hiện tại'); return; }
    setIsLoading(true);
    try {
      await api.post('/users/change-password', { currentPassword: currentPw.trim(), newPassword: newPw.trim() });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.statusBar} />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={16} color={theme.colors.text.secondary} library="ionicons" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Đổi mật khẩu</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Icon banner */}
        <View style={s.iconBanner}>
          <View style={s.iconWrap}>
            <Icon name="lock-closed-outline" size={34} color={theme.colors.brand.primary} library="ionicons" />
          </View>
          <Text style={s.bannerTitle}>Bảo mật tài khoản</Text>
          <Text style={s.bannerSub}>Đặt mật khẩu mạnh để bảo vệ tài khoản của bạn khỏi truy cập trái phép</Text>
        </View>

        {/* Form card */}
        <View style={s.formCard}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Mật khẩu hiện tại</Text>
            <View style={s.inputWrap}>
              <TextInput
                value={currentPw}
                onChangeText={(v) => { setCurrentPw(v); setError(null); }}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor={theme.colors.text.muted}
                secureTextEntry={!showCur}
                style={s.input}
                autoCapitalize="none"
                selectionColor={theme.colors.brand.primary}
              />
              <TouchableOpacity onPress={() => setShowCur(!showCur)} style={s.eyeBtn}>
                <Icon name={showCur ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.text.muted} library="ionicons" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>Mật khẩu mới</Text>
            <View style={s.inputWrap}>
              <TextInput
                value={newPw}
                onChangeText={(v) => { setNewPw(v); setError(null); }}
                placeholder="Tối thiểu 8 ký tự"
                placeholderTextColor={theme.colors.text.muted}
                secureTextEntry={!showNew}
                style={s.input}
                autoCapitalize="none"
                selectionColor={theme.colors.brand.primary}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={s.eyeBtn}>
                <Icon name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.text.muted} library="ionicons" />
              </TouchableOpacity>
            </View>
            <View style={s.strengthWrap}>
              <View style={s.strengthLabelRow}>
                <Text style={s.strengthLblLeft}>Độ mạnh mật khẩu</Text>
                <Text style={[s.strengthLblRight, { color: newPw ? strength.color : theme.colors.text.muted }]}>
                  {newPw ? strength.label : '—'}
                </Text>
              </View>
              <View style={s.strengthBarRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[s.sbar, i < strength.score && { backgroundColor: strength.color }]} />
                ))}
              </View>
            </View>
            <View style={s.rulesGrid}>
              <View style={s.rulesRow}>
                {rules.slice(0, 2).map((r, i) => (
                  <View key={i} style={s.rule}>
                    <Icon name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={r.ok ? theme.colors.status.success : theme.colors.text.muted} library="ionicons" />
                    <Text style={[s.ruleText, r.ok && s.ruleTextOk]}>{r.text}</Text>
                  </View>
                ))}
              </View>
              <View style={s.rulesRow}>
                {rules.slice(2).map((r, i) => (
                  <View key={i} style={s.rule}>
                    <Icon name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={r.ok ? theme.colors.status.success : theme.colors.text.muted} library="ionicons" />
                    <Text style={[s.ruleText, r.ok && s.ruleTextOk]}>{r.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[s.field, { marginBottom: 0 }]}>
            <Text style={s.fieldLabel}>Xác nhận mật khẩu mới</Text>
            <View style={s.inputWrap}>
              <TextInput
                value={confirmPw}
                onChangeText={(v) => { setConfirmPw(v); setError(null); }}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={theme.colors.text.muted}
                secureTextEntry={!showConf}
                style={s.input}
                autoCapitalize="none"
                selectionColor={theme.colors.brand.primary}
              />
              <TouchableOpacity onPress={() => setShowConf(!showConf)} style={s.eyeBtn}>
                <Icon name={showConf ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.text.muted} library="ionicons" />
              </TouchableOpacity>
            </View>
            {confirmPw.length > 0 && (
              <Text style={[s.matchMsg, { color: confirmPw === newPw ? theme.colors.status.success : theme.colors.status.danger }]}>
                {confirmPw === newPw ? '✓ Mật khẩu khớp' : '✗ Mật khẩu không khớp'}
              </Text>
            )}
          </View>
        </View>

        {/* Security tips */}
        <View style={s.tipsCard}>
          <View style={s.tipsTitle}>
            <Icon name="information-circle-outline" size={14} color={theme.colors.brand.primary} library="ionicons" />
            <Text style={s.tipsTitleText}>Gợi ý bảo mật</Text>
          </View>
          <Text style={s.tipItem}>· Không dùng tên, ngày sinh hoặc thông tin cá nhân</Text>
          <Text style={s.tipItem}>· Không tái sử dụng mật khẩu cũ</Text>
          <Text style={s.tipItem}>· Nên đổi mật khẩu định kỳ 3 tháng/lần</Text>
        </View>

        {error && (
          <View style={s.errorCard}>
            <Icon name="alert-circle-outline" size={16} color={theme.colors.status.danger} library="ionicons" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={isLoading} activeOpacity={0.85}>
          <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGradient}>
            {isLoading ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={s.submitText}>Cập nhật mật khẩu</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Success overlay */}
      {success && (
        <View style={s.overlay}>
          <View style={s.successCard}>
            <View style={s.scIcon}>
              <Icon name="checkmark-outline" size={32} color={theme.colors.status.success} library="ionicons" />
            </View>
            <Text style={s.scTitle}>Đổi mật khẩu thành công!</Text>
            <Text style={s.scSub}>Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại để tiếp tục.</Text>
            <TouchableOpacity style={s.scBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={s.scBtnText}>Đăng nhập lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    statusBar: { height: 44, backgroundColor: t.colors.background.base },

    topBar: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingBottom: 12, backgroundColor: t.colors.background.base,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: t.colors.background.surface, borderWidth: 1.5, borderColor: t.colors.border.default,
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 18, fontWeight: '800', color: t.colors.text.primary, letterSpacing: -0.3 },

    scroll: { paddingHorizontal: 16, paddingBottom: 24 },

    iconBanner: { alignItems: 'center', paddingVertical: 20, paddingBottom: 24 },
    iconWrap: {
      width: 72, height: 72, borderRadius: 20,
      backgroundColor: t.colors.background.indigoTint,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12,
      shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4,
    },
    bannerTitle: { fontSize: 20, fontWeight: '800', color: t.colors.text.primary, marginBottom: 4 },
    bannerSub: { fontSize: 13, color: t.colors.text.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

    formCard: {
      backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: t.colors.border.default, marginBottom: 12,
    },
    field: { marginBottom: 14 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: t.colors.text.secondary, marginBottom: 6 },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', height: 48,
      backgroundColor: t.colors.background.base, borderRadius: 12,
      borderWidth: 1.5, borderColor: t.colors.border.default, paddingHorizontal: 14,
    },
    input: { flex: 1, fontSize: 14, color: t.colors.text.primary, paddingRight: 8 },
    eyeBtn: { padding: 4 },

    strengthWrap: { marginTop: 10 },
    strengthLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    strengthLblLeft: { fontSize: 11, color: t.colors.text.muted },
    strengthLblRight: { fontSize: 11, fontWeight: '600' },
    strengthBarRow: { flexDirection: 'row', gap: 4 },
    sbar: { flex: 1, height: 4, borderRadius: 9999, backgroundColor: t.colors.border.default },

    rulesGrid: { marginTop: 12, gap: 6 },
    rulesRow: { flexDirection: 'row', gap: 6 },
    rule: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    ruleText: { fontSize: 11, color: t.colors.text.muted, fontWeight: '500', flex: 1 },
    ruleTextOk: { color: t.colors.status.success },

    matchMsg: { fontSize: 11, fontWeight: '500', marginTop: 5 },

    tipsCard: {
      backgroundColor: t.colors.background.indigoTint, borderRadius: 14,
      padding: 14, borderWidth: 1, borderColor: t.colors.border.indigo, marginBottom: 12,
    },
    tipsTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    tipsTitleText: { fontSize: 12, fontWeight: '700', color: t.colors.brand.primary },
    tipItem: { fontSize: 12, color: t.colors.text.secondary, lineHeight: 22 },

    errorCard: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.colors.status.dangerBg, borderWidth: 1, borderColor: t.colors.status.dangerBorder,
      borderRadius: 10, padding: 12, marginBottom: 12,
    },
    errorText: { flex: 1, fontSize: 13, color: t.colors.status.danger },

    submitBtn: {
      borderRadius: 9999, overflow: 'hidden',
      shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6,
    },
    submitGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    submitText: { fontSize: 16, fontWeight: '700', color: t.colors.text.onPrimary },

    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center', justifyContent: 'center',
    },
    successCard: {
      backgroundColor: t.colors.background.surface, borderRadius: 24, padding: 32,
      width: 300, alignItems: 'center',
    },
    scIcon: {
      width: 64, height: 64, borderRadius: 20,
      backgroundColor: t.colors.status.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    scTitle: { fontSize: 20, fontWeight: '800', color: t.colors.text.primary, marginBottom: 6 },
    scSub: { fontSize: 13, color: t.colors.text.muted, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
    scBtn: {
      width: '100%', height: 46, borderRadius: 9999,
      backgroundColor: t.colors.brand.primary, alignItems: 'center', justifyContent: 'center',
    },
    scBtnText: { fontSize: 14, fontWeight: '700', color: t.colors.text.onPrimary },
  });
}
