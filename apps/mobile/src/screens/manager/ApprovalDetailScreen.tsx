import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useApproveRequest, useRejectRequest } from '../../hooks/useManagerQueries';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

const DETAIL_ROWS = [
  { label: 'Loại yêu cầu', icon: 'document-text-outline', value: 'Nghỉ phép năm', badge: true },
  { label: 'Ngày bắt đầu', icon: 'calendar-outline', value: '28/04/2026 (Thứ Hai)', badge: false },
  { label: 'Ngày kết thúc', icon: 'calendar-outline', value: '30/04/2026 (Thứ Tư)', badge: false },
  { label: 'Số ngày', icon: 'time-outline', value: '3 ngày làm việc', badge: false, highlight: true },
  { label: 'Số dư phép', icon: 'albums-outline', value: '12 ngày còn lại', badge: false },
];

const TIMELINE = [
  { state: 'done', title: 'Nhân viên gửi yêu cầu', sub: '23/04/2026 · 08:32 · Hoàng Ngọc Anh' },
  { state: 'active', title: 'Quản lý trực tiếp duyệt', sub: 'Đang chờ · Trần Văn Minh' },
  { state: 'pending', title: 'HR xác nhận', sub: 'Chờ bước trước hoàn thành' },
];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: colors.background },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
    content: { paddingHorizontal: 16, paddingTop: 8 },
    statusHero: { backgroundColor: '#eef1ff', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    shIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
    shStatus: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    shSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    shBadge: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, flexShrink: 0 },
    shBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#d97706' },
    empCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
    empAva: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    empAvaTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
    empName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    empMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    empDept: { fontSize: 12, color: '#4F6EF7', fontWeight: '600', marginTop: 1 },
    contactBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#EEF1FF', alignItems: 'center', justifyContent: 'center' },
    detailCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    dcTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    dcRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    dcLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dcLabelTxt: { fontSize: 13, color: colors.textMuted },
    dcVal: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right', maxWidth: '55%' },
    typeBadge: { backgroundColor: '#ede9fe', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 },
    typeBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
    reasonBox: { backgroundColor: colors.separator, borderRadius: 10, padding: 12 },
    reasonTxt: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontStyle: 'italic' },
    tlItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', position: 'relative' },
    tlConnector: { position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, backgroundColor: colors.border },
    tlDot: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, borderWidth: 2 },
    tlDotDone: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
    tlDotActive: { backgroundColor: '#EEF1FF', borderColor: '#4F6EF7' },
    tlDotPending: { backgroundColor: colors.card, borderColor: colors.border },
    tlBody: { flex: 1, paddingTop: 4 },
    tlTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    tlSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    noteCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    noteLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    noteInput: { minHeight: 80, borderRadius: 10, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, fontSize: 13, color: colors.inputText, padding: 10, textAlignVertical: 'top' },
    actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', gap: 10 },
    btnReject: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#ef4444', backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
    btnRejectTxt: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
    btnApprove: { flex: 2, height: 52, borderRadius: 14, backgroundColor: '#4F6EF7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    btnApproveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    ovIcon: { width: 80, height: 80, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    ovTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    ovSub: { fontSize: 14, color: colors.textMuted },
  });
}

