import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import api from '../../libs/axios';
import { useTheme, Theme } from '../../theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'VerifyOtp'>;
  route: RouteProp<RootStackParamList, 'VerifyOtp'>;
};

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 299;

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local[0] + '***' + (local[local.length - 1] || '') + '@' + domain;
}

export default function VerifyOtpScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const illusScale = useRef(new Animated.Value(0.7)).current;
  const illusOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(16)).current;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(illusScale, { toValue: 1, tension: 34, friction: 5, useNativeDriver: true }),
      Animated.timing(illusOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 100);
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const formatCountdown = () => {
    const m = Math.floor(countdown / 60).toString().padStart(2, '0');
    const sec = (countdown % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[index] = digit; setOtp(next); setError(null);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp]; next[index - 1] = ''; setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await api.post('/auth/forgot-password', { email });
      setCountdown(COUNTDOWN_SECONDS); setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill('')); setError(null);
    } catch { setError('Không thể gửi lại mã. Thử lại sau.'); }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      inputRefs.current[otp.findIndex((d) => !d)]?.focus();
      setError('Vui lòng nhập đủ 6 chữ số'); return;
    }
    setIsLoading(true); setError(null);
    try {
      await api.post('/auth/verify-reset-otp', { email, otp: code });
      navigation.navigate('ResetPassword', { email });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    } finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color={theme.colors.text.primary} library="ionicons" />
        </TouchableOpacity>

        <Animated.View style={{ opacity: illusOpacity, transform: [{ scale: illusScale }] }}>
          <LinearGradient colors={[theme.colors.status.successBg, theme.colors.status.successBorder] as unknown as readonly [string, ...string[]]} style={s.illus}>
            <Icon name="shield-checkmark-outline" size={48} color={theme.colors.status.success} library="ionicons" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <Text style={s.title}>Xác minh OTP</Text>
          <Text style={s.sub}>Mã xác minh đã được gửi đến</Text>
        </Animated.View>

        <View style={s.emailBadge}>
          <Icon name="mail-outline" size={13} color={theme.colors.brand.primary} library="ionicons" />
          <Text style={s.emailBadgeText}>{maskEmail(email)}</Text>
        </View>

        <Text style={s.otpLabel}>Nhập mã 6 chữ số</Text>
        <View style={s.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={[s.otpBox, focusedIndex === i && !digit ? s.otpBoxFocused : null, digit ? s.otpBoxFilled : null]}
              selectionColor={theme.colors.brand.primary}
            />
          ))}
        </View>

        <View style={s.timerRow}>
          <Text style={s.timerText}>Hết hạn sau <Text style={s.timerBold}>{formatCountdown()}</Text></Text>
          <TouchableOpacity onPress={handleResend} disabled={!canResend} activeOpacity={0.7}>
            <Text style={[s.resendBtn, canResend && s.resendBtnActive]}>Gửi lại mã</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={s.errorCard}>
            <Icon name="alert-circle-outline" size={16} color={theme.colors.status.danger} library="ionicons" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleVerify} disabled={isLoading} activeOpacity={0.85} style={s.btnPrimary}>
          <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGradient}>
            {isLoading ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={s.btnText}>Xác minh</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.background.surface, borderWidth: 1.5, borderColor: t.colors.border.default, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    illus: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
    title: { fontSize: 26, fontWeight: '800', color: t.colors.text.primary, letterSpacing: -0.5, marginBottom: 8 },
    sub: { fontSize: 14, color: t.colors.text.muted, lineHeight: 22, marginBottom: 8 },
    emailBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: t.colors.background.indigoTint, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 9999, marginBottom: 36 },
    emailBadgeText: { fontSize: 13, fontWeight: '600', color: t.colors.brand.primary },
    otpLabel: { fontSize: 13, fontWeight: '600', color: t.colors.text.secondary, marginBottom: 12 },
    otpRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    otpBox: { flex: 1, height: 60, backgroundColor: t.colors.background.surface, borderRadius: 14, borderWidth: 2, borderColor: t.colors.border.default, fontSize: 24, fontWeight: '700', color: t.colors.text.primary, textAlign: 'center' },
    otpBoxFocused: { borderColor: t.colors.brand.primary, shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 },
    otpBoxFilled: { borderColor: t.colors.status.success, backgroundColor: t.colors.status.successBg, color: t.colors.status.success },
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 32 },
    timerText: { fontSize: 13, color: t.colors.text.muted },
    timerBold: { fontWeight: '700', color: t.colors.text.secondary },
    resendBtn: { fontSize: 13, fontWeight: '600', color: t.colors.text.muted },
    resendBtnActive: { color: t.colors.brand.primary },
    errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.colors.status.dangerBg, borderWidth: 1, borderColor: t.colors.status.dangerBorder, borderRadius: 10, padding: 12, marginBottom: 16 },
    errorText: { flex: 1, fontSize: 13, color: t.colors.status.danger },
    btnPrimary: { borderRadius: 9999, overflow: 'hidden', shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
    btnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontSize: 16, fontWeight: '700', color: t.colors.text.onPrimary },
  });
}
