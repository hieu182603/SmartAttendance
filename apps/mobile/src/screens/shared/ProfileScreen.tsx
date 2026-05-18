import React from 'react';
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

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : 'HN';

  const SECTIONS: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Tài khoản',
      items: [
        { icon: 'person-outline', iconBg: '#EEF1FF', iconColor: '#4F6EF7', label: 'Thông tin cá nhân', sub: 'Họ tên, email, số điện thoại' },
        { icon: 'scan-outline', iconBg: '#ede9fe', iconColor: '#7c3aed', label: 'Nhận diện khuôn mặt', sub: 'Cập nhật dữ liệu sinh trắc học', onPress: () => navigation.navigate('FaceRegistration' as any) },
        { icon: 'lock-closed-outline', iconBg: '#dcfce7', iconColor: '#16a34a', label: 'Đổi mật khẩu', sub: 'Cập nhật mật khẩu đăng nhập', onPress: () => navigation.navigate('ChangePassword' as any) },
      ],
    },
    {
      title: 'Công việc',
      items: [
        { icon: 'calendar-outline', iconBg: '#fff7ed', iconColor: '#f97316', label: 'Số ngày phép', sub: 'Theo dõi số ngày phép còn lại', badge: '12 ngày', onPress: () => navigation.navigate('LeaveBalance') },
        { icon: 'cash-outline', iconBg: '#dcfce7', iconColor: '#16a34a', label: 'Bảng lương', sub: 'Xem lương hàng tháng', onPress: () => navigation.navigate('Payslip' as any) },
        { icon: 'time-outline', iconBg: '#EEF1FF', iconColor: '#4F6EF7', label: 'Lịch sử chấm công', sub: 'Xem chi tiết chấm công', onPress: () => navigation.navigate('AttendanceHistory') },
      ],
    },
    {
      title: 'Cài đặt',
      items: [
        { icon: 'settings-outline', iconBg: '#f3f4f6', iconColor: '#6b7280', label: 'Cài đặt ứng dụng', sub: 'Ngôn ngữ, thông báo, giao diện', onPress: () => navigation.navigate('Settings' as any) },
        { icon: 'help-circle-outline', iconBg: '#EEF1FF', iconColor: '#4F6EF7', label: 'Hỗ trợ & FAQ', sub: 'Hướng dẫn sử dụng ứng dụng' },
      ],
    },
  ];

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={['#5b7cf6', '#7c5cbf', '#9b4dca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.ring1} />
        <View style={styles.ring2} />
        <View style={styles.avatarWrap}>
          <View style={styles.avatarImg}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarOnline} />
        </View>
        <Text style={styles.heroName}>{user?.name ?? 'Nguyễn Hữu Hiêu'}</Text>
        <Text style={styles.heroRole}>Nhân viên · Phòng Kỹ thuật</Text>
      </LinearGradient>

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        {[
          { val: '18', label: 'Ngày đi làm', color: '#4F6EF7' },
          { val: '12', label: 'Ngày phép còn', color: '#16a34a' },
          { val: '142h', label: 'Giờ làm T4', color: '#191c1e' },
        ].map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuGroup}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, i < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                    <Icon name={item.icon} size={18} color={item.iconColor} library="ionicons" />
                  </View>
                  <View style={styles.menuBody}>
                    <Text style={styles.menuName}>{item.label}</Text>
                    <Text style={styles.menuSub}>{item.sub}</Text>
                  </View>
                  <View style={styles.menuRight}>
                    {item.badge && (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Icon name="chevron-forward-outline" size={16} color="#9ca3af" library="ionicons" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Icon name="log-out-outline" size={18} color="#ef4444" library="ionicons" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Smatt v1.0.0 · Build 2025</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },
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
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  avatarOnline: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#4ade80',
    borderWidth: 2, borderColor: '#fff',
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginBottom: 4 },
  heroRole: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f8',
  },
  statVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLbl: { fontSize: 11, color: '#9ca3af' },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f8' },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  menuBody: { flex: 1 },
  menuName: { fontSize: 14, fontWeight: '600', color: '#191c1e', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#9ca3af' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge: {
    backgroundColor: '#fff7ed',
    borderRadius: 9999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: '#f97316' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  version: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 },
});
