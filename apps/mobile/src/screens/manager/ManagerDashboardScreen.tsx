import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ManagerTabParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useUnreadCount } from '../../hooks/useNotificationQueries';
import { useManagerApprovals, useTeamMembers } from '../../hooks/useManagerQueries';
import { useAuth } from '../../context/AuthContext';
import { ApprovalRequest } from '../../types';
import { useTheme, Theme } from '../../theme';

type Props = { navigation: BottomTabNavigationProp<ManagerTabParamList, 'ManagerDashboard'> };

// AVA_COLORS is built dynamically inside the component using theme tokens

function getLeaveTypeLabel(type: string) {
  switch (type) {
    case 'annual': return 'Phép';
    case 'sick': return 'Ốm';
    case 'overtime': return 'Tăng ca';
    case 'remote': return 'WFH';
    default: return 'Khác';
  }
}

function getLeaveTypeBadge(type: string, colors: Theme['colors']) {
  switch (type) {
    case 'annual':
    case 'sick': return { bg: colors.background.indigoTint, color: colors.brand.primaryActive };
    case 'overtime': return { bg: colors.status.warningBg, color: colors.status.warning };
    case 'remote': return { bg: colors.background.indigoTint, color: colors.brand.primary };
    default: return { bg: colors.background.base, color: colors.text.muted };
  }
}

