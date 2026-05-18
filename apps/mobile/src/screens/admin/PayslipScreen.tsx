import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

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

const HISTORY = [
  { month: 'Tháng 3/2026', net: '₫13.950.000', statusBg: '#dcfce7', statusColor: '#16a34a', status: 'Đã thanh toán' },
  { month: 'Tháng 2/2026', net: '₫13.420.000', statusBg: '#dcfce7', statusColor: '#16a34a', status: 'Đã thanh toán' },
  { month: 'Tháng 1/2026', net: '₫14.100.000', statusBg: '#dcfce7', statusColor: '#16a34a', status: 'Đã thanh toán' },
];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 180, height: 180, top: -60, right: -30 },
    heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    heroTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    backBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    exportBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14 },
    navArrow: { padding: 4 },
    monthTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    netBox: { alignItems: 'center' },
    netLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
    netAmt: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    statusPill: { marginTop: 8, backgroundColor: 'rgba(74,222,128,0.2)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 14 },
    statusTxt: { fontSize: 12, fontWeight: '700', color: '#4ade80' },
    statsStrip: { flexDirection: 'row', backgroundColor: colors.border, gap: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16 },
    statItem: { flex: 1, backgroundColor: colors.card, paddingVertical: 12, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
    statVal: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    statLbl: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
    content: { paddingHorizontal: 16 },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
    rowLabel: { fontSize: 13, color: colors.textSecondary },
    rowVal: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    rowTotal: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 12 },
    totalLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    totalVal: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    hMonth: { fontSize: 12, color: colors.textMuted },
    hNet: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
    histBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
    histBadgeTxt: { fontSize: 10, fontWeight: '700' },
    dlBtn: { backgroundColor: '#4F6EF7', borderRadius: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
    dlTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

export default function PayslipScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [monthIdx, setMonthIdx] = useState(3);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#4c1d95', '#6d28d9', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.ring, styles.r1]} />
        <View style={styles.heroHead}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={15} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Phiếu lương</Text>
          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
            <Icon name="share-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
        </View>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonthIdx((p) => Math.max(0, p - 1))} activeOpacity={0.7} style={styles.navArrow}>
            <Icon name="chevron-back-outline" size={16} color="rgba(255,255,255,0.8)" library="ionicons" />
          </TouchableOpacity>
          <Text style={styles.monthTxt}>{MONTHS[monthIdx]} / 2026</Text>
          <TouchableOpacity onPress={() => setMonthIdx((p) => Math.min(5, p + 1))} activeOpacity={0.7} style={styles.navArrow}>
            <Icon name="chevron-forward-outline" size={16} color="rgba(255,255,255,0.8)" library="ionicons" />
          </TouchableOpacity>
        </View>
        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Thực nhận</Text>
          <Text style={styles.netAmt}>₫14.250.000</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusTxt}>Đã thanh toán</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>22</Text>
          <Text style={styles.statLbl}>Ngày công</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={[styles.statVal, { color: '#d97706' }]}>2.5h</Text>
          <Text style={styles.statLbl}>Tăng ca</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: '#ef4444' }]}>0</Text>
          <Text style={styles.statLbl}>Khấu trừ thêm</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thu nhập</Text>
          {INCOME.map((row, i) => (
            <View key={row.label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowVal}>{row.val}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.rowTotal]}>
            <Text style={styles.totalLabel}>Tổng thu nhập</Text>
            <Text style={styles.totalVal}>₫15.250.000</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Khấu trừ</Text>
          {DEDUCTIONS.map((row, i) => (
            <View key={row.label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={[styles.rowVal, { color: '#ef4444' }]}>{row.val}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.rowTotal]}>
            <Text style={styles.totalLabel}>Tổng khấu trừ</Text>
            <Text style={[styles.totalVal, { color: '#ef4444' }]}>-₫2.000.000</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lịch sử lương</Text>
          {HISTORY.map((row, i) => (
            <View key={row.month} style={[styles.hRow, i > 0 && styles.rowBorder]}>
              <Icon name="calendar-outline" size={16} color={colors.textMuted} library="ionicons" />
              <View style={{ flex: 1 }}>
                <Text style={styles.hMonth}>{row.month}</Text>
                <Text style={styles.hNet}>{row.net}</Text>
              </View>
              <View style={[styles.histBadge, { backgroundColor: row.statusBg }]}>
                <Text style={[styles.histBadgeTxt, { color: row.statusColor }]}>{row.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.dlBtn} activeOpacity={0.85} onPress={() => {}}>
          <Icon name="download-outline" size={18} color="#fff" library="ionicons" />
          <Text style={styles.dlTxt}>Tải phiếu lương PDF</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
