import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Platform, RefreshControl, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { EmployeeTabParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { DateTimePickerWrapper } from '../../components/ui/DateTimePickerWrapper';
import { useLeaveHistory, useCreateLeaveRequest } from '../../hooks/useLeaveQueries';
import { queryKeys } from '../../hooks/queryKeys';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';

type Props = { navigation: BottomTabNavigationProp<EmployeeTabParamList, 'Requests'> };

const TABS = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'];
const TAB_STATUS: (string | null)[] = [null, 'pending', 'approved', 'rejected'];

const LEAVE_TYPES = [
  { id: 'annual', label: 'Nghỉ phép năm' },
  { id: 'sick', label: 'Nghỉ ốm' },
  { id: 'unpaid', label: 'Nghỉ không lương' },
  { id: 'overtime', label: 'Đăng ký OT' },
  { id: 'compensatory', label: 'Nghỉ bù' },
  { id: 'maternity', label: 'Nghỉ thai sản' },
  { id: 'remote', label: 'Làm remote' },
  { id: 'adjustment', label: 'Điều chỉnh giờ' },
];

function formatDate(d: string | number) {
  if (!d) return '--/--/----';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '--/--/----';
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateInput(d: Date) {
  const dt = (!d || isNaN(d.getTime())) ? new Date() : d;
  const off = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - off).toISOString().split('T')[0];
}

export default function RequestsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState(0);
  const [showSheet, setShowSheet] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const TYPE_META: Record<string, { icon: string; bg: string; color: string }> = {
    annual:       { icon: 'calendar-outline', bg: theme.colors.background.indigoTint, color: theme.colors.brand.primary },
    sick:         { icon: 'medkit-outline',   bg: theme.colors.status.dangerBg,        color: theme.colors.status.danger },
    unpaid:       { icon: 'calendar-outline', bg: theme.colors.background.indigoTint,  color: theme.colors.brand.primary },
    overtime:     { icon: 'time-outline',     bg: theme.colors.status.warningBg,        color: theme.colors.status.warning },
    compensatory: { icon: 'calendar-outline', bg: theme.colors.background.indigoTint,  color: theme.colors.brand.primary },
    maternity:    { icon: 'heart-outline',    bg: '#fce7f3',                            color: '#db2777' },
    remote:       { icon: 'desktop-outline',  bg: theme.colors.status.successBg,        color: theme.colors.status.success },
    adjustment:   { icon: 'document-text-outline', bg: theme.colors.background.indigoTint, color: theme.colors.brand.primaryActive },
  };

  const SHEET_OPTIONS = [
    { id: 'annual',     label: 'Nghỉ phép',      sub: 'Nghỉ phép năm, nghỉ ốm, việc riêng...', icon: 'calendar-outline', bg: theme.colors.background.indigoTint, color: theme.colors.brand.primary },
    { id: 'overtime',   label: 'Đăng ký OT',     sub: 'Làm ngoài giờ, cuối tuần, lễ...',       icon: 'time-outline', bg: theme.colors.status.warningBg, color: theme.colors.status.warning },
    { id: 'remote',     label: 'Làm remote',     sub: 'Đăng ký làm việc từ xa',                icon: 'desktop-outline', bg: theme.colors.status.successBg, color: theme.colors.status.success },
    { id: 'adjustment', label: 'Điều chỉnh giờ', sub: 'Quên chấm công, sai giờ vào/ra...',     icon: 'document-text-outline', bg: theme.colors.background.indigoTint, color: theme.colors.brand.primaryActive },
  ];

  useFocusEffect(React.useCallback(() => {
    const state = navigation.getState();
    const params = state?.routes[state?.index]?.params as any;
    if (params?.openCreateModal) {
      setShowSheet(true);
      navigation.setParams({ openCreateModal: undefined } as any);
    }
  }, [navigation]));

  const { data: historyData, isLoading } = useLeaveHistory({ limit: 20 });
  const createLeave = useCreateLeaveRequest();

  const requests = useMemo(() => {
    if (!Array.isArray(historyData)) return [];
    return historyData.map((item: any) => ({
      id: item._id,
      type: item.type ?? 'annual',
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason,
      status: item.status as 'pending' | 'approved' | 'rejected',
      createdAt: item.submittedAt ?? item.createdAt,
      rejectionReason: item.rejectionReason,
    }));
  }, [historyData]);

  const filtered = useMemo(() => {
    const filter = TAB_STATUS[activeTab];
    return filter ? requests.filter((r) => r.status === filter) : requests;
  }, [requests, activeTab]);

  const handleSubmit = () => {
    if (!leaveType || !reason) { alert('Vui lòng điền đầy đủ thông tin'); return; }
    createLeave.mutate(
      { type: leaveType, startDate: startDate.toISOString(), endDate: endDate.toISOString(), reason },
      {
        onSuccess: () => {
          alert('Tạo đơn thành công!');
          setShowForm(false);
          setLeaveType(''); setReason('');
        },
        onError: (err: any) => alert(err?.response?.data?.message ?? 'Có lỗi xảy ra'),
      }
    );
  };

  const getTypeLabel = (id: string) => LEAVE_TYPES.find((t) => t.id === id)?.label ?? id;
  const getTypeMeta = (id: string) => TYPE_META[id] ?? { icon: 'document-text-outline', bg: theme.colors.background.subtle, color: theme.colors.text.muted };

  const statusBadge = (status: string) => {
    const statusColors = {
      approved: { bg: theme.colors.status.successBg, color: theme.colors.status.success, label: 'Đã duyệt' },
      pending:  { bg: theme.colors.status.warningBg, color: theme.colors.status.warning, label: 'Chờ duyệt' },
      rejected: { bg: theme.colors.status.dangerBg,  color: theme.colors.status.danger,  label: 'Từ chối' },
    };
    const c = (statusColors as any)[status] ?? statusColors.pending;
    return (
      <View style={[s.badge, { backgroundColor: c.bg }]}>
        <Text style={[s.badgeText, { color: c.color }]}>{c.label}</Text>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.leave.all })} tintColor={theme.colors.brand.primary} colors={[theme.colors.brand.primary]} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Đơn từ</Text>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === i && s.tabActive]}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Request cards */}
        <View style={s.list}>
          {filtered.length === 0 && (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>Không có đơn nào</Text>
            </View>
          )}
          {filtered.map((req) => {
            const meta = getTypeMeta(req.type);
            return (
              <View key={req.id} style={s.card}>
                {/* Top row */}
                <View style={s.cardTop}>
                  <View style={s.cardType}>
                    <View style={[s.cardIcon, { backgroundColor: meta.bg }]}>
                      <Icon name={meta.icon} size={18} color={meta.color} library="ionicons" />
                    </View>
                    <View>
                      <Text style={s.cardName}>{getTypeLabel(req.type)}</Text>
                      <Text style={s.cardCreated}>Tạo {formatDate(req.createdAt)}</Text>
                    </View>
                  </View>
                  {statusBadge(req.status)}
                </View>

                {/* Divider */}
                <View style={s.divider} />

                {/* Info grid */}
                <View style={s.infoGrid}>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>Từ ngày</Text>
                    <Text style={s.infoVal}>{formatDate(req.startDate)}</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>Đến ngày</Text>
                    <Text style={s.infoVal}>{formatDate(req.endDate)}</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>Lý do</Text>
                    <Text style={s.infoVal} numberOfLines={1}>{req.reason || '--'}</Text>
                  </View>
                  {req.status === 'rejected' && req.rejectionReason ? (
                    <View style={s.infoItem}>
                      <Text style={s.infoLabel}>Lý do từ chối</Text>
                      <Text style={[s.infoVal, { color: theme.colors.status.danger }]} numberOfLines={1}>{req.rejectionReason}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
        <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabGradient}>
          <Icon name="add" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom sheet — select type */}
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSheet(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Tạo đơn mới</Text>
            {SHEET_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={s.sheetOpt}
                activeOpacity={0.7}
                onPress={() => { setLeaveType(opt.id); setShowSheet(false); setShowForm(true); }}
              >
                <View style={[s.sheetOptIcon, { backgroundColor: opt.bg }]}>
                  <Icon name={opt.icon} size={20} color={opt.color} library="ionicons" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetOptName}>{opt.label}</Text>
                  <Text style={s.sheetOptSub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create form modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={s.formOverlay}>
          <View style={s.formSheet}>
            <View style={s.sheetHandle} />
            <View style={s.formHeader}>
              <Text style={s.sheetTitle}>Tạo đơn — {LEAVE_TYPES.find((t) => t.id === leaveType)?.label}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={s.closeBtn}>
                <Icon name="close" size={22} color={theme.colors.text.primary} library="ionicons" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              {/* Type picker */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Loại đơn</Text>
                <TouchableOpacity style={s.formSelect} onPress={() => setShowTypePicker(true)} activeOpacity={0.7}>
                  <Text style={[s.formSelectText, !leaveType && { color: theme.colors.text.muted }]}>
                    {leaveType ? getTypeLabel(leaveType) : 'Chọn loại đơn'}
                  </Text>
                  <Icon name="chevron-forward-outline" size={18} color={theme.colors.text.muted} library="ionicons" />
                </TouchableOpacity>
              </View>

              {/* Dates */}
              <View style={s.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.formLabel}>Từ ngày</Text>
                  <TouchableOpacity style={s.formSelect} onPress={() => setShowStartPicker(true)} activeOpacity={0.7}>
                    <Text style={s.formSelectText}>{formatDateInput(startDate)}</Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePickerWrapper
                      value={startDate} mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_: any, d?: Date) => { if (Platform.OS === 'android') setShowStartPicker(false); if (d) setStartDate(d); }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Đến ngày</Text>
                  <TouchableOpacity style={s.formSelect} onPress={() => setShowEndPicker(true)} activeOpacity={0.7}>
                    <Text style={s.formSelectText}>{formatDateInput(endDate)}</Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePickerWrapper
                      value={endDate} mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_: any, d?: Date) => { if (Platform.OS === 'android') setShowEndPicker(false); if (d) setEndDate(d); }}
                    />
                  )}
                </View>
              </View>

              {/* Reason */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Lý do</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Nhập lý do..."
                  placeholderTextColor={theme.colors.text.muted}
                  multiline
                  numberOfLines={4}
                  style={s.formTextarea}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={createLeave.isPending}
                activeOpacity={0.85}
                style={s.submitBtn}
              >
                <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGradient}>
                  <Text style={s.submitText}>{createLeave.isPending ? 'Đang gửi...' : 'Gửi đơn'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Type picker modal */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={[s.overlay, { justifyContent: 'center', alignItems: 'center' }]} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={s.pickerBox} onStartShouldSetResponder={() => true}>
            {LEAVE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[s.pickerItem, leaveType === t.id && s.pickerItemActive]}
                onPress={() => { setLeaveType(t.id); setShowTypePicker(false); }}
              >
                <Text style={[s.pickerItemText, leaveType === t.id && { color: theme.colors.brand.primary, fontWeight: '600' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },

    header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: t.colors.text.primary, letterSpacing: -0.3 },

    tabs: { paddingHorizontal: 20, paddingBottom: 12, gap: 8, flexDirection: 'row' },
    tab: {
      paddingVertical: 7, paddingHorizontal: 16, borderRadius: 9999,
      borderWidth: 1.5, borderColor: t.colors.border.default,
      backgroundColor: t.colors.background.surface,
    },
    tabActive: { backgroundColor: t.colors.brand.primary, borderColor: t.colors.brand.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: t.colors.text.muted },
    tabTextActive: { color: '#fff' },

    list: { paddingHorizontal: 16, gap: 10 },

    emptyCard: {
      backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 32,
      alignItems: 'center', borderWidth: 1, borderColor: t.colors.border.default,
    },
    emptyText: { fontSize: 14, color: t.colors.text.muted },

    card: {
      backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: t.colors.border.default, marginBottom: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    cardType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cardName: { fontSize: 14, fontWeight: '700', color: t.colors.text.primary },
    cardCreated: { fontSize: 11, color: t.colors.text.muted },
    badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    divider: { height: 1, backgroundColor: t.colors.border.default, marginVertical: 10 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { width: '47%' },
    infoLabel: { fontSize: 11, color: t.colors.text.muted, marginBottom: 2 },
    infoVal: { fontSize: 13, fontWeight: '600', color: t.colors.text.secondary },

    // FAB
    fab: {
      position: 'absolute', bottom: 88, right: 20,
      width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
      shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: t.colors.background.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 36,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border.default, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: t.colors.text.primary, marginBottom: 16 },
    sheetOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
    sheetOptIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    sheetOptName: { fontSize: 14, fontWeight: '600', color: t.colors.text.primary },
    sheetOptSub: { fontSize: 12, color: t.colors.text.muted },

    // Form modal
    formOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    formSheet: {
      backgroundColor: t.colors.background.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 20, maxHeight: '90%',
    },
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    closeBtn: { padding: 4 },
    formField: { marginBottom: 16 },
    formRow: { flexDirection: 'row', marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '600', color: t.colors.text.secondary, marginBottom: 6 },
    formSelect: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.colors.background.base, borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.border.default,
      paddingVertical: 13, paddingHorizontal: 14,
    },
    formSelectText: { fontSize: 15, color: t.colors.text.primary },
    formTextarea: {
      backgroundColor: t.colors.background.base, borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.border.default,
      padding: 14, color: t.colors.text.primary, fontSize: 15, minHeight: 100, textAlignVertical: 'top',
    },
    submitBtn: { borderRadius: 9999, overflow: 'hidden', marginTop: 8, shadowColor: t.colors.brand.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
    submitGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // Type picker
    pickerBox: { backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 8, width: '80%', maxWidth: 360 },
    pickerItem: { padding: 14, borderRadius: 10, marginBottom: 2 },
    pickerItemActive: { backgroundColor: t.colors.background.indigoTint },
    pickerItemText: { fontSize: 15, color: t.colors.text.primary },
  });
}
