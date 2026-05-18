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

const TYPE_META: Record<string, { icon: string; bg: string; color: string }> = {
  annual:       { icon: 'calendar-outline', bg: '#EEF1FF', color: '#4F6EF7' },
  sick:         { icon: 'medkit-outline',   bg: '#fef2f2', color: '#ef4444' },
  unpaid:       { icon: 'calendar-outline', bg: '#EEF1FF', color: '#4F6EF7' },
  overtime:     { icon: 'time-outline',     bg: '#fef3c7', color: '#d97706' },
  compensatory: { icon: 'calendar-outline', bg: '#EEF1FF', color: '#4F6EF7' },
  maternity:    { icon: 'heart-outline',    bg: '#fce7f3', color: '#db2777' },
  remote:       { icon: 'desktop-outline',  bg: '#f0fdf4', color: '#16a34a' },
  adjustment:   { icon: 'document-text-outline', bg: '#ede9fe', color: '#7c3aed' },
};

const SHEET_OPTIONS = [
  { id: 'annual',     label: 'Nghỉ phép',      sub: 'Nghỉ phép năm, nghỉ ốm, việc riêng...', icon: 'calendar-outline', bg: '#EEF1FF', color: '#4F6EF7' },
  { id: 'overtime',   label: 'Đăng ký OT',     sub: 'Làm ngoài giờ, cuối tuần, lễ...',       icon: 'time-outline', bg: '#fef3c7', color: '#d97706' },
  { id: 'remote',     label: 'Làm remote',     sub: 'Đăng ký làm việc từ xa',                icon: 'desktop-outline', bg: '#f0fdf4', color: '#16a34a' },
  { id: 'adjustment', label: 'Điều chỉnh giờ', sub: 'Quên chấm công, sai giờ vào/ra...',     icon: 'document-text-outline', bg: '#ede9fe', color: '#7c3aed' },
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
  const getTypeMeta = (id: string) => TYPE_META[id] ?? { icon: 'document-text-outline', bg: '#f3f4f6', color: '#6b7280' };

  const statusBadge = (status: string) => {
    const cfg: Record<string, { bg: string; color: string; label: string }> = {
      pending:  { bg: '#fef3c7', color: '#b45309', label: 'Chờ duyệt' },
      approved: { bg: '#dcfce7', color: '#15803d', label: 'Đã duyệt' },
      rejected: { bg: '#fef2f2', color: '#b91c1c', label: 'Từ chối' },
    };
    const c = cfg[status] ?? cfg.pending;
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.leave.all })} tintColor="#4F6EF7" colors={['#4F6EF7']} />}
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
                      <Text style={[s.infoVal, { color: '#ef4444' }]} numberOfLines={1}>{req.rejectionReason}</Text>
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
        <LinearGradient colors={['#4F6EF7', '#3a52dd']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabGradient}>
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
                <Icon name="close" size={22} color="#191c1e" library="ionicons" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              {/* Type picker */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Loại đơn</Text>
                <TouchableOpacity style={s.formSelect} onPress={() => setShowTypePicker(true)} activeOpacity={0.7}>
                  <Text style={[s.formSelectText, !leaveType && { color: '#9ca3af' }]}>
                    {leaveType ? getTypeLabel(leaveType) : 'Chọn loại đơn'}
                  </Text>
                  <Icon name="chevron-forward-outline" size={18} color="#9ca3af" library="ionicons" />
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
                  placeholderTextColor="#9ca3af"
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
                <LinearGradient colors={['#4F6EF7', '#3a52dd']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGradient}>
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
                <Text style={[s.pickerItemText, leaveType === t.id && { color: '#4F6EF7', fontWeight: '600' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },

  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#191c1e', letterSpacing: -0.3 },

  tabs: { paddingHorizontal: 20, paddingBottom: 12, gap: 8, flexDirection: 'row' },
  tab: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 9999,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#4F6EF7', borderColor: '#4F6EF7' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#fff' },

  list: { paddingHorizontal: 16, gap: 10 },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  emptyText: { fontSize: 14, color: '#9ca3af' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#191c1e' },
  cardCreated: { fontSize: 11, color: '#9ca3af' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoItem: { width: '47%' },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoVal: { fontSize: 13, fontWeight: '600', color: '#444654' },

  // FAB
  fab: {
    position: 'absolute', bottom: 88, right: 20,
    width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
    shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#191c1e', marginBottom: 16 },
  sheetOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  sheetOptIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetOptName: { fontSize: 14, fontWeight: '600', color: '#191c1e' },
  sheetOptSub: { fontSize: 12, color: '#9ca3af' },

  // Form modal
  formOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, maxHeight: '90%',
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  closeBtn: { padding: 4 },
  formField: { marginBottom: 16 },
  formRow: { flexDirection: 'row', marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#444654', marginBottom: 6 },
  formSelect: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f3f4f8', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingVertical: 13, paddingHorizontal: 14,
  },
  formSelectText: { fontSize: 15, color: '#191c1e' },
  formTextarea: {
    backgroundColor: '#f3f4f8', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    padding: 14, color: '#191c1e', fontSize: 15, minHeight: 100, textAlignVertical: 'top',
  },
  submitBtn: { borderRadius: 9999, overflow: 'hidden', marginTop: 8, shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  submitGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Type picker
  pickerBox: { backgroundColor: '#fff', borderRadius: 16, padding: 8, width: '80%', maxWidth: 360 },
  pickerItem: { padding: 14, borderRadius: 10, marginBottom: 2 },
  pickerItemActive: { backgroundColor: '#EEF1FF' },
  pickerItemText: { fontSize: 15, color: '#191c1e' },
});
