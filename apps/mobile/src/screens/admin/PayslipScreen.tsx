import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useTheme, Theme } from '../../theme';

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'];

const INCOME = [
  { label: 'Lương cơ bản', val: '₫14.000.000' },
  { label: 'Phụ cấp đi lại', val: '₫500.000' },
  { label: 'Phụ cấp ăn trưa', val: '₫400.000' },
  { label: 'Tăng ca (OT)', val: '₫350.000' },
];

const DEDUCTIONS = [
  { label: 'BHXH (8%)', val: '-₫1.120.000' },
  { label: 'BHYT (1.5%)', val: '-₫210.000' },
  { label: 'Thuế TNCN', val: '-₫670.000' },
];

const HISTORY_MONTHS = [
  { month: 'Tháng 3/2026', net: '₫13.950.000', status: 'Đã thanh toán' },
  { month: 'Tháng 2/2026', net: '₫13.420.000', status: 'Đã thanh toán' },
  { month: 'Tháng 1/2026', net: '₫14.100.000', status: 'Đã thanh toán' },
];

export default function PayslipScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [monthIdx, setMonthIdx] = useState(3);
  const HISTORY = HISTORY_MONTHS.map((h) => ({
    ...h,
    statusBg: theme.colors.status.successBg,
    statusColor: theme.colors.status.success,
  }));

  return (
    <View style={s.root}>
      <LinearGradient colors={['#4c1d95', '#6d28d9', theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={[s.ring, s.r1]} />
        <View style={s.heroHead}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={15} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
          <Text style={s.heroTitle}>Phiếu lương</Text>
          <TouchableOpacity style={s.exportBtn} activeOpacity={0.7}>
            <Icon name="share-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
        </View>
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => setMonthIdx((p) => Math.max(0, p - 1))} activeOpacity={0.7} style={s.navArrow}>
            <Icon name="chevron-back-outline" size={16} color="rgba(255,255,255,0.8)" library="ionicons" />
          </TouchableOpacity>
          <Text style={s.monthTxt}>{MONTHS[monthIdx]} / 2026</Text>
          <TouchableOpacity onPress={() => setMonthIdx((p) => Math.min(5, p + 1))} activeOpacity={0.7} style={s.navArrow}>
            <Icon name="chevron-forward-outline" size={16} color="rgba(255,255,255,0.8)" library="ionicons" />
          </TouchableOpacity>
        </View>
        <View style={s.netBox}>
          <Text style={s.netLabel}>Thực nhận</Text>
          <Text style={s.netAmt}>₫14.250.000</Text>
          <View style={s.statusPill}>
            <Text style={s.statusTxt}>Đã thanh toán</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.statsStrip}>
        <View style={s.statItem}>
          <Text style={s.statVal}>22</Text>
          <Text style={s.statLbl}>Ngày công</Text>
        </View>
        <View style={[s.statItem, s.statBorder]}>
          <Text style={[s.statVal, { color: theme.colors.status.warning }]}>2.5h</Text>
          <Text style={s.statLbl}>Tăng ca</Text>
        </View>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: theme.colors.status.danger }]}>0</Text>
          <Text style={s.statLbl}>Khấu trừ thêm</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Thu nhập</Text>
          {INCOME.map((row, i) => (
            <View key={row.label} style={[s.row, i > 0 && s.rowBorder]}>
              <Text style={s.rowLabel}>{row.label}</Text>
              <Text style={s.rowVal}>{row.val}</Text>
            </View>
          ))}
          <View style={[s.row, s.rowTotal]}>
            <Text style={s.totalLabel}>Tổng thu nhập</Text>
            <Text style={s.totalVal}>₫15.250.000</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Khấu trừ</Text>
          {DEDUCTIONS.map((row, i) => (
            <View key={row.label} style={[s.row, i > 0 && s.rowBorder]}>
              <Text style={s.rowLabel}>{row.label}</Text>
              <Text style={[s.rowVal, { color: theme.colors.status.danger }]}>{row.val}</Text>
            </View>
          ))}
          <View style={[s.row, s.rowTotal]}>
            <Text style={s.totalLabel}>Tổng khấu trừ</Text>
            <Text style={[s.totalVal, { color: theme.colors.status.danger }]}>-₫2.000.000</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Lịch sử lương</Text>
          {HISTORY.map((row, i) => (
            <View key={row.month} style={[s.hRow, i > 0 && s.rowBorder]}>
              <Icon name="calendar-outline" size={16} color={theme.colors.text.muted} library="ionicons" />
              <View style={{ flex: 1 }}>
                <Text style={s.hMonth}>{row.month}</Text>
                <Text style={s.hNet}>{row.net}</Text>
              </View>
              <View style={[s.histBadge, { backgroundColor: row.statusBg }]}>
                <Text style={[s.histBadgeTxt, { color: row.statusColor }]}>{row.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.dlBtn} activeOpacity={0.85} onPress={() => {}}>
          <Icon name="download-outline" size={18} color={theme.colors.text.onPrimary} library="ionicons" />
          <Text style={s.dlTxt}>Tải phiếu lương PDF</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 180, height: 180, top: -60, right: -30 },
    heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    heroTitle: { fontSize: 17, fontWeight: '800', color: t.colors.text.onPrimary },
    backBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    exportBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14 },
    navArrow: { padding: 4 },
    monthTxt: { fontSize: 15, fontWeight: '700', color: t.colors.text.onPrimary },
    netBox: { alignItems: 'center' },
    netLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
    netAmt: { fontSize: 30, fontWeight: '800', color: t.colors.text.onPrimary, letterSpacing: -0.5 },
    statusPill: { marginTop: 8, backgroundColor: 'rgba(74,222,128,0.2)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 14 },
    statusTxt: { fontSize: 12, fontWeight: '700', color: '#4ade80' },
    statsStrip: { flexDirection: 'row', backgroundColor: t.colors.border.default, gap: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16 },
    statItem: { flex: 1, backgroundColor: t.colors.background.surface, paddingVertical: 12, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: t.colors.border.default },
    statVal: { fontSize: 16, fontWeight: '800', color: t.colors.text.primary },
    statLbl: { fontSize: 9, color: t.colors.text.muted, marginTop: 2 },
    content: { paddingHorizontal: 16 },
    card: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
    rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.border.default },
    rowLabel: { fontSize: 13, color: t.colors.text.secondary },
    rowVal: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary },
    rowTotal: { borderTopWidth: 1, borderTopColor: t.colors.border.default, marginTop: 4, paddingTop: 12 },
    totalLabel: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    totalVal: { fontSize: 15, fontWeight: '800', color: t.colors.text.primary },
    hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    hMonth: { fontSize: 12, color: t.colors.text.muted },
    hNet: { fontSize: 14, fontWeight: '700', color: t.colors.text.primary, marginTop: 2 },
    histBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
    histBadgeTxt: { fontSize: 10, fontWeight: '700' },
    dlBtn: { backgroundColor: t.colors.brand.primary, borderRadius: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
    dlTxt: { fontSize: 14, fontWeight: '700', color: t.colors.text.onPrimary },
  });
}
