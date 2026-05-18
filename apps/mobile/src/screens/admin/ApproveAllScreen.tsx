import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useManagerApprovals, useApproveRequest, useRejectRequest } from '../../hooks/useManagerQueries';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

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

const PENDING: RequestItem[] = [
  { id: '1', priority: 'urgent', user: 'Hoàng Ngọc Anh', type: 'Nghỉ phép khẩn', detail: '27/04 – 29/04 · 3 ngày', time: '2h trước', colorIdx: 0 },
  { id: '2', priority: 'urgent', user: 'Đinh Quang Hải', type: 'Làm thêm giờ', detail: 'T2 25/04 · 2h OT', time: '3h trước', colorIdx: 4 },
  { id: '3', priority: 'normal', user: 'Phạm Thị Thu', type: 'Công tác', detail: '30/04 – 01/05 · Đà Nẵng', time: '5h trước', colorIdx: 1 },
  { id: '4', priority: 'normal', user: 'Nguyễn Thị Kim', type: 'WFH', detail: 'T6 30/04 · WFH', time: '6h trước', colorIdx: 3 },
  { id: '5', priority: 'normal', user: 'Lê Văn Minh', type: 'Điều chỉnh giờ', detail: '24/04 Check-in 08:52', time: 'Hôm qua', colorIdx: 2 },
];

const RESOLVED = [
  { id: 'r1', user: 'Trần Văn Minh', type: 'Nghỉ phép', detail: '20/04 – 22/04 · 3 ngày', status: 'Đã duyệt', statusBg: '#dcfce7', statusColor: '#16a34a', colorIdx: 4 },
  { id: 'r2', user: 'Vũ Hoàng Nam', type: 'Làm thêm giờ', detail: '18/04 · 3h OT', status: 'Từ chối', statusBg: '#fef2f2', statusColor: '#ef4444', colorIdx: 0 },
  { id: 'r3', user: 'Bùi Thị Lan', type: 'WFH', detail: 'T5 17/04 · WFH', status: 'Đã duyệt', statusBg: '#dcfce7', statusColor: '#16a34a', colorIdx: 2 },
];

