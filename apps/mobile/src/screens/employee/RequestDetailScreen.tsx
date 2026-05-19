import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'RequestDetail'>;
  route: RouteProp<RootStackParamList, 'RequestDetail'>;
};

const TIMELINE = [
  { name: 'Manager', role: 'Đã duyệt · Review', time: '23/04/2025 · 08:28', done: true },
  { name: 'System', role: 'Auto', time: '23/04/2025 · 08:30', done: true },
];

const DETAILS = [
  { label: 'Loại đơn', val: 'Nghỉ phép năm' },
  { label: 'Từ ngày', val: '25/04/2025' },
  { label: 'Đến ngày', val: '26/04/2025' },
  { label: 'Đã sử dụng', val: '2 ngày' },
  { label: 'Còn lại', val: '12 ngày', green: true },
  { label: 'Lý do', val: 'Family trip' },
  { label: 'Gửi ngày', val: '22/04/2025 · 17:45' },
];

export default function RequestDetailScreen({ navigation }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.root}>
      <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroRing} />
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Chi tiết đơn từ</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.heroType}>Nghỉ phép năm</Text>
        <Text style={s.heroTitle}>Nghỉ phép năm 25–26/04</Text>
        <View style={s.heroMeta}>
          <View style={s.heroBadge}><Text style={s.heroBadgeText}>✓ Đã duyệt</Text></View>
          <Text style={s.heroDate}>Gửi ngày 22/04 · 17:45</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Thông tin đơn</Text>
          {DETAILS.map((d) => (
            <View key={d.label} style={s.detailRow}>
              <Text style={s.drLabel}>{d.label}</Text>
              <Text style={[s.drValue, d.green && { color: theme.colors.status.success }]}>{d.val}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Tiến trình phê duyệt</Text>
          {TIMELINE.map((item, i) => (
            <View key={item.name + i} style={s.tlItem}>
              <View style={[s.tlDot, item.done && s.tlDotDone]}>
                {item.done && <Icon name="checkmark-outline" size={14} color="#fff" library="ionicons" />}
              </View>
              {i < TIMELINE.length - 1 && <View style={s.tlLine} />}
              <View style={s.tlBody}>
                <Text style={s.tlName}>{item.name}</Text>
                <Text style={s.tlRole}>{item.role}</Text>
                <Text style={s.tlTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Ghi chú từ người duyệt</Text>
          <View style={s.noteBox}>
            <Text style={s.noteAuthor}>Manager · 23/04 08:28</Text>
            <Text style={s.noteText}>Approved. Leave planned, work handed over.</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity style={s.btnPrimary} activeOpacity={0.85} onPress={() => navigation.navigate('LeaveBalance')}>
            <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGradient}>
              <Text style={s.btnPrimaryText}>Xem số ngày phép</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnDanger} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <Text style={s.btnDangerText}>Hủy đơn</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.btnOutline} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.btnOutlineText}>Quay lại danh sách</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, overflow: 'hidden' },
    heroRing: {
      position: 'absolute', top: -60, right: -60,
      width: 200, height: 200, borderRadius: 100,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    heroType: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12, letterSpacing: -0.4 },
    heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    heroBadge: { backgroundColor: t.colors.status.successBg, borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 12 },
    heroBadgeText: { fontSize: 12, fontWeight: '700', color: t.colors.status.success },
    heroDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    content: { padding: 16 },
    card: {
      backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: t.colors.border.default, marginBottom: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: t.colors.text.primary, marginBottom: 12 },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.colors.background.base,
    },
    drLabel: { fontSize: 13, color: t.colors.text.muted },
    drValue: { fontSize: 13, fontWeight: '600', color: t.colors.text.secondary, textAlign: 'right', flex: 1, paddingLeft: 16 },
    tlItem: { flexDirection: 'row', gap: 12, marginBottom: 16, position: 'relative' },
    tlDot: {
      width: 28, height: 28, borderRadius: 9999, backgroundColor: t.colors.border.default,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1,
    },
    tlDotDone: { backgroundColor: t.colors.status.success },
    tlLine: { position: 'absolute', left: 13, top: 28, width: 2, height: 20, backgroundColor: t.colors.border.default },
    tlBody: { flex: 1 },
    tlName: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary, marginBottom: 2 },
    tlRole: { fontSize: 12, color: t.colors.text.muted, marginBottom: 2 },
    tlTime: { fontSize: 12, color: t.colors.text.muted },
    noteBox: { backgroundColor: t.colors.background.base, borderRadius: 10, padding: 12 },
    noteAuthor: { fontSize: 11, fontWeight: '700', color: t.colors.text.muted, marginBottom: 6 },
    noteText: { fontSize: 13, color: t.colors.text.secondary, lineHeight: 20 },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    btnPrimary: { flex: 1, borderRadius: 9999, overflow: 'hidden' },
    btnGradient: { height: 48, alignItems: 'center', justifyContent: 'center' },
    btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    btnDanger: {
      flex: 1, height: 48, borderRadius: 9999,
      backgroundColor: t.colors.status.dangerBg, borderWidth: 1.5, borderColor: t.colors.status.dangerBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    btnDangerText: { fontSize: 14, fontWeight: '700', color: t.colors.status.danger },
    btnOutline: {
      width: '100%', height: 48, borderRadius: 9999,
      backgroundColor: t.colors.background.surface, borderWidth: 1.5, borderColor: t.colors.border.default,
      alignItems: 'center', justifyContent: 'center',
    },
    btnOutlineText: { fontSize: 14, fontWeight: '600', color: t.colors.text.muted },
  });
}
