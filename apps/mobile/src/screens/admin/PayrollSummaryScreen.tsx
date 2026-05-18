import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'];

const BREAKDOWN = [
  { label: 'Lương cơ bản', val: '₫2.850.000.000', pct: 87 },
  { label: 'Phụ cấp', val: '₫285.000.000', pct: 9 },
  { label: 'Tăng ca (OT)', val: '₫95.000.000', pct: 3 },
  { label: 'Khấu trừ', val: '-₫45.000.000', pct: 1, isDeduction: true },
];

const CHART_BARS: { month: string; h: number; amount: string; active?: boolean }[] = [
  { month: 'T11', h: 0.72, amount: '3.1B' },
  { month: 'T12', h: 0.78, amount: '3.3B' },
  { month: 'T1', h: 0.74, amount: '3.1B' },
  { month: 'T2', h: 0.65, amount: '2.8B' },
  { month: 'T3', h: 0.80, amount: '3.4B' },
  { month: 'T4', h: 0.92, amount: '3.9B', active: true },
];

const DEPT_TABLE = [
  { name: 'Kỹ thuật', count: 38, avg: '₫25.9M', total: '₫984M' },
  { name: 'Kinh doanh', count: 31, avg: '₫22.1M', total: '₫685M' },
  { name: 'Marketing', count: 24, avg: '₫21.4M', total: '₫514M' },
  { name: 'HR & Hành chính', count: 18, avg: '₫19.8M', total: '₫356M' },
  { name: 'Kế toán', count: 16, avg: '₫23.5M', total: '₫376M' },
];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 200, height: 200, top: -70, right: -40 },
    heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    heroTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    backBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    exportBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14 },
    navArrow: { padding: 4 },
    monthTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    totalBox: { alignItems: 'center' },
    totalLabelTxt: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
    totalAmt: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    totalSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    kpiRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginVertical: 14, overflow: 'hidden' },
    kpiItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    kpiBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
    kpiVal: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    kpiLbl: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
    content: { paddingHorizontal: 16 },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
    divider: { height: 1, backgroundColor: colors.separator, marginVertical: 8 },
    bRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    bVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    barTrack: { height: 6, backgroundColor: colors.separator, borderRadius: 3 },
    barFill: { height: 6, backgroundColor: '#7c3aed', borderRadius: 3 },
    bPct: { fontSize: 12, fontWeight: '700', color: colors.textMuted, width: 32, textAlign: 'right' },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80, marginTop: 8 },
    chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    chartAmt: { fontSize: 8, color: '#7c3aed', fontWeight: '700', marginBottom: 2 },
    chartBar: { width: '100%', borderRadius: 4, minHeight: 8 },
    chartLbl: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
    tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 },
    thCell: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
    tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.separator },
    tdName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    tdCell: { fontSize: 12, color: colors.textSecondary },
    tdBold: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  });
}

export default function PayrollSummaryScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [monthIdx, setMonthIdx] = useState(3);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#5b21b6', '#7c3aed', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.ring, styles.r1]} />
        <View style={styles.heroHead}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={15} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Bảng lương</Text>
          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
            <Icon name="download-outline" size={16} color="#fff" library="ionicons" />
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
        <View style={styles.totalBox}>
          <Text style={styles.totalLabelTxt}>Tổng quỹ lương</Text>
          <Text style={styles.totalAmt}>₫3.285.000.000</Text>
          <Text style={styles.totalSub}>127 nhân viên</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>₫25.9M</Text>
            <Text style={styles.kpiLbl}>TB / người</Text>
          </View>
          <View style={[styles.kpiItem, styles.kpiBorder]}>
            <Text style={[styles.kpiVal, { color: '#16a34a' }]}>+2.4%</Text>
            <Text style={styles.kpiLbl}>So tháng trước</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiVal, { color: '#4F6EF7' }]}>98%</Text>
            <Text style={styles.kpiLbl}>Đã thanh toán</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cơ cấu lương</Text>
          {BREAKDOWN.map((row, i) => (
            <View key={row.label}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.bRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.bLabel}>{row.label}</Text>
                    <Text style={[styles.bVal, row.isDeduction && { color: '#ef4444' }]}>{row.val}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${row.pct}%` as any }]} />
                  </View>
                </View>
                <Text style={styles.bPct}>{row.pct}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Xu hướng 6 tháng</Text>
          <View style={styles.chartRow}>
            {CHART_BARS.map((bar) => (
              <View key={bar.month} style={styles.chartCol}>
                <Text style={styles.chartAmt}>{bar.active ? bar.amount : ''}</Text>
                <LinearGradient
                  colors={bar.active ? ['#7c3aed', '#a855f7'] : [colors.border, colors.border]}
                  start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
                  style={[styles.chartBar, { height: `${bar.h * 100}%` as any }]}
                />
                <Text style={[styles.chartLbl, bar.active && { color: '#7c3aed', fontWeight: '700' }]}>{bar.month}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theo phòng ban</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.thCell, { flex: 2 }]}>Phòng ban</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>TB / người</Text>
            <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Tổng</Text>
          </View>
          {DEPT_TABLE.map((row, i) => (
            <View key={row.name} style={[styles.tableRow, i < DEPT_TABLE.length - 1 && styles.tableRowBorder]}>
              <Text style={[styles.tdName, { flex: 2 }]} numberOfLines={1}>{row.name}</Text>
              <Text style={[styles.tdCell, { flex: 1, textAlign: 'center' }]}>{row.count}</Text>
              <Text style={[styles.tdCell, { flex: 1.5, textAlign: 'right' }]}>{row.avg}</Text>
              <Text style={[styles.tdBold, { flex: 1.5, textAlign: 'right' }]}>{row.total}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
