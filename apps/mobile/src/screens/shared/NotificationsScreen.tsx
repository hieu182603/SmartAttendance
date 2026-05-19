import React, { useMemo } from 'react';
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
import { useTheme, Theme } from '../../theme';

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

type StaticNotif = Omit<Notif, 'iconBg' | 'iconColor'> & { type: 'success' | 'primary' | 'warning' | 'purple' | 'danger' };

const STATIC_GROUPS: { label: string; items: StaticNotif[] }[] = [];

export default function NotificationsScreen() {
  const navigation = useNavigation<NavProp>();
  const { data: notifsData, isLoading } = useNotificationsList();
  const markAllRead = useMarkAllAsRead();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const notifColors = useMemo(() => ({
    success: { bg: theme.colors.status.successBg, color: theme.colors.status.success },
    primary: { bg: theme.colors.background.indigoTint, color: theme.colors.brand.primary },
    warning: { bg: theme.colors.status.warningBg, color: theme.colors.status.warning },
    purple: { bg: theme.colors.background.indigoTint, color: theme.colors.brand.primaryActive },
    danger: { bg: theme.colors.status.dangerBg, color: theme.colors.status.danger },
  }), [theme]);

  const GROUPS: { label: string; items: Notif[] }[] = useMemo(() =>
    STATIC_GROUPS.map((g) => ({
      label: g.label,
      items: g.items.map((item) => ({
        ...item,
        iconBg: notifColors[item.type].bg,
        iconColor: notifColors[item.type].color,
      })),
    })), [notifColors]);

  // Map API data to grouped display format if available
  const apiNotifs = (notifsData?.data || notifsData || []);
  const hasApiData = apiNotifs.length > 0;

  const apiGroups = hasApiData ? [{
    label: 'Thông báo',
    items: apiNotifs.map((n: any) => ({
      id: n._id || n.id,
      iconBg: n.type === 'leave' ? notifColors.success.bg : n.type === 'attendance' ? notifColors.primary.bg : notifColors.warning.bg,
      iconColor: n.type === 'leave' ? notifColors.success.color : n.type === 'attendance' ? notifColors.primary.color : notifColors.warning.color,
      icon: n.type === 'leave' ? 'checkmark-done-outline' : n.type === 'attendance' ? 'log-in-outline' : 'alert-circle-outline',
      title: n.title || 'Thông báo',
      msg: n.message || n.body || '',
      time: n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '',
      unread: !n.isRead && !n.read,
    }))
  }] : GROUPS;

  const displayGroups = apiGroups;

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-outline" size={18} color={theme.colors.text.primary} library="ionicons" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Thông báo</Text>
        <TouchableOpacity onPress={() => markAllRead.mutate()}>
          <Text style={s.readAll}>Đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.brand.primary} style={{ marginTop: 20 }} />
        ) : displayGroups.map((group) => (
          <View key={group.label}>
            <Text style={s.groupLabel}>{group.label}</Text>
            {group.items.map((notif: Notif) => (
              <TouchableOpacity
                key={notif.id}
                style={[s.notif, notif.unread && s.notifUnread]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('NotificationDetail', { notificationId: notif.id })}
              >
                <View style={[s.notifIcon, { backgroundColor: notif.iconBg }]}>
                  <Icon name={notif.icon} size={19} color={notif.iconColor} library="ionicons" />
                </View>
                <View style={s.notifBody}>
                  <Text style={s.notifTitle}>{notif.title}</Text>
                  <Text style={s.notifMsg} numberOfLines={2}>{notif.msg}</Text>
                  <Text style={s.notifTime}>{notif.time}</Text>
                </View>
                {notif.unread && <View style={s.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
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
      backgroundColor: t.colors.background.surface,
      borderWidth: 1, borderColor: t.colors.border.default,
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 17, fontWeight: '700', color: t.colors.text.primary },
    readAll: { fontSize: 13, fontWeight: '600', color: t.colors.brand.primary },
    content: { paddingHorizontal: 16 },
    groupLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: t.colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },
    notif: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      backgroundColor: t.colors.background.surface,
      borderRadius: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      position: 'relative',
    },
    notifUnread: { backgroundColor: t.colors.background.indigoTint, borderColor: t.colors.border.indigo },
    notifIcon: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    notifBody: { flex: 1, minWidth: 0 },
    notifTitle: { fontSize: 13, fontWeight: '700', color: t.colors.text.primary, marginBottom: 3 },
    notifMsg: { fontSize: 12, color: t.colors.text.muted, lineHeight: 18, marginBottom: 4 },
    notifTime: { fontSize: 11, color: t.colors.text.muted },
    unreadDot: {
      position: 'absolute',
      top: 14, right: 14,
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: t.colors.brand.primary,
    },
  });
}
