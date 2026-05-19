import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useAttendanceHistory } from '../../hooks/useAttendanceQueries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/queryKeys';
import { useTheme, Theme } from '../../theme';

type AttendanceHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AttendanceHistory'>;

interface AttendanceHistoryScreenProps {
  navigation: AttendanceHistoryScreenNavigationProp;
}

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const getLocalISODate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export default function AttendanceHistoryScreen({ navigation }: AttendanceHistoryScreenProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  const [currentMonth, setCurrentMonth] = useState(getLocalISODate().substring(0, 7));
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const dateRange = useMemo(() => {
    const [year, monthNum] = currentMonth.split('-');
    const from = `${year}-${monthNum}-01`;
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const to = `${year}-${monthNum}-${lastDay}`;
    return { from, to };
  }, [currentMonth]);

  const { data: historyResponse, isLoading } = useAttendanceHistory({
    from: dateRange.from,
    to: dateRange.to,
    limit: 100,
  });

  const parseDuration = (str: string) => {
    const h = str.match(/(\d+)h/)?.[1] || '0';
    const m = str.match(/(\d+)m/)?.[1] || '0';
    return parseInt(h) * 60 + parseInt(m);
  };

  const { markedDates, monthlyStats } = useMemo(() => {
    const data = (historyResponse as any)?.records || [];
    const newMarkedDates: any = {};
    let stats = { present: 0, late: 0, absent: 0, totalHours: 0 };

    data.forEach((item: any) => {
      let date = item.date;
      if (date && !/^\d{4}-\d{2}-\d{2}/.test(date)) {
        const dateRegex = /(\d{1,2})\s*(?:tháng|[/-])\s*(\d{1,2})(?:,\s*|\s+|[/-])\s*(\d{4})/;
        const match = dateRegex.exec(date);
        if (match) {
          const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          if (!isNaN(d.getTime())) {
            const offset = d.getTimezoneOffset() * 60000;
            date = new Date(d.getTime() - offset).toISOString().split('T')[0];
          }
        }
      }

      let color = theme.colors.status.success;
      if (item.status === 'late') color = theme.colors.status.warning;
      if (item.status === 'absent' || item.status === 'on_leave') color = theme.colors.status.danger;

      newMarkedDates[date] = {
        selected: date === selectedDate,
        marked: true,
        dotColor: color,
        details: {
          status: item.status,
          checkIn: item.checkIn || '--:--',
          checkOut: item.checkOut || '--:--',
          total: item.hours || '0h 0m',
        },
      };

      if (item.status === 'present') stats.present++;
      if (item.status === 'late') stats.late++;
      if (item.status === 'absent' || item.status === 'on_leave') stats.absent++;
      if (item.hours) stats.totalHours += parseDuration(item.hours);
    });

    if (!newMarkedDates[selectedDate]) {
      newMarkedDates[selectedDate] = { selected: true };
    }

    const totalH = Math.floor(stats.totalHours / 60);
    const totalM = stats.totalHours % 60;

    return {
      markedDates: newMarkedDates,
      monthlyStats: { present: stats.present, late: stats.late, absent: stats.absent, totalHours: `${totalH}h ${totalM}m` },
    };
  }, [historyResponse, selectedDate]);

  const dayDetails = useMemo(() => markedDates[selectedDate]?.details || null, [selectedDate, markedDates]);

  const onMonthChange = (date: DateData) => {
    setCurrentMonth(`${date.year}-${String(date.month).padStart(2, '0')}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return theme.colors.status.success;
      case 'late': return theme.colors.status.warning;
      case 'absent': return theme.colors.status.danger;
      default: return theme.colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Đúng giờ';
      case 'late': return 'Đi muộn';
      case 'absent': return 'Vắng';
      default: return 'Không có dữ liệu';
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Icon name="arrow-back-outline" size={24} color="#ffffff" library="ionicons" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Lịch sử chấm công</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all })}
            colors={[theme.colors.brand.primary]}
            tintColor={theme.colors.brand.primary}
          />
        }
      >
        <View style={s.calendarWrapper}>
          <Calendar
            current={currentMonth}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={onMonthChange}
            markedDates={markedDates}
            renderHeader={(date: any) => {
              const d = new Date(date);
              return (
                <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: 'bold' }}>
                  {MONTHS[d.getMonth()]} {d.getFullYear()}
                </Text>
              );
            }}
            theme={{
              backgroundColor: theme.colors.background.surface,
              calendarBackground: theme.colors.background.surface,
              textSectionTitleColor: theme.colors.text.secondary,
              selectedDayBackgroundColor: theme.colors.brand.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: theme.colors.brand.primary,
              dayTextColor: theme.colors.text.primary,
              textDisabledColor: theme.colors.text.muted,
              dotColor: theme.colors.brand.primary,
              selectedDotColor: '#ffffff',
              arrowColor: theme.colors.brand.primary,
              monthTextColor: theme.colors.text.primary,
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <View style={[s.statDot, { backgroundColor: theme.colors.status.success }]} />
            <Text style={s.statLabel}>Đúng giờ</Text>
            <Text style={s.statValue}>{monthlyStats.present}</Text>
          </View>
          <View style={s.statItem}>
            <View style={[s.statDot, { backgroundColor: theme.colors.status.warning }]} />
            <Text style={s.statLabel}>Đi muộn</Text>
            <Text style={s.statValue}>{monthlyStats.late}</Text>
          </View>
          <View style={s.statItem}>
            <View style={[s.statDot, { backgroundColor: theme.colors.status.danger }]} />
            <Text style={s.statLabel}>Vắng</Text>
            <Text style={s.statValue}>{monthlyStats.absent}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 12 }}>
          <Text style={s.dayDetailTitle}>Chi tiết ngày {selectedDate}</Text>

          {dayDetails ? (
            <View style={s.dayDetailCard}>
              <View style={s.dayDetailStatus}>
                <Text style={s.dayDetailStatusLabel}>Trạng thái</Text>
                <View style={{ backgroundColor: `${getStatusColor(dayDetails.status)}20`, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: getStatusColor(dayDetails.status) }}>
                  <Text style={{ color: getStatusColor(dayDetails.status), fontWeight: 'bold', fontSize: 12 }}>
                    {getStatusText(dayDetails.status)}
                  </Text>
                </View>
              </View>

              <View style={s.detailRow}>
                <View style={s.detailItem}>
                  <Icon name="log-in-outline" size={20} color={theme.colors.status.success} library="ionicons" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={s.detailLabel}>Giờ vào</Text>
                    <Text style={s.detailValue}>{dayDetails.checkIn}</Text>
                  </View>
                </View>
                <View style={s.detailItem}>
                  <Icon name="log-out-outline" size={20} color={theme.colors.status.danger} library="ionicons" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={s.detailLabel}>Giờ ra</Text>
                    <Text style={s.detailValue}>{dayDetails.checkOut}</Text>
                  </View>
                </View>
              </View>

              <View style={s.totalRow}>
                <Icon name="time-outline" size={20} color={theme.colors.brand.primary} library="ionicons" />
                <Text style={s.totalLabel}>Tổng giờ:</Text>
                <Text style={s.totalValue}>{dayDetails.total}</Text>
              </View>
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>Không có dữ liệu</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    header: { paddingTop: 36, paddingBottom: 20, paddingHorizontal: 12 },
    headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
    calendarWrapper: {
      margin: 12, borderRadius: 12, overflow: 'hidden',
      backgroundColor: t.colors.background.surface, borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingHorizontal: 12 },
    statItem: {
      alignItems: 'center', backgroundColor: t.colors.background.surface, padding: 12, borderRadius: 8,
      width: '30%', borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
    statLabel: { color: t.colors.text.secondary, fontSize: 12, marginBottom: 4 },
    statValue: { color: t.colors.text.primary, fontSize: 18, fontWeight: 'bold' },
    dayDetailTitle: { color: t.colors.text.primary, fontSize: 18, fontWeight: '600', marginBottom: 12 },
    dayDetailCard: {
      backgroundColor: t.colors.background.surface, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    dayDetailStatus: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dayDetailStatusLabel: { color: t.colors.text.secondary },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    detailLabel: { color: t.colors.text.secondary, fontSize: 12 },
    detailValue: { color: t.colors.text.primary, fontSize: 16, fontWeight: '600' },
    totalRow: {
      flexDirection: 'row', alignItems: 'center', marginTop: 12,
      paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.border.default,
    },
    totalLabel: { color: t.colors.text.secondary, marginLeft: 8 },
    totalValue: { color: t.colors.text.primary, fontWeight: 'bold', marginLeft: 'auto' },
    emptyCard: {
      padding: 20, alignItems: 'center', backgroundColor: t.colors.background.surface,
      borderRadius: 12, borderWidth: 1, borderColor: t.colors.border.default,
    },
    emptyText: { color: t.colors.text.secondary },
  });
}
