import React, { useState, useRef, useEffect } from 'react';
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

type Props = { navigation: StackNavigationProp<RootStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color="#191c1e" library="ionicons" />
        </TouchableOpacity>

        <Animated.View style={{ opacity: illusOpacity, transform: [{ scale: illusScale }] }}>
          <LinearGradient colors={['#EEF1FF', '#dde4ff']} style={styles.illus}>
            <Icon name="lock-closed-outline" size={52} color="#4F6EF7" library="ionicons" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.sub}>Nhập email công ty của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.</Text>
        </Animated.View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email công ty</Text>
          <View style={[styles.inputWrap, focused && styles.inputWrapFocused, !!error && styles.inputWrapError]}>
            <Icon name="mail-outline" size={18} color="#9ca3af" library="ionicons" />
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder="ten@congty.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              selectionColor="#4F6EF7"
            />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.infoCard}>
          <Icon name="information-circle-outline" size={18} color="#4F6EF7" library="ionicons" />
          <Text style={styles.infoText}>
            Mã OTP gồm 6 chữ số sẽ được gửi đến email của bạn. Mã có hiệu lực trong{' '}
            <Text style={{ fontWeight: '700' }}>5 phút</Text>.
          </Text>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.85} style={styles.btnPrimary}>
          <LinearGradient colors={['#4F6EF7', '#3d5fef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Gửi mã OTP</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.backLogin}>
          Nhớ mật khẩu rồi?{' '}
          <Text style={styles.backLoginLink} onPress={() => navigation.goBack()}>Đăng nhập</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  illus: { width: 120, height: 120, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#191c1e', letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 14, color: '#9ca3af', lineHeight: 22, marginBottom: 36 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#444654', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, gap: 10 },
  inputWrapFocused: { borderColor: '#4F6EF7', shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  inputWrapError: { borderColor: '#ef4444' },
  input: { flex: 1, fontSize: 15, color: '#191c1e', height: '100%' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 5 },
  infoCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#eff2ff', borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 12, padding: 14, marginBottom: 28 },
  infoText: { flex: 1, fontSize: 13, color: '#3730a3', lineHeight: 20 },
  btnPrimary: { borderRadius: 9999, overflow: 'hidden', shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6, marginBottom: 20 },
  btnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  backLogin: { textAlign: 'center', fontSize: 13, color: '#9ca3af' },
  backLoginLink: { color: '#4F6EF7', fontWeight: '600' },
});
