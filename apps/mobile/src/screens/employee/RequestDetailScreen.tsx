import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'RequestDetail'>;
  route: RouteProp<RootStackParamList, 'RequestDetail'>;
};

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    hero: {
      paddingTop: 56,
      paddingBottom: 24,
      paddingHorizontal: 20,
      overflow: 'hidden',
    },
    heroRing: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    heroType: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12, letterSpacing: -0.4 },
    heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    heroBadgeApproved: {
      backgroundColor: '#dcfce7',
      borderRadius: 9999,
      paddingVertical: 5,
      paddingHorizontal: 12,
    },
    heroBadgeApprovedText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
    heroDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    content: { padding: 16 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    drLabel: { fontSize: 13, color: colors.textMuted },
    drValue: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'right', flex: 1, paddingLeft: 16 },
    // Timeline
    tlItem: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
      position: 'relative',
    },
    tlDot: {
      width: 28,
      height: 28,
      borderRadius: 9999,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      zIndex: 1,
    },
    tlDotDone: { backgroundColor: '#16a34a' },
    tlLine: {
      position: 'absolute',
      left: 13,
      top: 28,
      width: 2,
      height: 20,
      backgroundColor: colors.border,
    },
    tlBody: { flex: 1 },
    tlName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    tlRole: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    tlTime: { fontSize: 12, color: colors.textMuted },
    // Note
    noteBox: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
    },
    noteAuthor: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
    noteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    // Actions
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    btnPrimary: { flex: 1, borderRadius: 9999, overflow: 'hidden' },
    btnGradient: { height: 48, alignItems: 'center', justifyContent: 'center' },
    btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    btnDanger: {
      flex: 1,
      height: 48,
      borderRadius: 9999,
      backgroundColor: '#fef2f2',
      borderWidth: 1.5,
      borderColor: '#fecaca',
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnDangerText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
    btnOutline: {
      width: '100%',
      height: 48,
      borderRadius: 9999,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnOutlineText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  });
}

export default function RequestDetailScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const TIMELINE = [
    { name: 'Manager', role: t.requestDetail.approved + ' · Review', time: '23/04/2025 · 08:28', done: true },
    { name: 'System', role: 'Auto', time: '23/04/2025 · 08:30', done: true },
  ];

  const DETAILS = [
    { label: t.requests.type, val: t.requests.leaveTypes.annual },
    { label: t.requests.fromDate, val: '25/04/2025' },
    { label: t.requests.toDate, val: '26/04/2025' },
    { label: t.leaveBalance.used, val: '2 ' + t.common.day },
    { label: t.leaveBalance.remaining, val: '12 ' + t.common.day, green: true },
    { label: t.requests.reason, val: 'Family trip' },
    { label: t.requests.submittedOn, val: '22/04/2025 · 17:45' },
  ];

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={['#4f6ef7', '#7c5cbf']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRing} />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t.requestDetail.title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.heroType}>{t.requests.leaveTypes.annual}</Text>
        <Text style={styles.heroTitle}>{t.requests.leaveTypes.annual} 25–26/04</Text>
        <View style={styles.heroMeta}>
          <View style={styles.heroBadgeApproved}>
            <Text style={styles.heroBadgeApprovedText}>✓ {t.requestDetail.approved}</Text>
          </View>
          <Text style={styles.heroDate}>{t.requests.submittedOn} 22/04 · 17:45</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Detail card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.requestDetail.info}</Text>
          {DETAILS.map((d) => (
            <View key={d.label} style={styles.detailRow}>
              <Text style={styles.drLabel}>{d.label}</Text>
              <Text style={[styles.drValue, d.green && { color: '#16a34a' }]}>{d.val}</Text>
            </View>
          ))}
        </View>

        {/* Approval timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.requestDetail.timeline}</Text>
          {TIMELINE.map((item, i) => (
            <View key={item.name + i} style={styles.tlItem}>
              <View style={[styles.tlDot, item.done && styles.tlDotDone]}>
                {item.done && <Icon name="checkmark-outline" size={14} color="#fff" library="ionicons" />}
              </View>
              {i < TIMELINE.length - 1 && <View style={styles.tlLine} />}
              <View style={styles.tlBody}>
                <Text style={styles.tlName}>{item.name}</Text>
                <Text style={styles.tlRole}>{item.role}</Text>
                <Text style={styles.tlTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Note */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.requestDetail.approverNote}</Text>
          <View style={styles.noteBox}>
            <Text style={styles.noteAuthor}>Manager · 23/04 08:28</Text>
            <Text style={styles.noteText}>Approved. Leave planned, work handed over.</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={() => navigation.navigate('LeaveBalance')}>
            <LinearGradient
              colors={['#4F6EF7', '#3a52dd']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnPrimaryText}>{t.requestDetail.viewLeaveBalance}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnDanger} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <Text style={styles.btnDangerText}>{t.requestDetail.cancelRequest}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.btnOutlineText}>{t.requestDetail.backToList}</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
