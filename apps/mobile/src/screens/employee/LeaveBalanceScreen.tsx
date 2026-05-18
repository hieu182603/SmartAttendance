import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useLeaveBalance, useLeaveHistory } from '../../hooks/useLeaveQueries';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

type NavProp = StackNavigationProp<RootStackParamList>;

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: {
      paddingTop: 56,
      paddingBottom: 20,
      paddingHorizontal: 20,
      overflow: 'hidden',
    },
    heroRing: {
      position: 'absolute', top: -60, right: -60,
      width: 200, height: 200, borderRadius: 100,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
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
    donutInner: { alignItems: 'center' },
    donutNum: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 32 },
    donutLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
    donutArc: {
      position: 'absolute',
      width: 78, height: 78, borderRadius: 39,
      borderWidth: 6,
      borderColor: 'transparent',
      borderTopColor: '#4ade80',
    },
    balanceInfo: { flex: 1 },
    balanceYear: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 4 },
    balanceUsed: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
    balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    expireNote: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 9999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      alignSelf: 'flex-start',
    },
    expireText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    content: { padding: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, paddingTop: 8 },
    leaveTypes: { gap: 8, marginBottom: 20 },
    leaveType: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    ltIcon: {
      width: 38, height: 38, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    ltBody: { flex: 1 },
    ltName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
    ltBarWrap: {
      height: 4, borderRadius: 9999,
      backgroundColor: colors.separator, overflow: 'hidden',
    },
    ltBar: { height: '100%', borderRadius: 9999, minWidth: 4 },
    ltRight: { alignItems: 'flex-end' },
    ltCount: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
    ltTotal: { fontSize: 11, color: colors.textMuted },
    histItem: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    histIcon: {
      width: 36, height: 36, borderRadius: 9999,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    histBody: { flex: 1 },
    histTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
    histDate: { fontSize: 11, color: colors.textMuted },
    histDays: { fontSize: 13, fontWeight: '700' },
    requestBtn: { borderRadius: 9999, overflow: 'hidden', marginTop: 8 },
    requestGradient: {
      height: 52, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    requestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}

export default function LeaveBalanceScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: balanceData, isLoading: isBalanceLoading } = useLeaveBalance();
  const { data: historyData, isLoading: isHistoryLoading } = useLeaveHistory();

  const remaining = balanceData?.remaining ?? balanceData?.leavesRemaining ?? 12;
  const total = balanceData?.total ?? balanceData?.totalLeaves ?? 14;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  const LEAVE_TYPES = [
    { icon: 'calendar-outline', iconBg: '#EEF1FF', iconColor: '#4F6EF7', name: t.leaveBalance.annualLeave, used: 2, total: 14, barColor: '#4F6EF7' },
    { icon: 'pulse-outline', iconBg: '#dcfce7', iconColor: '#16a34a', name: t.leaveBalance.sickLeave, used: 0, total: 5, barColor: '#16a34a' },
    { icon: 'people-outline', iconBg: '#fff7ed', iconColor: '#f97316', name: t.leaveBalance.unpaidLeave, used: 0, total: 3, barColor: '#f97316' },
    { icon: 'desktop-outline', iconBg: '#ede9fe', iconColor: '#7c3aed', name: 'Remote (WFH)', used: 2, total: 10, barColor: '#7c3aed' },
  ];

  const HISTORY_FALLBACK = [
    { icon: 'calendar-outline', iconBg: '#EEF1FF', iconColor: '#4F6EF7', title: t.leaveBalance.annualLeave, date: '25 – 26 Apr, 2025', days: '-2 ' + t.common.day, daysColor: '#ef4444' },
    { icon: 'pulse-outline', iconBg: '#dcfce7', iconColor: '#16a34a', title: t.leaveBalance.annualLeave, date: '2024', days: '+2 ' + t.common.day, daysColor: '#16a34a' },
  ];

  // Map API leave types if available
  const apiLeaveTypes = balanceData?.leaveTypes;
  const displayLeaveTypes = apiLeaveTypes?.length ? apiLeaveTypes.map((lt: any) => ({
    icon: lt.type === 'annual' ? 'calendar-outline' : lt.type === 'sick' ? 'pulse-outline' : lt.type === 'family' ? 'people-outline' : 'desktop-outline',
    iconBg: lt.type === 'annual' ? '#EEF1FF' : lt.type === 'sick' ? '#dcfce7' : lt.type === 'family' ? '#fff7ed' : '#ede9fe',
    iconColor: lt.type === 'annual' ? '#4F6EF7' : lt.type === 'sick' ? '#16a34a' : lt.type === 'family' ? '#f97316' : '#7c3aed',
    name: lt.name || lt.type,
    used: lt.used || 0,
    total: lt.total || 0,
    barColor: lt.type === 'annual' ? '#4F6EF7' : lt.type === 'sick' ? '#16a34a' : lt.type === 'family' ? '#f97316' : '#7c3aed',
  })) : LEAVE_TYPES;

  // Map API history if available
  const apiHistory = (historyData?.data || historyData || []);
  const displayHistory = apiHistory.length > 0 ? apiHistory.slice(0, 5).map((h: any) => ({
    icon: 'calendar-outline',
    iconBg: '#EEF1FF',
    iconColor: '#4F6EF7',
    title: h.type || h.leaveType || t.leaveBalance.annualLeave,
    date: h.startDate ? `${new Date(h.startDate).toLocaleDateString()} - ${new Date(h.endDate).toLocaleDateString()}` : '',
    days: h.status === 'approved' ? `-${h.days || 1} ${t.common.day}` : `${h.days || 1} ${t.common.day}`,
    daysColor: h.status === 'approved' ? '#ef4444' : '#16a34a',
  })) : HISTORY_FALLBACK;

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={['#4f6ef7', '#7c5cbf']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRing} />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t.leaveBalance.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Donut + info */}
        <View style={styles.balanceDisplay}>
          <View style={styles.donutWrap}>
            <View style={styles.donutOuter}>
              <View style={styles.donutInner}>
                <Text style={styles.donutNum}>{remaining}</Text>
                <Text style={styles.donutLbl}>{t.leaveBalance.remaining}</Text>
              </View>
            </View>
            <View style={[styles.donutArc, { borderTopColor: '#4ade80', borderRightColor: pct > 50 ? '#4ade80' : 'transparent' }]} />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceYear}>2025</Text>
            <Text style={styles.balanceUsed}>{total - remaining} / {total} {t.leaveBalance.daysUsed}</Text>
            <Text style={styles.balanceSub}>{remaining} {t.leaveBalance.daysLeft}</Text>
          </View>
        </View>

        <View style={styles.expireNote}>
          <Icon name="time-outline" size={13} color="rgba(255,255,255,0.8)" library="ionicons" />
          <Text style={styles.expireText}>{t.leaveBalance.expiresOn} 31/12/2025</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Leave types */}
        <Text style={styles.sectionTitle}>{t.leaveBalance.title}</Text>
        <View style={styles.leaveTypes}>
          {displayLeaveTypes.map((lt: any) => {
            const rem = lt.total - lt.used;
            const pctFill = (lt.used / lt.total) * 100;
            return (
              <View key={lt.name} style={styles.leaveType}>
                <View style={[styles.ltIcon, { backgroundColor: lt.iconBg }]}>
                  <Icon name={lt.icon} size={18} color={lt.iconColor} library="ionicons" />
                </View>
                <View style={styles.ltBody}>
                  <Text style={styles.ltName}>{lt.name}</Text>
                  <View style={styles.ltBarWrap}>
                    <View style={[styles.ltBar, { width: `${pctFill}%` as any, backgroundColor: lt.barColor }]} />
                  </View>
                </View>
                <View style={styles.ltRight}>
                  <Text style={[styles.ltCount, { color: lt.barColor }]}>{rem}</Text>
                  <Text style={styles.ltTotal}>/ {lt.total} {t.common.day}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>{t.leaveBalance.history}</Text>
        {displayHistory.map((h: any, idx: number) => (
          <View key={h.title + idx} style={styles.histItem}>
            <View style={[styles.histIcon, { backgroundColor: h.iconBg }]}>
              <Icon name={h.icon} size={16} color={h.iconColor} library="ionicons" />
            </View>
            <View style={styles.histBody}>
              <Text style={styles.histTitle}>{h.title}</Text>
              <Text style={styles.histDate}>{h.date}</Text>
            </View>
            <Text style={[styles.histDays, { color: h.daysColor }]}>{h.days}</Text>
          </View>
        ))}

        {/* Request button */}
        <TouchableOpacity style={styles.requestBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Leaves' as any)}>
          <LinearGradient
            colors={['#4F6EF7', '#3a52dd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestGradient}
          >
            <Icon name="add-outline" size={18} color="#fff" library="ionicons" />
            <Text style={styles.requestBtnText}>{t.leaveBalance.requestLeave}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
