import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useSubmitPerformanceReview } from '../../hooks/useManagerQueries';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

const STAR_CRITERIA = [
  { id: 0, label: 'Chất lượng công việc', desc: 'Độ chính xác, hoàn chỉnh và cẩn thận trong công việc', initial: 5 },
  { id: 1, label: 'Tinh thần đội nhóm', desc: 'Khả năng hợp tác, hỗ trợ đồng nghiệp', initial: 4 },
  { id: 2, label: 'Sáng kiến & Chủ động', desc: 'Đề xuất ý tưởng mới, giải quyết vấn đề chủ động', initial: 4 },
];

const PROG_CRITERIA = [
  { id: 0, label: 'Chuyên cần & Đúng giờ', initial: 96 },
  { id: 1, label: 'Hoàn thành KPI', initial: 88 },
  { id: 2, label: 'Giao tiếp & Báo cáo', initial: 80 },
];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: colors.background },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
    content: { paddingHorizontal: 16, paddingTop: 8 },
    empMini: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    emAva: { width: 44, height: 44, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    emAvaTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
    emName: { fontSize: 14, fontWeight: '700', color: '#fff' },
    emRole: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
    emPeriod: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, flexShrink: 0 },
    emPeriodTxt: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    overallCard: { backgroundColor: '#fef3c7', borderRadius: 16, borderWidth: 1, borderColor: '#fcd34d', padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    overallScore: { fontSize: 48, fontWeight: '800', color: '#92400e', letterSpacing: -2, lineHeight: 52 },
    overallScoreSub: { fontSize: 20, fontWeight: '600', color: '#b45309' },
    oiLabel: { fontSize: 11, fontWeight: '600', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 },
    oiGrade: { fontSize: 22, fontWeight: '800', color: '#92400e', marginTop: 2 },
    oiSub: { fontSize: 11, color: '#b45309', marginTop: 2 },
    overallRing: { width: 60, height: 60, borderRadius: 9999, borderWidth: 6, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    ringPct: { fontSize: 13, fontWeight: '800', color: '#92400e' },
    secLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
    ratingItem: { paddingBottom: 14 },
    ratingItemBorder: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
    riHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    riLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    riScore: { fontSize: 14, fontWeight: '800', color: '#4F6EF7' },
    starsRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    riDesc: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    progItem: {},
    progHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    progVal: { fontSize: 13, fontWeight: '700', color: '#4F6EF7' },
    progTrack: { height: 8, borderRadius: 4, backgroundColor: colors.separator, overflow: 'hidden' },
    progFill: { height: '100%', borderRadius: 4 },
    taLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
    textarea: { minHeight: 80, borderRadius: 10, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, fontSize: 13, color: colors.inputText, padding: 10, lineHeight: 20 },
    actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
    submitBtn: { height: 52, borderRadius: 14, backgroundColor: '#4F6EF7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    submitTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    ovIcon: { width: 80, height: 80, borderRadius: 9999, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    ovTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    ovSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  });
}

export default function PerformanceReviewScreen() {
  const navigation = useNavigation<any>();
  const [stars, setStars] = useState([5, 4, 4]);
  const [progs] = useState([96, 88, 80]);
  const [strengths, setStrengths] = useState('- Kỹ năng kỹ thuật xuất sắc, luôn hoàn thành task đúng deadline\n- Chủ động báo cáo sự cố sớm\n- Hỗ trợ tốt thành viên junior trong team');
  const [improvements, setImprovements] = useState('- Cần tăng cường tham gia họp nhóm đầy đủ hơn\n- Kỹ năng thuyết trình kết quả cần nâng cao');
  const [goals, setGoals] = useState('- Hoàn thành ít nhất 2 module của dự án XYZ\n- Tham gia 1 khóa đào tạo kỹ năng lãnh đạo');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="chevron-back-outline" size={18} color={colors.textSecondary} library="ionicons" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Đánh giá hiệu suất</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Employee mini */}
        <LinearGradient colors={['#3a58ef', '#5b3fcb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.empMini}>
          <View style={styles.emAva}><Text style={styles.emAvaTxt}>HN</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emName}>Hoàng Ngọc Anh</Text>
            <Text style={styles.emRole}>Kỹ thuật · Senior Developer</Text>
          </View>
          <View style={styles.emPeriod}><Text style={styles.emPeriodTxt}>Q2 / 2026</Text></View>
        </LinearGradient>

        {/* Overall */}
        <View style={styles.overallCard}>
          <View>
            <Text style={styles.overallScore}>{avgStars}<Text style={styles.overallScoreSub}>/5</Text></Text>
          </View>
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={styles.oiLabel}>Đánh giá tổng thể</Text>
            <Text style={styles.oiGrade}>{grade}</Text>
            <Text style={styles.oiSub}>Vượt kỳ vọng</Text>
          </View>
          <View style={styles.overallRing}>
            <Text style={styles.ringPct}>{overallPct}%</Text>
          </View>
        </View>

        {/* Star ratings */}
        <Text style={styles.secLabel}>Đánh giá theo tiêu chí</Text>
        <View style={styles.card}>
          {STAR_CRITERIA.map((c, ci) => (
            <View key={c.id} style={[styles.ratingItem, ci > 0 && styles.ratingItemBorder]}>
              <View style={styles.riHeader}>
                <Text style={styles.riLabel}>{c.label}</Text>
                <Text style={styles.riScore}>{stars[c.id]}/5</Text>
              </View>
              <View style={styles.starsRow}>
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
              <Text style={styles.riDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>

        {/* Progress bars */}
        <View style={styles.card}>
          {PROG_CRITERIA.map((p, pi) => (
            <View key={p.id} style={[styles.progItem, pi > 0 && { marginTop: 12 }]}>
              <View style={styles.progHeader}>
                <Text style={styles.progLabel}>{p.label}</Text>
                <Text style={styles.progVal}>{progs[p.id]}%</Text>
              </View>
              <View style={styles.progTrack}>
                <LinearGradient
                  colors={['#4F6EF7', '#7c3aed']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progFill, { width: (progs[p.id] + '%') as any }]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Feedback text areas */}
        <Text style={styles.secLabel}>Nhận xét chi tiết</Text>
        <View style={styles.card}>
          <Text style={styles.taLabel}>Điểm mạnh</Text>
          <TextInput style={styles.textarea} multiline value={strengths} onChangeText={setStrengths} placeholder="Nhập điểm mạnh của nhân viên..." placeholderTextColor={colors.inputPlaceholder} textAlignVertical="top" />
        </View>
        <View style={styles.card}>
          <Text style={styles.taLabel}>Điểm cần cải thiện</Text>
          <TextInput style={styles.textarea} multiline value={improvements} onChangeText={setImprovements} placeholder="Nhập điểm cần cải thiện..." placeholderTextColor={colors.inputPlaceholder} textAlignVertical="top" />
        </View>
        <View style={styles.card}>
          <Text style={styles.taLabel}>Mục tiêu Q3/2026</Text>
          <TextInput style={styles.textarea} multiline value={goals} onChangeText={setGoals} placeholder="Nhập mục tiêu cho kỳ tới..." placeholderTextColor={colors.inputPlaceholder} textAlignVertical="top" />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85} disabled={isPending}>
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="checkmark-outline" size={18} color="#fff" library="ionicons" />
              <Text style={styles.submitTxt}>{t.common.submit}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Overlay */}
      {overlayVisible && (
        <View style={styles.overlay}>
          <View style={styles.ovIcon}>
            <Icon name="checkmark-outline" size={40} color="#16a34a" library="ionicons" />
          </View>
          <Text style={styles.ovTitle}>{t.common.success}!</Text>
          <Text style={styles.ovSub}>Đánh giá Q2/2026 của Hoàng Ngọc Anh đã được lưu thành công.</Text>
        </View>
      )}
    </View>
  );
}
