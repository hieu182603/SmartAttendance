import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../components/ui/Icon';
import { useAdminStats } from '../../hooks/useAdminQueries';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '../../theme';

const { width } = Dimensions.get('window');

export default function AdminReportsScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const { data: statsData, isLoading } = useAdminStats();

  const totalEmployees = statsData?.kpi?.totalEmployees || 0;
  const presentToday = statsData?.kpi?.presentToday || 0;
  const lateToday = statsData?.kpi?.lateToday || 0;
  const absentToday = statsData?.kpi?.absentToday || 0;
  const attendanceRate = totalEmployees > 0 ? ((presentToday + lateToday) / totalEmployees * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Tỉ lệ đi làm', value: `${attendanceRate}%`, icon: 'trending-up-outline', color: theme.colors.status.success },
    { label: 'Số người muộn', value: `${lateToday}`, icon: 'time-outline', color: theme.colors.status.warning },
    { label: 'Số người vắng', value: `${absentToday}`, icon: 'person-remove-outline', color: theme.colors.status.danger },
  ];

  const chartData = (statsData?.attendanceData || []).map((item: any) => {
    const totalDay = item.present + item.late + item.absent;
    const rate = totalDay > 0 ? ((item.present + item.late) / totalDay) * 100 : 0;
    return { day: item.date, value: rate };
  });

  const reportTypes = [
    { id: 1, title: 'Báo cáo điểm danh', subtitle: 'Chi tiết check-in/out hằng ngày', icon: 'document-text-outline' },
    { id: 2, title: 'Tổng hợp bảng lương', subtitle: 'Thống kê giờ làm và tăng ca', icon: 'card-outline' },
    { id: 3, title: 'Năng suất phòng ban', subtitle: 'Hiệu quả theo từng phòng ban', icon: 'business-outline' },
    { id: 4, title: 'Kiểm tra bảo mật', subtitle: 'Nhật ký truy cập và thay đổi', icon: 'shield-checkmark-outline' },
  ];

  if (isLoading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[theme.colors.brand.primaryHover, '#9333ea'] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGradient}
      >
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 12 }}>
              <Icon name="arrow-back-outline" size={24} color={theme.colors.text.onPrimary} library="ionicons" />
            </TouchableOpacity>
            <View>
              <Text style={s.headerTitle}>Báo cáo & Phân tích</Text>
              <Text style={s.headerSubtitle}>Dữ liệu hệ thống thời gian thực</Text>
            </View>
          </View>
          <TouchableOpacity style={s.actionBtn}>
            <Icon name="ellipsis-vertical-outline" size={24} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
        </View>

        <View style={s.periodSelectorWrapper}>
          <View style={s.periodSelector}>
            {['Weekly'].map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setSelectedPeriod(period)}
                style={[s.periodBtn, selectedPeriod === period && s.periodBtnActive]}
              >
                <Text style={[s.periodText, selectedPeriod === period && s.periodTextActive]}>
                  {period === 'Weekly' ? '7 Ngày Qua' : period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <View style={s.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={s.statCard}>
              <View style={[s.statIconBox, { backgroundColor: `${stat.color}15` }]}>
                <Icon name={stat.icon} size={20} color={stat.color} library="ionicons" />
              </View>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.chartCard}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Tỉ lệ đi làm 7 Ngày Qua (%)</Text>
            <Icon name="trending-up-outline" size={18} color={theme.colors.status.success} library="ionicons" />
          </View>
          <View style={s.chartArea}>
            {chartData.length > 0 ? chartData.map((item: any, index: number) => (
              <View key={index} style={s.barContainer}>
                <View style={s.barBg}>
                  <View style={[s.barFill, { height: `${Math.max(item.value, 5)}%` as any, backgroundColor: item.value > 80 ? theme.colors.brand.primary : theme.colors.brand.primaryActive }]}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
                      style={[StyleSheet.absoluteFill, { borderRadius: 4 }]}
                    />
                  </View>
                </View>
                <Text style={s.barLabel}>{item.day}</Text>
              </View>
            )) : (
              <Text style={{ color: theme.colors.text.muted, alignSelf: 'center', flex: 1, textAlign: 'center' }}>Chưa có dữ liệu</Text>
            )}
          </View>
        </View>

        <View style={s.reportListSection}>
          <Text style={s.sectionHeading}>Danh sách báo cáo</Text>
          {reportTypes.map((report) => (
            <TouchableOpacity key={report.id} style={s.reportCard}>
              <View style={s.reportIconBox}>
                <Icon name={report.icon} size={22} color={theme.colors.brand.primary} library="ionicons" />
              </View>
              <View style={s.reportMetaData}>
                <Text style={s.reportTitleText}>{report.title}</Text>
                <Text style={s.reportSubtitleText}>{report.subtitle}</Text>
              </View>
              <Icon name="chevron-forward-outline" size={20} color={theme.colors.text.muted} library="ionicons" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    headerGradient: {
      paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20,
      borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: t.colors.text.onPrimary, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    periodSelectorWrapper: { marginBottom: 8 },
    periodSelector: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 6, height: 48 },
    periodBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    periodBtnActive: { backgroundColor: t.colors.brand.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
    periodText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
    periodTextActive: { color: t.colors.text.onPrimary },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16, marginTop: 16 },
    statCard: {
      flex: 1, padding: 16, borderRadius: 16, alignItems: 'center',
      backgroundColor: t.colors.background.surface, borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 18, fontWeight: '800', color: t.colors.text.primary, marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '600', color: t.colors.text.muted, textAlign: 'center' },
    chartCard: {
      backgroundColor: t.colors.background.surface, padding: 20, borderRadius: 24, marginBottom: 20,
      borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: t.colors.text.primary },
    chartArea: { flexDirection: 'row', height: 160, alignItems: 'flex-end', justifyContent: 'space-between' },
    barContainer: { alignItems: 'center', flex: 1 },
    barBg: { width: 10, height: 120, borderRadius: 5, backgroundColor: t.colors.background.base, justifyContent: 'flex-end', marginBottom: 10 },
    barFill: { width: '100%', borderRadius: 5, overflow: 'hidden' },
    barLabel: { fontSize: 11, fontWeight: '600', color: t.colors.text.muted },
    reportListSection: { marginTop: 4 },
    sectionHeading: { fontSize: 20, fontWeight: '800', color: t.colors.text.primary, marginBottom: 16 },
    reportCard: {
      flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12,
      backgroundColor: t.colors.background.surface, borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    reportIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: t.colors.status.infoBg, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    reportMetaData: { flex: 1 },
    reportTitleText: { fontSize: 16, fontWeight: '700', color: t.colors.text.primary, marginBottom: 2 },
    reportSubtitleText: { fontSize: 13, color: t.colors.text.muted },
  });
}
