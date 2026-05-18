import React, { useEffect } from 'react';
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

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'NotificationDetail'>;
  route: RouteProp<RootStackParamList, 'NotificationDetail'>;
};

export default function NotificationDetailScreen({ navigation, route }: Props) {
  const markAsRead = useMarkAsRead();
  const notificationId = (route?.params as any)?.notificationId;

  // Auto-mark as read when opening
  useEffect(() => {
    if (notificationId) {
      markAsRead.mutate(notificationId);
    }
  }, [notificationId]);

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={['#16a34a', '#15803d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRing} />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back-outline" size={16} color="#fff" library="ionicons" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Chi tiết thông báo</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.heroIcon}>
          <Icon name="checkmark-done-outline" size={32} color="#16a34a" library="ionicons" />
        </View>
        <Text style={styles.heroTitle}>Đơn nghỉ phép được duyệt ✓</Text>
        <Text style={styles.heroTime}>08:30 · Hôm nay, 23/04/2025</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Message */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nội dung thông báo</Text>
          <Text style={styles.msgText}>
            Đơn nghỉ phép 25–26/04/2025 của bạn đã được{' '}
            <Text style={{ fontWeight: '700', color: '#191c1e' }}>Nguyễn Thị A</Text>{' '}
            chấp thuận lúc 08:28 ngày 23/04/2025.{'\n\n'}
            Số ngày phép còn lại của bạn sau kỳ nghỉ này là <Text style={{ fontWeight: '700', color: '#16a34a' }}>12 ngày</Text>.
          </Text>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin liên quan</Text>
          {[
            { label: 'Loại đơn', val: 'Nghỉ phép năm' },
            { label: 'Từ ngày', val: '25/04/2025' },
            { label: 'Đến ngày', val: '26/04/2025' },
            { label: 'Người duyệt', val: 'Nguyễn Thị A' },
            { label: 'Thời gian duyệt', val: '23/04/2025 · 08:28' },
          ].map((d) => (
            <View key={d.label} style={styles.detailRow}>
              <Text style={styles.drLabel}>{d.label}</Text>
              <Text style={styles.drValue}>{d.val}</Text>
            </View>
          ))}
        </View>

        {/* Action */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <LinearGradient
            colors={['#4F6EF7', '#3a52dd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionBtnText}>Xem chi tiết đơn từ</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backListBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backListText}>Quay lại thông báo</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },
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
  topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  heroIcon: {
    width: 64, height: 64, borderRadius: 9999,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.3 },
  heroTime: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#191c1e', marginBottom: 12 },
  msgText: { fontSize: 14, color: '#444654', lineHeight: 22 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f3f4f8',
  },
  drLabel: { fontSize: 13, color: '#9ca3af' },
  drValue: { fontSize: 13, fontWeight: '600', color: '#444654' },
  actionBtn: { borderRadius: 9999, overflow: 'hidden', marginBottom: 10 },
  actionGradient: { height: 50, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  backListBtn: {
    height: 50, borderRadius: 9999,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  backListText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
});
