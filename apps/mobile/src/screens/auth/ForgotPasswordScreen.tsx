import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import api from '../../libs/axios';
import { useTheme, Theme } from '../../theme';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const illusScale = useRef(new Animated.Value(0.7)).current;
  const illusOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(16)).current;

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

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) { setError('Vui lòng nhập email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email không hợp lệ'); return; }
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      navigation.navigate('VerifyOtp', { email: email.trim() });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color={theme.colors.text.primary} library="ionicons" />
        </TouchableOpacity>

        <Animated.View style={{ opacity: illusOpacity, transform: [{ scale: illusScale }] }}>
          <LinearGradient colors={[theme.colors.background.indigoTint, theme.colors.background.indigoTint] as unknown as readonly [string, ...string[]]} style={s.illus}>
            <Icon name="lock-closed-outline" size={52} color={theme.colors.brand.primary} library="ionicons" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <Text style={s.title}>Quên mật khẩu?</Text>
          <Text style={s.sub}>Nhập email công ty của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.</Text>
        </Animated.View>

        <View style={s.field}>
          <Text style={s.fieldLabel}>Email công ty</Text>
          <View style={[s.inputWrap, focused && s.inputWrapFocused, !!error && s.inputWrapError]}>
            <Icon name="mail-outline" size={18} color={theme.colors.text.muted} library="ionicons" />
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder="ten@congty.com"
              placeholderTextColor={theme.colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={s.input}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              selectionColor={theme.colors.brand.primary}
            />
          </View>
          {error && <Text style={s.errorText}>{error}</Text>}
        </View>

        <View style={s.infoCard}>
          <Icon name="information-circle-outline" size={18} color={theme.colors.brand.primary} library="ionicons" />
          <Text style={s.infoText}>
            Mã OTP gồm 6 chữ số sẽ được gửi đến email của bạn. Mã có hiệu lực trong{' '}
            <Text style={{ fontWeight: '700' }}>5 phút</Text>.
          </Text>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.85} style={s.btnPrimary}>
          <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGradient}>
            {isLoading ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={s.btnText}>Gửi mã OTP</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.backLogin}>
          Nhớ mật khẩu rồi?{' '}
          <Text style={s.backLoginLink} onPress={() => navigation.goBack()}>Đăng nhập</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.background.surface, borderWidth: 1.5, borderColor: t.colors.border.default, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    illus: { width: 120, height: 120, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
    title: { fontSize: 26, fontWeight: '800', color: t.colors.text.primary, letterSpacing: -0.5, marginBottom: 8 },
    sub: { fontSize: 14, color: t.colors.text.muted, lineHeight: 22, marginBottom: 36 },
    field: { marginBottom: 20 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: t.colors.text.secondary, marginBottom: 6 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: t.colors.background.surface, borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.border.default, paddingHorizontal: 14, gap: 10 },
    inputWrapFocused: { borderColor: t.colors.brand.primary, shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
    inputWrapError: { borderColor: t.colors.status.danger },
    input: { flex: 1, fontSize: 15, color: t.colors.text.primary, height: '100%' },
    errorText: { fontSize: 12, color: t.colors.status.danger, marginTop: 5 },
    infoCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.colors.background.indigoTint, borderWidth: 1, borderColor: t.colors.border.indigo, borderRadius: 12, padding: 14, marginBottom: 28 },
    infoText: { flex: 1, fontSize: 13, color: t.colors.text.indigo, lineHeight: 20 },
    btnPrimary: { borderRadius: 9999, overflow: 'hidden', shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6, marginBottom: 20 },
    btnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontSize: 16, fontWeight: '700', color: t.colors.text.onPrimary },
    backLogin: { textAlign: 'center', fontSize: 13, color: t.colors.text.muted },
    backLoginLink: { color: t.colors.brand.primary, fontWeight: '600' },
  });
}
