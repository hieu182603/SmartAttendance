import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, AdminTabParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useAdminStats } from '../../hooks/useAdminQueries';
import { useUnreadCount } from '../../hooks/useNotificationQueries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/queryKeys';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';

type Props = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabParamList, 'AdminDashboard'>,
  StackNavigationProp<RootStackParamList>
>;

const AVA_COLORS = ['#4F6EF7', '#16a34a', '#f97316', '#d97706', '#ec4899'];

export default function AdminDashboardScreen({ navigation }: { navigation: Props }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const { data: statsData, isLoading } = useAdminStats();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = (unreadData as any)?.count ?? 0;

  const onRefresh = () => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() }).finally(() => setRefreshing(false));
  };

  const totalEmployees = statsData?.counts?.users ?? statsData?.kpi?.totalEmployees ?? 0;
  const pendingRequests = statsData?.pendingRequests ?? 0;
  const systemIssues = statsData?.counts?.logs ? 0 : 0; // surface real issues when API provides them

  const presentToday = statsData?.attendanceToday?.present ?? statsData?.kpi?.presentToday ?? 0;
  const lateToday = statsData?.attendanceToday?.late ?? statsData?.kpi?.lateToday ?? 0;
  const absentToday = statsData?.attendanceToday?.absent ?? statsData?.kpi?.absentToday ?? 0;

  const onTimeRate = totalEmployees > 0
    ? Math.round(((presentToday) / totalEmployees) * 100)
    : 94;

  const userName = user?.name || 'Admin';
  const monthLabel = new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Hero */}
        <LinearGradient
          colors={['#4c1d95', '#6d28d9', '#7c3aed']}
          locations={[0, 0.45, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroGreet}>Quản trị hệ thống</Text>
              <Text style={s.heroName}>{userName}</Text>
            </View>
            <View style={s.heroRight}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                style={s.notifBtn}
              >
                <Icon name="notifications-outline" size={20} color="#fff" library="ionicons" />
                {unreadCount > 0 && (
                  <View style={s.notifBadge}>
                    <Text style={s.notifBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={s.adminBadge}>
                <Text style={s.adminBadgeText}>Admin</Text>
              </View>
            </View>
          </View>

          {/* 3 stat boxes */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statVal}>{isLoading ? '—' : totalEmployees}</Text>
              <Text style={s.statLabel}>Tổng nhân viên</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statVal, s.statWarn]}>{isLoading ? '—' : pendingRequests}</Text>
              <Text style={s.statLabel}>Chờ duyệt</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statVal, s.statRed]}>{isLoading ? '—' : systemIssues}</Text>
              <Text style={s.statLabel}>Vấn đề hệ thống</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={s.body}>
          {/* Quick actions 3-column (2 rows) */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Quản lý nhanh</Text>
          </View>
          <View style={s.quickRow}>
            <TouchableOpacity style={[s.qaItem, s.qaFlex]} onPress={() => navigation.navigate('AdminUsers')}>
              <View style={[s.qaIcon, { backgroundColor: '#ede9fe' }]}>
                <Icon name="people-outline" size={22} color="#7c3aed" library="ionicons" />
              </View>
              <Text style={s.qaLabel}>Nhân viên</Text>
            </TouchableOpacity>

            <View style={s.qaWrap}>
              <TouchableOpacity style={s.qaItem} onPress={() => navigation.navigate('AdminApprovals' as any)}>
                <View style={[s.qaIcon, { backgroundColor: '#fef2f2' }]}>
                  <Icon name="document-text-outline" size={22} color="#ef4444" library="ionicons" />
                </View>
                <Text style={s.qaLabel}>Duyệt đơn</Text>
              </TouchableOpacity>
              {pendingRequests > 0 && (
                <View style={s.qaBadge}>
                  <Text style={s.qaBadgeText}>{pendingRequests}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[s.qaItem, s.qaFlex]} onPress={() => navigation.navigate('AdminReports')}>
              <View style={[s.qaIcon, { backgroundColor: '#dcfce7' }]}>
                <Icon name="cash-outline" size={22} color="#16a34a" library="ionicons" />
              </View>
              <Text style={s.qaLabel}>Bảng lương</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.quickRow, { marginBottom: 4 }]}>
            <TouchableOpacity style={[s.qaItem, s.qaFlex]} onPress={() => navigation.navigate('AdminDepartments' as any)}>
              <View style={[s.qaIcon, { backgroundColor: '#f0fdf4' }]}>
                <Icon name="business-outline" size={22} color="#16a34a" library="ionicons" />
              </View>
              <Text style={s.qaLabel}>Phòng ban</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.qaItem, s.qaFlex]} onPress={() => navigation.navigate('AdminAudit')}>
              <View style={[s.qaIcon, { backgroundColor: '#fef3c7' }]}>
                <Icon name="receipt-outline" size={22} color="#b45309" library="ionicons" />
              </View>
              <Text style={s.qaLabel}>Nhật ký</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.qaItem, s.qaFlex]} onPress={() => navigation.navigate('AdminUsers')}>
              <View style={[s.qaIcon, { backgroundColor: '#eef1ff' }]}>
                <Icon name="search-outline" size={22} color="#4f6ef7" library="ionicons" />
              </View>
              <Text style={s.qaLabel}>Tìm kiếm</Text>
            </TouchableOpacity>
          </View>

          {/* KPI overview */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Tổng quan tháng {monthLabel}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiRow}>
              <View style={s.kpiCell}>
                <Text style={[s.kpiVal, { color: '#16a34a' }]}>{onTimeRate}%</Text>
                <Text style={s.kpiLbl}>Tỉ lệ đúng giờ</Text>
              </View>
              <View style={[s.kpiCell, s.kpiCellBorder]}>
                <Text style={[s.kpiVal, { color: '#d97706' }]}>{lateToday}</Text>
                <Text style={s.kpiLbl}>Nghỉ phép</Text>
              </View>
              <View style={s.kpiCell}>
                <Text style={[s.kpiVal, { color: '#7c3aed' }]}>{statsData?.kpi?.overtime ?? 0}</Text>
                <Text style={s.kpiLbl}>Tăng ca</Text>
              </View>
            </View>
            <View style={s.kpiSub}>
              <Text style={s.kpiSubLabel}>Tổng giờ làm tháng này</Text>
              <Text style={s.kpiSubVal}>{statsData?.kpi?.totalHours ?? '—'} giờ</Text>
            </View>
          </View>

          {/* Payroll mini */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Lương tháng này</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminReports')}>
              <Text style={s.secLink}>Chi tiết</Text>
            </TouchableOpacity>
          </View>
          <LinearGradient
            colors={['#5b21b6', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.payrollMini}
          >
            <Text style={s.pmLabel}>Tổng chi lương · Tháng {monthLabel}</Text>
            <Text style={s.pmAmount}>
              ₫ {statsData?.payroll?.total
                ? (statsData.payroll.total / 1_000_000).toFixed(1) + 'M'
                : '—'}
            </Text>
            <View style={s.pmRow}>
              <View style={s.pmItem}>
                <Text style={s.pmVal}>{totalEmployees}</Text>
                <Text style={s.pmItemLabel}>Nhân viên</Text>
              </View>
              <View style={s.pmItem}>
                <Text style={s.pmVal}>
                  {statsData?.payroll?.average
                    ? '₫ ' + (statsData.payroll.average / 1_000_000).toFixed(2) + 'M'
                    : '—'}
                </Text>
                <Text style={s.pmItemLabel}>TB / người</Text>
              </View>
              <View style={s.pmItem}>
                <Text style={s.pmVal}>{statsData?.payroll?.processedRate ?? '—'}</Text>
                <Text style={s.pmItemLabel}>Đã xử lý</Text>
              </View>
            </View>
            <TouchableOpacity style={s.pmBtn} onPress={() => navigation.navigate('AdminReports')}>
              <Text style={s.pmBtnText}>Xem bảng lương đầy đủ</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Recent employees / activity */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Nhân viên gần đây</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')}>
              <Text style={s.secLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {statsData?.recentActivity?.length > 0
            ? statsData.recentActivity.slice(0, 3).map((activity: any, idx: number) => {
                const timeLabel = formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: viLocale });
                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={s.empRow}
                    onPress={() => navigation.navigate('AdminUsers')}
                  >
                    <View style={[s.empAva, { backgroundColor: AVA_COLORS[idx % AVA_COLORS.length] }]}>
                      <Text style={s.empAvaText}>
                        {activity.userName?.slice(0, 2).toUpperCase() ?? '??'}
                      </Text>
                    </View>
                    <View style={s.empInfo}>
                      <Text style={s.empName}>{activity.userName}</Text>
                      <Text style={s.empSub}>{activity.description}</Text>
                    </View>
                    <Text style={s.empTime}>{timeLabel}</Text>
                  </TouchableOpacity>
                );
              })
            : !isLoading && (
                <View style={s.empEmpty}>
                  <Text style={s.empEmptyText}>Chưa có hoạt động gần đây</Text>
                </View>
              )}

          {/* Utility links */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Tiện ích hệ thống</Text>
          </View>
          <View style={s.utilRow}>
            <TouchableOpacity style={s.utilCard} onPress={() => navigation.navigate('AdminDepartments' as any)}>
              <View style={[s.utilIcon, { backgroundColor: '#dcfce7' }]}>
                <Icon name="business-outline" size={18} color="#16a34a" library="ionicons" />
              </View>
              <View>
                <Text style={s.utilLabel}>Phòng ban & Chi nhánh</Text>
                <Text style={s.utilSub}>
                  {statsData?.counts?.departments ?? '—'} phòng ban
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.utilCard} onPress={() => navigation.navigate('AdminAudit')}>
              <View style={[s.utilIcon, { backgroundColor: '#fef3c7' }]}>
                <Icon name="document-outline" size={18} color="#b45309" library="ionicons" />
              </View>
              <View>
                <Text style={s.utilLabel}>Nhật ký hệ thống</Text>
                <Text style={s.utilSub}>
                  {statsData?.counts?.logs ?? '—'} sự kiện
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },

  // Hero
  hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 36 },
  heroTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  heroGreet: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '400', marginBottom: 2 },
  heroName: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#ef4444', borderRadius: 9999,
    minWidth: 14, paddingHorizontal: 3, alignItems: 'center',
  },
  notifBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  adminBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 14,
  },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
  },
  statVal: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 26 },
  statWarn: { color: '#fbbf24' },
  statRed: { color: '#f87171' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontWeight: '500', textAlign: 'center' },

  // Body
  body: { paddingHorizontal: 16 },

  secHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 16, marginBottom: 10,
  },
  secTitle: { fontSize: 14, fontWeight: '700', color: '#191c1e' },
  secLink: { fontSize: 12, fontWeight: '600', color: '#7c3aed' },

  // Quick actions 3-col
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  qaWrap: { flex: 1, position: 'relative' },
  qaItem: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingVertical: 14, paddingHorizontal: 6,
    alignItems: 'center', gap: 6,
  },
  qaFlex: { flex: 1 },
  qaIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: 10, fontWeight: '600', color: '#444654', textAlign: 'center', lineHeight: 14 },
  qaBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#ef4444', borderRadius: 9999,
    minWidth: 16, paddingHorizontal: 4, paddingVertical: 1,
    alignItems: 'center', zIndex: 1,
  },
  qaBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  // KPI card
  kpiCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 4,
  },
  kpiRow: {
    flexDirection: 'row', borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb',
  },
  kpiCell: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  kpiCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e5e7eb' },
  kpiVal: { fontSize: 18, fontWeight: '800', color: '#191c1e' },
  kpiLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '500', marginTop: 3, textAlign: 'center' },
  kpiSub: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 12,
  },
  kpiSubLabel: { fontSize: 11, color: '#444654', fontWeight: '600' },
  kpiSubVal: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },

  // Payroll mini
  payrollMini: { borderRadius: 16, padding: 16, marginBottom: 4, overflow: 'hidden' },
  pmLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  pmAmount: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
  pmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pmItem: { alignItems: 'center' },
  pmVal: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pmItemLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  pmBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  pmBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Recent employees
  empRow: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingVertical: 11, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
  },
  empAva: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  empAvaText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  empInfo: { flex: 1, minWidth: 0 },
  empName: { fontSize: 13, fontWeight: '700', color: '#191c1e' },
  empSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  empTime: { fontSize: 10, color: '#9ca3af' },
  empEmpty: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 16, alignItems: 'center', marginBottom: 8,
  },
  empEmptyText: { fontSize: 13, color: '#9ca3af' },

  // Utility row
  utilRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  utilCard: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  utilIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  utilLabel: { fontSize: 12, fontWeight: '700', color: '#191c1e', lineHeight: 16 },
  utilSub: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
});
