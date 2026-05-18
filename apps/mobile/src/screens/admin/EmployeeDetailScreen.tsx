import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useUsers } from '../../hooks/useAdminQueries';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

type TabKey = 0 | 1 | 2;
type RoleKey = 'emp' | 'mgr' | 'hr' | 'admin';

const ROLE_OPTS: { key: RoleKey; label: string }[] = [
  { key: 'emp', label: 'Nhân viên' },
  { key: 'mgr', label: 'Quản lý' },
  { key: 'hr', label: 'HR' },
  { key: 'admin', label: 'Admin' },
];

const LOG_ENTRIES = [
  { dot: '#16a34a', action: 'Yêu cầu nghỉ phép đã được duyệt', time: '23/04/2026 · 10:15 · HR Admin' },
  { dot: '#4F6EF7', action: 'Gửi yêu cầu tăng ca Q2', time: '20/04/2026 · 17:32 · Tự gửi' },
  { dot: '#7c3aed', action: 'Cập nhật hồ sơ — số điện thoại', time: '15/04/2026 · 09:04 · Admin Hệ thống' },
  { dot: '#d97706', action: 'Cảnh báo đi trễ lần 2 trong tháng', time: '10/04/2026 · 08:12 · Hệ thống tự động' },
  { dot: '#16a34a', action: 'Đánh giá hiệu suất Q1 — Xuất sắc', time: '01/04/2026 · 14:00 · Trần Văn Minh' },
];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 50, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 200, height: 200, top: -60, right: -40 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    heroActions: { flexDirection: 'row', gap: 8 },
    hAct: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    heroProfile: { alignItems: 'center' },
    ava: { width: 68, height: 68, borderRadius: 9999, backgroundColor: 'rgba(196,181,253,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 10 },
    avaTxt: { fontSize: 24, fontWeight: '800', color: '#fff' },
    heroName: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    statsStrip: { flexDirection: 'row', backgroundColor: colors.border, gap: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 14 },
    statItem: { flex: 1, backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
    statVal: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 22 },
    statLbl: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
    content: { paddingHorizontal: 16, paddingTop: 4 },
    tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    tab: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    tabActive: { backgroundColor: '#7c3aed' },
    tabTxt: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    tabTxtActive: { color: '#fff' },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
    fieldRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    frIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    frLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
    frVal: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    roleSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    rsOpt: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
    rsOptActive: { borderColor: '#7c3aed', backgroundColor: '#ede9fe' },
    rsOptTxt: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    rsOptTxtActive: { color: '#7c3aed' },
    contractChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginTop: 6, alignSelf: 'flex-start' },
    contractTxt: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
    logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
    logRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    logDot: { width: 8, height: 8, borderRadius: 9999, marginTop: 5, flexShrink: 0 },
    logAction: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    logTime: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', gap: 10 },
    btnCancel: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.separator, alignItems: 'center', justifyContent: 'center' },
    btnCancelTxt: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    btnSave: { flex: 2, height: 48, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    btnSaveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

export default function EmployeeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'EmployeeDetail'>>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<TabKey>(0);
  const [role, setRole] = useState<RoleKey>('emp');
  const { data: usersData } = useUsers();

  const userId = route.params.userId;
  const users = Array.isArray(usersData) ? usersData : (usersData?.data || []);
  const employee = users?.find((u: any) => u.id === userId || u._id === userId) || users?.[0];
  const empName = employee?.name || 'Hoàng Ngọc Anh';
  const empCode = employee?.employeeId || 'NV0042';
  const empDept = employee?.department?.name || 'Kỹ thuật';
  const empPosition = employee?.position?.title || 'Senior Developer';
  const empEmail = employee?.email || 'hoangngocank@company.com';
  const empPhone = employee?.phone || '0901 234 567';

  const tabLabels = [t.profile.personalInfo, 'Điểm danh', 'Lịch sử'];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#5b21b6', '#7c3aed', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.ring, styles.r1]} />
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.hAct} activeOpacity={0.7} onPress={() => navigation.navigate('EmployeeProfileView' as any)}>
              <Icon name="pencil-outline" size={16} color="#fff" library="ionicons" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.hAct} activeOpacity={0.7}>
              <Icon name="ellipsis-horizontal-outline" size={16} color="#fff" library="ionicons" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.heroProfile}>
          <View style={styles.ava}><Text style={styles.avaTxt}>{empName.split(' ').map((w: string) => w[0]).join('').slice(-2)}</Text></View>
          <Text style={styles.heroName}>{empName}</Text>
          <Text style={styles.heroSub}>{empCode} · {empDept} · {empPosition}</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsStrip}>
        <View style={styles.statItem}><Text style={[styles.statVal, { color: '#7c3aed' }]}>3 năm</Text><Text style={styles.statLbl}>Thâm niên</Text></View>
        <View style={[styles.statItem, styles.statBorder]}><Text style={[styles.statVal, { color: '#16a34a' }]}>96%</Text><Text style={styles.statLbl}>Chuyên cần</Text></View>
        <View style={styles.statItem}><Text style={[styles.statVal, { color: '#d97706' }]}>12</Text><Text style={styles.statLbl}>Ngày phép còn</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.tabs}>
          {tabLabels.map((label, i) => (
            <TouchableOpacity key={label} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i as TabKey)} activeOpacity={0.7}>
              <Text style={[styles.tabTxt, tab === i && styles.tabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 0 && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t.profile.personalInfo}</Text>
              {[
                { icon: 'person-outline', label: t.profile.fullName, val: empName },
                { icon: 'phone-portrait-outline', label: t.profile.phone, val: empPhone },
                { icon: 'mail-outline', label: t.profile.email, val: empEmail },
                { icon: 'location-outline', label: 'Địa chỉ', val: employee?.address || '123 Nguyễn Huệ, Q.1, TP.HCM' },
              ].map((row, i) => (
                <View key={row.label} style={[styles.fieldRow, i > 0 && styles.fieldRowBorder]}>
                  <View style={styles.frIcon}>
                    <Icon name={row.icon as any} size={14} color="#7c3aed" library="ionicons" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.frLabel}>{row.label}</Text>
                    <Text style={styles.frVal}>{row.val}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Thông tin công việc</Text>
              <View style={styles.fieldRow}>
                <View style={styles.frIcon}><Icon name="calendar-outline" size={14} color="#7c3aed" library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.frLabel}>{t.profile.joinDate}</Text>
                  <Text style={styles.frVal}>15/03/2022</Text>
                </View>
              </View>
              <View style={[styles.fieldRow, styles.fieldRowBorder]}>
                <View style={styles.frIcon}><Icon name="people-outline" size={14} color="#7c3aed" library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.frLabel}>Phân quyền</Text>
                  <View style={styles.roleSelect}>
                    {ROLE_OPTS.map((opt) => (
                      <TouchableOpacity key={opt.key} style={[styles.rsOpt, role === opt.key && styles.rsOptActive]} onPress={() => setRole(opt.key)} activeOpacity={0.7}>
                        <Text style={[styles.rsOptTxt, role === opt.key && styles.rsOptTxtActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={[styles.fieldRow, styles.fieldRowBorder]}>
                <View style={styles.frIcon}><Icon name="cube-outline" size={14} color="#7c3aed" library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.frLabel}>Hợp đồng</Text>
                  <View style={styles.contractChip}>
                    <Icon name="checkmark-outline" size={14} color="#16a34a" library="ionicons" />
                    <Text style={styles.contractTxt}>Hợp đồng không xác định thời hạn</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.fieldRow, styles.fieldRowBorder]}>
                <View style={styles.frIcon}><Icon name="cash-outline" size={14} color="#7c3aed" library="ionicons" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.frLabel}>{t.profile.basicSalary}</Text>
                  <Text style={styles.frVal}>25.000.000 VND / tháng</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {tab === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tháng 4/2026</Text>
            {[
              { label: 'Ngày đi làm', val: '22 / 23 ngày', color: '#16a34a', big: true },
              { label: 'Tổng giờ làm', val: '184.5 giờ', color: colors.textPrimary, big: false },
              { label: 'Số lần đi trễ', val: '2 lần', color: '#d97706', big: false },
              { label: 'Ngày WFH', val: '3 ngày', color: '#4F6EF7', big: false },
              { label: 'Ngày nghỉ phép', val: '1 ngày', color: colors.textPrimary, big: false },
            ].map((row, i) => (
              <View key={row.label} style={[styles.fieldRow, i > 0 && styles.fieldRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.frLabel}>{row.label}</Text>
                  <Text style={[styles.frVal, { color: row.color, fontSize: row.big ? 20 : 13, fontWeight: row.big ? '800' : '600' }]}>{row.val}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nhật ký hoạt động</Text>
            {LOG_ENTRIES.map((log, i) => (
              <View key={i} style={[styles.logRow, i > 0 && styles.logRowBorder]}>
                <View style={[styles.logDot, { backgroundColor: log.dot }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logAction}>{log.action}</Text>
                  <Text style={styles.logTime}>{log.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.saveBar}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.btnCancelTxt}>{t.common.cancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} activeOpacity={0.85}>
          <Text style={styles.btnSaveTxt}>{t.common.save}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
