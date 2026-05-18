import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { EmployeeTabParamList, RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { Icon } from '../../components/ui/Icon';
import { useSocket } from '../../context/SocketContext';
import { usePreferences } from '../../context/PreferencesContext';

// TanStack Query hooks
import { useLeaveBalance } from '../../hooks/useLeaveQueries';
import { useRecentAttendance, useAttendanceHistory } from '../../hooks/useAttendanceQueries';
import { useNotificationsList, useUnreadCount } from '../../hooks/useNotificationQueries';
import { useShiftSchedule } from '../../hooks/useShiftQueries';
import { queryKeys } from '../../hooks/queryKeys';

import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<EmployeeTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    cardBase: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginLeft: SPACING.sm,
    },
    activityTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: SPACING.xs / 2,
    },
    activityMeta: { fontSize: 12, color: colors.textSecondary },
    divider: { borderBottomColor: colors.separator },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: SPACING.xs },
    statPrimary: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: SPACING.xs / 2 },
    statSub: { fontSize: 11, color: colors.textSecondary },
    emptyText: { fontSize: 14, color: colors.textSecondary },
  });
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { notificationsEnabled } = usePreferences();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // ─── Date calculations for queries ──────────────────────────────
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // ─── TanStack Query hooks ───────────────────────────────────────
  const { data: leaveBalance, isLoading: isLeaveLoading } = useLeaveBalance();
  const { data: recentAttendance, isLoading: isAttendanceLoading, refetch: refetchAttendance } = useRecentAttendance(5);
  const { data: unreadData, refetch: refetchUnread } = useUnreadCount();
  const { data: notificationsData, refetch: refetchNotifications } = useNotificationsList({ limit: 3, unreadOnly: true });
  const { data: shiftData, isLoading: isShiftLoading } = useShiftSchedule(todayStr, nextWeekStr);
  const { data: monthlyAttendance } = useAttendanceHistory({ from: firstDayOfMonth, to: lastDayOfMonth, limit: 50 });

  const isLoading = isLeaveLoading || isAttendanceLoading;

  // ─── Computed: next shift ───────────────────────────────────────
  const nextShift = useMemo(() => {
    if (!Array.isArray(shiftData) || shiftData.length === 0) {
      return { day: '--', time: '--:-- - --:--' };
    }
    const upcoming = shiftData
      .filter((s: any) => s.date >= todayStr)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))[0];

    if (!upcoming) return { day: '--', time: '--:-- - --:--' };

    const shiftDate = new Date(upcoming.date + 'T00:00:00');
    const dayName = t.schedule.daysOfWeek[shiftDate.getDay()];
    const startTime = upcoming.startTime || '--:--';
    const endTime = upcoming.endTime || '--:--';
    return { day: dayName, time: `${startTime} - ${endTime}` };
  }, [shiftData, todayStr, t.schedule.daysOfWeek]);

  // ─── Computed: monthly attendance count ─────────────────────────
  const attendanceThisMonth = useMemo(() => {
    const records = (monthlyAttendance as any)?.records || monthlyAttendance;
    if (!Array.isArray(records)) return 0;
    return records.filter((r: any) =>
      r.status === 'present' || r.status === 'ontime' || r.status === 'late'
    ).length;
  }, [monthlyAttendance]);

  const stats = useMemo(() => ({
    leavesRemaining: (leaveBalance as any)?.annual?.remaining || 0,
    totalLeaves: (leaveBalance as any)?.annual?.total || 12,
    overtimeHours: 0,
    thisMonth: attendanceThisMonth,
    totalDays: totalDaysInMonth,
  }), [leaveBalance, attendanceThisMonth, totalDaysInMonth]);

  const unreadCount = (unreadData as any)?.count ?? 0;

  const isCheckedIn = useMemo(() => {
    if (!Array.isArray(recentAttendance) || recentAttendance.length === 0) return false;
    const latest = recentAttendance[0] as any;
    return !!latest && !!latest.checkIn && !latest.checkOut;
  }, [recentAttendance]);

  const activities = useMemo(() => {
    if (!Array.isArray(recentAttendance)) return [];
    return recentAttendance.map((item: any) => {
      const hasCheckOut = !!item.checkOut;
      return {
        id: item._id || item.id || Math.random().toString(),
        type: hasCheckOut ? 'check-out' : 'check-in',
        time: hasCheckOut ? item.checkOut : (item.checkIn || '--:--'),
        date: item.date || '--/--/----',
        status: item.status === 'late' ? 'warning' : 'success',
        title: hasCheckOut ? t.attendance.checkOut : t.attendance.checkIn,
        subtitle: hasCheckOut ? t.dashboard.workingSubtitle : t.dashboard.readySubtitle,
      };
    });
  }, [recentAttendance, t]);

  // ─── Pull-to-refresh ────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchAttendance(),
      refetchUnread(),
      refetchNotifications(),
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.balance() }),
    ]);
    setRefreshing(false);
  }, [refetchAttendance, refetchUnread, refetchNotifications, queryClient]);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.recent(5) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    }, [queryClient])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.dashboard.greetingMorning;
    if (hour < 18) return t.dashboard.greetingAfternoon;
    return t.dashboard.greetingEvening;
  };

  const userName = user?.name;
  const userAvatar = user?.avatar;
  const greeting = getGreeting();

  const [isProcessing] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (data: any) => {
      if (!notificationsEnabled) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };
    const handleAttendanceUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    };
    socket.on('notification', handleNewNotification);
    socket.on('attendance-updated', handleAttendanceUpdate);
    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('attendance-updated', handleAttendanceUpdate);
    };
  }, [socket, notificationsEnabled, queryClient]);

  const handleCheckInOut = () => {
    const mode = isCheckedIn ? 'check-out' : 'check-in';
    navigation.navigate('Attendance', { mode });
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const cardWidth = (width - SPACING.lg * 3) / 2;

  const statusColorMap: { [key: string]: string } = {
    success: COLORS.accent.green,
    info: COLORS.primary,
    warning: COLORS.accent.yellow,
    error: COLORS.accent.red,
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: SPACING.xxl * 2,
            paddingBottom: SPACING.xl + 20,
            paddingHorizontal: SPACING.lg,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', top: 0, right: 0, width: 256, height: 256, borderRadius: 128, backgroundColor: 'rgba(34, 211, 238, 0.2)' }} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, width: 192, height: 192, borderRadius: 96, backgroundColor: 'rgba(66, 69, 240, 0.3)' }} />

          <View style={{ position: 'relative', zIndex: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ position: 'relative', marginRight: SPACING.md }}>
                  {userAvatar ? (
                    <Image
                      source={{ uri: userAvatar }}
                      style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#ffffff', ...SHADOWS.lg }}
                    />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffffff', ...SHADOWS.lg }}>
                      <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>
                        {userName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.accent.green, borderWidth: 2, borderColor: COLORS.primary, ...SHADOWS.md }} />
                </View>
                <View>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>{t.dashboard.greeting},</Text>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>{userName}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleNotificationPress}
                style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center', ...SHADOWS.lg, position: 'relative' }}
              >
                <Icon name="notifications" size={20} color="#ffffff" />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.accent.red, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, ...SHADOWS.md }}>
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View>
              <Text style={{ fontSize: 24, fontWeight: '600', color: '#ffffff', marginBottom: SPACING.xs }}>{greeting}</Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>{t.dashboard.subtitle}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.md }}>

          {/* Check In/Out Widget */}
          <LinearGradient
            colors={isCheckedIn ? [COLORS.accent.red, '#b91c1c'] : [COLORS.accent.green, '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.md }}
          >
            <View style={{ marginBottom: SPACING.lg }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: SPACING.xs }}>
                {isCheckedIn ? t.dashboard.working : t.dashboard.ready}
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' }}>
                {isCheckedIn ? t.dashboard.workingSubtitle : t.dashboard.readySubtitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCheckInOut}
              disabled={isProcessing}
              activeOpacity={0.8}
              style={{ backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={isCheckedIn ? COLORS.accent.red : COLORS.accent.green} />
              ) : (
                <>
                  <Icon name={isCheckedIn ? 'logout' : 'login'} size={24} color={isCheckedIn ? COLORS.accent.red : COLORS.accent.green} />
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: isCheckedIn ? COLORS.accent.red : COLORS.accent.green, marginLeft: SPACING.sm }}>
                    {isCheckedIn ? t.dashboard.checkout : t.dashboard.checkin}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>

          {/* Stats Cards */}
          {isLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.lg }}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.cardBase, { width: cardWidth, marginRight: i % 2 === 0 ? 0 : SPACING.md, marginBottom: SPACING.md }]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.lg }}>
                {/* Leaves Remaining */}
                <View style={[styles.cardBase, { width: cardWidth, marginRight: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.md }]}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(34, 197, 94, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm }}>
                    <Icon name="event" size={20} color={COLORS.accent.green} />
                  </View>
                  <Text style={styles.statLabel}>{t.dashboard.stats.leaves}</Text>
                  <Text style={styles.statPrimary}>{stats.leavesRemaining}</Text>
                  <Text style={styles.statSub}>{t.dashboard.stats.leaveDays}</Text>
                </View>

                {/* Next Shift */}
                <View style={[styles.cardBase, { width: cardWidth, marginBottom: SPACING.md, ...SHADOWS.md }]}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(66, 69, 240, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm }}>
                    <Icon name="schedule" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.statLabel}>{t.dashboard.stats.nextShift}</Text>
                  <Text style={[styles.statPrimary, { fontSize: 18 }]}>{isShiftLoading ? '...' : nextShift.day}</Text>
                  <Text style={styles.statSub}>{isShiftLoading ? '...' : nextShift.time}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.xl }}>
                {/* Attendance This Month */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('AttendanceHistory')}
                  style={[styles.cardBase, { width: cardWidth, marginRight: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.md }]}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(34, 211, 238, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm }}>
                    <Icon name="check_circle" size={20} color={COLORS.accent.cyan} />
                  </View>
                  <Text style={styles.statLabel}>{t.dashboard.stats.attendance}</Text>
                  <Text style={styles.statPrimary}>{stats.thisMonth}/{stats.totalDays}</Text>
                  <Text style={styles.statSub}>{t.dashboard.stats.details}</Text>
                </TouchableOpacity>

                {/* Overtime */}
                <View style={[styles.cardBase, { width: cardWidth, marginBottom: SPACING.md, ...SHADOWS.md }]}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm }}>
                    <Icon name="bolt" size={20} color={COLORS.accent.yellow} />
                  </View>
                  <Text style={styles.statLabel}>{t.dashboard.stats.overtime}</Text>
                  <Text style={styles.statPrimary}>{stats.overtimeHours}</Text>
                  <Text style={styles.statSub}>{t.dashboard.stats.overtimeHours}</Text>
                </View>
              </View>
            </>
          )}

          {/* Recent Activities */}
          <View style={{ marginBottom: SPACING.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <Icon name="trending_up" size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>{t.dashboard.recentActivity}</Text>
            </View>
            <View style={[styles.cardBase, { ...SHADOWS.md }]}>
              {activities.length === 0 ? (
                <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
                  <Text style={styles.emptyText}>{t.dashboard.noActivity}</Text>
                </View>
              ) : (
                <View>
                  {activities.map((activity, index) => {
                    const statusColor = statusColorMap[activity.status] || COLORS.primary;
                    return (
                      <TouchableOpacity
                        key={activity.id ?? index}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: index < activities.length - 1 ? 1 : 0, borderBottomColor: colors.separator }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, marginRight: SPACING.md }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityTitle}>{activity.title}</Text>
                          <Text style={styles.activityMeta}>{activity.time} • {activity.date}</Text>
                        </View>
                        <Icon name="chevron_right" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
