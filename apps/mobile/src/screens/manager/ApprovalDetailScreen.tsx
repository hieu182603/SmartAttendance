import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useApproveRequest, useRejectRequest } from '../../hooks/useManagerQueries';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme, Theme } from '../../theme';

const DETAIL_ROWS: { label: string; icon: string; value: string; badge: boolean; highlight?: boolean }[] = [];

const TIMELINE: { state: string; title: string; sub: string }[] = [];

export default function ApprovalDetailScreen() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'ApprovalDetail'>>();
  const [note, setNote] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState('');
  const [overlaySuccess, setOverlaySuccess] = useState(true);

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
        setOverlayTitle('Lỗi!');
        setOverlaySuccess(false);
        setOverlayVisible(true);
        setTimeout(() => setOverlayVisible(false), 2000);
      },
    });
  }

  function handleReject() {
    rejectMutation.mutate({ id: requestId, note: note || 'Từ chối' }, {
      onSuccess: () => {
        setOverlayTitle('Đã từ chối yêu cầu');
        setOverlaySuccess(false);
        setOverlayVisible(true);
        setTimeout(() => navigation.goBack(), 2000);
      },
      onError: () => {
        setOverlayTitle('Lỗi!');
        setOverlaySuccess(false);
        setOverlayVisible(true);
        setTimeout(() => setOverlayVisible(false), 2000);
      },
    });
  }

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="chevron-back-outline" size={18} color={theme.colors.text.secondary} library="ionicons" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Chi tiết yêu cầu</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Status hero */}
        <View style={s.statusHero}>
          <View style={s.shIcon}>
            <Icon name="time-outline" size={24} color={theme.colors.brand.primary} library="ionicons" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.shStatus}>Đang chờ duyệt</Text>
            <Text style={s.shSub}>Gửi lúc 23/04/2026 · 08:32</Text>
          </View>
          <View style={s.shBadge}><Text style={s.shBadgeTxt}>Mức độ cao</Text></View>
        </View>

        {/* Employee card */}
        <View style={s.empCard}>
          <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.empAva}>
            <Text style={s.empAvaTxt}>HN</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={s.empName}>Hoàng Ngọc Anh</Text>
            <Text style={s.empMeta}>NV0042 · Tuyển dụng: 15/03/2022</Text>
            <Text style={s.empDept}>Phòng Kỹ thuật</Text>
          </View>
          <View style={{ gap: 6 }}>
            <TouchableOpacity style={s.contactBtn} activeOpacity={0.7}>
              <Icon name="call-outline" size={16} color={theme.colors.brand.primary} library="ionicons" />
            </TouchableOpacity>
            <TouchableOpacity style={s.contactBtn} activeOpacity={0.7}>
              <Icon name="mail-outline" size={16} color={theme.colors.brand.primary} library="ionicons" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Request details */}
        <View style={s.detailCard}>
          <Text style={s.dcTitle}>Thông tin yêu cầu</Text>
          {DETAIL_ROWS.map((row, i) => (
            <View key={row.label} style={[s.dcRow, i === DETAIL_ROWS.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.dcLabel}>
                <Icon name={row.icon as any} size={14} color={theme.colors.text.muted} library="ionicons" />
                <Text style={s.dcLabelTxt}>{row.label}</Text>
              </View>
              {row.badge ? (
                <View style={s.typeBadge}><Text style={s.typeBadgeTxt}>{row.value}</Text></View>
              ) : (
                <Text style={[s.dcVal, row.highlight && { color: theme.colors.brand.primary, fontWeight: '800' }]}>{row.value}</Text>
              )}
            </View>
          ))}
          <View style={{ paddingTop: 10 }}>
            <View style={[s.dcLabel, { marginBottom: 8 }]}>
              <Icon name="chatbubble-outline" size={14} color={theme.colors.text.muted} library="ionicons" />
              <Text style={s.dcLabelTxt}>Lý do</Text>
            </View>
            <View style={s.reasonBox}>
              <Text style={s.reasonTxt}>"Đi du lịch cùng gia đình dịp lễ 30/4 – 1/5. Đã bàn giao công việc cho đồng nghiệp."</Text>
            </View>
          </View>
        </View>

        {/* Approval timeline */}
        <View style={s.detailCard}>
          <Text style={s.dcTitle}>Quy trình duyệt</Text>
          {TIMELINE.map((item, i) => (
            <View key={item.title} style={[s.tlItem, i < TIMELINE.length - 1 && { paddingBottom: 16 }]}>
              {i < TIMELINE.length - 1 && <View style={s.tlConnector} />}
              <View style={[
                s.tlDot,
                item.state === 'done' && s.tlDotDone,
                item.state === 'active' && s.tlDotActive,
                item.state === 'pending' && s.tlDotPending,
              ]}>
                {item.state === 'done' && <Icon name="checkmark-outline" size={14} color={theme.colors.status.success} library="ionicons" />}
                {item.state === 'active' && <Icon name="time-outline" size={14} color={theme.colors.brand.primary} library="ionicons" />}
                {item.state === 'pending' && <Icon name="people-outline" size={14} color={theme.colors.text.muted} library="ionicons" />}
              </View>
              <View style={s.tlBody}>
                <Text style={[s.tlTitle, item.state === 'active' && { color: theme.colors.brand.primary }, item.state === 'pending' && { color: theme.colors.text.muted }]}>
                  {item.title}
                </Text>
                <Text style={s.tlSub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Note */}
        <View style={s.noteCard}>
          <Text style={s.noteLabel}>Ghi chú</Text>
          <TextInput
            style={s.noteInput}
            placeholder="Ghi chú (không bắt buộc)"
            placeholderTextColor={theme.colors.text.muted}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action bar */}
      <View style={s.actionBar}>
        <TouchableOpacity style={s.btnReject} onPress={handleReject} activeOpacity={0.85}>
          <Text style={s.btnRejectTxt}>✕ Từ chối</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnApprove} onPress={handleApprove} activeOpacity={0.85}>
          <Icon name="checkmark-outline" size={18} color="#fff" library="ionicons" />
          <Text style={s.btnApproveTxt}>Phê duyệt</Text>
        </TouchableOpacity>
      </View>

      {/* Success overlay */}
      {overlayVisible && (
        <View style={s.overlay}>
          <View style={[s.ovIcon, { backgroundColor: overlaySuccess ? theme.colors.status.successBg : theme.colors.status.dangerBg }]}>
            <Icon
              name={overlaySuccess ? 'checkmark-outline' : 'close-outline'}
              size={40}
              color={overlaySuccess ? theme.colors.status.success : theme.colors.status.danger}
              library="ionicons"
            />
          </View>
          <Text style={s.ovTitle}>{overlayTitle}</Text>
          <Text style={s.ovSub}>Nhân viên sẽ nhận thông báo ngay</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: t.colors.background.base },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.colors.background.surface, borderWidth: 1.5, borderColor: t.colors.border.default, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontSize: 18, fontWeight: '800', color: t.colors.text.primary, letterSpacing: -0.3 },
    content: { paddingHorizontal: 16, paddingTop: 8 },
    statusHero: { backgroundColor: t.colors.status.infoBg, borderWidth: 1, borderColor: t.colors.status.infoBorder, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    shIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: t.colors.background.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
    shStatus: { fontSize: 15, fontWeight: '800', color: t.colors.text.primary },
    shSub: { fontSize: 12, color: t.colors.text.muted, marginTop: 2 },
    shBadge: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, flexShrink: 0 },
    shBadgeTxt: { fontSize: 12, fontWeight: '700', color: t.colors.status.warning },
    empCard: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
    empAva: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    empAvaTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
    empName: { fontSize: 15, fontWeight: '700', color: t.colors.text.primary },
    empMeta: { fontSize: 12, color: t.colors.text.muted, marginTop: 2 },
    empDept: { fontSize: 12, color: t.colors.brand.primary, fontWeight: '600', marginTop: 1 },
    contactBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: t.colors.status.infoBg, alignItems: 'center', justifyContent: 'center' },
    detailCard: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    dcTitle: { fontSize: 13, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    dcRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.colors.border.default },
    dcLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dcLabelTxt: { fontSize: 13, color: t.colors.text.muted },
    dcVal: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary, textAlign: 'right', maxWidth: '55%' },
    typeBadge: { backgroundColor: t.colors.background.indigoTint, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 },
    typeBadgeTxt: { fontSize: 12, fontWeight: '700', color: t.colors.brand.primaryActive },
    reasonBox: { backgroundColor: t.colors.background.base, borderRadius: 10, padding: 12 },
    reasonTxt: { fontSize: 13, color: t.colors.text.secondary, lineHeight: 20, fontStyle: 'italic' },
    tlItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', position: 'relative' },
    tlConnector: { position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, backgroundColor: t.colors.border.default },
    tlDot: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, borderWidth: 2 },
    tlDotDone: { backgroundColor: t.colors.status.successBg, borderColor: t.colors.status.success },
    tlDotActive: { backgroundColor: t.colors.status.infoBg, borderColor: t.colors.brand.primary },
    tlDotPending: { backgroundColor: t.colors.background.surface, borderColor: t.colors.border.default },
    tlBody: { flex: 1, paddingTop: 4 },
    tlTitle: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    tlSub: { fontSize: 11, color: t.colors.text.muted, marginTop: 2 },
    noteCard: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    noteLabel: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary, marginBottom: 8 },
    noteInput: { minHeight: 80, borderRadius: 10, borderWidth: 1.5, borderColor: t.colors.border.default, backgroundColor: t.colors.background.surface, fontSize: 13, color: t.colors.text.primary, padding: 10, textAlignVertical: 'top' },
    actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, backgroundColor: t.colors.background.surface, borderTopWidth: 1, borderTopColor: t.colors.border.default, flexDirection: 'row', gap: 10 },
    btnReject: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: t.colors.status.danger, backgroundColor: t.colors.status.dangerBg, alignItems: 'center', justifyContent: 'center' },
    btnRejectTxt: { fontSize: 15, fontWeight: '700', color: t.colors.status.danger },
    btnApprove: { flex: 2, height: 52, borderRadius: 14, backgroundColor: t.colors.brand.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    btnApproveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    ovIcon: { width: 80, height: 80, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    ovTitle: { fontSize: 22, fontWeight: '800', color: t.colors.text.primary, marginBottom: 8 },
    ovSub: { fontSize: 14, color: t.colors.text.muted },
  });
}
