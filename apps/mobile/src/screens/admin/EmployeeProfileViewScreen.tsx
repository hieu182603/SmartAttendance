import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

const ATT_BARS = [
  { type: 'ok', h: 0.9 }, { type: 'ok', h: 0.95 }, { type: 'ok', h: 0.85 }, { type: 'late', h: 0.4 },
  { type: 'ok', h: 0.9 }, { type: 'ok', h: 0.8 }, { type: 'absent', h: 0.2 }, { type: 'ok', h: 0.95 },
  { type: 'ok', h: 0.88 }, { type: 'late', h: 0.35 }, { type: 'ok', h: 0.92 }, { type: 'ok', h: 0.9 },
] as const;

const ATT_RECORDS = [
  { date: '23/04', times: '08:02 → 17:34', badge: 'Đúng giờ', bg: '#dcfce7', color: '#16a34a' },
  { date: '22/04', times: '08:45 → 17:30', badge: "Trễ 45'", bg: '#fef3c7', color: '#d97706' },
  { date: '21/04', times: 'WFH', badge: 'WFH', bg: '#EEF1FF', color: '#4F6EF7' },
  { date: '18/04', times: '08:01 → 17:33', badge: 'Đúng giờ', bg: '#dcfce7', color: '#16a34a' },
  { date: '17/04', times: 'Nghỉ phép', badge: 'Phép', bg: '#ede9fe', color: '#7c3aed' },
];

const BAR_COLORS: Record<string, [string, string]> = {
  ok: ['#16a34a', '#4ade80'],
  late: ['#d97706', '#fbbf24'],
  absent: ['#ef4444', '#f87171'],
};

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T2', 'T3', 'T4', 'T5', 'T6', 'T2', 'T3'];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
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
    avaTxt: { fontSize: 26, fontWeight: '800', color: '#fff' },
    avaStatus: { position: 'absolute', bottom: 3, right: 3, width: 16, height: 16, borderRadius: 9999, backgroundColor: '#4ade80', borderWidth: 2, borderColor: '#fff' },
    heroName: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
    heroMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    statsStrip: { flexDirection: 'row', backgroundColor: colors.border, gap: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16 },
    statItem: { flex: 1, backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
    statVal: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 22 },
    statLbl: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
    content: { paddingHorizontal: 16 },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    actPrimary: { backgroundColor: '#4F6EF7' },
    actPrimaryTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    actSecondary: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
    actSecondaryTxt: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    actSuccess: { backgroundColor: '#dcfce7' },
    actSuccessTxt: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
    infoRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    irIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.separator, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    irLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
    irVal: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 60, marginTop: 12 },
    chartBar: { flex: 1, borderRadius: 4, minHeight: 8 },
    chartLabels: { flexDirection: 'row', gap: 4, marginTop: 4 },
    chartLabel: { flex: 1, textAlign: 'center', fontSize: 9, color: colors.textMuted },
    attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
    attDate: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, width: 60, flexShrink: 0 },
    attTimes: { flex: 1, fontSize: 12, color: colors.textMuted },
    attBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
    attBadgeTxt: { fontSize: 11, fontWeight: '700' },
  });
}

