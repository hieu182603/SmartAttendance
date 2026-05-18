import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/ui/Icon';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setError('');
    try {
      await login(email.trim(), password);
    } catch {
      setError('Email hoặc mật khẩu không đúng.');
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Hero ── */}
      <LinearGradient
        colors={['#3a58ef', '#5b3fcb', '#6d35c4']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={[s.ring, s.ring1]} />
        <View style={[s.ring, s.ring2]} />
        <View style={[s.ring, s.ring3]} />

        <Image
          source={require('../../../assets/icon.png')}
          style={s.logoImg}
          resizeMode="cover"
        />
        <Text style={s.heroTitle}>Smatt</Text>
        <Text style={s.heroSub}>Smart Attendance System</Text>
      </LinearGradient>

      {/* ── Form ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={s.sectionLabel}>Đăng nhập</Text>
          <Text style={s.sectionSub}>Chào mừng trở lại! Vui lòng nhập thông tin của bạn.</Text>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <View style={s.inputWrap}>
              <Icon name="mail-outline" size={17} color="#9ca3af" library="ionicons" style={s.inputIco} />
              <TextInput
                style={s.input}
                placeholder="ten@congty.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>MẬT KHẨU</Text>
            <View style={s.inputWrap}>
              <Icon name="lock-closed-outline" size={17} color="#9ca3af" library="ionicons" style={s.inputIco} />
              <TextInput
                style={[s.input, { paddingRight: 44 }]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw((v) => !v)} activeOpacity={0.7}>
                <Icon
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={17} color="#9ca3af" library="ionicons"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot */}
          <TouchableOpacity
            style={s.forgotRow}
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={s.forgotTxt}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          {/* Error */}
          {!!error && <Text style={s.errorTxt}>{error}</Text>}

          {/* Login button */}
          <TouchableOpacity style={s.btnPrimary} onPress={handleLogin} activeOpacity={0.85} disabled={isLoading}>
            <LinearGradient
              colors={['#4F6EF7', '#3a52dd']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.btnPrimaryGrad}
            >
              <Text style={s.btnPrimaryTxt}>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>hoặc tiếp tục bằng</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={s.socials}>
            <TouchableOpacity style={s.btnSocial} activeOpacity={0.8}>
              <Icon name="logo-google" size={20} color="#4285F4" library="ionicons" />
              <Text style={s.btnSocialTxt}>Đăng nhập bằng Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={s.footer}>
            Chưa có tài khoản?{' '}
            <Text style={s.footerLink}>Liên hệ HR để được cấp</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },

  // ── Hero ──
  hero: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ring1: { width: 200, height: 200, top: -60, right: -60 },
  ring2: { width: 120, height: 120, bottom: 30, left: -30 },
  ring3: { width: 320, height: 320, top: -100, left: -80 },
  logoImg: {
    width: 80, height: 80,
    borderRadius: 22,
    zIndex: 2,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    letterSpacing: -0.4, zIndex: 2,
  },
  heroSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)',
    marginTop: 3, zIndex: 2,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
    backgroundColor: '#f3f4f8',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -36,
  },
  scrollContent: { padding: 24, paddingTop: 28, paddingBottom: 32 },

  // ── Typography ──
  sectionLabel: {
    fontSize: 20, fontWeight: '700', color: '#191c1e',
    letterSpacing: -0.3, marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13, color: '#9ca3af', marginBottom: 24,
  },

  // ── Fields ──
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#444654',
    marginBottom: 6, letterSpacing: 0.2,
  },
  inputWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIco: { position: 'absolute', left: 14, zIndex: 1 } as any,
  input: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 15,
    color: '#191c1e',
  },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },

  // ── Forgot ──
  forgotRow: { alignItems: 'flex-end', marginTop: 6, marginBottom: 20 },
  forgotTxt: { fontSize: 13, fontWeight: '600', color: '#4F6EF7' },

  // ── Error ──
  errorTxt: { fontSize: 13, color: '#ef4444', marginBottom: 12, textAlign: 'center' },

  // ── Primary Button ──
  btnPrimary: { borderRadius: 9999, overflow: 'hidden', shadowColor: '#4F6EF7', shadowOpacity: 0.38, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  btnPrimaryGrad: { height: 50, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // ── Divider ──
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerTxt: { fontSize: 12, color: '#9ca3af' },

  // ── Social Buttons ──
  socials: { gap: 10 },
  btnSocial: {
    height: 50, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  btnSocialTxt: { fontSize: 14, fontWeight: '600', color: '#444654' },

  // ── Footer ──
  footer: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20 },
  footerLink: { color: '#4F6EF7', fontWeight: '600' },
});