const STATS_TYPES = [
  { label: 'Nghỉ phép', count: 12, pct: 50, color: '#4F6EF7' },
  { label: 'Làm thêm giờ', count: 7, pct: 29, color: '#16a34a' },
  { label: 'WFH', count: 3, pct: 13, color: '#d97706' },
  { label: 'Khác', count: 2, pct: 8, color: '#9ca3af' },
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2);
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 22, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 200, height: 200, top: -70, right: -40 },
    heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    heroTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    backBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    filterBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    statsRow: { flexDirection: 'row', gap: 6 },
    sBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
    sv: { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 22 },
    sl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '500' },
    content: { paddingHorizontal: 16 },
    tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginVertical: 14, borderWidth: 1, borderColor: colors.border },
    tabBtn: { flex: 1, height: 34, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    tabBtnActive: { backgroundColor: '#7c3aed' },
    tabTxt: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    tabTxtActive: { color: '#fff' },
    tabBadge: { backgroundColor: colors.separator, borderRadius: 9999, paddingHorizontal: 6, paddingVertical: 1 },
    tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
    tabBadgeTxtActive: { color: '#fff' },
    bulkBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    bulkLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    bulkApprove: { backgroundColor: '#16a34a' },
    bulkApproveTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
    bulkReject: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    bulkRejectTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
    urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
    groupTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1 },
    groupCount: { fontSize: 11, color: colors.textMuted },
    reqCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    reqCardUrgent: { borderColor: '#fecaca' },
    reqAva: { width: 38, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    reqAvaTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    reqName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    reqType: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    reqTime: { fontSize: 10, color: colors.border, marginTop: 1 },
    reqActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
    raApprove: { width: 30, height: 30, borderRadius: 9999, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
    raReject: { width: 30, height: 30, borderRadius: 9999, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
    resolvedCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
    rAva: { width: 38, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    rAvaTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    rName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    rDetail: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    rBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
    rBadgeTxt: { fontSize: 10, fontWeight: '700' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statCard: { flex: 1, minWidth: '45%', backgroundColor: '#EEF1FF', borderRadius: 14, padding: 14, alignItems: 'center' },
    scVal: { fontSize: 22, fontWeight: '800', color: '#4F6EF7' },
    scLbl: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    stRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    stLabel: { fontSize: 12, color: colors.textSecondary, width: 110, flexShrink: 0 },
    stBarTrack: { flex: 1, height: 8, backgroundColor: colors.separator, borderRadius: 4 },
    stBarFill: { height: 8, borderRadius: 4 },
    stCount: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, width: 20, textAlign: 'right' },
  });
}

export default function ApproveAllScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<TabKey>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const { data: pendingData, isLoading: isPendingLoading } = useManagerApprovals({ status: 'pending' });
  const { data: resolvedData, isLoading: isResolvedLoading } = useManagerApprovals({ status: 'resolved' });
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const TABS = [
    { label: t.manager.approvals.pending, badge: 24 },
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
  const displayResolved = hasResolvedApi ? apiResolved.map((item: any, idx: number) => ({
    id: item._id || item.id || `r-${idx}`,
    user: item.user?.name || item.employeeName || 'Nhân viên',
    type: item.type || 'Yêu cầu',
    detail: item.startDate ? `${new Date(item.startDate).toLocaleDateString('vi-VN')} – ${new Date(item.endDate).toLocaleDateString('vi-VN')}` : '',
    status: item.status === 'approved' ? t.manager.approvals.approved : t.manager.approvals.rejected,
    statusBg: item.status === 'approved' ? '#dcfce7' : '#fef2f2',
    statusColor: item.status === 'approved' ? '#16a34a' : '#ef4444',
    colorIdx: idx % AVA_COLORS.length,
  })) : RESOLVED;

  const pendingCount = hasPendingApi ? displayPending.length : 24;
  const approvedCount = hasResolvedApi ? displayResolved.filter((r: any) => r.status === t.manager.approvals.approved).length : 87;
  const rejectedCount = hasResolvedApi ? displayResolved.filter((r: any) => r.status === t.manager.approvals.rejected).length : 5;

  function handleApprove(id: string) {
    approveMutation.mutate({ id }, {
      onError: () => Alert.alert(t.common.error, 'Không thể duyệt yêu cầu'),
    });
  }

  function handleReject(id: string) {
    rejectMutation.mutate({ id, note: t.manager.approvals.reject }, {
      onError: () => Alert.alert(t.common.error, 'Không thể từ chối yêu cầu'),
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
    <View style={styles.root}>
      <LinearGradient colors={['#5b21b6', '#7c3aed', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.ring, styles.r1]} />
        <View style={styles.heroHead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Icon name="chevron-back-outline" size={15} color="#fff" library="ionicons" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>{t.manager.approvals.title}</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <Icon name="options-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.sBox}><Text style={[styles.sv, { color: '#fbbf24' }]}>{pendingCount}</Text><Text style={styles.sl}>{t.manager.approvals.pending}</Text></View>
          <View style={styles.sBox}><Text style={styles.sv}>12</Text><Text style={styles.sl}>Đang xử lý</Text></View>
          <View style={styles.sBox}><Text style={[styles.sv, { color: '#4ade80' }]}>{approvedCount}</Text><Text style={styles.sl}>{t.manager.approvals.approved}</Text></View>
          <View style={styles.sBox}><Text style={[styles.sv, { color: '#f87171' }]}>{rejectedCount}</Text><Text style={styles.sl}>{t.manager.approvals.rejected}</Text></View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.tabs}>
          {TABS.map((tb, i) => (
            <TouchableOpacity key={i} style={[styles.tabBtn, tab === i && styles.tabBtnActive]} onPress={() => setTab(i as TabKey)} activeOpacity={0.7}>
              <Text style={[styles.tabTxt, tab === i && styles.tabTxtActive]}>{tb.label}</Text>
              {i === 0 && pendingCount > 0 && (
                <View style={[styles.tabBadge, tab === i && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeTxt, tab === i && styles.tabBadgeTxtActive]}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {tab === 0 && (
          <>
            <View style={styles.bulkBar}>
              <TouchableOpacity style={[styles.checkbox, selected.length === displayPending.length && styles.checkboxChecked]} onPress={selectAll} activeOpacity={0.7}>
                {selected.length === displayPending.length && <Icon name="checkmark-outline" size={13} color="#fff" library="ionicons" />}
              </TouchableOpacity>
              <Text style={styles.bulkLabel}>{selected.length > 0 ? `${selected.length} đã chọn` : 'Chọn tất cả'}</Text>
              <TouchableOpacity style={[styles.bulkBtn, styles.bulkApprove]} activeOpacity={0.7} onPress={() => selected.forEach(id => handleApprove(id))}>
                <Icon name="checkmark-outline" size={14} color="#fff" library="ionicons" />
                <Text style={styles.bulkApproveTxt}>{t.manager.approvals.approve}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bulkBtn, styles.bulkReject]} activeOpacity={0.7} onPress={() => selected.forEach(id => handleReject(id))}>
                <Icon name="close-outline" size={14} color="#ef4444" library="ionicons" />
                <Text style={styles.bulkRejectTxt}>{t.manager.approvals.reject}</Text>
              </TouchableOpacity>
            </View>

            {urgentItems.length > 0 && (
              <>
                <View style={styles.groupHeader}>
                  <View style={styles.urgentDot} />
                  <Text style={styles.groupTitle}>Khẩn cấp</Text>
                  <Text style={styles.groupCount}>{urgentItems.length} đơn</Text>
                </View>
                {urgentItems.map((item) => (
                  <ReqCard key={item.id} item={item} selected={selected.includes(item.id)} onToggle={() => toggleSelect(item.id)} styles={styles} colors={colors} />
                ))}
              </>
            )}

            {normalItems.length > 0 && (
              <>
                <View style={styles.groupHeader}>
                  <View style={[styles.urgentDot, { backgroundColor: colors.textMuted }]} />
                  <Text style={styles.groupTitle}>Thông thường</Text>
                  <Text style={styles.groupCount}>{normalItems.length} đơn</Text>
                </View>
                {normalItems.map((item) => (
                  <ReqCard key={item.id} item={item} selected={selected.includes(item.id)} onToggle={() => toggleSelect(item.id)} styles={styles} colors={colors} />
                ))}
              </>
            )}
          </>
        )}

        {tab === 1 && (isResolvedLoading ? (
          <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 20 }} />
        ) : displayResolved.map((item: any) => (
          <View key={item.id} style={styles.resolvedCard}>
            <LinearGradient colors={AVA_COLORS[item.colorIdx % AVA_COLORS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rAva}>
              <Text style={styles.rAvaTxt}>{initials(item.user)}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.rName}>{item.user}</Text>
              <Text style={styles.rDetail}>{item.type} · {item.detail}</Text>
            </View>
            <View style={[styles.rBadge, { backgroundColor: item.statusBg }]}>
              <Text style={[styles.rBadgeTxt, { color: item.statusColor }]}>{item.status}</Text>
            </View>
          </View>
        )))}

        {tab === 2 && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.scVal}>{pendingCount}</Text><Text style={styles.scLbl}>{t.manager.approvals.pending}</Text></View>
              <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}><Text style={[styles.scVal, { color: '#16a34a' }]}>{approvedCount}</Text><Text style={styles.scLbl}>{t.manager.approvals.approved}</Text></View>
              <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}><Text style={[styles.scVal, { color: '#ef4444' }]}>{rejectedCount}</Text><Text style={styles.scLbl}>{t.manager.approvals.rejected}</Text></View>
              <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}><Text style={[styles.scVal, { color: '#d97706' }]}>1.5</Text><Text style={styles.scLbl}>TB xử lý (ngày)</Text></View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Theo loại đơn</Text>
              {STATS_TYPES.map((st) => (
                <View key={st.label} style={styles.stRow}>
                  <Text style={styles.stLabel}>{st.label}</Text>
                  <View style={styles.stBarTrack}>
                    <View style={[styles.stBarFill, { width: `${st.pct}%` as any, backgroundColor: st.color }]} />
                  </View>
                  <Text style={styles.stCount}>{st.count}</Text>
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

function ReqCard({ item, selected, onToggle, styles, colors }: {
  item: RequestItem;
  selected: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const reqColors = AVA_COLORS[item.colorIdx % AVA_COLORS.length];
  return (
    <View style={[styles.reqCard, item.priority === 'urgent' && styles.reqCardUrgent]}>
      <TouchableOpacity style={[styles.checkbox, selected && styles.checkboxChecked]} onPress={onToggle} activeOpacity={0.7}>
        {selected && <Icon name="checkmark-outline" size={13} color="#fff" library="ionicons" />}
      </TouchableOpacity>
      <LinearGradient colors={reqColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reqAva}>
        <Text style={styles.reqAvaTxt}>{initials(item.user)}</Text>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.reqName} numberOfLines={1}>{item.user}</Text>
        <Text style={styles.reqType}>{item.type} · {item.detail}</Text>
        <Text style={styles.reqTime}>{item.time}</Text>
      </View>
      <View style={styles.reqActions}>
        <TouchableOpacity style={styles.raApprove} activeOpacity={0.7}>
          <Icon name="checkmark-outline" size={13} color="#16a34a" library="ionicons" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.raReject} activeOpacity={0.7}>
          <Icon name="close-outline" size={13} color="#ef4444" library="ionicons" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
