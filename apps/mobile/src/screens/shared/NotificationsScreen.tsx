import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useNotificationsList, useMarkAllAsRead } from '../../hooks/useNotificationQueries';

type NavProp = StackNavigationProp<RootStackParamList>;

type Notif = {
  id: string;
  iconBg: string;
  iconColor: string;
  icon: string;
  title: string;
  msg: string;
  time: string;
  unread: boolean;
};

const GROUPS: { label: string; items: Notif[] }[] = [
  {
    label: 'Hôm nay',
    items: [
      { id: 'n1', iconBg: '#dcfce7', iconColor: '#16a34a', icon: 'checkmark-done-outline', title: 'Đơn nghỉ phép được duyệt ✓', msg: 'Đơn nghỉ phép 25–26/04/2025 của bạn đã được Nguyễn Thị A chấp thuận.', time: '08:30 · Hôm nay', unread: true },
      { id: 'n2', iconBg: '#EEF1FF', iconColor: '#4F6EF7', icon: 'log-in-outline', title: 'Check-in thành công', msg: 'Bạn đã check-in lúc 08:02 tại Văn phòng HCM. Chúc bạn ngày làm việc hiệu quả!', time: '08:02 · Hôm nay', unread: true },
    ],
  },
  {
    label: 'Hôm qua',
    items: [
      { id: 'n3', iconBg: '#fef3c7', iconColor: '#d97706', icon: 'alert-circle-outline', title: 'Nhắc nhở: Đăng ký OT đang chờ', msg: 'Đơn đăng ký OT ngày 22/04 của bạn chưa được duyệt. Trưởng nhóm Trần Văn B sẽ xem xét trong hôm nay.', time: '17:00 · Hôm qua', unread: false },
      { id: 'n4', iconBg: '#ede9fe', iconColor: '#7c3aed', icon: 'cash-outline', title: 'Bảng lương tháng 3 đã sẵn sàng', msg: 'Bảng lương tháng 3/2025 của bạn đã được tính toán và sẵn sàng để xem.', time: '09:00 · Hôm qua', unread: false },
    ],
  },
  {
    label: 'Tuần trước',
    items: [
      { id: 'n5', iconBg: '#fef2f2', iconColor: '#ef4444', icon: 'close-circle-outline', title: 'Đơn điều chỉnh giờ bị từ chối', msg: 'Đơn điều chỉnh giờ ngày 09/04 bị từ chối do thiếu bằng chứng. Vui lòng bổ sung và gửi lại.', time: '14:30 · 18/04', unread: false },
      { id: 'n6', iconBg: '#EEF1FF', iconColor: '#4F6EF7', icon: 'bar-chart-outline', title: 'Báo cáo tháng 3 đã sẵn sàng', msg: 'Báo cáo chấm công tháng 3/2025 đã được tổng hợp. Tổng 22 ngày làm việc, 176 giờ.', time: '09:00 · 17/04', unread: false },
    ],
  },
];

export default function NotificationsScreen() {
  const navigation = useNavigation<NavProp>();
  const { data: notifsData, isLoading } = useNotificationsList();
  const markAllRead = useMarkAllAsRead();

  // Map API data to grouped display format if available
  const apiNotifs = (notifsData?.data || notifsData || []);
  const hasApiData = apiNotifs.length > 0;

  const apiGroups = hasApiData ? [{
    label: 'Thông báo',
    items: apiNotifs.map((n: any) => ({
      id: n._id || n.id,
      iconBg: n.type === 'leave' ? '#dcfce7' : n.type === 'attendance' ? '#EEF1FF' : '#fef3c7',
      iconColor: n.type === 'leave' ? '#16a34a' : n.type === 'attendance' ? '#4F6EF7' : '#d97706',
      icon: n.type === 'leave' ? 'checkmark-done-outline' : n.type === 'attendance' ? 'log-in-outline' : 'alert-circle-outline',
      title: n.title || 'Thông báo',
      msg: n.message || n.body || '',
      time: n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '',
      unread: !n.isRead && !n.read,
    }))
  }] : GROUPS;

  const displayGroups = apiGroups;

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color="#191c1e" library="ionicons" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Thông báo</Text>
        <TouchableOpacity onPress={() => markAllRead.mutate()}>
          <Text style={styles.readAll}>Đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#4F6EF7" style={{ marginTop: 20 }} />
        ) : displayGroups.map((group) => (
          <View key={group.label}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.items.map((notif: Notif) => (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notif, notif.unread && styles.notifUnread]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('NotificationDetail', { notificationId: notif.id })}
              >
                <View style={[styles.notifIcon, { backgroundColor: notif.iconBg }]}>
                  <Icon name={notif.icon} size={19} color={notif.iconColor} library="ionicons" />
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifMsg} numberOfLines={2}>{notif.msg}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                {notif.unread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f8' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#191c1e' },
  readAll: { fontSize: 13, fontWeight: '600', color: '#4F6EF7' },
  content: { paddingHorizontal: 16 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  notif: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  notifUnread: { backgroundColor: '#fafbff', borderColor: '#c7d2fe' },
  notifIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifBody: { flex: 1, minWidth: 0 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#191c1e', marginBottom: 3 },
  notifMsg: { fontSize: 12, color: '#9ca3af', lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: '#9ca3af' },
  unreadDot: {
    position: 'absolute',
    top: 14, right: 14,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#4F6EF7',
  },
});
