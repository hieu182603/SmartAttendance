import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useUsers } from '../../hooks/useAdminQueries';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme, Theme } from '../../theme';

type TabKey = 0 | 1 | 2;
type RoleKey = 'emp' | 'mgr' | 'hr' | 'admin';

const ROLE_OPTS: { key: RoleKey; label: string }[] = [
  { key: 'emp', label: 'Nhân viên' },
  { key: 'mgr', label: 'Quản lý' },
  { key: 'hr', label: 'HR' },
  { key: 'admin', label: 'Admin' },
];

const LOG_ENTRIES_STATIC: { dotType: 'success' | 'brand' | 'purple' | 'warning'; action: string; time: string }[] = [];

export default function EmployeeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'EmployeeDetail'>>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [tab, setTab] = useState<TabKey>(0);
  const [role, setRole] = useState<RoleKey>('emp');
  const { data: usersData } = useUsers();

  const logEntries = LOG_ENTRIES_STATIC.map((e) => ({
    ...e,
    dot: e.dotType === 'success' ? theme.colors.status.success
      : e.dotType === 'brand' ? theme.colors.brand.primary
      : e.dotType === 'warning' ? theme.colors.status.warning
      : theme.colors.brand.primaryActive,
  }));

  const userId = route.params.userId;
  const users = Array.isArray(usersData) ? usersData : (usersData?.data || []);
  const employee = users?.find((u: any) => u.id === userId || u._id === userId) || users?.[0];
  const empName = employee?.name || 'Hoàng Ngọc Anh';
  const empCode = employee?.employeeId || 'NV0042';
  const empDept = employee?.department?.name || 'Kỹ thuật';
  const empPosition = employee?.position?.title || 'Senior Developer';
  const empEmail = employee?.email || 'hoangngocank@company.com';
  const empPhone = employee?.phone || '0901 234 567';

  const tabLabels = ['Thông tin cá nhân', 'Điểm danh', 'Lịch sử'];

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.colors.brand.primaryActive, theme.colors.brand.primary, '#a855f7'] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={[s.ring, s.r1]} />
        <View style={s.heroTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
          <View style={s.heroActions}>
            <TouchableOpacity style={s.hAct} activeOpacity={0.7} onPress={() => navigation.navigate('EmployeeProfileView' as any)}>
              <Icon name="pencil-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
            </TouchableOpacity>
            <TouchableOpacity style={s.hAct} activeOpacity={0.7}>
              <Icon name="ellipsis-horizontal-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.heroProfile}>
          <View style={s.ava}><Text style={s.avaTxt}>{empName.split(' ').map((w: string) => w[0]).join('').slice(-2)}</Text></View>
          <Text style={s.heroName}>{empName}</Text>
          <Text style={s.heroSub}>{empCode} · {empDept} · {empPosition}</Text>
        </View>
      </LinearGradient>

      <View style={s.statsStrip}>
        <View style={s.statItem}><Text style={[s.statVal, { color: theme.colors.brand.primaryActive }]}>3 năm</Text><Text style={s.statLbl}>Thâm niên</Text></View>
        <View style={[s.statItem, s.statBorder]}><Text style={[s.statVal, { color: theme.colors.status.success }]}>96%</Text><Text style={s.statLbl}>Chuyên cần</Text></View>
        <View style={s.statItem}><Text style={[s.statVal, { color: theme.colors.status.warning }]}>12</Text><Text style={s.statLbl}>Ngày phép còn</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.tabs}>
          {tabLabels.map((label, i) => (
            <TouchableOpacity key={label} style={[s.tab, tab === i && s.tabActive]} onPress={() => setTab(i as TabKey)} activeOpacity={0.7}>
              <Text style={[s.tabTxt, tab === i && s.tabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 0 && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Thông tin cá nhân</Text>
              {[
                { icon: 'person-outline', label: 'Họ và tên', val: empName },
                { icon: 'phone-portrait-outline', label: 'Điện thoại', val: empPhone },
                { icon: 'mail-outline', label: 'Email', val: empEmail },
                { icon: 'location-outline', label: 'Địa chỉ', val: employee?.address || '123 Nguyễn Huệ, Q.1, TP.HCM' },
              ].map((row, i) => (
                <View key={row.label} style={[s.fieldRow, i > 0 && s.fieldRowBorder]}>
                  <View style={s.frIcon}>
                    <Icon name={row.icon as any} size={14} color={theme.colors.brand.primaryActive} library="ionicons" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.frLabel}>{row.label}</Text>
                    <Text style={s.frVal}>{row.val}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Thông tin công việc</Text>
              <View style={s.fieldRow}>
                <View style={s.frIcon}><Icon name="calendar-outline" size={14} color={theme.colors.brand.primaryActive} library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.frLabel}>Ngày vào làm</Text>
                  <Text style={s.frVal}>15/03/2022</Text>
                </View>
              </View>
              <View style={[s.fieldRow, s.fieldRowBorder]}>
                <View style={s.frIcon}><Icon name="people-outline" size={14} color={theme.colors.brand.primaryActive} library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.frLabel}>Phân quyền</Text>
                  <View style={s.roleSelect}>
                    {ROLE_OPTS.map((opt) => (
                      <TouchableOpacity key={opt.key} style={[s.rsOpt, role === opt.key && s.rsOptActive]} onPress={() => setRole(opt.key)} activeOpacity={0.7}>
                        <Text style={[s.rsOptTxt, role === opt.key && s.rsOptTxtActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={[s.fieldRow, s.fieldRowBorder]}>
                <View style={s.frIcon}><Icon name="cube-outline" size={14} color={theme.colors.brand.primaryActive} library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.frLabel}>Hợp đồng</Text>
                  <View style={s.contractChip}>
                    <Icon name="checkmark-outline" size={14} color={theme.colors.status.success} library="ionicons" />
                    <Text style={s.contractTxt}>Hợp đồng không xác định thời hạn</Text>
                  </View>
                </View>
              </View>
              <View style={[s.fieldRow, s.fieldRowBorder]}>
                <View style={s.frIcon}><Icon name="cash-outline" size={14} color={theme.colors.brand.primaryActive} library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.frLabel}>Lương cơ bản</Text>
                  <Text style={s.frVal}>25.000.000 VND / tháng</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {tab === 1 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Tháng 4/2026</Text>
            {[
              { label: 'Ngày đi làm', val: '22 / 23 ngày', color: theme.colors.status.success, big: true },
              { label: 'Tổng giờ làm', val: '184.5 giờ', color: theme.colors.text.primary, big: false },
              { label: 'Số lần đi trễ', val: '2 lần', color: theme.colors.status.warning, big: false },
              { label: 'Ngày WFH', val: '3 ngày', color: theme.colors.brand.primary, big: false },
              { label: 'Ngày nghỉ phép', val: '1 ngày', color: theme.colors.text.primary, big: false },
            ].map((row, i) => (
              <View key={row.label} style={[s.fieldRow, i > 0 && s.fieldRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.frLabel}>{row.label}</Text>
                  <Text style={[s.frVal, { color: row.color, fontSize: row.big ? 20 : 13, fontWeight: row.big ? '800' : '600' }]}>{row.val}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 2 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Nhật ký hoạt động</Text>
            {logEntries.map((log, i) => (
              <View key={i} style={[s.logRow, i > 0 && s.logRowBorder]}>
                <View style={[s.logDot, { backgroundColor: log.dot }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.logAction}>{log.action}</Text>
                  <Text style={s.logTime}>{log.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.saveBar}>
        <TouchableOpacity style={s.btnCancel} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.btnCancelTxt}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSave} activeOpacity={0.85}>
          <Text style={s.btnSaveTxt}>Lưu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 50, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 200, height: 200, top: -60, right: -40 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    heroActions: { flexDirection: 'row', gap: 8 },
    hAct: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    heroProfile: { alignItems: 'center' },
    ava: { width: 68, height: 68, borderRadius: 9999, backgroundColor: 'rgba(196,181,253,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 10 },
    avaTxt: { fontSize: 24, fontWeight: '800', color: t.colors.text.onPrimary },
    heroName: { fontSize: 17, fontWeight: '800', color: t.colors.text.onPrimary, letterSpacing: -0.3 },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    statsStrip: { flexDirection: 'row', backgroundColor: t.colors.border.default, gap: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 14 },
    statItem: { flex: 1, backgroundColor: t.colors.background.surface, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: t.colors.border.default },
    statVal: { fontSize: 18, fontWeight: '800', color: t.colors.text.primary, lineHeight: 22 },
    statLbl: { fontSize: 10, color: t.colors.text.muted, marginTop: 3 },
    content: { paddingHorizontal: 16, paddingTop: 4 },
    tabs: { flexDirection: 'row', backgroundColor: t.colors.background.surface, borderRadius: 12, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: t.colors.border.default },
    tab: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    tabActive: { backgroundColor: t.colors.brand.primaryActive },
    tabTxt: { fontSize: 12, fontWeight: '600', color: t.colors.text.muted },
    tabTxtActive: { color: t.colors.text.onPrimary },
    card: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
    fieldRowBorder: { borderTopWidth: 1, borderTopColor: t.colors.border.default },
    frIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: t.colors.background.indigoTint, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    frLabel: { fontSize: 11, color: t.colors.text.muted, marginBottom: 2 },
    frVal: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary },
    roleSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    rsOpt: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1.5, borderColor: t.colors.border.default, backgroundColor: t.colors.background.surface },
    rsOptActive: { borderColor: t.colors.brand.primaryActive, backgroundColor: t.colors.background.indigoTint },
    rsOptTxt: { fontSize: 12, fontWeight: '600', color: t.colors.text.muted },
    rsOptTxtActive: { color: t.colors.brand.primaryActive },
    contractChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.colors.status.successBg, borderWidth: 1, borderColor: t.colors.status.success, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginTop: 6, alignSelf: 'flex-start' },
    contractTxt: { fontSize: 12, fontWeight: '700', color: t.colors.status.success },
    logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
    logRowBorder: { borderTopWidth: 1, borderTopColor: t.colors.border.default },
    logDot: { width: 8, height: 8, borderRadius: 9999, marginTop: 5, flexShrink: 0 },
    logAction: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary },
    logTime: { fontSize: 11, color: t.colors.text.muted, marginTop: 1 },
    saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, backgroundColor: t.colors.background.surface, borderTopWidth: 1, borderTopColor: t.colors.border.default, flexDirection: 'row', gap: 10 },
    btnCancel: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.border.default, backgroundColor: t.colors.background.base, alignItems: 'center', justifyContent: 'center' },
    btnCancelTxt: { fontSize: 14, fontWeight: '600', color: t.colors.text.secondary },
    btnSave: { flex: 2, height: 48, borderRadius: 12, backgroundColor: t.colors.brand.primaryActive, alignItems: 'center', justifyContent: 'center' },
    btnSaveTxt: { fontSize: 14, fontWeight: '700', color: t.colors.text.onPrimary },
  });
}
