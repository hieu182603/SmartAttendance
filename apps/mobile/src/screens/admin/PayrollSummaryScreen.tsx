import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useTheme, Theme } from '../../theme';

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'];

const BREAKDOWN: { label: string; val: string; pct: number; isDeduction?: boolean }[] = [];

const CHART_BARS: { month: string; h: number; amount: string; active?: boolean }[] = [];

const DEPT_TABLE: { name: string; count: number; avg: string; total: string }[] = [];

export default function PayrollSummaryScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [monthIdx, setMonthIdx] = useState(3);

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.colors.brand.primaryActive, theme.colors.brand.primary, '#a855f7'] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={[s.ring, s.r1]} />
        <View style={s.heroHead}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={15} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
          <Text style={s.heroTitle}>Bảng lương</Text>
          <TouchableOpacity style={s.exportBtn} activeOpacity={0.7}>
            <Icon name="download-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
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
        <View style={s.totalBox}>
          <Text style={s.totalLabelTxt}>Tổng quỹ lương</Text>
          <Text style={s.totalAmt}>₫3.285.000.000</Text>
          <Text style={s.totalSub}>127 nhân viên</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.kpiRow}>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>₫25.9M</Text>
            <Text style={s.kpiLbl}>TB / người</Text>
          </View>
          <View style={[s.kpiItem, s.kpiBorder]}>
            <Text style={[s.kpiVal, { color: theme.colors.status.success }]}>+2.4%</Text>
            <Text style={s.kpiLbl}>So tháng trước</Text>
          </View>
          <View style={s.kpiItem}>
            <Text style={[s.kpiVal, { color: theme.colors.brand.primary }]}>98%</Text>
            <Text style={s.kpiLbl}>Đã thanh toán</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Cơ cấu lương</Text>
          {BREAKDOWN.map((row, i) => (
            <View key={row.label}>
              {i > 0 && <View style={s.divider} />}
              <View style={s.bRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={s.bLabel}>{row.label}</Text>
                    <Text style={[s.bVal, row.isDeduction && { color: theme.colors.status.danger }]}>{row.val}</Text>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${row.pct}%` as any }]} />
                  </View>
                </View>
                <Text style={s.bPct}>{row.pct}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Xu hướng 6 tháng</Text>
          <View style={s.chartRow}>
            {CHART_BARS.map((bar) => (
              <View key={bar.month} style={s.chartCol}>
                <Text style={s.chartAmt}>{bar.active ? bar.amount : ''}</Text>
                <LinearGradient
                  colors={bar.active
                    ? [theme.colors.brand.primaryActive, '#a855f7'] as unknown as readonly [string, ...string[]]
                    : [theme.colors.border.default, theme.colors.border.default] as unknown as readonly [string, ...string[]]}
                  start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
                  style={[s.chartBar, { height: `${bar.h * 100}%` as any }]}
                />
                <Text style={[s.chartLbl, bar.active && { color: theme.colors.brand.primaryActive, fontWeight: '700' }]}>{bar.month}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Theo phòng ban</Text>
          <View style={s.tableHead}>
            <Text style={[s.thCell, { flex: 2 }]}>Phòng ban</Text>
            <Text style={[s.thCell, { flex: 1, textAlign: 'center' }]}>SL</Text>
            <Text style={[s.thCell, { flex: 1.5, textAlign: 'right' }]}>TB / người</Text>
            <Text style={[s.thCell, { flex: 1.5, textAlign: 'right' }]}>Tổng</Text>
          </View>
          {DEPT_TABLE.map((row, i) => (
            <View key={row.name} style={[s.tableRow, i < DEPT_TABLE.length - 1 && s.tableRowBorder]}>
              <Text style={[s.tdName, { flex: 2 }]} numberOfLines={1}>{row.name}</Text>
              <Text style={[s.tdCell, { flex: 1, textAlign: 'center' }]}>{row.count}</Text>
              <Text style={[s.tdCell, { flex: 1.5, textAlign: 'right' }]}>{row.avg}</Text>
              <Text style={[s.tdBold, { flex: 1.5, textAlign: 'right' }]}>{row.total}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 200, height: 200, top: -70, right: -40 },
    heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    heroTitle: { fontSize: 17, fontWeight: '800', color: t.colors.text.onPrimary },
    backBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    exportBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14 },
    navArrow: { padding: 4 },
    monthTxt: { fontSize: 15, fontWeight: '700', color: t.colors.text.onPrimary },
    totalBox: { alignItems: 'center' },
    totalLabelTxt: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
    totalAmt: { fontSize: 28, fontWeight: '800', color: t.colors.text.onPrimary, letterSpacing: -0.5 },
    totalSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    kpiRow: { flexDirection: 'row', backgroundColor: t.colors.background.surface, borderRadius: 14, borderWidth: 1, borderColor: t.colors.border.default, marginVertical: 14, overflow: 'hidden' },
    kpiItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    kpiBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: t.colors.border.default },
    kpiVal: { fontSize: 16, fontWeight: '800', color: t.colors.text.primary },
    kpiLbl: { fontSize: 10, color: t.colors.text.muted, marginTop: 3 },
    content: { paddingHorizontal: 16 },
    card: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
    divider: { height: 1, backgroundColor: t.colors.border.default, marginVertical: 8 },
    bRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bLabel: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary },
    bVal: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    barTrack: { height: 6, backgroundColor: t.colors.border.default, borderRadius: 3 },
    barFill: { height: 6, backgroundColor: t.colors.brand.primaryActive, borderRadius: 3 },
    bPct: { fontSize: 12, fontWeight: '700', color: t.colors.text.muted, width: 32, textAlign: 'right' },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80, marginTop: 8 },
    chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    chartAmt: { fontSize: 8, color: t.colors.brand.primaryActive, fontWeight: '700', marginBottom: 2 },
    chartBar: { width: '100%', borderRadius: 4, minHeight: 8 },
    chartLbl: { fontSize: 10, color: t.colors.text.muted, marginTop: 4 },
    tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: t.colors.border.default, marginBottom: 4 },
    thCell: { fontSize: 10, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
    tableRowBorder: { borderBottomWidth: 1, borderBottomColor: t.colors.border.default },
    tdName: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary },
    tdCell: { fontSize: 12, color: t.colors.text.secondary },
    tdBold: { fontSize: 12, fontWeight: '700', color: t.colors.text.primary },
  });
}