export default function EmployeeProfileViewScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1e40af', '#3b58ef', '#5b3fcb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.ring, styles.r1]} />
        <View style={[styles.ring, styles.r2]} />
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.hActBtn} onPress={() => navigation.navigate('PerformanceReview')} activeOpacity={0.7}>
              <Icon name="star-outline" size={16} color="#fff" library="ionicons" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.hActBtn} activeOpacity={0.7}>
              <Icon name="share-social-outline" size={16} color="#fff" library="ionicons" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.heroProfile}>
          <View style={styles.avaWrap}>
            <View style={styles.ava}><Text style={styles.avaTxt}>HN</Text></View>
            <View style={styles.avaStatus} />
          </View>
          <Text style={styles.heroName}>Hoàng Ngọc Anh</Text>
          <Text style={styles.heroMeta}>NV0042 · Kỹ thuật · Senior Dev</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsStrip}>
        <View style={styles.statItem}><Text style={[styles.statVal, { color: '#4F6EF7' }]}>96%</Text><Text style={styles.statLbl}>Chuyên cần</Text></View>
        <View style={[styles.statItem, styles.statBorder]}><Text style={[styles.statVal, { color: '#16a34a' }]}>22</Text><Text style={styles.statLbl}>Ngày đúng giờ</Text></View>
        <View style={styles.statItem}><Text style={[styles.statVal, { color: '#d97706' }]}>2</Text><Text style={styles.statLbl}>Ngày trễ</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actBtn, styles.actPrimary]} onPress={() => navigation.navigate('PerformanceReview')} activeOpacity={0.85}>
            <Icon name="star-outline" size={16} color="#fff" library="ionicons" />
            <Text style={styles.actPrimaryTxt}>Đánh giá</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, styles.actSecondary]} activeOpacity={0.85}>
            <Icon name="call-outline" size={16} color={colors.textPrimary} library="ionicons" />
            <Text style={styles.actSecondaryTxt}>Liên hệ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, styles.actSuccess]} activeOpacity={0.85}>
            <Icon name="mail-outline" size={16} color="#16a34a" library="ionicons" />
            <Text style={styles.actSuccessTxt}>Email</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.profile.personalInfo}</Text>
          {[
            { icon: 'person-outline', label: t.profile.employeeId, val: 'NV0042' },
            { icon: 'call-outline', label: t.profile.phone, val: '0901 234 567' },
            { icon: 'mail-outline', label: t.profile.email, val: 'hoangngocank@company.com' },
            { icon: 'calendar-outline', label: t.profile.joinDate, val: '15/03/2022 · 3 năm 1 tháng' },
            { icon: 'time-outline', label: 'Ca làm việc', val: 'Ca sáng: 08:00 – 12:00' },
          ].map((row, i) => (
            <View key={row.label} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
              <View style={styles.irIcon}><Icon name={row.icon as any} size={15} color={colors.textMuted} library="ionicons" /></View>
              <View>
                <Text style={styles.irLabel}>{row.label}</Text>
                <Text style={styles.irVal}>{row.val}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Điểm danh tháng 4/2026</Text>
          <View style={styles.chartRow}>
            {ATT_BARS.map((bar, i) => (
              <LinearGradient
                key={i}
                colors={BAR_COLORS[bar.type]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={[styles.chartBar, { height: `${bar.h * 100}%` as any }]}
              />
            ))}
          </View>
          <View style={styles.chartLabels}>
            {DAY_LABELS.map((d, i) => <Text key={i} style={styles.chartLabel}>{d}</Text>)}
          </View>

          <View style={{ marginTop: 16 }}>
            {ATT_RECORDS.map((row) => (
              <View key={row.date} style={styles.attRow}>
                <Text style={styles.attDate}>{row.date}</Text>
                <Text style={styles.attTimes}>{row.times}</Text>
                <View style={[styles.attBadge, { backgroundColor: row.bg }]}>
                  <Text style={[styles.attBadgeTxt, { color: row.color }]}>{row.badge}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Số dư phép năm 2026</Text>
          <View style={styles.infoRow}>
            <View style={styles.irIcon}><Icon name="calendar-outline" size={15} color={colors.textMuted} library="ionicons" /></View>
            <View><Text style={styles.irLabel}>Phép năm</Text><Text style={styles.irVal}>12 / 15 ngày còn lại</Text></View>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <View style={styles.irIcon}><Icon name="pulse-outline" size={15} color={colors.textMuted} library="ionicons" /></View>
            <View><Text style={styles.irLabel}>Phép ốm</Text><Text style={styles.irVal}>10 / 10 ngày còn lại</Text></View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
