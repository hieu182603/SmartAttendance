import React, { useEffect, useMemo } from 'react';
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
import { useMarkAsRead } from '../../hooks/useNotificationQueries';
import { useTheme, Theme } from '../../theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'NotificationDetail'>;
  route: RouteProp<RootStackParamList, 'NotificationDetail'>;
};

export default function NotificationDetailScreen({ navigation, route }: Props) {
  const markAsRead = useMarkAsRead();
  const notificationId = (route?.params as any)?.notificationId;
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  // Auto-mark as read when opening
  useEffect(() => {
    if (notificationId) {
      markAsRead.mutate(notificationId);
    }
  }, [notificationId]);

  return (
    <View style={s.root}>
      {/* Hero */}
      <LinearGradient
        colors={[theme.colors.status.success, theme.colors.brand.secondary] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroRing} />
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Chi tiết thông báo</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.heroIcon}>
          <Icon name="checkmark-done-outline" size={32} color={theme.colors.status.success} library="ionicons" />
        </View>
        <Text style={s.heroTitle}>Đơn nghỉ phép được duyệt ✓</Text>
        <Text style={s.heroTime}>08:30 · Hôm nay, 23/04/2025</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Message */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Nội dung thông báo</Text>
          <Text style={s.msgText}>
            Đơn nghỉ phép 25–26/04/2025 của bạn đã được{' '}
            <Text style={{ fontWeight: '700', color: theme.colors.text.primary }}>Nguyễn Thị A</Text>{' '}
            chấp thuận lúc 08:28 ngày 23/04/2025.{'\n\n'}
            Số ngày phép còn lại của bạn sau kỳ nghỉ này là <Text style={{ fontWeight: '700', color: theme.colors.status.success }}>12 ngày</Text>.
          </Text>
        </View>

        {/* Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Thông tin liên quan</Text>
          {[
            { label: 'Loại đơn', val: 'Nghỉ phép năm' },
            { label: 'Từ ngày', val: '25/04/2025' },
            { label: 'Đến ngày', val: '26/04/2025' },
            { label: 'Người duyệt', val: 'Nguyễn Thị A' },
            { label: 'Thời gian duyệt', val: '23/04/2025 · 08:28' },
          ].map((d) => (
            <View key={d.label} style={s.detailRow}>
              <Text style={s.drLabel}>{d.label}</Text>
              <Text style={s.drValue}>{d.val}</Text>
            </View>
          ))}
        </View>

        {/* Action */}
        <TouchableOpacity style={s.actionBtn} activeOpacity={0.85}>
          <LinearGradient
            colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.actionGradient}
          >
            <Text style={s.actionBtnText}>Xem chi tiết đơn từ</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.backListBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backListText}>Quay lại thông báo</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    hero: {
      paddingTop: 56,
      paddingBottom: 28,
      paddingHorizontal: 20,
      overflow: 'hidden',
    },
    heroRing: {
      position: 'absolute', top: -60, right: -60,
      width: 180, height: 180, borderRadius: 90,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 16, fontWeight: '700', color: t.colors.text.onPrimary },
    heroIcon: {
      width: 64, height: 64, borderRadius: 9999,
      backgroundColor: t.colors.background.surface,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    heroTitle: { fontSize: 20, fontWeight: '800', color: t.colors.text.onPrimary, marginBottom: 6, letterSpacing: -0.3 },
    heroTime: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    content: { padding: 16 },
    card: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: t.colors.text.primary, marginBottom: 12 },
    msgText: { fontSize: 14, color: t.colors.text.secondary, lineHeight: 22 },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.colors.background.base,
    },
    drLabel: { fontSize: 13, color: t.colors.text.muted },
    drValue: { fontSize: 13, fontWeight: '600', color: t.colors.text.secondary },
    actionBtn: { borderRadius: 9999, overflow: 'hidden', marginBottom: 10 },
    actionGradient: { height: 50, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: t.colors.text.onPrimary },
    backListBtn: {
      height: 50, borderRadius: 9999,
      backgroundColor: t.colors.background.surface, borderWidth: 1.5, borderColor: t.colors.border.default,
      alignItems: 'center', justifyContent: 'center',
    },
    backListText: { fontSize: 14, fontWeight: '600', color: t.colors.text.muted },
  });
}
