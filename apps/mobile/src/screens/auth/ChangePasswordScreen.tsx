import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { globalStyles, COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import api from '../../libs/axios';

export default function ChangePasswordScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
        if (!password) return { level: 0, label: '', color: COLORS.text.secondary };
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        if (strength <= 2) return { level: strength, label: 'Yếu', color: COLORS.accent.red };
        if (strength <= 3) return { level: strength, label: 'Trung bình', color: COLORS.accent.yellow };
        return { level: strength, label: 'Mạnh', color: COLORS.accent.green };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    const handleSubmit = async () => {
        setError(null);
        if (!currentPassword.trim()) { setError('Vui lòng nhập mật khẩu hiện tại'); return; }
        if (!newPassword.trim()) { setError('Vui lòng nhập mật khẩu mới'); return; }
        if (newPassword.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
        if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
        if (currentPassword === newPassword) { setError('Mật khẩu mới phải khác mật khẩu hiện tại'); return; }
        setIsLoading(true);
        try {
            await api.post('/users/change-password', { currentPassword: currentPassword.trim(), newPassword: newPassword.trim() });
            setSuccess(true);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally { setIsLoading(false); }
    };

    const handleGoBack = () => navigation.goBack();

    return (
        <KeyboardAvoidingView style={globalStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <LinearGradient colors={[COLORS.primary, COLORS.accent.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: SPACING.xxl * 2, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}>
                        <TouchableOpacity onPress={handleGoBack} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md }}>
                            <Icon name="arrow_back" size={20} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 20, fontWeight: '600', color: '#ffffff' }}>Đổi mật khẩu</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' }}>Cập nhật mật khẩu để bảo vệ tài khoản của bạn</Text>
                </LinearGradient>

                <View style={{ padding: SPACING.lg, marginTop: -SPACING.md }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: '#e5e7eb', ...SHADOWS.lg }}>
                        {success ? (
                            <View style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(34, 197, 94, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg }}>
                                    <Icon name="check_circle" size={40} color={COLORS.accent.green} />
                                </View>
                                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.sm, textAlign: 'center' }}>Đổi mật khẩu thành công!</Text>
                                <Text style={{ fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.lg }}>Mật khẩu đã được cập nhật. Hãy sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.</Text>
                                <TouchableOpacity onPress={handleGoBack} activeOpacity={0.8}>
                                    <LinearGradient colors={[COLORS.primary, COLORS.accent.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: BORDER_RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, ...SHADOWS.md }}>
                                        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Quay lại</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {[
                                    { label: 'Mật khẩu hiện tại', value: currentPassword, setter: setCurrentPassword, show: showCurrentPassword, toggleShow: () => setShowCurrentPassword(!showCurrentPassword), placeholder: 'Nhập mật khẩu hiện tại', icon: 'lock' },
                                    { label: 'Mật khẩu mới', value: newPassword, setter: setNewPassword, show: showNewPassword, toggleShow: () => setShowNewPassword(!showNewPassword), placeholder: 'Nhập mật khẩu mới', icon: 'lock_open' },
                                    { label: 'Xác nhận mật khẩu mới', value: confirmPassword, setter: setConfirmPassword, show: showConfirmPassword, toggleShow: () => setShowConfirmPassword(!showConfirmPassword), placeholder: 'Nhập lại mật khẩu mới', icon: 'lock' },
                                ].map(({ label, value, setter, show, toggleShow, placeholder, icon }, idx) => (
                                    <View key={idx} style={{ marginBottom: SPACING.lg }}>
                                        <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.text.primary, marginBottom: SPACING.sm }}>{label}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: idx === 2 && confirmPassword && confirmPassword !== newPassword ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)', paddingHorizontal: SPACING.md }}>
                                            <Icon name={icon} size={20} color={COLORS.text.secondary} />
                                            <TextInput value={value} onChangeText={(t) => { setter(t); if (error) setError(null); }} placeholder={placeholder} placeholderTextColor="rgba(148, 163, 184, 0.5)" secureTextEntry={!show} style={{ flex: 1, color: COLORS.text.primary, fontSize: 16, paddingVertical: SPACING.md, marginLeft: SPACING.sm }} autoCapitalize="none" autoCorrect={false} editable={!isLoading} />
                                            <TouchableOpacity onPress={toggleShow} style={{ padding: SPACING.xs }}>
                                                <Icon name={show ? 'visibility_off' : 'visibility'} size={20} color={COLORS.text.secondary} />
                                            </TouchableOpacity>
                                        </View>
                                        {idx === 1 && newPassword.length > 0 && (
                                            <View style={{ marginTop: SPACING.xs }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
                                                    <View style={{ flex: 1, height: 4, backgroundColor: 'rgba(148, 163, 184, 0.2)', borderRadius: 2, marginRight: SPACING.sm, overflow: 'hidden' }}>
                                                        <View style={{ width: `${(passwordStrength.level / 5) * 100}%`, height: '100%', backgroundColor: passwordStrength.color, borderRadius: 2 }} />
                                                    </View>
                                                    <Text style={{ fontSize: 12, color: passwordStrength.color, fontWeight: '500' }}>{passwordStrength.label}</Text>
                                                </View>
                                                <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>Sử dụng ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt</Text>
                                            </View>
                                        )}
                                        {idx === 2 && confirmPassword && confirmPassword !== newPassword && (
                                            <Text style={{ fontSize: 12, color: COLORS.accent.red, marginTop: SPACING.xs }}>Mật khẩu xác nhận không khớp</Text>
                                        )}
                                    </View>
                                ))}

                                {error && (
                                    <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, flexDirection: 'row', alignItems: 'center' }}>
                                        <Icon name="error" size={16} color={COLORS.accent.red} />
                                        <Text style={{ color: COLORS.accent.red, fontSize: 14, marginLeft: SPACING.sm, flex: 1 }}>{error}</Text>
                                    </View>
                                )}

                                <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.8}>
                                    <LinearGradient colors={[COLORS.primary, COLORS.accent.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: BORDER_RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md, opacity: isLoading ? 0.7 : 1 }}>
                                        {isLoading ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <ActivityIndicator size="small" color="#ffffff" />
                                                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: SPACING.sm }}>Đang xử lý...</Text>
                                            </View>
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Icon name="lock_reset" size={20} color="#ffffff" />
                                                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: SPACING.sm }}>Đổi mật khẩu</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleGoBack} style={{ marginTop: SPACING.md, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)', alignItems: 'center' }} disabled={isLoading}>
                                    <Text style={{ color: COLORS.text.primary, fontSize: 16, fontWeight: '500' }}>Hủy</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
