import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useSubmitPerformanceReview } from '../../hooks/useManagerQueries';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';

const STAR_CRITERIA = [
  { id: 0, label: 'Chất lượng công việc', desc: 'Độ chính xác, hoàn chỉnh và cẩn thận trong công việc', initial: 0 },
  { id: 1, label: 'Tinh thần đội nhóm', desc: 'Khả năng hợp tác, hỗ trợ đồng nghiệp', initial: 0 },
  { id: 2, label: 'Sáng kiến & Chủ động', desc: 'Đề xuất ý tưởng mới, giải quyết vấn đề chủ động', initial: 0 },
];

const PROG_CRITERIA = [
  { id: 0, label: 'Chuyên cần & Đúng giờ', initial: 0 },
  { id: 1, label: 'Hoàn thành KPI', initial: 0 },
  { id: 2, label: 'Giao tiếp & Báo cáo', initial: 0 },
];

export default function PerformanceReviewScreen() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const navigation = useNavigation<any>();
  const [stars, setStars] = useState([0, 0, 0]);
  const [progs] = useState([0, 0, 0]);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [goals, setGoals] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(false);

  const avgStars = (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(1);
  const avgProg = Math.round(progs.reduce((a, b) => a + b, 0) / progs.length);
  const overallPct = Math.round(((parseFloat(avgStars) / 5) * 0.6 + (avgProg / 100) * 0.4) * 100);
  const grade = overallPct >= 90 ? 'Xuất sắc' : overallPct >= 80 ? 'Tốt' : overallPct >= 70 ? 'Khá' : 'Trung bình';

  const { mutateAsync: submitReview, isPending } = useSubmitPerformanceReview();

  async function handleSubmit() {
    try {
      await submitReview({ stars, progs, strengths, improvements, goals });
      setOverlayVisible(true);
      setTimeout(() => navigation.goBack(), 2200);
    } catch (err) {
      console.log('Error submitting review', err);
    }
  }

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="chevron-back-outline" size={18} color={theme.colors.text.secondary} library="ionicons" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Đánh giá hiệu suất</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Employee mini */}
        <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.empMini}>
          <View style={s.emAva}><Text style={s.emAvaTxt}>HN</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.emName}>Hoàng Ngọc Anh</Text>
            <Text style={s.emRole}>Kỹ thuật · Senior Developer</Text>
          </View>
          <View style={s.emPeriod}><Text style={s.emPeriodTxt}>Q2 / 2026</Text></View>
        </LinearGradient>

        {/* Overall */}
        <View style={s.overallCard}>
          <View>
            <Text style={s.overallScore}>{avgStars}<Text style={s.overallScoreSub}>/5</Text></Text>
          </View>
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={s.oiLabel}>Đánh giá tổng thể</Text>
            <Text style={s.oiGrade}>{grade}</Text>
            <Text style={s.oiSub}>Vượt kỳ vọng</Text>
          </View>
          <View style={s.overallRing}>
            <Text style={s.ringPct}>{overallPct}%</Text>
          </View>
        </View>

        {/* Star ratings */}
        <Text style={s.secLabel}>Đánh giá theo tiêu chí</Text>
        <View style={s.card}>
          {STAR_CRITERIA.map((c, ci) => (
            <View key={c.id} style={[s.ratingItem, ci > 0 && s.ratingItemBorder]}>
              <View style={s.riHeader}>
                <Text style={s.riLabel}>{c.label}</Text>
                <Text style={s.riScore}>{stars[c.id]}/5</Text>
              </View>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <TouchableOpacity key={v} onPress={() => setStars((prev) => prev.map((val, i) => i === c.id ? v : val))} activeOpacity={0.7}>
                    <Icon
                      name={v <= stars[c.id] ? 'star' : 'star-outline'}
                      size={28}
                      color={v <= stars[c.id] ? '#fbbf24' : '#d1d5db'}
                      library="ionicons"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.riDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>

        {/* Progress bars */}
        <View style={s.card}>
          {PROG_CRITERIA.map((p, pi) => (
            <View key={p.id} style={[s.progItem, pi > 0 && { marginTop: 12 }]}>
              <View style={s.progHeader}>
                <Text style={s.progLabel}>{p.label}</Text>
                <Text style={s.progVal}>{progs[p.id]}%</Text>
              </View>
              <View style={s.progTrack}>
                <LinearGradient
                  colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.progFill, { width: (progs[p.id] + '%') as any }]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Feedback text areas */}
        <Text style={s.secLabel}>Nhận xét chi tiết</Text>
        <View style={s.card}>
          <Text style={s.taLabel}>Điểm mạnh</Text>
          <TextInput style={s.textarea} multiline value={strengths} onChangeText={setStrengths} placeholder="Nhập điểm mạnh của nhân viên..." placeholderTextColor={theme.colors.text.muted} textAlignVertical="top" />
        </View>
        <View style={s.card}>
          <Text style={s.taLabel}>Điểm cần cải thiện</Text>
          <TextInput style={s.textarea} multiline value={improvements} onChangeText={setImprovements} placeholder="Nhập điểm cần cải thiện..." placeholderTextColor={theme.colors.text.muted} textAlignVertical="top" />
        </View>
        <View style={s.card}>
          <Text style={s.taLabel}>Mục tiêu Q3/2026</Text>
          <TextInput style={s.textarea} multiline value={goals} onChangeText={setGoals} placeholder="Nhập mục tiêu cho kỳ tới..." placeholderTextColor={theme.colors.text.muted} textAlignVertical="top" />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit */}
      <View style={s.actionBar}>
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.85} disabled={isPending}>
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="checkmark-outline" size={18} color="#fff" library="ionicons" />
              <Text style={s.submitTxt}>Gửi đánh giá</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Overlay */}
      {overlayVisible && (
        <View style={s.overlay}>
          <View style={s.ovIcon}>
            <Icon name="checkmark-outline" size={40} color={theme.colors.status.success} library="ionicons" />
          </View>
          <Text style={s.ovTitle}>Thành công!</Text>
          <Text style={s.ovSub}>Đánh giá Q2/2026 của Hoàng Ngọc Anh đã được lưu thành công.</Text>
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
    empMini: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    emAva: { width: 44, height: 44, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    emAvaTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
    emName: { fontSize: 14, fontWeight: '700', color: '#fff' },
    emRole: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
    emPeriod: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, flexShrink: 0 },
    emPeriodTxt: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    overallCard: { backgroundColor: t.colors.status.warningBg, borderRadius: 16, borderWidth: 1, borderColor: '#fcd34d', padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    overallScore: { fontSize: 48, fontWeight: '800', color: '#92400e', letterSpacing: -2, lineHeight: 52 },
    overallScoreSub: { fontSize: 20, fontWeight: '600', color: '#b45309' },
    oiLabel: { fontSize: 11, fontWeight: '600', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 },
    oiGrade: { fontSize: 22, fontWeight: '800', color: '#92400e', marginTop: 2 },
    oiSub: { fontSize: 11, color: '#b45309', marginTop: 2 },
    overallRing: { width: 60, height: 60, borderRadius: 9999, borderWidth: 6, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    ringPct: { fontSize: 13, fontWeight: '800', color: '#92400e' },
    secLabel: { fontSize: 12, fontWeight: '700', color: t.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    card: { backgroundColor: t.colors.background.surface, borderRadius: 16, borderWidth: 1, borderColor: t.colors.border.default, padding: 16, marginBottom: 12 },
    ratingItem: { paddingBottom: 14 },
    ratingItemBorder: { borderTopWidth: 1, borderTopColor: t.colors.border.default, paddingTop: 14 },
    riHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    riLabel: { fontSize: 14, fontWeight: '600', color: t.colors.text.primary },
    riScore: { fontSize: 14, fontWeight: '800', color: t.colors.brand.primary },
    starsRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    riDesc: { fontSize: 11, color: t.colors.text.muted, marginTop: 4 },
    progItem: {},
    progHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progLabel: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary },
    progVal: { fontSize: 13, fontWeight: '700', color: t.colors.brand.primary },
    progTrack: { height: 8, borderRadius: 4, backgroundColor: t.colors.background.base, overflow: 'hidden' },
    progFill: { height: '100%', borderRadius: 4 },
    taLabel: { fontSize: 13, fontWeight: '600', color: t.colors.text.primary, marginBottom: 8 },
    textarea: { minHeight: 80, borderRadius: 10, borderWidth: 1.5, borderColor: t.colors.border.default, backgroundColor: t.colors.background.surface, fontSize: 13, color: t.colors.text.primary, padding: 10, lineHeight: 20 },
    actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, backgroundColor: t.colors.background.surface, borderTopWidth: 1, borderTopColor: t.colors.border.default },
    submitBtn: { height: 52, borderRadius: 14, backgroundColor: t.colors.brand.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    submitTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    ovIcon: { width: 80, height: 80, borderRadius: 9999, backgroundColor: t.colors.status.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    ovTitle: { fontSize: 22, fontWeight: '800', color: t.colors.text.primary, marginBottom: 8 },
    ovSub: { fontSize: 14, color: t.colors.text.muted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  });
}