export default function ApprovalDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'ApprovalDetail'>>();
  const [note, setNote] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState('');
  const [overlaySuccess, setOverlaySuccess] = useState(true);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const requestId = route.params.requestId;

  function handleApprove() {
    approveMutation.mutate({ id: requestId, note }, {
      onSuccess: () => {
        setOverlayTitle('Đã duyệt thành công!');
        setOverlaySuccess(true);
        setOverlayVisible(true);
        setTimeout(() => navigation.goBack(), 2000);
      },
      onError: () => {
        setOverlayTitle(`${t.common.error}!`);
        setOverlaySuccess(false);
        setOverlayVisible(true);
        setTimeout(() => setOverlayVisible(false), 2000);
      },
    });
  }

  function handleReject() {
    rejectMutation.mutate({ id: requestId, note: note || t.manager.approvals.reject }, {
      onSuccess: () => {
        setOverlayTitle('Đã từ chối yêu cầu');
        setOverlaySuccess(false);
        setOverlayVisible(true);
        setTimeout(() => navigation.goBack(), 2000);
      },
      onError: () => {
        setOverlayTitle(`${t.common.error}!`);
        setOverlaySuccess(false);
        setOverlayVisible(true);
        setTimeout(() => setOverlayVisible(false), 2000);
      },
    });
  }

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="chevron-back-outline" size={18} color={colors.textSecondary} library="ionicons" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Chi tiết yêu cầu</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status hero */}
        <View style={styles.statusHero}>
          <View style={styles.shIcon}>
            <Icon name="time-outline" size={24} color="#4F6EF7" library="ionicons" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shStatus}>Đang chờ duyệt</Text>
            <Text style={styles.shSub}>Gửi lúc 23/04/2026 · 08:32</Text>
          </View>
          <View style={styles.shBadge}><Text style={styles.shBadgeTxt}>Mức độ cao</Text></View>
        </View>

        {/* Employee card */}
        <View style={styles.empCard}>
          <LinearGradient colors={['#4F6EF7', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.empAva}>
            <Text style={styles.empAvaTxt}>HN</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.empName}>Hoàng Ngọc Anh</Text>
            <Text style={styles.empMeta}>NV0042 · Tuyển dụng: 15/03/2022</Text>
            <Text style={styles.empDept}>Phòng Kỹ thuật</Text>
          </View>
          <View style={{ gap: 6 }}>
            <TouchableOpacity style={styles.contactBtn} activeOpacity={0.7}>
              <Icon name="call-outline" size={16} color="#4F6EF7" library="ionicons" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn} activeOpacity={0.7}>
              <Icon name="mail-outline" size={16} color="#4F6EF7" library="ionicons" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Request details */}
        <View style={styles.detailCard}>
          <Text style={styles.dcTitle}>Thông tin yêu cầu</Text>
          {DETAIL_ROWS.map((row, i) => (
            <View key={row.label} style={[styles.dcRow, i === DETAIL_ROWS.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.dcLabel}>
                <Icon name={row.icon as any} size={14} color={colors.textMuted} library="ionicons" />
                <Text style={styles.dcLabelTxt}>{row.label}</Text>
              </View>
              {row.badge ? (
                <View style={styles.typeBadge}><Text style={styles.typeBadgeTxt}>{row.value}</Text></View>
              ) : (
                <Text style={[styles.dcVal, row.highlight && { color: '#4F6EF7', fontWeight: '800' }]}>{row.value}</Text>
              )}
            </View>
          ))}
          <View style={{ paddingTop: 10 }}>
            <View style={[styles.dcLabel, { marginBottom: 8 }]}>
              <Icon name="chatbubble-outline" size={14} color={colors.textMuted} library="ionicons" />
              <Text style={styles.dcLabelTxt}>Lý do</Text>
            </View>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonTxt}>"Đi du lịch cùng gia đình dịp lễ 30/4 – 1/5. Đã bàn giao công việc cho đồng nghiệp."</Text>
            </View>
          </View>
        </View>

        {/* Approval timeline */}
        <View style={styles.detailCard}>
          <Text style={styles.dcTitle}>Quy trình duyệt</Text>
          {TIMELINE.map((item, i) => (
            <View key={item.title} style={[styles.tlItem, i < TIMELINE.length - 1 && { paddingBottom: 16 }]}>
              {i < TIMELINE.length - 1 && <View style={styles.tlConnector} />}
              <View style={[
                styles.tlDot,
                item.state === 'done' && styles.tlDotDone,
                item.state === 'active' && styles.tlDotActive,
                item.state === 'pending' && styles.tlDotPending,
              ]}>
                {item.state === 'done' && <Icon name="checkmark-outline" size={14} color="#16a34a" library="ionicons" />}
                {item.state === 'active' && <Icon name="time-outline" size={14} color="#4F6EF7" library="ionicons" />}
                {item.state === 'pending' && <Icon name="people-outline" size={14} color={colors.textMuted} library="ionicons" />}
              </View>
              <View style={styles.tlBody}>
                <Text style={[styles.tlTitle, item.state === 'active' && { color: '#4F6EF7' }, item.state === 'pending' && { color: colors.textMuted }]}>
                  {item.title}
                </Text>
                <Text style={styles.tlSub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>{t.manager.approvals.note}</Text>
          <TextInput
            style={styles.noteInput}
            placeholder={t.manager.approvals.noteOptional}
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.btnReject} onPress={handleReject} activeOpacity={0.85}>
          <Text style={styles.btnRejectTxt}>✕ {t.manager.approvals.reject}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnApprove} onPress={handleApprove} activeOpacity={0.85}>
          <Icon name="checkmark-outline" size={18} color="#fff" library="ionicons" />
          <Text style={styles.btnApproveTxt}>{t.manager.approvals.approve}</Text>
        </TouchableOpacity>
      </View>

      {/* Success overlay */}
      {overlayVisible && (
        <View style={styles.overlay}>
          <View style={[styles.ovIcon, { backgroundColor: overlaySuccess ? '#dcfce7' : '#fef2f2' }]}>
            <Icon
              name={overlaySuccess ? 'checkmark-outline' : 'close-outline'}
              size={40}
              color={overlaySuccess ? '#16a34a' : '#ef4444'}
              library="ionicons"
            />
          </View>
          <Text style={styles.ovTitle}>{overlayTitle}</Text>
          <Text style={styles.ovSub}>Nhân viên sẽ nhận thông báo ngay</Text>
        </View>
      )}
    </View>
  );
}
