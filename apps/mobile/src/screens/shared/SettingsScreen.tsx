import React, { useState, useMemo } from 'react';
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
import { useTheme, Theme } from '../../theme';

type NavProp = StackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [checkinRemind, setCheckinRemind] = useState(true);
  const [approvalNotif, setApprovalNotif] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : 'HN';

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color={theme.colors.text.primary} library="ionicons" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Cài đặt</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.pAvatar}>
            <Text style={s.pAvatarText}>{initials}</Text>
          </View>
          <View style={s.pInfo}>
            <Text style={s.pName}>{user?.name ?? 'Hieu Nguyen'}</Text>
            <Text style={s.pRole}>Nhân viên · Kỹ thuật</Text>
            <Text style={s.pEmail}>{user?.email ?? 'hieunguyen@company.com'}</Text>
          </View>
          <TouchableOpacity style={s.pEdit}>
            <Icon name="create-outline" size={16} color={theme.colors.brand.primary} library="ionicons" />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={s.sectionLabel}>Tài khoản</Text>
        <View style={s.card}>
          <SettingsRow
            s={s}
            theme={theme}
            icon="lock-closed-outline"
            iconBg={theme.colors.background.indigoTint}
            iconColor={theme.colors.brand.primary}
            label="Đổi mật khẩu"
            sub="Cập nhật mật khẩu đăng nhập"
            onPress={() => navigation.navigate('ChangePassword' as any)}
          />
          <SettingsRow
            s={s}
            theme={theme}
            icon="scan-outline"
            iconBg={theme.colors.background.indigoTint}
            iconColor={theme.colors.brand.primaryActive}
            label="Khuôn mặt Face ID"
            sub="Cập nhật dữ liệu nhận diện"
            border={false}
          />
        </View>

        {/* Notifications */}
        <Text style={s.sectionLabel}>Thông báo</Text>
        <View style={s.card}>
          <ToggleRow s={s} theme={theme} icon="notifications-outline" iconBg={theme.colors.background.indigoTint} iconColor={theme.colors.brand.primary} label="Thông báo đẩy" sub="Nhận cập nhật tức thì" value={pushNotif} onChange={setPushNotif} />
          <ToggleRow s={s} theme={theme} icon="mail-outline" iconBg={theme.colors.status.successBg} iconColor={theme.colors.status.success} label="Email thông báo" sub="Gửi báo cáo qua email" value={emailNotif} onChange={setEmailNotif} />
          <ToggleRow s={s} theme={theme} icon="phone-portrait-outline" iconBg={theme.colors.status.warningBg} iconColor={theme.colors.status.warning} label="Nhắc nhở check-in" sub="Nhắc trước 15 phút vào ca" value={checkinRemind} onChange={setCheckinRemind} />
          <ToggleRow s={s} theme={theme} icon="pulse-outline" iconBg={theme.colors.background.indigoTint} iconColor={theme.colors.brand.primaryActive} label="Duyệt yêu cầu" sub="Thông báo khi yêu cầu được xử lý" value={approvalNotif} onChange={setApprovalNotif} border={false} />
        </View>

        {/* App */}
        <Text style={s.sectionLabel}>Ứng dụng</Text>
        <View style={s.card}>
          <SettingsRow
            s={s}
            theme={theme}
            icon="language-outline"
            iconBg={theme.colors.background.indigoTint}
            iconColor={theme.colors.brand.primary}
            label="Ngôn ngữ"
            sub="Hiển thị ứng dụng"
            rightText="Tiếng Việt"
          />
          <ToggleRow s={s} theme={theme} icon="sunny-outline" iconBg={theme.colors.background.subtle} iconColor={theme.colors.text.muted} label="Chế độ tối" sub="Giao diện ban đêm" value={darkMode} onChange={setDarkMode} />
          <SettingsRow
            s={s}
            theme={theme}
            icon="refresh-outline"
            iconBg={theme.colors.status.warningBg}
            iconColor={theme.colors.status.warning}
            label="Xóa bộ nhớ đệm"
            sub="Đang dùng 12.4 MB"
            border={false}
          />
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>Về ứng dụng</Text>
        <View style={s.card}>
          <SettingsRow s={s} theme={theme} icon="information-circle-outline" iconBg={theme.colors.background.indigoTint} iconColor={theme.colors.brand.primary} label="Phiên bản" sub="v1.0.0 (Build 2025)" />
          <SettingsRow s={s} theme={theme} icon="document-text-outline" iconBg={theme.colors.background.subtle} iconColor={theme.colors.text.muted} label="Điều khoản sử dụng" sub="Chính sách & quyền riêng tư" border={false} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

type RowProps = {
  readonly s: ReturnType<typeof makeStyles>;
  readonly theme: Theme;
  readonly icon: string; readonly iconBg: string; readonly iconColor: string;
  readonly label: string; readonly sub: string;
  readonly onPress?: () => void;
  readonly rightText?: string;
  readonly border?: boolean;
};

function SettingsRow({ s, theme, icon, iconBg, iconColor, label, sub, onPress, rightText, border = true }: RowProps) {
  return (
    <TouchableOpacity
      style={[s.row, border && s.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={18} color={iconColor} library="ionicons" />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      {rightText && <Text style={s.valBadge}>{rightText}</Text>}
      {onPress && <Icon name="chevron-forward-outline" size={16} color={theme.colors.text.muted} library="ionicons" />}
    </TouchableOpacity>
  );
}

type ToggleRowProps = {
  readonly s: ReturnType<typeof makeStyles>;
  readonly theme: Theme;
  readonly icon: string; readonly iconBg: string; readonly iconColor: string;
  readonly label: string; readonly sub: string; readonly border?: boolean;
  readonly value: boolean; readonly onChange: (v: boolean) => void;
};

function ToggleRow({ s, theme, icon, iconBg, iconColor, label, sub, value, onChange, border = true }: ToggleRowProps) {
  return (
    <View style={[s.row, border && s.rowBorder]}>
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={18} color={iconColor} library="ionicons" />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border.default, true: theme.colors.brand.primary }}
        thumbColor={theme.colors.background.surface}
        ios_backgroundColor={theme.colors.border.default}
      />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: t.colors.background.surface, borderWidth: 1, borderColor: t.colors.border.default,
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 17, fontWeight: '700', color: t.colors.text.primary },
    content: { paddingHorizontal: 16, paddingTop: 8 },
    profileCard: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    pAvatar: {
      width: 52, height: 52, borderRadius: 9999,
      backgroundColor: t.colors.brand.primary,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    pAvatarText: { fontSize: 18, fontWeight: '800', color: t.colors.text.onPrimary },
    pInfo: { flex: 1 },
    pName: { fontSize: 15, fontWeight: '700', color: t.colors.text.primary, marginBottom: 2 },
    pRole: { fontSize: 12, color: t.colors.text.muted, marginBottom: 2 },
    pEmail: { fontSize: 12, color: t.colors.text.muted },
    pEdit: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: t.colors.background.indigoTint,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionLabel: {
      fontSize: 11, fontWeight: '600', color: t.colors.text.muted,
      textTransform: 'uppercase', letterSpacing: 0.6,
      paddingHorizontal: 4, marginBottom: 8, marginTop: 4,
    },
    card: {
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
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 14, paddingHorizontal: 16, minHeight: 56,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: t.colors.background.base },
    rowIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowLabel: { fontSize: 14, fontWeight: '600', color: t.colors.text.primary },
    rowSub: { fontSize: 12, color: t.colors.text.muted, marginTop: 1 },
    valBadge: { fontSize: 13, fontWeight: '600', color: t.colors.text.muted, marginRight: 4 },
  });
}
