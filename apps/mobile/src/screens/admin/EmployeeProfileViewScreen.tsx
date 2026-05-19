import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useTheme, Theme } from '../../theme';

const ATT_BARS: { type: 'ok' | 'late' | 'absent'; h: number }[] = [];

const ATT_RECORDS_STATIC: { date: string; times: string; badge: string; type: 'success' | 'warning' | 'indigo' | 'purple' }[] = [];

const BAR_COLORS: Record<string, [string, string]> = {
  ok: ['#16a34a', '#4ade80'],
  late: ['#d97706', '#fbbf24'],
  absent: ['#ef4444', '#f87171'],
};

const DAY_LABELS: string[] = [];

export default function EmployeeProfileViewScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const ATT_RECORDS = ATT_RECORDS_STATIC.map((r) => ({
    ...r,
    bg: r.type === 'success' ? theme.colors.status.successBg
      : r.type === 'warning' ? theme.colors.background.warningTint
      : r.type === 'indigo' ? theme.colors.background.indigoTint
      : theme.colors.background.indigoTint,
    color: r.type === 'success' ? theme.colors.status.success
      : r.type === 'warning' ? theme.colors.status.warning
      : r.type === 'indigo' ? theme.colors.brand.primary
      : theme.colors.brand.primaryActive,
  }));

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1e40af', theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={[s.ring, s.r1]} />
        <View style={[s.ring, s.r2]} />
        <View style={s.heroTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
          <View style={s.heroActions}>
            <TouchableOpacity style={s.hActBtn} onPress={() => navigation.navigate('PerformanceReview')} activeOpacity={0.7}>
              <Icon name="star-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
            </TouchableOpacity>
            <TouchableOpacity style={s.hActBtn} activeOpacity={0.7}>
              <Icon name="share-social-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.heroProfile}>
          <View style={s.avaWrap}>
            <View style={s.ava}><Text style={s.avaTxt}>HN</Text></View>
            <View style={s.avaStatus} />
          </View>
          <Text style={s.heroName}>Hoàng Ngọc Anh</Text>
          <Text style={s.heroMeta}>NV0042 · Kỹ thuật · Senior Dev</Text>
        </View>
      </LinearGradient>

      <View style={s.statsStrip}>
        <View style={s.statItem}><Text style={[s.statVal, { color: theme.colors.brand.primary }]}>96%</Text><Text style={s.statLbl}>Chuyên cần</Text></View>
        <View style={[s.statItem, s.statBorder]}><Text style={[s.statVal, { color: theme.colors.status.success }]}>22</Text><Text style={s.statLbl}>Ngày đúng giờ</Text></View>
        <View style={s.statItem}><Text style={[s.statVal, { color: theme.colors.status.warning }]}>2</Text><Text style={s.statLbl}>Ngày trễ</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actBtn, s.actPrimary]} onPress={() => navigation.navigate('PerformanceReview')} activeOpacity={0.85}>
            <Icon name="star-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
            <Text style={s.actPrimaryTxt}>Đánh giá</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actBtn, s.actSecondary]} activeOpacity={0.85}>
            <Icon name="call-outline" size={16} color={theme.colors.text.primary} library="ionicons" />
            <Text style={s.actSecondaryTxt}>Liên hệ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actBtn, s.actSuccess]} activeOpacity={0.85}>
            <Icon name="mail-outline" size={16} color={theme.colors.status.success} library="ionicons" />
            <Text style={s.actSuccessTxt}>Email</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Thông tin cá nhân</Text>
          {[
            { icon: 'person-outline', label: 'Mã nhân viên', val: 'NV0042' },
            { icon: 'call-outline', label: 'Điện thoại', val: '0901 234 567' },
            { icon: 'mail-outline', label: 'Email', val: 'hoangngocank@company.com' },
            { icon: 'calendar-outline', label: 'Ngày vào làm', val: '15/03/2022 · 3 năm 1 tháng' },
            { icon: 'time-outline', label: 'Ca làm việc', val: 'Ca sáng: 08:00 – 12:00' },
          ].map((row, i) => (
            <View key={row.label} style={[s.infoRow, i > 0 && s.infoRowBorder]}>
              <View style={s.irIcon}><Icon name={row.icon as any} size={15} color={theme.colors.text.muted} library="ionicons" /></View>
              <View>
                <Text style={s.irLabel}>{row.label}</Text>
                <Text style={s.irVal}>{row.val}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Điểm danh tháng 4/2026</Text>
          <View style={s.chartRow}>
            {ATT_BARS.map((bar, i) => (
              <LinearGradient
                key={i}
                colors={BAR_COLORS[bar.type]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={[s.chartBar, { height: `${bar.h * 100}%` as any }]}
              />
            ))}
          </View>
          <View style={s.chartLabels}>
            {DAY_LABELS.map((d, i) => <Text key={i} style={s.chartLabel}>{d}</Text>)}
          </View>

          <View style={{ marginTop: 16 }}>
            {ATT_RECORDS.map((row) => (
              <View key={row.date} style={s.attRow}>
                <Text style={s.attDate}>{row.date}</Text>
                <Text style={s.attTimes}>{row.times}</Text>
                <View style={[s.attBadge, { backgroundColor: row.bg }]}>
                  <Text style={[s.attBadgeTxt, { color: row.color }]}>{row.badge}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Số dư phép năm 2026</Text>
          <View style={s.infoRow}>
            <View style={s.irIcon}><Icon name="calendar-outline" size={15} color={theme.colors.text.muted} library="ionicons" /></View>
            <View><Text style={s.irLabel}>Phép năm</Text><Text style={s.irVal}>12 / 15 ngày còn lại</Text></View>
          </View>
          <View style={[s.infoRow, s.infoRowBorder]}>
            <View style={s.irIcon}><Icon name="pulse-outline" size={15} color={theme.colors.text.muted} library="ionicons" /></View>
            <View><Text style={s.irLabel}>Phép ốm</Text><Text style={s.irVal}>10 / 10 ngày còn lại</Text></View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 50, position: 'relative', overflow: 'hidden' },
    ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    r1: { width: 200, height: 200, top: -60, right: -40 },
    r2: { width: 120, height: 120, bottom: 30, left: -20 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    heroActions: { flexDirection: 'row', gap: 8 },
    hActBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    heroProfile: { alignItems: 'center' },
    avaWrap: { position: 'relative', marginBottom: 10 },
    ava: { width: 72, height: 72, borderRadius: 9999, backgroundColor: 'rgba(147,197,253,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
    avaTxt: { fontSize: 26, fontWeight: '800', color: t.colors.text.onPrimary },
    avaStatus: { position: 'absolute', bottom: 3, right: 3, width: 16, height: 16, borderRadius: 9999, backgroundColor: '#4ade80', borderWidth: 2, borderColor: t.colors.background.surface },
    heroName: { fontSize: 18, fontWeight: '800', color: t.colors.text.onPrimary, letterSpacing: -0.3 },
    heroMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    statsStrip: { flexDirection: 'row', backgroundColor: t.colors.border.default, gap: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16 },
    statItem: { flex: 1, backgroundColor: t.colors.background.surface, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: t.colors.border.default },
    statVal: { fontSize: 18, fontWeight: '800', color: t.colors.text.primary, lineHeight: 22 },
    statLbl: { fontSize: 10, color: t.colors.text.muted, marginTop: 3 },
    content: { paddingHorizontal: 16 },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    actPrimary: { backgroundColor: t.colors.brand.primary },
    actPrimaryTxt: { fontSize: 13, fontWeight: '700', color: t.colors.text.onPrimary },
    actSecondary: { backgroundColor: t.colors.background.surface, borderWidth: 1.5, borderColor: t.colors.border.default },
    actSecondaryTxt: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary },
    actSuccess: { backgroundColor: t.colors.status.successBg },
    actSuccessTxt: { fontSize: 13, fontWeight: '700', color: t.colors.status.success },
    card: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
    infoRowBorder: { borderTopWidth: 1, borderTopColor: t.colors.border.default },
    irIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: t.colors.background.base, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    irLabel: { fontSize: 11, color: t.colors.text.muted, marginBottom: 2 },
    irVal: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 60, marginTop: 12 },
    chartBar: { flex: 1, borderRadius: 4, minHeight: 8 },
    chartLabels: { flexDirection: 'row', gap: 4, marginTop: 4 },
    chartLabel: { flex: 1, textAlign: 'center', fontSize: 9, color: t.colors.text.muted },
    attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.colors.border.default },
    attDate: { fontSize: 12, fontWeight: '600', color: t.colors.text.primary, width: 60, flexShrink: 0 },
    attTimes: { flex: 1, fontSize: 12, color: t.colors.text.muted },
    attBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
    attBadgeTxt: { fontSize: 11, fontWeight: '700' },
  });
}
