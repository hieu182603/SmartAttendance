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
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useAttendanceHistory } from '../../hooks/useAttendanceQueries';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'AttendanceDetail'>;
  route: RouteProp<RootStackParamList, 'AttendanceDetail'>;
};

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: {
      paddingTop: 56,
      paddingBottom: 24,
      paddingHorizontal: 20,
      overflow: 'hidden',
    },
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    heroDate: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
    heroDow: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
    heroStats: { flexDirection: 'row', gap: 8 },
    heroStat: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
    heroStatVal: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
    heroStatSub: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
    content: { padding: 16 },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    badgeOk: { backgroundColor: '#dcfce7', borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 12 },
    badgeOkText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
    // Timeline
    timeline: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    tlItem: { flexDirection: 'row', gap: 12, marginBottom: 16, position: 'relative' },
    tlDot: {
      width: 36, height: 36, borderRadius: 9999,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1,
    },
    tlLine: {
      position: 'absolute', left: 17, top: 36,
      width: 2, height: 20, backgroundColor: colors.border,
    },
    tlBody: { flex: 1 },
    tlTime: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    tlLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    tlLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tlLoc: { fontSize: 11, color: colors.textMuted },
    // Map
    mapCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    mapPlaceholder: {
      height: 120,
      backgroundColor: '#e8eaf6',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    mapGrid: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'transparent',
    },
    mapInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      paddingHorizontal: 14,
    },
    mapName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    mapDist: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
    // Info grid
    infoGrid: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 12,
    },
    igItem: { width: '45%' },
    igLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
    igVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    // Adjust button
    adjustBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: 9999,
      backgroundColor: '#EEF1FF',
      borderWidth: 1.5,
      borderColor: '#c7d2fe',
    },
    adjustBtnText: { fontSize: 14, fontWeight: '700', color: '#4F6EF7' },
  });
}

export default function AttendanceDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { recordId } = route.params || {};
  const { data: historyData, isLoading } = useAttendanceHistory();
  const record = historyData?.data?.find((r: any) => r.id === recordId || r._id === recordId);

  const heroDate = record?.date || 'Wed, 23/04/2025';
  const heroDow = record?.shift || '08:00 – 17:00';

  const inTime = record?.checkIn || '08:02';
  const workedTime = record?.totalHours ? `${record.totalHours}h` : '1h 39m';

  const TIMELINE = [
    { icon: 'log-in-outline', color: '#4F6EF7', bg: '#EEF1FF', time: '08:02', label: `${t.attendance.checkIn} · Face ID`, loc: 'HCM · 45m' },
    { icon: 'restaurant-outline', color: '#d97706', bg: '#fef3c7', time: '12:00 – 13:00', label: 'Lunch break', loc: '1h' },
    { icon: 'time-outline', color: colors.textMuted, bg: colors.separator, time: '—', label: `${t.attendance.checkOut} 17:00`, loc: t.attendanceDetail.inProgress },
  ];

  const INFO = [
    { label: 'Device', val: 'iPhone 14 Pro' },
    { label: 'Method', val: 'Face ID' },
    { label: 'IP Address', val: '192.168.1.42' },
    { label: 'Shift', val: 'Standard' },
  ];

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={['#4f6ef7', '#7c5cbf']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRing1} />
        <View style={styles.heroRing2} />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t.attendanceDetail.title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.heroDate}>{heroDate}</Text>
        <Text style={styles.heroDow}>{heroDow}</Text>
        <View style={styles.heroStats}>
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : [
            { lbl: t.attendanceDetail.checkIn, val: inTime, sub: record?.status === 'late' ? t.attendanceDetail.late : t.attendanceDetail.onTime },
            { lbl: t.attendanceDetail.worked, val: workedTime, sub: record?.checkOut ? t.attendanceDetail.completed : t.attendanceDetail.inProgress },
            { lbl: t.attendanceDetail.remaining, val: record?.checkOut ? '0h 0m' : '7h 18m', sub: '17:00' },
          ].map((s) => (
            <View key={s.lbl} style={styles.heroStat}>
              <Text style={styles.heroStatLbl}>{s.lbl}</Text>
              <Text style={styles.heroStatVal}>{s.val}</Text>
              <Text style={styles.heroStatSub}>{s.sub}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={styles.statusRow}>
          <Text style={styles.statusTitle}>{t.attendance.status}</Text>
          <View style={styles.badgeOk}>
            <Text style={styles.badgeOkText}>{t.attendanceDetail.onTime}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {TIMELINE.map((item, i) => (
            <View key={item.label} style={styles.tlItem}>
              <View style={[styles.tlDot, { backgroundColor: item.bg }]}>
                <Icon name={item.icon} size={16} color={item.color} library="ionicons" />
              </View>
              {i < TIMELINE.length - 1 && <View style={styles.tlLine} />}
              <View style={styles.tlBody}>
                <Text style={styles.tlTime}>{item.time}</Text>
                <Text style={styles.tlLabel}>{item.label}</Text>
                <View style={styles.tlLocRow}>
                  <Icon name="location-outline" size={11} color={colors.textMuted} library="ionicons" />
                  <Text style={styles.tlLoc}>{item.loc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Map placeholder */}
        <View style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapGrid} />
            <Icon name="location" size={32} color="#4F6EF7" library="ionicons" />
          </View>
          <View style={styles.mapInfo}>
            <Text style={styles.mapName}>{t.attendanceDetail.location}</Text>
            <Text style={styles.mapDist}>✓ {t.attendanceDetail.within}</Text>
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          {(record?.info || INFO).map((item: any) => (
            <View key={item.label} style={styles.igItem}>
              <Text style={styles.igLabel}>{item.label}</Text>
              <Text style={styles.igVal}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* Adjust button */}
        <TouchableOpacity style={styles.adjustBtn} activeOpacity={0.85}>
          <Icon name="create-outline" size={18} color="#4F6EF7" library="ionicons" />
          <Text style={styles.adjustBtnText}>{t.attendanceDetail.adjustRequest}</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
