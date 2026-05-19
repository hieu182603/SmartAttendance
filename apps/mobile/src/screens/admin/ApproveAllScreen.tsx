import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useManagerApprovals, useApproveRequest, useRejectRequest } from '../../hooks/useManagerQueries';
import { useTheme, Theme } from '../../theme';

type TabKey = 0 | 1 | 2;

type RequestItem = {
  id: string;
  priority: 'urgent' | 'normal';
  user: string;
  type: string;
  detail: string;
  time: string;
  colorIdx: number;
};

const AVA_COLORS: [string, string][] = [
  ['#4F6EF7', '#7c3aed'],
  ['#16a34a', '#22d3ee'],
  ['#f97316', '#ef4444'],
  ['#d97706', '#f59e0b'],
  ['#ec4899', '#a855f7'],
];

const PENDING: RequestItem[] = [];

const RESOLVED_STATIC: { id: string; user: string; type: string; detail: string; status: string; approved: boolean; colorIdx: number }[] = [];

const STATS_TYPES_STATIC: { label: string; count: number; pct: number; colorKey: 'brand.primary' | 'status.success' | 'status.warning' | 'text.muted' }[] = [];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2);
}

export default function ApproveAllScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [tab, setTab] = useState<TabKey>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const { data: pendingData, isLoading: isPendingLoading } = useManagerApprovals({ status: 'pending' });
  const { data: resolvedData, isLoading: isResolvedLoading } = useManagerApprovals({ status: 'resolved' });
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const TABS = [
    { label: 'Chờ duyệt', badge: 24 },
    { label: 'Đã xử lý', badge: null },
    { label: 'Thống kê', badge: null },
  ];

  const apiPending = Array.isArray(pendingData) ? pendingData : (pendingData?.data || []);
  const hasPendingApi = apiPending.length > 0;
  const displayPending: RequestItem[] = hasPendingApi ? apiPending.map((item: any, idx: number) => ({
    id: item._id || item.id || `p-${idx}`,
    priority: item.priority === 'urgent' || item.urgent ? 'urgent' as const : 'normal' as const,
    user: item.user?.name || item.employeeName || 'Nhân viên',
    type: item.type || item.leaveType || 'Yêu cầu',
    detail: item.startDate ? `${new Date(item.startDate).toLocaleDateString('vi-VN')} – ${new Date(item.endDate).toLocaleDateString('vi-VN')}` : '',
    time: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '',
    colorIdx: idx % AVA_COLORS.length,
  })) : PENDING;

  const apiResolved = Array.isArray(resolvedData) ? resolvedData : (resolvedData?.data || []);
  const hasResolvedApi = apiResolved.length > 0;
  const RESOLVED = RESOLVED_STATIC.map((r) => ({
    ...r,
    statusBg: r.approved ? theme.colors.status.successBg : theme.colors.status.dangerBg,
    statusColor: r.approved ? theme.colors.status.success : theme.colors.status.danger,
  }));
  const displayResolved = hasResolvedApi ? apiResolved.map((item: any, idx: number) => ({
    id: item._id || item.id || `r-${idx}`,
    user: item.user?.name || item.employeeName || 'Nhân viên',
    type: item.type || 'Yêu cầu',
    detail: item.startDate ? `${new Date(item.startDate).toLocaleDateString('vi-VN')} – ${new Date(item.endDate).toLocaleDateString('vi-VN')}` : '',
    status: item.status === 'approved' ? 'Đã duyệt' : 'Từ chối',
    statusBg: item.status === 'approved' ? theme.colors.status.successBg : theme.colors.status.dangerBg,
    statusColor: item.status === 'approved' ? theme.colors.status.success : theme.colors.status.danger,
    colorIdx: idx % AVA_COLORS.length,
  })) : RESOLVED;

  const pendingCount = hasPendingApi ? displayPending.length : 24;
  const approvedCount = hasResolvedApi ? displayResolved.filter((r: any) => r.status === 'Đã duyệt').length : 87;
  const rejectedCount = hasResolvedApi ? displayResolved.filter((r: any) => r.status === 'Từ chối').length : 5;

  const statsTypes = STATS_TYPES_STATIC.map((st) => ({
    ...st,
    color: st.colorKey === 'brand.primary' ? theme.colors.brand.primary
      : st.colorKey === 'status.success' ? theme.colors.status.success
      : st.colorKey === 'status.warning' ? theme.colors.status.warning
      : theme.colors.text.muted,
  }));

  function handleApprove(id: string) {
    approveMutation.mutate({ id }, {
      onError: () => Alert.alert('Lỗi', 'Không thể duyệt yêu cầu'),
    });
  }

  function handleReject(id: string) {
    rejectMutation.mutate({ id, note: 'Từ chối' }, {
      onError: () => Alert.alert('Lỗi', 'Không thể từ chối yêu cầu'),
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function selectAll() {
    setSelected(selected.length === displayPending.length ? [] : displayPending.map((p) => p.id));
  }

  const urgentItems = displayPending.filter((p) => p.priority === 'urgent');
  const normalItems = displayPending.filter((p) => p.priority === 'normal');

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.colors.brand.primaryActive, theme.colors.brand.primary, '#a855f7'] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={[s.ring, s.r1]} />
        <View style={s.heroHead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Icon name="chevron-back-outline" size={15} color={theme.colors.text.onPrimary} library="ionicons" />
            </TouchableOpacity>
            <Text style={s.heroTitle}>Phê duyệt đơn từ</Text>
          </View>
          <TouchableOpacity style={s.filterBtn} activeOpacity={0.7}>
            <Icon name="options-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
        </View>
        <View style={s.statsRow}>
          <View style={s.sBox}><Text style={[s.sv, { color: '#fbbf24' }]}>{pendingCount}</Text><Text style={s.sl}>Chờ duyệt</Text></View>
          <View style={s.sBox}><Text style={s.sv}>12</Text><Text style={s.sl}>Đang xử lý</Text></View>
          <View style={s.sBox}><Text style={[s.sv, { color: '#4ade80' }]}>{approvedCount}</Text><Text style={s.sl}>Đã duyệt</Text></View>
          <View style={s.sBox}><Text style={[s.sv, { color: '#f87171' }]}>{rejectedCount}</Text><Text style={s.sl}>Từ chối</Text></View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.tabs}>
          {TABS.map((tb, i) => (
            <TouchableOpacity key={i} style={[s.tabBtn, tab === i && s.tabBtnActive]} onPress={() => setTab(i as TabKey)} activeOpacity={0.7}>
              <Text style={[s.tabTxt, tab === i && s.tabTxtActive]}>{tb.label}</Text>
              {i === 0 && pendingCount > 0 && (
                <View style={[s.tabBadge, tab === i && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, tab === i && s.tabBadgeTxtActive]}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {tab === 0 && (
          <>
            <View style={s.bulkBar}>
              <TouchableOpacity style={[s.checkbox, selected.length === displayPending.length && s.checkboxChecked]} onPress={selectAll} activeOpacity={0.7}>
                {selected.length === displayPending.length && <Icon name="checkmark-outline" size={13} color={theme.colors.text.onPrimary} library="ionicons" />}
              </TouchableOpacity>
              <Text style={s.bulkLabel}>{selected.length > 0 ? `${selected.length} đã chọn` : 'Chọn tất cả'}</Text>
              <TouchableOpacity style={[s.bulkBtn, s.bulkApprove]} activeOpacity={0.7} onPress={() => selected.forEach(id => handleApprove(id))}>
                <Icon name="checkmark-outline" size={14} color={theme.colors.text.onPrimary} library="ionicons" />
                <Text style={s.bulkApproveTxt}>Duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.bulkBtn, s.bulkReject]} activeOpacity={0.7} onPress={() => selected.forEach(id => handleReject(id))}>
                <Icon name="close-outline" size={14} color={theme.colors.status.danger} library="ionicons" />
                <Text style={s.bulkRejectTxt}>Từ chối</Text>
              </TouchableOpacity>
            </View>

            {urgentItems.length > 0 && (
              <>
                <View style={s.groupHeader}>
                  <View style={s.urgentDot} />
                  <Text style={s.groupTitle}>Khẩn cấp</Text>
                  <Text style={s.groupCount}>{urgentItems.length} đơn</Text>
                </View>
                {urgentItems.map((item) => (
                  <ReqCard key={item.id} item={item} selected={selected.includes(item.id)} onToggle={() => toggleSelect(item.id)} theme={theme} s={s} />
                ))}
              </>
            )}

            {normalItems.length > 0 && (
              <>
                <View style={s.groupHeader}>
                  <View style={[s.urgentDot, { backgroundColor: theme.colors.text.muted }]} />
                  <Text style={s.groupTitle}>Thông thường</Text>
                  <Text style={s.groupCount}>{normalItems.length} đơn</Text>
                </View>
                {normalItems.map((item) => (
                  <ReqCard key={item.id} item={item} selected={selected.includes(item.id)} onToggle={() => toggleSelect(item.id)} theme={theme} s={s} />
                ))}
              </>
            )}
          </>
        )}

        {tab === 1 && (isResolvedLoading ? (
          <ActivityIndicator size="small" color={theme.colors.brand.primaryActive} style={{ marginVertical: 20 }} />
        ) : displayResolved.map((item: any) => (
          <View key={item.id} style={s.resolvedCard}>
            <LinearGradient colors={AVA_COLORS[item.colorIdx % AVA_COLORS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.rAva}>
              <Text style={s.rAvaTxt}>{initials(item.user)}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.rName}>{item.user}</Text>
              <Text style={s.rDetail}>{item.type} · {item.detail}</Text>
            </View>
            <View style={[s.rBadge, { backgroundColor: item.statusBg }]}>
              <Text style={[s.rBadgeTxt, { color: item.statusColor }]}>{item.status}</Text>
            </View>
          </View>
        )))}

        {tab === 2 && (
          <>
            <View style={s.statsGrid}>
              <View style={s.statCard}><Text style={s.scVal}>{pendingCount}</Text><Text style={s.scLbl}>Chờ duyệt</Text></View>
              <View style={[s.statCard, { backgroundColor: theme.colors.status.successBg }]}><Text style={[s.scVal, { color: theme.colors.status.success }]}>{approvedCount}</Text><Text style={s.scLbl}>Đã duyệt</Text></View>
              <View style={[s.statCard, { backgroundColor: theme.colors.status.dangerBg }]}><Text style={[s.scVal, { color: theme.colors.status.danger }]}>{rejectedCount}</Text><Text style={s.scLbl}>Từ chối</Text></View>
              <View style={[s.statCard, { backgroundColor: theme.colors.status.warningBg }]}><Text style={[s.scVal, { color: theme.colors.status.warning }]}>1.5</Text><Text style={s.scLbl}>TB xử lý (ngày)</Text></View>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Theo loại đơn</Text>
              {statsTypes.map((st) => (
                <View key={st.label} style={s.stRow}>
                  <Text style={s.stLabel}>{st.label}</Text>
                  <View style={s.stBarTrack}>
                    <View style={[s.stBarFill, { width: `${st.pct}%` as any, backgroundColor: st.color }]} />
                  </View>
                  <Text style={s.stCount}>{st.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function ReqCard({ item, selected, onToggle, theme, s }: {
  item: RequestItem;
  selected: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
  s: ReturnType<typeof makeStyles>;
}) {
  const reqColors = AVA_COLORS[item.colorIdx % AVA_COLORS.length];
  return (
    <View style={[s.reqCard, item.priority === 'urgent' && s.reqCardUrgent]}>
      <TouchableOpacity style={[s.checkbox, selected && s.checkboxChecked]} onPress={onToggle} activeOpacity={0.7}>
        {selected && <Icon name="checkmark-outline" size={13} color={theme.colors.text.onPrimary} library="ionicons" />}
      </TouchableOpacity>
      <LinearGradient colors={reqColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.reqAva}>
        <Text style={s.reqAvaTxt}>{initials(item.user)}</Text>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.reqName} numberOfLines={1}>{item.user}</Text>
        <Text style={s.reqType}>{item.type} · {item.detail}</Text>
        <Text style={s.reqTime}>{item.time}</Text>
      </View>
      <View style={s.reqActions}>
        <TouchableOpacity style={s.raApprove} activeOpacity={0.7}>
          <Icon name="checkmark-outline" size={13} color={theme.colors.status.success} library="ionicons" />
        </TouchableOpacity>
        <TouchableOpacity style={s.raReject} activeOpacity={0.7}>
          <Icon name="close-outline" size={13} color={theme.colors.status.danger} library="ionicons" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 22, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 200, height: 200, top: -70, right: -40 },
    heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    heroTitle: { fontSize: 17, fontWeight: '800', color: t.colors.text.onPrimary },
    backBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    filterBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    statsRow: { flexDirection: 'row', gap: 6 },
    sBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
    sv: { fontSize: 18, fontWeight: '800', color: t.colors.text.onPrimary, lineHeight: 22 },
    sl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '500' },
    content: { paddingHorizontal: 16 },
    tabs: { flexDirection: 'row', backgroundColor: t.colors.background.surface, borderRadius: 12, padding: 4, marginVertical: 14, borderWidth: 1, borderColor: t.colors.border.default },
    tabBtn: { flex: 1, height: 34, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    tabBtnActive: { backgroundColor: t.colors.brand.primaryActive },
    tabTxt: { fontSize: 12, fontWeight: '600', color: t.colors.text.muted },
    tabTxtActive: { color: t.colors.text.onPrimary },
    tabBadge: { backgroundColor: t.colors.border.default, borderRadius: 9999, paddingHorizontal: 6, paddingVertical: 1 },
    tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabBadgeTxt: { fontSize: 10, fontWeight: '700', color: t.colors.text.muted },
    tabBadgeTxtActive: { color: t.colors.text.onPrimary },
    bulkBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.colors.background.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border.default, padding: 10, marginBottom: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: t.colors.border.default, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: t.colors.brand.primaryActive, borderColor: t.colors.brand.primaryActive },
    bulkLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: t.colors.text.secondary },
    bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    bulkApprove: { backgroundColor: t.colors.status.success },
    bulkApproveTxt: { fontSize: 12, fontWeight: '700', color: t.colors.text.onPrimary },
    bulkReject: { backgroundColor: t.colors.status.dangerBg, borderWidth: 1, borderColor: t.colors.status.dangerBorder },
    bulkRejectTxt: { fontSize: 12, fontWeight: '700', color: t.colors.status.danger },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
    urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.status.danger },
    groupTitle: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary, flex: 1 },
    groupCount: { fontSize: 11, color: t.colors.text.muted },
    reqCard: { backgroundColor: t.colors.background.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border.default, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    reqCardUrgent: { borderColor: t.colors.border.danger },
    reqAva: { width: 38, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    reqAvaTxt: { fontSize: 13, fontWeight: '800', color: t.colors.text.onPrimary },
    reqName: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    reqType: { fontSize: 11, color: t.colors.text.muted, marginTop: 1 },
    reqTime: { fontSize: 10, color: t.colors.border.default, marginTop: 1 },
    reqActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
    raApprove: { width: 30, height: 30, borderRadius: 9999, backgroundColor: t.colors.status.successBg, alignItems: 'center', justifyContent: 'center' },
    raReject: { width: 30, height: 30, borderRadius: 9999, backgroundColor: t.colors.status.dangerBg, alignItems: 'center', justifyContent: 'center' },
    resolvedCard: { backgroundColor: t.colors.background.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border.default, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
    rAva: { width: 38, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    rAvaTxt: { fontSize: 13, fontWeight: '800', color: t.colors.text.onPrimary },
    rName: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    rDetail: { fontSize: 11, color: t.colors.text.muted, marginTop: 1 },
    rBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
    rBadgeTxt: { fontSize: 10, fontWeight: '700' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statCard: { flex: 1, minWidth: '45%', backgroundColor: t.colors.background.indigoTint, borderRadius: 14, padding: 14, alignItems: 'center' },
    scVal: { fontSize: 22, fontWeight: '800', color: t.colors.brand.primary },
    scLbl: { fontSize: 10, color: t.colors.text.muted, marginTop: 4, textAlign: 'center' },
    card: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    stRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    stLabel: { fontSize: 12, color: t.colors.text.secondary, width: 110, flexShrink: 0 },
    stBarTrack: { flex: 1, height: 8, backgroundColor: t.colors.border.default, borderRadius: 4 },
    stBarFill: { height: 8, borderRadius: 4 },
    stCount: { fontSize: 12, fontWeight: '700', color: t.colors.text.primary, width: 20, textAlign: 'right' },
  });
}
