import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useLeaveBalance, useLeaveHistory } from '../../hooks/useLeaveQueries';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';

type NavProp = StackNavigationProp<RootStackParamList>;

export default function LeaveBalanceScreen() {
  const navigation = useNavigation<NavProp>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const { data: balanceData, isLoading: isBalanceLoading } = useLeaveBalance();
  const { data: historyData } = useLeaveHistory();

  const LEAVE_TYPES_FALLBACK = [
    { icon: 'calendar-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primary, name: 'Nghỉ phép năm', used: 2, total: 14, barColor: theme.colors.brand.primary },
    { icon: 'pulse-outline', iconBg: theme.colors.status.successBg, iconColor: theme.colors.status.success, name: 'Nghỉ ốm', used: 0, total: 5, barColor: theme.colors.status.success },
    { icon: 'people-outline', iconBg: '#fff7ed', iconColor: '#f97316', name: 'Nghỉ không lương', used: 0, total: 3, barColor: '#f97316' },
    { icon: 'desktop-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primaryActive, name: 'Remote (WFH)', used: 2, total: 10, barColor: theme.colors.brand.primaryActive },
  ];

  const remaining = balanceData?.remaining ?? balanceData?.leavesRemaining ?? 12;
  const total = balanceData?.total ?? balanceData?.totalLeaves ?? 14;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  const apiLeaveTypes = balanceData?.leaveTypes;
  const displayLeaveTypes = apiLeaveTypes?.length ? apiLeaveTypes.map((lt: any) => ({
    icon: lt.type === 'annual' ? 'calendar-outline' : lt.type === 'sick' ? 'pulse-outline' : lt.type === 'family' ? 'people-outline' : 'desktop-outline',
    iconBg: lt.type === 'annual' ? theme.colors.background.indigoTint : lt.type === 'sick' ? theme.colors.status.successBg : lt.type === 'family' ? '#fff7ed' : theme.colors.background.indigoTint,
    iconColor: lt.type === 'annual' ? theme.colors.brand.primary : lt.type === 'sick' ? theme.colors.status.success : lt.type === 'family' ? '#f97316' : theme.colors.brand.primaryActive,
    name: lt.name || lt.type,
    used: lt.used || 0,
    total: lt.total || 0,
    barColor: lt.type === 'annual' ? theme.colors.brand.primary : lt.type === 'sick' ? theme.colors.status.success : lt.type === 'family' ? '#f97316' : theme.colors.brand.primaryActive,
  })) : LEAVE_TYPES_FALLBACK;

  const apiHistory = historyData?.data || historyData || [];
  const HISTORY_FALLBACK = [
    { icon: 'calendar-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primary, title: 'Nghỉ phép năm', date: '25 – 26 Apr, 2025', days: '-2 ngày', daysColor: theme.colors.status.danger },
    { icon: 'pulse-outline', iconBg: theme.colors.status.successBg, iconColor: theme.colors.status.success, title: 'Nghỉ ốm', date: '2024', days: '+2 ngày', daysColor: theme.colors.status.success },
  ];
  const displayHistory = apiHistory.length > 0 ? apiHistory.slice(0, 5).map((h: any) => ({
    icon: 'calendar-outline', iconBg: theme.colors.background.indigoTint, iconColor: theme.colors.brand.primary,
    title: h.type || h.leaveType || 'Nghỉ phép năm',
    date: h.startDate ? `${new Date(h.startDate).toLocaleDateString()} - ${new Date(h.endDate).toLocaleDateString()}` : '',
    days: h.status === 'approved' ? `-${h.days || 1} ngày` : `${h.days || 1} ngày`,
    daysColor: h.status === 'approved' ? theme.colors.status.danger : theme.colors.status.success,
  })) : HISTORY_FALLBACK;

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroRing} />
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Số ngày phép</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.balanceDisplay}>
          <View style={s.donutWrap}>
            {isBalanceLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={s.donutOuter}>
                <Text style={s.donutNum}>{remaining}</Text>
                <Text style={s.donutLbl}>Còn lại</Text>
              </View>
            )}
            <View style={[s.donutArc, { borderRightColor: pct > 50 ? '#4ade80' : 'transparent' }]} />
          </View>
          <View style={s.balanceInfo}>
            <Text style={s.balanceYear}>2025</Text>
            <Text style={s.balanceUsed}>{total - remaining} / {total} ngày đã dùng</Text>
            <Text style={s.balanceSub}>{remaining} ngày còn lại</Text>
          </View>
        </View>

        <View style={s.expireNote}>
          <Icon name="time-outline" size={13} color="rgba(255,255,255,0.8)" library="ionicons" />
          <Text style={s.expireText}>Hết hạn 31/12/2025</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Text style={s.sectionTitle}>Số ngày phép</Text>
        <View style={s.leaveTypes}>
          {displayLeaveTypes.map((lt: any) => {
            const rem = lt.total - lt.used;
            const pctFill = lt.total > 0 ? (lt.used / lt.total) * 100 : 0;
            return (
              <View key={lt.name} style={s.leaveType}>
                <View style={[s.ltIcon, { backgroundColor: lt.iconBg }]}>
                  <Icon name={lt.icon} size={18} color={lt.iconColor} library="ionicons" />
                </View>
                <View style={s.ltBody}>
                  <Text style={s.ltName}>{lt.name}</Text>
                  <View style={s.ltBarWrap}>
                    <View style={[s.ltBar, { width: `${pctFill}%` as any, backgroundColor: lt.barColor }]} />
                  </View>
                </View>
                <View style={s.ltRight}>
                  <Text style={[s.ltCount, { color: lt.barColor }]}>{rem}</Text>
                  <Text style={s.ltTotal}>/ {lt.total} ngày</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={s.sectionTitle}>Lịch sử nghỉ phép</Text>
        {displayHistory.map((h: any, idx: number) => (
          <View key={h.title + idx} style={s.histItem}>
            <View style={[s.histIcon, { backgroundColor: h.iconBg }]}>
              <Icon name={h.icon} size={16} color={h.iconColor} library="ionicons" />
            </View>
            <View style={s.histBody}>
              <Text style={s.histTitle}>{h.title}</Text>
              <Text style={s.histDate}>{h.date}</Text>
            </View>
            <Text style={[s.histDays, { color: h.daysColor }]}>{h.days}</Text>
          </View>
        ))}

        <TouchableOpacity style={s.requestBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Leaves' as any)}>
          <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.requestGradient}>
            <Icon name="add-outline" size={18} color="#fff" library="ionicons" />
            <Text style={s.requestBtnText}>Xin nghỉ phép</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, overflow: 'hidden' },
    heroRing: {
      position: 'absolute', top: -60, right: -60,
      width: 200, height: 200, borderRadius: 100,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    balanceDisplay: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 14 },
    donutWrap: { position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
    donutOuter: {
      width: 90, height: 90, borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 6, borderColor: 'rgba(255,255,255,0.2)',
    },
    donutNum: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 32 },
    donutLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
    donutArc: {
      position: 'absolute', width: 78, height: 78, borderRadius: 39,
      borderWidth: 6, borderColor: 'transparent', borderTopColor: '#4ade80',
    },
    balanceInfo: { flex: 1 },
    balanceYear: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 4 },
    balanceUsed: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
    balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    expireNote: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 12,
      alignSelf: 'flex-start',
    },
    expireText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    content: { padding: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary, marginBottom: 10, paddingTop: 8 },
    leaveTypes: { gap: 8, marginBottom: 20 },
    leaveType: {
      backgroundColor: t.colors.background.surface, borderRadius: 14, padding: 14, paddingHorizontal: 16,
      borderWidth: 1, borderColor: t.colors.border.default, flexDirection: 'row', alignItems: 'center', gap: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    ltIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    ltBody: { flex: 1 },
    ltName: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary, marginBottom: 6 },
    ltBarWrap: { height: 4, borderRadius: 9999, backgroundColor: t.colors.background.base, overflow: 'hidden' },
    ltBar: { height: '100%', borderRadius: 9999, minWidth: 4 },
    ltRight: { alignItems: 'flex-end' },
    ltCount: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
    ltTotal: { fontSize: 11, color: t.colors.text.muted },
    histItem: {
      backgroundColor: t.colors.background.surface, borderRadius: 14, padding: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
      borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    histIcon: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    histBody: { flex: 1 },
    histTitle: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary, marginBottom: 2 },
    histDate: { fontSize: 11, color: t.colors.text.muted },
    histDays: { fontSize: 13, fontWeight: '700' },
    requestBtn: { borderRadius: 9999, overflow: 'hidden', marginTop: 8 },
    requestGradient: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    requestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
