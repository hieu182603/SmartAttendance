import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useAttendanceHistory } from '../../hooks/useAttendanceQueries';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'AttendanceDetail'>;
  route: RouteProp<RootStackParamList, 'AttendanceDetail'>;
};

export default function AttendanceDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const { recordId } = route.params || {};
  const { data: historyData, isLoading } = useAttendanceHistory();
  const record = historyData?.data?.find((r: any) => r.id === recordId || r._id === recordId);

  const heroDate = record?.date || 'Wed, 23/04/2025';
  const heroDow = record?.shift || '08:00 – 17:00';
  const inTime = record?.checkIn || '08:02';
  const workedTime = record?.totalHours ? `${record.totalHours}h` : '1h 39m';

  const TIMELINE = [
    { icon: 'log-in-outline', color: theme.colors.brand.primary, bg: theme.colors.background.indigoTint, time: '08:02', label: 'Giờ vào · Face ID', loc: 'HCM · 45m' },
    { icon: 'restaurant-outline', color: theme.colors.status.warning, bg: theme.colors.status.warningBg, time: '12:00 – 13:00', label: 'Nghỉ trưa', loc: '1h' },
    { icon: 'time-outline', color: theme.colors.text.muted, bg: theme.colors.background.base, time: '—', label: 'Giờ ra 17:00', loc: 'Đang làm' },
  ];

  const INFO = [
    { label: 'Device', val: 'iPhone 14 Pro' },
    { label: 'Method', val: 'Face ID' },
    { label: 'IP Address', val: '192.168.1.42' },
    { label: 'Shift', val: 'Standard' },
  ];

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroRing1} />
        <View style={s.heroRing2} />
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Chi tiết chấm công</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.heroDate}>{heroDate}</Text>
        <Text style={s.heroDow}>{heroDow}</Text>
        <View style={s.heroStats}>
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : [
            { lbl: 'Vào lúc', val: inTime, sub: record?.status === 'late' ? 'Đi muộn' : 'Đúng giờ' },
            { lbl: 'Đã làm', val: workedTime, sub: record?.checkOut ? 'Hoàn thành' : 'Đang làm' },
            { lbl: 'Còn lại', val: record?.checkOut ? '0h 0m' : '7h 18m', sub: '17:00' },
          ].map((stat) => (
            <View key={stat.lbl} style={s.heroStat}>
              <Text style={s.heroStatLbl}>{stat.lbl}</Text>
              <Text style={s.heroStatVal}>{stat.val}</Text>
              <Text style={s.heroStatSub}>{stat.sub}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.statusRow}>
          <Text style={s.statusTitle}>Trạng thái</Text>
          <View style={s.badgeOk}><Text style={s.badgeOkText}>Đúng giờ</Text></View>
        </View>

        <View style={s.timeline}>
          {TIMELINE.map((item, i) => (
            <View key={item.label} style={s.tlItem}>
              <View style={[s.tlDot, { backgroundColor: item.bg }]}>
                <Icon name={item.icon} size={16} color={item.color} library="ionicons" />
              </View>
              {i < TIMELINE.length - 1 && <View style={s.tlLine} />}
              <View style={s.tlBody}>
                <Text style={s.tlTime}>{item.time}</Text>
                <Text style={s.tlLabel}>{item.label}</Text>
                <View style={s.tlLocRow}>
                  <Icon name="location-outline" size={11} color={theme.colors.text.muted} library="ionicons" />
                  <Text style={s.tlLoc}>{item.loc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={s.mapCard}>
          <View style={s.mapPlaceholder}>
            <Icon name="location" size={32} color={theme.colors.brand.primary} library="ionicons" />
          </View>
          <View style={s.mapInfo}>
            <Text style={s.mapName}>Địa điểm</Text>
            <Text style={s.mapDist}>✓ Trong phạm vi 100m</Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          {(record?.info || INFO).map((item: any) => (
            <View key={item.label} style={s.igItem}>
              <Text style={s.igLabel}>{item.label}</Text>
              <Text style={s.igVal}>{item.val}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.adjustBtn} activeOpacity={0.85}>
          <Icon name="create-outline" size={18} color={theme.colors.brand.primary} library="ionicons" />
          <Text style={s.adjustBtnText}>Tạo đơn điều chỉnh giờ</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, overflow: 'hidden' },
    heroRing1: {
      position: 'absolute', top: -80, right: -80,
      width: 220, height: 220, borderRadius: 110,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    heroRing2: {
      position: 'absolute', bottom: -40, left: -40,
      width: 160, height: 160, borderRadius: 80,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    heroDate: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
    heroDow: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
    heroStats: { flexDirection: 'row', gap: 8 },
    heroStat: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 10, padding: 12, alignItems: 'center',
    },
    heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
    heroStatVal: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
    heroStatSub: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
    content: { padding: 16 },
    statusRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 16, backgroundColor: t.colors.background.surface, borderRadius: 12,
      padding: 14, borderWidth: 1, borderColor: t.colors.border.default,
    },
    statusTitle: { fontSize: 14, fontWeight: '700', color: t.colors.text.primary },
    badgeOk: { backgroundColor: t.colors.status.successBg, borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 12 },
    badgeOkText: { fontSize: 12, fontWeight: '700', color: t.colors.status.success },
    timeline: {
      backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: t.colors.border.default, marginBottom: 12,
    },
    tlItem: { flexDirection: 'row', gap: 12, marginBottom: 16, position: 'relative' },
    tlDot: {
      width: 36, height: 36, borderRadius: 9999,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1,
    },
    tlLine: { position: 'absolute', left: 17, top: 36, width: 2, height: 20, backgroundColor: t.colors.border.default },
    tlBody: { flex: 1 },
    tlTime: { fontSize: 14, fontWeight: '700', color: t.colors.text.primary, marginBottom: 2 },
    tlLabel: { fontSize: 12, color: t.colors.text.secondary, marginBottom: 4 },
    tlLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tlLoc: { fontSize: 11, color: t.colors.text.muted },
    mapCard: {
      backgroundColor: t.colors.background.surface, borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: t.colors.border.default, marginBottom: 12,
    },
    mapPlaceholder: {
      height: 120, backgroundColor: t.colors.background.indigoTint,
      alignItems: 'center', justifyContent: 'center',
    },
    mapInfo: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 12, paddingHorizontal: 14,
    },
    mapName: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    mapDist: { fontSize: 12, fontWeight: '600', color: t.colors.status.success },
    infoGrid: {
      backgroundColor: t.colors.background.surface, borderRadius: 16,
      borderWidth: 1, borderColor: t.colors.border.default,
      padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12,
    },
    igItem: { width: '45%' },
    igLabel: { fontSize: 11, color: t.colors.text.muted, marginBottom: 4 },
    igVal: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    adjustBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, height: 50, borderRadius: 9999,
      backgroundColor: t.colors.background.indigoTint, borderWidth: 1.5, borderColor: t.colors.border.indigo,
    },
    adjustBtnText: { fontSize: 14, fontWeight: '700', color: t.colors.brand.primary },
  });
}
