import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/ui/Icon';

type NavProp = StackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [checkinRemind, setCheckinRemind] = useState(true);
  const [approvalNotif, setApprovalNotif] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : 'HN';

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color="#191c1e" library="ionicons" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Cài đặt</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.pAvatar}>
            <Text style={styles.pAvatarText}>{initials}</Text>
          </View>
          <View style={styles.pInfo}>
            <Text style={styles.pName}>{user?.name ?? 'Hieu Nguyen'}</Text>
            <Text style={styles.pRole}>Nhân viên · Kỹ thuật</Text>
            <Text style={styles.pEmail}>{user?.email ?? 'hieunguyen@company.com'}</Text>
          </View>
          <TouchableOpacity style={styles.pEdit}>
            <Icon name="create-outline" size={16} color="#4F6EF7" library="ionicons" />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>Tài khoản</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="lock-closed-outline"
            iconBg="#EEF1FF"
            iconColor="#4F6EF7"
            label="Đổi mật khẩu"
            sub="Cập nhật mật khẩu đăng nhập"
            onPress={() => navigation.navigate('ChangePassword' as any)}
          />
          <SettingsRow
            icon="scan-outline"
            iconBg="#ede9fe"
            iconColor="#7c3aed"
            label="Khuôn mặt Face ID"
            sub="Cập nhật dữ liệu nhận diện"
            border={false}
          />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Thông báo</Text>
        <View style={styles.card}>
          <ToggleRow icon="notifications-outline" iconBg="#EEF1FF" iconColor="#4F6EF7" label="Thông báo đẩy" sub="Nhận cập nhật tức thì" value={pushNotif} onChange={setPushNotif} />
          <ToggleRow icon="mail-outline" iconBg="#dcfce7" iconColor="#16a34a" label="Email thông báo" sub="Gửi báo cáo qua email" value={emailNotif} onChange={setEmailNotif} />
          <ToggleRow icon="phone-portrait-outline" iconBg="#fff7ed" iconColor="#f97316" label="Nhắc nhở check-in" sub="Nhắc trước 15 phút vào ca" value={checkinRemind} onChange={setCheckinRemind} />
          <ToggleRow icon="pulse-outline" iconBg="#ede9fe" iconColor="#7c3aed" label="Duyệt yêu cầu" sub="Thông báo khi yêu cầu được xử lý" value={approvalNotif} onChange={setApprovalNotif} border={false} />
        </View>

        {/* App */}
        <Text style={styles.sectionLabel}>Ứng dụng</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="language-outline"
            iconBg="#EEF1FF"
            iconColor="#4F6EF7"
            label="Ngôn ngữ"
            sub="Hiển thị ứng dụng"
            rightText="Tiếng Việt"
          />
          <ToggleRow icon="sunny-outline" iconBg="#f3f4f6" iconColor="#6b7280" label="Chế độ tối" sub="Giao diện ban đêm" value={darkMode} onChange={setDarkMode} />
          <SettingsRow
            icon="refresh-outline"
            iconBg="#fff7ed"
            iconColor="#f97316"
            label="Xóa bộ nhớ đệm"
            sub="Đang dùng 12.4 MB"
            border={false}
          />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>Về ứng dụng</Text>
        <View style={styles.card}>
          <SettingsRow icon="information-circle-outline" iconBg="#EEF1FF" iconColor="#4F6EF7" label="Phiên bản" sub="v1.0.0 (Build 2025)" />
          <SettingsRow icon="document-text-outline" iconBg="#f3f4f6" iconColor="#6b7280" label="Điều khoản sử dụng" sub="Chính sách & quyền riêng tư" border={false} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

type RowProps = {
  readonly icon: string; readonly iconBg: string; readonly iconColor: string;
  readonly label: string; readonly sub: string;
  readonly onPress?: () => void;
  readonly rightText?: string;
  readonly border?: boolean;
};

function SettingsRow({ icon, iconBg, iconColor, label, sub, onPress, rightText, border = true }: RowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, border && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={18} color={iconColor} library="ionicons" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {rightText && <Text style={styles.valBadge}>{rightText}</Text>}
      {onPress && <Icon name="chevron-forward-outline" size={16} color="#9ca3af" library="ionicons" />}
    </TouchableOpacity>
  );
}

type ToggleRowProps = {
  readonly icon: string; readonly iconBg: string; readonly iconColor: string;
  readonly label: string; readonly sub: string; readonly border?: boolean;
  readonly value: boolean; readonly onChange: (v: boolean) => void;
};

function ToggleRow({ icon, iconBg, iconColor, label, sub, value, onChange, border = true }: ToggleRowProps) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={18} color={iconColor} library="ionicons" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#d1d5db', true: '#4F6EF7' }}
        thumbColor="#fff"
        ios_backgroundColor="#d1d5db"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#191c1e' },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pAvatar: {
    width: 52, height: 52, borderRadius: 9999,
    backgroundColor: '#4F6EF7',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  pAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  pInfo: { flex: 1 },
  pName: { fontSize: 15, fontWeight: '700', color: '#191c1e', marginBottom: 2 },
  pRole: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  pEmail: { fontSize: 12, color: '#9ca3af' },
  pEdit: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#EEF1FF',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 4, marginBottom: 8, marginTop: 4,
  },
  card: {
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, minHeight: 56,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f8' },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#191c1e' },
  rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  valBadge: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginRight: 4 },
});
