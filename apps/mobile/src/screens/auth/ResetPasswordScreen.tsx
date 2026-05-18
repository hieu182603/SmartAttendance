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
  navigation: StackNavigationProp<RootStackParamList, 'ResetPassword'>;
  route: RouteProp<RootStackParamList, 'ResetPassword'>;
};

function getStrength(pw: string): { score: number; label: string; color: string } {
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), pw.length >= 12].filter(Boolean).length;
  if (score <= 1) return { score, label: 'Yếu', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Trung bình', color: '#f59e0b' };
  if (score === 3) return { score, label: 'Mạnh', color: '#16a34a' };
  return { score, label: 'Rất mạnh', color: '#16a34a' };
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [matchError, setMatchError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successCircleScale = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const illusScale = useRef(new Animated.Value(0.7)).current;
  const illusOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(illusScale, { toValue: 1, tension: 34, friction: 5, useNativeDriver: true }),
      Animated.timing(illusOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const strength = getStrength(password);

  const handleSubmit = async () => {
    setMatchError(false); setError(null);
    if (!password || password !== confirm) { setMatchError(true); return; }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, password });
      setShowSuccess(true);
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(successCircleScale, { toValue: 1, tension: 34, friction: 5, useNativeDriver: true }),
      ]).start();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally { setIsLoading(false); }
  };

  const goToLogin = () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color="#191c1e" library="ionicons" />
        </TouchableOpacity>

        <Animated.View style={{ opacity: illusOpacity, transform: [{ scale: illusScale }] }}>
          <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.illus}>
            <Icon name="key-outline" size={48} color="#d97706" library="ionicons" />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.title}>Đặt lại mật khẩu</Text>
        <Text style={styles.sub}>Tạo mật khẩu mới cho tài khoản của bạn. Mật khẩu phải đảm bảo đủ độ bảo mật.</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
          <View style={[styles.inputWrap, pwFocused && styles.inputWrapFocused]}>
            <Icon name="lock-closed-outline" size={18} color="#9ca3af" library="ionicons" />
            <TextInput value={password} onChangeText={(v) => { setPassword(v); setError(null); }} placeholder="Tối thiểu 8 ký tự" placeholderTextColor="#9ca3af" secureTextEntry={!showPw} style={styles.input} onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)} selectionColor="#4F6EF7" />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
              <Icon name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" library="ionicons" />
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3].map((i) => <View key={i} style={[styles.sBar, i < strength.score && { backgroundColor: strength.color }]} />)}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}
          <View style={styles.rules}>
            <Rule ok={password.length >= 8} text="Ít nhất 8 ký tự" />
            <Rule ok={/[A-Z]/.test(password)} text="Có chữ hoa" />
            <Rule ok={/\d/.test(password)} text="Có số" />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
          <View style={[styles.inputWrap, confirmFocused && styles.inputWrapFocused, matchError && styles.inputWrapError]}>
            <Icon name="lock-closed-outline" size={18} color="#9ca3af" library="ionicons" />
            <TextInput value={confirm} onChangeText={(v) => { setConfirm(v); setMatchError(false); }} placeholder="Nhập lại mật khẩu" placeholderTextColor="#9ca3af" secureTextEntry={!showConfirm} style={styles.input} onFocus={() => setConfirmFocused(true)} onBlur={() => setConfirmFocused(false)} selectionColor="#4F6EF7" />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Icon name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" library="ionicons" />
            </TouchableOpacity>
          </View>
          {matchError && <Text style={styles.errorText}>Mật khẩu không khớp</Text>}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Icon name="alert-circle-outline" size={16} color="#ef4444" library="ionicons" />
            <Text style={styles.errorTextInline}>{error}</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.85} style={styles.btnPrimary}>
          <LinearGradient colors={['#4F6EF7', '#3d5fef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Đặt lại mật khẩu</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successCircleScale }] }]}>
            <Icon name="checkmark-circle-outline" size={44} color="#16a34a" library="ionicons" />
          </Animated.View>
          <Text style={styles.successTitle}>Đặt lại thành công!</Text>
          <Text style={styles.successSub}>Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.</Text>
          <TouchableOpacity onPress={goToLogin} style={styles.btnGoLogin} activeOpacity={0.85}>
            <LinearGradient colors={['#4F6EF7', '#3d5fef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
              <Text style={styles.btnText}>Về trang đăng nhập</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.rule}>
      <Icon name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={ok ? '#16a34a' : '#9ca3af'} library="ionicons" />
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  illus: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#191c1e', letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 14, color: '#9ca3af', lineHeight: 22, marginBottom: 32 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#444654', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, gap: 10 },
  inputWrapFocused: { borderColor: '#4F6EF7', shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  inputWrapError: { borderColor: '#ef4444' },
  input: { flex: 1, fontSize: 15, color: '#191c1e', height: '100%' },
  eyeBtn: { padding: 4 },
  strengthWrap: { marginTop: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  sBar: { flex: 1, height: 4, borderRadius: 9999, backgroundColor: '#e5e7eb' },
  strengthLabel: { fontSize: 11, color: '#9ca3af' },
  rules: { marginTop: 8, gap: 6 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 12, color: '#9ca3af' },
  ruleTextOk: { color: '#16a34a' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 5 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTextInline: { flex: 1, fontSize: 13, color: '#ef4444' },
  btnPrimary: { borderRadius: 9999, overflow: 'hidden', shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6, marginTop: 8 },
  btnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f3f4f8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  successCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#191c1e', marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  btnGoLogin: { width: '100%', borderRadius: 9999, overflow: 'hidden', shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
});
