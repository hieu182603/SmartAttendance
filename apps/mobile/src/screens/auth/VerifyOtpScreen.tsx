import React, { useState, useRef, useEffect } from 'react';
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
    const id = setInterval(() => setCountdown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const formatCountdown = () => {
    const m = Math.floor(countdown / 60).toString().padStart(2, '0');
    const s = (countdown % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color="#191c1e" library="ionicons" />
        </TouchableOpacity>

        <Animated.View style={{ opacity: illusOpacity, transform: [{ scale: illusScale }] }}>
          <LinearGradient colors={['#dcfce7', '#bbf7d0']} style={styles.illus}>
            <Icon name="shield-checkmark-outline" size={48} color="#16a34a" library="ionicons" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <Text style={styles.title}>Xác minh OTP</Text>
          <Text style={styles.sub}>Mã xác minh đã được gửi đến</Text>
        </Animated.View>

        <View style={styles.emailBadge}>
          <Icon name="mail-outline" size={13} color="#4F6EF7" library="ionicons" />
          <Text style={styles.emailBadgeText}>{maskEmail(email)}</Text>
        </View>

        <Text style={styles.otpLabel}>Nhập mã 6 chữ số</Text>
        <View style={styles.otpRow}>
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
              style={[styles.otpBox, focusedIndex === i && !digit ? styles.otpBoxFocused : null, digit ? styles.otpBoxFilled : null]}
              selectionColor="#4F6EF7"
            />
          ))}
        </View>

        <View style={styles.timerRow}>
          <Text style={styles.timerText}>Hết hạn sau <Text style={styles.timerBold}>{formatCountdown()}</Text></Text>
          <TouchableOpacity onPress={handleResend} disabled={!canResend} activeOpacity={0.7}>
            <Text style={[styles.resendBtn, canResend && styles.resendBtnActive]}>Gửi lại mã</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Icon name="alert-circle-outline" size={16} color="#ef4444" library="ionicons" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleVerify} disabled={isLoading} activeOpacity={0.85} style={styles.btnPrimary}>
          <LinearGradient colors={['#4F6EF7', '#3d5fef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Xác minh</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  illus: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#191c1e', letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 14, color: '#9ca3af', lineHeight: 22, marginBottom: 8 },
  emailBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#EEF1FF', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 9999, marginBottom: 36 },
  emailBadgeText: { fontSize: 13, fontWeight: '600', color: '#4F6EF7' },
  otpLabel: { fontSize: 13, fontWeight: '600', color: '#444654', marginBottom: 12 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  otpBox: { flex: 1, height: 60, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 2, borderColor: '#e5e7eb', fontSize: 24, fontWeight: '700', color: '#191c1e', textAlign: 'center' },
  otpBoxFocused: { borderColor: '#4F6EF7', shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 },
  otpBoxFilled: { borderColor: '#16a34a', backgroundColor: '#dcfce7', color: '#16a34a' },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 32 },
  timerText: { fontSize: 13, color: '#9ca3af' },
  timerBold: { fontWeight: '700', color: '#444654' },
  resendBtn: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  resendBtnActive: { color: '#4F6EF7' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444' },
  btnPrimary: { borderRadius: 9999, overflow: 'hidden', shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  btnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
