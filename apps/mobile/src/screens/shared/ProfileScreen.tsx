import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/ui/Icon';
import { useTheme, Theme } from '../../theme';

type NavProp = StackNavigationProp<RootStackParamList>;

type MenuItem = {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  sub: string;
  badge?: string;
  onPress?: () => void;
};

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : 'HN';

  const SECTIONS: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Tài khoản',
      items: [
        { icon: 'person-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primary, label: 'Thông tin cá nhân', sub: 'Họ tên, email, số điện thoại' },
        { icon: 'scan-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primaryActive, label: 'Nhận diện khuôn mặt', sub: 'Cập nhật dữ liệu sinh trắc học', onPress: () => navigation.navigate('FaceRegistration' as any) },
        { icon: 'lock-closed-outline', iconBg: theme.colors.status.successBg, iconColor: theme.colors.status.success, label: 'Đổi mật khẩu', sub: 'Cập nhật mật khẩu đăng nhập', onPress: () => navigation.navigate('ChangePassword' as any) },
      ],
    },
    {
      title: 'Công việc',
      items: [
        { icon: 'calendar-outline', iconBg: theme.colors.status.warningBg, iconColor: theme.colors.status.warning, label: 'Số ngày phép', sub: 'Theo dõi số ngày phép còn lại', badge: '12 ngày', onPress: () => navigation.navigate('LeaveBalance') },
        { icon: 'cash-outline', iconBg: theme.colors.status.successBg, iconColor: theme.colors.status.success, label: 'Bảng lương', sub: 'Xem lương hàng tháng', onPress: () => navigation.navigate('Payslip' as any) },
        { icon: 'time-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primary, label: 'Lịch sử chấm công', sub: 'Xem chi tiết chấm công', onPress: () => navigation.navigate('AttendanceHistory') },
      ],
    },
    {
      title: 'Cài đặt',
      items: [
        { icon: 'settings-outline', iconBg: theme.colors.background.subtle, iconColor: theme.colors.text.muted, label: 'Cài đặt ứng dụng', sub: 'Ngôn ngữ, thông báo, giao diện', onPress: () => navigation.navigate('Settings' as any) },
        { icon: 'help-circle-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primary, label: 'Hỗ trợ & FAQ', sub: 'Hướng dẫn sử dụng ứng dụng' },
      ],
    },
  ];

  return (
    <View style={s.root}>
      {/* Hero */}
      <LinearGradient
        colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.ring1} />
        <View style={s.ring2} />
        <View style={s.avatarWrap}>
          <View style={s.avatarImg}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.avatarOnline} />
        </View>
        <Text style={s.heroName}>{user?.name ?? 'Nguyễn Hữu Hiêu'}</Text>
        <Text style={s.heroRole}>Nhân viên · Phòng Kỹ thuật</Text>
      </LinearGradient>

      {/* Stats strip */}
      <View style={s.statsStrip}>
        {[
          { val: '18', label: 'Ngày đi làm', color: theme.colors.brand.primary },
          { val: '12', label: 'Ngày phép còn', color: theme.colors.status.success },
          { val: '142h', label: 'Giờ làm T4', color: theme.colors.text.primary },
        ].map((stat) => (
          <View key={stat.label} style={s.statItem}>
            <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
            <Text style={s.statLbl}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.menuGroup}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.menuItem, i < section.items.length - 1 && s.menuItemBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[s.menuIcon, { backgroundColor: item.iconBg }]}>
                    <Icon name={item.icon} size={18} color={item.iconColor} library="ionicons" />
                  </View>
                  <View style={s.menuBody}>
                    <Text style={s.menuName}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                  <View style={s.menuRight}>
                    {item.badge && (
                      <View style={s.menuBadge}>
                        <Text style={s.menuBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Icon name="chevron-forward-outline" size={16} color={theme.colors.text.muted} library="ionicons" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Icon name="log-out-outline" size={18} color={theme.colors.status.danger} library="ionicons" />
          <Text style={s.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={s.version}>Smatt v1.0.0 · Build 2025</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: {
      paddingTop: 56,
      paddingBottom: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
      overflow: 'hidden',
    },
    ring1: {
      position: 'absolute', top: -60, right: -60,
      width: 200, height: 200, borderRadius: 100,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    ring2: {
      position: 'absolute', bottom: 0, left: -40,
      width: 160, height: 160, borderRadius: 80,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    avatarWrap: { position: 'relative', marginBottom: 12 },
    avatarImg: {
      width: 80, height: 80, borderRadius: 9999,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: t.colors.text.onPrimary },
    avatarOnline: {
      position: 'absolute', bottom: 4, right: 4,
      width: 16, height: 16, borderRadius: 8,
      backgroundColor: t.colors.brand.secondary,
      borderWidth: 2, borderColor: t.colors.text.onPrimary,
    },
    heroName: { fontSize: 22, fontWeight: '800', color: t.colors.text.onPrimary, letterSpacing: -0.4, marginBottom: 4 },
    heroRole: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
    statsStrip: {
      flexDirection: 'row',
      backgroundColor: t.colors.background.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border.default,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRightWidth: 1,
      borderRightColor: t.colors.background.base,
    },
    statVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
    statLbl: { fontSize: 11, color: t.colors.text.muted },
    content: { paddingHorizontal: 16, paddingTop: 16 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: t.colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    menuGroup: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: t.colors.background.base },
    menuIcon: {
      width: 40, height: 40, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    menuBody: { flex: 1 },
    menuName: { fontSize: 14, fontWeight: '600', color: t.colors.text.primary, marginBottom: 2 },
    menuSub: { fontSize: 12, color: t.colors.text.muted },
    menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    menuBadge: {
      backgroundColor: t.colors.status.warningBg,
      borderRadius: 9999,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    menuBadgeText: { fontSize: 11, fontWeight: '700', color: t.colors.status.warning },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: 14,
      backgroundColor: t.colors.status.dangerBg,
      borderWidth: 1.5,
      borderColor: t.colors.status.dangerBorder,
      marginBottom: 16,
    },
    logoutText: { fontSize: 15, fontWeight: '700', color: t.colors.status.danger },
    version: { textAlign: 'center', fontSize: 12, color: t.colors.text.muted, marginBottom: 8 },
  });
}
