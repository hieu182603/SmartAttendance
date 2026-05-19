import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { EmployeeTabParamList, RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/ui/Icon';
import { useSocket } from '../../context/SocketContext';
import { usePreferences } from '../../context/PreferencesContext';


import { useRecentAttendance, useAttendanceHistory } from '../../hooks/useAttendanceQueries';
import { useUnreadCount } from '../../hooks/useNotificationQueries';
import { useShiftSchedule } from '../../hooks/useShiftQueries';
import { queryKeys } from '../../hooks/queryKeys';

import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { useTheme, Theme } from '../../theme';

type DashboardNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<EmployeeTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function fmtDuration(ms: number) {
  const tot = Math.floor(ms / 60000);
  return `${Math.floor(tot / 60)}h ${tot % 60}m`;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<DashboardNavProp>();
  const { notificationsEnabled } = usePreferences();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const { socket } = useSocket();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  // Live clock — updates every 30s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = now.toISOString().split('T')[0];
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const { data: recentAttendance, isLoading: isAttendanceLoading, refetch: refetchAttendance } = useRecentAttendance(5);
  const { data: unreadData, refetch: refetchUnread } = useUnreadCount();
  const { data: shiftData } = useShiftSchedule(todayStr, nextWeekStr);
  const { data: monthlyAttendance } = useAttendanceHistory({ from: firstDayOfMonth, to: lastDayOfMonth, limit: 50 });

  const unreadCount = (unreadData as any)?.count ?? 0;

  // Today's shift
  const todayShift = useMemo(() => {
    if (!Array.isArray(shiftData)) return null;
    return shiftData.find((s: any) => s.date === todayStr) ?? null;
  }, [shiftData, todayStr]);

  const shiftStart = todayShift?.startTime ?? '08:00';
  const shiftEnd = todayShift?.endTime ?? '17:00';

  // Check-in state
  const latestRecord = useMemo(() => {
    if (!Array.isArray(recentAttendance) || recentAttendance.length === 0) return null;
    return recentAttendance[0] as any;
  }, [recentAttendance]);

  const isCheckedIn = !!(latestRecord?.checkIn && !latestRecord?.checkOut);

  const checkInTimeStr = useMemo(() => {
    if (!latestRecord?.checkIn) return '--:--';
    try {
      const d = new Date(latestRecord.checkIn);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch { return '--:--'; }
  }, [latestRecord]);

  const workedStr = useMemo(() => {
    if (!latestRecord?.checkIn) return '--';
    try {
      const checkin = new Date(latestRecord.checkIn);
      return fmtDuration(Math.max(0, now.getTime() - checkin.getTime()));
    } catch { return '--'; }
  }, [latestRecord, now]);

  const remainingStr = useMemo(() => {
    const [hEnd, mEnd] = shiftEnd.split(':').map(Number);
    const endOfShift = new Date(now);
    endOfShift.setHours(hEnd, mEnd, 0, 0);
    return fmtDuration(Math.max(0, endOfShift.getTime() - now.getTime()));
  }, [shiftEnd, now]);

  // Monthly stats
  const attendanceThisMonth = useMemo(() => {
    const records = (monthlyAttendance as any)?.records ?? monthlyAttendance;
    if (!Array.isArray(records)) return 0;
    return records.filter((r: any) => ['present', 'ontime', 'late'].includes(r.status)).length;
  }, [monthlyAttendance]);

  const workedHoursThisMonth = useMemo(() => {
    const records = (monthlyAttendance as any)?.records ?? monthlyAttendance;
    if (!Array.isArray(records)) return 0;
    return records.reduce((sum: number, r: any) => {
      if (r.checkIn && r.checkOut) {
        const diff = (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3_600_000;
        return sum + diff;
      }
      return sum;
    }, 0);
  }, [monthlyAttendance]);

  // Activity list from recentAttendance
  const activities = useMemo(() => {
    if (!Array.isArray(recentAttendance)) return [];
    return recentAttendance.slice(0, 3).map((item: any) => {
      const hasCheckOut = !!item.checkOut;
      const isLate = item.status === 'late';
      const timeStr = hasCheckOut
        ? new Date(item.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : item.checkIn
        ? new Date(item.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '--:--';
      return {
        id: item._id || item.id || Math.random().toString(),
        type: hasCheckOut ? 'checkout' : 'checkin',
        iconType: isLate ? 'orange' : hasCheckOut ? 'green' : 'blue',
        title: hasCheckOut ? 'Check-out' : 'Check-in thành công',
        sub: item.locationName ?? (item.date ?? ''),
        time: timeStr,
        badge: isLate ? { label: 'Đi muộn', color: 'orange' } : null,
      };
    });
  }, [recentAttendance]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchAttendance(),
      refetchUnread(),
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.balance() }),
    ]);
    setRefreshing(false);
  }, [refetchAttendance, refetchUnread, queryClient]);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.recent(5) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    }, [queryClient])
  );

  useEffect(() => {
    if (!socket) return;
    const handleNotification = () => {
      if (!notificationsEnabled) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };
    const handleAttendance = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    };
    socket.on('notification', handleNotification);
    socket.on('attendance-updated', handleAttendance);
    return () => {
      socket.off('notification', handleNotification);
      socket.off('attendance-updated', handleAttendance);
    };
  }, [socket, notificationsEnabled, queryClient]);

  const clockStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${DAYS_VI[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
  const userName = user?.name ?? '';
  const userInitials = userName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase() || 'HN';

  const monthLabel = `Tháng ${now.getMonth() + 1} / ${now.getFullYear()}`;

  const quickActions = [
    { icon: 'calendar-outline', bg: theme.colors.background.indigoTint, color: theme.colors.brand.primary, label: 'Xin nghỉ phép', onPress: () => navigation.navigate('Requests', { openCreateModal: true } as any) },
    { icon: 'time-outline', bg: theme.colors.status.warningBg, color: theme.colors.status.warning, label: 'Đăng ký OT', onPress: () => navigation.navigate('Requests', { openCreateModal: true } as any) },
    { icon: 'desktop-outline', bg: theme.colors.status.successBg, color: theme.colors.status.success, label: 'Làm remote', onPress: () => navigation.navigate('Requests', { openCreateModal: true } as any) },
    { icon: 'document-text-outline', bg: theme.colors.status.dangerBg, color: theme.colors.status.danger, label: 'Đơn điều chỉnh', onPress: () => navigation.navigate('Requests', { openCreateModal: true } as any) },
  ];

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand.primary} colors={[theme.colors.brand.primary]} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Xin chào</Text>
            <Text style={s.userName}>{userName}</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
              <View style={s.notifBellWrap}>
                <Icon name="notifications-outline" size={16} color={theme.colors.brand.primaryHover} library="ionicons" />
                {unreadCount > 0 && (
                  <View style={s.notifBadge}>
                    <Text style={s.notifBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{userInitials}</Text>
            </View>
          </View>
        </View>

        {/* Hero Card */}
        <LinearGradient
          colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroDecor1} />
          <View style={s.heroDecor2} />

          <View style={s.heroTop}>
            <View>
              <Text style={s.heroShiftLabel}>Ca làm việc hôm nay</Text>
              <Text style={s.heroShiftTime}>{shiftStart} – {shiftEnd}</Text>
            </View>
            <View style={s.workingBadge}>
              <View style={s.workingDot} />
              <Text style={s.workingBadgeText}>{isCheckedIn ? 'Đang làm việc' : 'Chưa check-in'}</Text>
            </View>
          </View>

          <View style={s.heroClock}>
            <Text style={s.heroTime}>{clockStr}</Text>
            <Text style={s.heroDate}>{dateStr}</Text>
          </View>

          <View style={s.heroStats}>
            {[
              { label: 'Vào lúc', value: checkInTimeStr },
              { label: 'Đã làm', value: workedStr },
              { label: 'Còn lại', value: remainingStr },
            ].map((stat) => (
              <View key={stat.label} style={s.heroStat}>
                <Text style={s.heroStatLabel}>{stat.label}</Text>
                <Text style={s.heroStatValue}>{stat.value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={s.checkoutBtn}
            onPress={() => navigation.navigate('Attendance', { mode: isCheckedIn ? 'check-out' : 'check-in' })}
            activeOpacity={0.85}
          >
            <Icon name={isCheckedIn ? 'log-out-outline' : 'log-in-outline'} size={18} color={theme.colors.brand.primaryHover} library="ionicons" />
            <Text style={s.checkoutBtnText}>{isCheckedIn ? 'Check-out khi kết thúc' : 'Check-in ngay'}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Thao tác nhanh</Text>
        </View>
        <View style={s.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.label} style={s.actionItem} onPress={action.onPress} activeOpacity={0.7}>
              <View style={[s.actionIcon, { backgroundColor: action.bg }]}>
                <Icon name={action.icon} size={20} color={action.color} library="ionicons" />
              </View>
              <Text style={s.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monthly Stats */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AttendanceHistory')} activeOpacity={0.7}>
            <Text style={s.sectionLink}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>

        {isAttendanceLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator size="small" color={theme.colors.brand.primary} />
          </View>
        ) : (
          <View style={s.statsGrid}>
            <View style={s.statCard}>
              <View style={[s.statCardBadge, { backgroundColor: theme.colors.background.indigoTint }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: theme.colors.brand.primaryHover }}>+{Math.max(0, attendanceThisMonth - Math.round(attendanceThisMonth * 0.9))}</Text>
              </View>
              <Icon name="calendar-outline" size={18} color={theme.colors.brand.primary} library="ionicons" />
              <Text style={s.statCardValue}>{attendanceThisMonth}</Text>
              <Text style={s.statCardLabel}>Ngày đi làm</Text>
              <View style={s.statBar}>
                <View style={[s.statBarFill, { width: `${Math.min(100, (attendanceThisMonth / totalDaysInMonth) * 100)}%`, backgroundColor: theme.colors.brand.primary }]} />
              </View>
            </View>

            <View style={s.statCard}>
              <View style={[s.statCardBadge, { backgroundColor: theme.colors.status.warningBg }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: theme.colors.status.warning }}>1 muộn</Text>
              </View>
              <Icon name="time-outline" size={18} color={theme.colors.status.success} library="ionicons" />
              <Text style={s.statCardValue}>{Math.round(workedHoursThisMonth)}h</Text>
              <Text style={s.statCardLabel}>Giờ làm việc</Text>
              <View style={s.statBar}>
                <View style={[s.statBarFill, { width: `${Math.min(100, (workedHoursThisMonth / (totalDaysInMonth * 8)) * 100)}%`, backgroundColor: theme.colors.status.success }]} />
              </View>
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Hoạt động gần đây</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AttendanceHistory')} activeOpacity={0.7}>
            <Text style={s.sectionLink}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={s.activityList}>
          {activities.length === 0 ? (
            <View style={[s.activityItem, { justifyContent: 'center' }]}>
              <Text style={{ fontSize: 13, color: theme.colors.text.muted }}>Chưa có hoạt động hôm nay</Text>
            </View>
          ) : (
            activities.map((a) => (
              <View key={a.id} style={s.activityItem}>
                <View style={[s.activityIcon, a.iconType === 'blue' && s.activityIconBlue, a.iconType === 'green' && s.activityIconGreen, a.iconType === 'orange' && s.activityIconOrange]}>
                  <Icon
                    name={a.type === 'checkout' ? 'log-out-outline' : a.iconType === 'orange' ? 'time-outline' : 'log-in-outline'}
                    size={17}
                    color={a.iconType === 'blue' ? theme.colors.brand.primary : a.iconType === 'green' ? theme.colors.status.success : theme.colors.status.warning}
                    library="ionicons"
                  />
                </View>
                <View style={s.activityBody}>
                  <Text style={s.activityTitle}>{a.title}</Text>
                  <Text style={s.activitySub}>{a.sub}</Text>
                </View>
                <View style={s.activityMeta}>
                  <Text style={s.activityTime}>{a.time}</Text>
                  {a.badge && (
                    <View style={[s.badge, a.badge.color === 'orange' ? s.badgeOrange : s.badgeGreen]}>
                      <Text style={[s.badgeText, a.badge.color === 'orange' ? s.badgeTextOrange : s.badgeTextGreen]}>{a.badge.label}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    },
    greeting: { fontSize: 13, color: t.colors.text.muted, fontWeight: '400', marginBottom: 2 },
    userName: { fontSize: 22, fontWeight: '700', color: t.colors.text.primary, letterSpacing: -0.4 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    notifBtn: {
      width: 40, height: 40, borderRadius: 9999,
      borderWidth: 1, borderColor: t.colors.border.default,
      backgroundColor: t.colors.background.surface,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
    },
    notifBellWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.background.indigoTint, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    notifBadge: {
      position: 'absolute', top: -2, right: -2,
      minWidth: 16, height: 16, borderRadius: 8,
      backgroundColor: t.colors.status.danger, borderWidth: 1.5, borderColor: t.colors.background.surface,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    },
    notifBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: t.colors.brand.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
    },
    avatarText: { fontSize: 17, fontWeight: '700', color: '#fff' },

    // Hero card
    heroCard: {
      marginHorizontal: 16, marginBottom: 20, borderRadius: 24,
      padding: 18, overflow: 'hidden',
      shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
    },
    heroDecor1: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' },
    heroDecor2: { position: 'absolute', bottom: -30, left: 30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    heroShiftLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
    heroShiftTime: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    workingBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
      borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 10,
    },
    workingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: t.colors.brand.secondary },
    workingBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    heroClock: { alignItems: 'center', marginBottom: 4 },
    heroTime: { fontSize: 52, fontWeight: '800', color: '#fff', letterSpacing: -2, lineHeight: 56 },
    heroDate: { fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: '400', marginTop: 4 },
    heroStats: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 16 },
    heroStat: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
      paddingVertical: 10, alignItems: 'center',
    },
    heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginBottom: 3 },
    heroStatValue: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    checkoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: 48, borderRadius: 9999,
      backgroundColor: 'rgba(255,255,255,0.95)',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
    },
    checkoutBtnText: { fontSize: 15, fontWeight: '600', color: t.colors.brand.primaryHover },

    // Quick actions
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: t.colors.text.primary, letterSpacing: -0.2 },
    sectionLink: { fontSize: 13, fontWeight: '500', color: t.colors.brand.primary },
    quickActions: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 24,
    },
    actionItem: {
      flex: 1, alignItems: 'center', gap: 8, backgroundColor: t.colors.background.surface,
      borderRadius: 12, paddingVertical: 14,
      borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    actionIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 11, fontWeight: '500', color: t.colors.text.secondary, textAlign: 'center', lineHeight: 14 },

    // Monthly stats
    statsGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 24 },
    statCard: {
      flex: 1, backgroundColor: t.colors.background.surface, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: t.colors.border.default, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    statCardBadge: {
      position: 'absolute', top: 12, right: 12,
      paddingVertical: 2, paddingHorizontal: 7, borderRadius: 9999,
    },
    statCardValue: { fontSize: 28, fontWeight: '800', color: t.colors.text.primary, letterSpacing: -1, lineHeight: 32, marginTop: 8, marginBottom: 2 },
    statCardLabel: { fontSize: 12, color: t.colors.text.muted, marginBottom: 10 },
    statBar: { height: 4, borderRadius: 9999, backgroundColor: t.colors.background.base, overflow: 'hidden' },
    statBarFill: { height: '100%', borderRadius: 9999 },

    // Activity
    activityList: { paddingHorizontal: 16, gap: 8, flexDirection: 'column', marginBottom: 8 },
    activityItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: t.colors.background.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
      marginBottom: 8,
    },
    activityIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    activityIconBlue: { backgroundColor: t.colors.background.indigoTint },
    activityIconGreen: { backgroundColor: t.colors.status.successBg },
    activityIconOrange: { backgroundColor: t.colors.status.warningBg },
    activityBody: { flex: 1, minWidth: 0 },
    activityTitle: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary, marginBottom: 2 },
    activitySub: { fontSize: 11, color: t.colors.text.muted, overflow: 'hidden' },
    activityMeta: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    activityTime: { fontSize: 12, fontWeight: '600', color: t.colors.text.secondary },
    badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 9999 },
    badgeGreen: { backgroundColor: t.colors.status.successBg },
    badgeOrange: { backgroundColor: t.colors.status.warningBg },
    badgeText: { fontSize: 10, fontWeight: '600' },
    badgeTextGreen: { color: t.colors.status.success },
    badgeTextOrange: { color: t.colors.status.warning },
  });
}