function AttBar({ label, value, total, color, s }: { label: string; value: number; total: number; color: string; s: ReturnType<typeof makeStyles> }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={s.attBarRow}>
      <Text style={s.attBarLabel}>{label}</Text>
      <View style={s.attBarTrack}>
        <View style={[s.attBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={s.attBarVal}>{value}</Text>
    </View>
  );
}

export default function ManagerDashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const AVA_COLORS = [theme.colors.brand.primary, theme.colors.status.success, theme.colors.status.warning, theme.colors.status.warning];

  const { user } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const { data: approvalsData, isLoading: approvalsLoading } = useManagerApprovals({ status: 'pending' });
  const { data: teamData, isLoading: teamLoading } = useTeamMembers();

  const unreadCount = (unreadData as any)?.count ?? 0;
  const approvals: ApprovalRequest[] = approvalsData ?? [];
  const pendingCount = approvals.length;
  const members = (teamData ?? []) as any[];
  const totalCount = members.length;
  const presentCount = members.filter((m) => m.status === 'online').length;
  const absentCount = members.filter((m) => m.status === 'absent').length;
  const lateCount = members.filter((m) => m.status === 'late').length;
  const wfhCount = members.filter((m) => m.status === 'remote').length;

  const userName = user?.name || 'Manager';
  const todayStr = new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <LinearGradient
          colors={[theme.colors.brand.primaryActive, theme.colors.brand.primaryHover, theme.colors.brand.primary]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroGreet}>Xin chào,</Text>
              <Text style={s.heroName}>{userName}</Text>
            </View>
            <View style={s.heroRight}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications' as any)}
                style={s.notifBtn}
              >
                <Icon name="notifications-outline" size={20} color="#fff" library="ionicons" />
                {unreadCount > 0 && (
                  <View style={s.notifBadge}>
                    <Text style={s.notifBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={s.mgrBadge}>
                <Text style={s.mgrBadgeText}>Quản lý</Text>
              </View>
            </View>
          </View>

          {/* 3 frosted stat boxes */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={[s.statVal, s.statGreen]}>{teamLoading ? '—' : presentCount}</Text>
              <Text style={s.statLabel}>Đi làm hôm nay</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statVal, s.statWarn]}>{approvalsLoading ? '—' : pendingCount}</Text>
              <Text style={s.statLabel}>Chờ duyệt</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statVal, s.statRed]}>{teamLoading ? '—' : absentCount}</Text>
              <Text style={s.statLabel}>Vắng mặt</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={s.body}>
          {/* Quick actions */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Thao tác nhanh</Text>
          </View>
          <View style={s.quickGrid}>
            {/* Duyệt yêu cầu — with pending badge */}
            <View style={s.qaWrap}>
              <TouchableOpacity style={s.qaItem} onPress={() => navigation.navigate('ManagerApprovals')}>
                <View style={[s.qaIcon, { backgroundColor: theme.colors.background.indigoTint }]}>
                  <Icon name="document-text-outline" size={20} color={theme.colors.brand.primary} library="ionicons" />
                </View>
                <Text style={s.qaLabel}>Duyệt yêu cầu</Text>
              </TouchableOpacity>
              {pendingCount > 0 && (
                <View style={s.qaBadge}>
                  <Text style={s.qaBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[s.qaItem, s.qaFlex]} onPress={() => navigation.navigate('ManagerTeam')}>
              <View style={[s.qaIcon, { backgroundColor: theme.colors.background.emeraldTint }]}>
                <Icon name="people-outline" size={20} color={theme.colors.status.success} library="ionicons" />
              </View>
              <Text style={s.qaLabel}>Điểm danh nhóm</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.qaItem, s.qaFlex]} onPress={() => navigation.navigate('Schedule')}>
              <View style={[s.qaIcon, { backgroundColor: theme.colors.status.warningBg }]}>
                <Icon name="calendar-outline" size={20} color={theme.colors.status.warning} library="ionicons" />
              </View>
              <Text style={s.qaLabel}>Ca làm việc</Text>
            </TouchableOpacity>
          </View>

          {/* Team attendance bar chart */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Điểm danh hôm nay</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ManagerTeam')}>
              <Text style={s.secLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <View style={s.attCard}>
            <View style={s.attHead}>
              <Text style={s.attTitle}>Nhóm của tôi · {teamLoading ? '...' : totalCount} người</Text>
              <Text style={s.attDate}>{todayStr}</Text>
            </View>
            <AttBar s={s} label="Đúng giờ" value={presentCount} total={totalCount} color={theme.colors.status.success} />
            <AttBar s={s} label="Đi trễ" value={lateCount} total={totalCount} color={theme.colors.status.warning} />
            <AttBar s={s} label="WFH" value={wfhCount} total={totalCount} color={theme.colors.brand.primary} />
            <AttBar s={s} label="Vắng" value={absentCount} total={totalCount} color={theme.colors.status.danger} />
            <View style={s.attLegend}>
              {[
                { color: theme.colors.status.success, label: 'Đúng giờ' },
                { color: theme.colors.status.warning, label: 'Trễ' },
                { color: theme.colors.brand.primary, label: 'WFH' },
                { color: theme.colors.status.danger, label: 'Vắng' },
              ].map((item) => (
                <View key={item.label} style={s.legItem}>
                  <View style={[s.legDot, { backgroundColor: item.color }]} />
                  <Text style={s.legText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pending requests mini list */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>Chờ duyệt</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ManagerApprovals')}>
              <Text style={s.secLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {approvalsLoading ? (
            [1, 2].map((i) => <View key={i} style={s.reqSkeleton} />)
          ) : approvals.length === 0 ? (
            <View style={s.reqEmpty}>
              <Text style={s.reqEmptyText}>Không có đơn chờ duyệt ✅</Text>
            </View>
          ) : (
            approvals.slice(0, 3).map((approval: ApprovalRequest, idx) => {
              const badge = getLeaveTypeBadge(approval.type, theme.colors);
              const dateRange = approval.startDate === approval.endDate
                ? approval.startDate
                : `${approval.startDate} – ${approval.endDate}`;
              return (
                <TouchableOpacity
                  key={approval.id}
                  style={s.reqMini}
                  onPress={() => navigation.navigate('ManagerApprovals')}
                >
                  <View style={[s.reqAva, { backgroundColor: AVA_COLORS[idx % AVA_COLORS.length] }]}>
                    <Text style={s.reqAvaText}>
                      {approval.employeeName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.reqInfo}>
                    <Text style={s.reqName}>{approval.employeeName}</Text>
                    <Text style={s.reqSub} numberOfLines={1}>
                      {getLeaveTypeLabel(approval.type)} · {dateRange}{approval.days ? ` · ${approval.days} ngày` : ''}
                    </Text>
                  </View>
                  <View style={[s.reqTypeBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.reqTypeText, { color: badge.color }]}>
                      {getLeaveTypeLabel(approval.type)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },

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
      justifyContent: 'center', alignItems: 'center',
      position: 'relative',
    },
    notifBadge: {
      position: 'absolute', top: -2, right: -2,
      backgroundColor: t.colors.status.danger, borderRadius: 9999,
      minWidth: 14, paddingHorizontal: 3, alignItems: 'center',
    },
    notifBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },
    mgrBadge: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
      borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 14,
    },
    mgrBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    // Stats row (in hero)
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
    },
    statVal: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
    statGreen: { color: '#86efac' },
    statWarn: { color: '#fbbf24' },
    statRed: { color: '#f87171' },
    statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontWeight: '500', textAlign: 'center' },

    // Body
    body: { paddingHorizontal: 16 },

    // Section header
    secHead: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginTop: 16, marginBottom: 10,
    },
    secTitle: { fontSize: 14, fontWeight: '700', color: t.colors.text.primary },
    secLink: { fontSize: 12, fontWeight: '600', color: t.colors.brand.primary },

    // Quick actions grid
    quickGrid: { flexDirection: 'row', gap: 8 },
    qaWrap: { flex: 1, position: 'relative' },
    qaItem: {
      backgroundColor: t.colors.background.surface, borderRadius: 14,
      borderWidth: 1, borderColor: t.colors.border.default,
      paddingVertical: 14, paddingHorizontal: 6,
      alignItems: 'center', gap: 6,
    },
    qaFlex: { flex: 1 },
    qaIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    qaLabel: { fontSize: 10, fontWeight: '600', color: t.colors.text.secondary, textAlign: 'center', lineHeight: 14 },
    qaBadge: {
      position: 'absolute', top: -4, right: -4,
      backgroundColor: t.colors.status.danger, borderRadius: 9999,
      minWidth: 16, paddingHorizontal: 4, paddingVertical: 1,
      alignItems: 'center', zIndex: 1,
    },
    qaBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

    // Attendance card
    attCard: {
      backgroundColor: t.colors.background.surface, borderRadius: 16,
      borderWidth: 1, borderColor: t.colors.border.default, padding: 14, marginBottom: 4,
    },
    attHead: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 12,
    },
    attTitle: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    attDate: { fontSize: 11, color: t.colors.text.muted, fontWeight: '500' },
    attBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    attBarLabel: { fontSize: 11, color: t.colors.text.secondary, width: 52, fontWeight: '500' },
    attBarTrack: { flex: 1, height: 7, backgroundColor: t.colors.background.base, borderRadius: 9999, overflow: 'hidden' },
    attBarFill: { height: 7, borderRadius: 9999 },
    attBarVal: { fontSize: 11, fontWeight: '700', color: t.colors.text.primary, width: 20, textAlign: 'right' },
    attLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
    legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legDot: { width: 7, height: 7, borderRadius: 4 },
    legText: { fontSize: 10, color: t.colors.text.muted, fontWeight: '500' },

    // Pending requests mini list
    reqSkeleton: { height: 56, backgroundColor: t.colors.border.default, borderRadius: 14, marginBottom: 8 },
    reqEmpty: {
      backgroundColor: t.colors.background.surface, borderRadius: 14,
      borderWidth: 1, borderColor: t.colors.border.default,
      padding: 16, alignItems: 'center', marginBottom: 8,
    },
    reqEmptyText: { fontSize: 13, color: t.colors.text.muted },
    reqMini: {
      backgroundColor: t.colors.background.surface, borderRadius: 14,
      borderWidth: 1, borderColor: t.colors.border.default,
      paddingVertical: 12, paddingHorizontal: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    },
    reqAva: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    reqAvaText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    reqInfo: { flex: 1, minWidth: 0 },
    reqName: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    reqSub: { fontSize: 11, color: t.colors.text.muted, marginTop: 1 },
    reqTypeBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 9 },
    reqTypeText: { fontSize: 10, fontWeight: '700' },
  });
}
