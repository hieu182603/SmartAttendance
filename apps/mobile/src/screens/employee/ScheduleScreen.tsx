import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { EmployeeTabParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { EmployeeSchedule } from '../../services/shift.service';
import { useShiftSchedule } from '../../hooks/useShiftQueries';
import { useAttendanceHistory } from '../../hooks/useAttendanceQueries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/queryKeys';
import { useTheme } from '../../theme';

type ScheduleScreenNavigationProp = BottomTabNavigationProp<EmployeeTabParamList, 'Schedule'>;

const { width } = Dimensions.get('window');
const CALENDAR_ITEM_SIZE = Math.floor((width - 32 - 48) / 7) - 1;
const GAP_SIZE = 8;

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DAYS_OF_WEEK = ['CN','T2','T3','T4','T5','T6','T7'];

type DayStatus = 'completed' | 'today' | 'scheduled' | 'off' | 'none' | 'late';

export default function ScheduleScreen() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const theme = useTheme();
  const t = theme;

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0));
    return { startDate, endDate };
  }, [currentDate]);

  const { data: scheduleData, isLoading: scheduleLoading } = useShiftSchedule(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceHistory(
    { from: dateRange.startDate, to: dateRange.endDate, limit: 100 }
  );

  const loading = scheduleLoading || attendanceLoading;

  const scheduleMap = useMemo<Record<string, EmployeeSchedule>>(() => {
    if (!scheduleData || !Array.isArray(scheduleData)) return {};
    const map: Record<string, EmployeeSchedule> = {};
    scheduleData.forEach((sched: EmployeeSchedule) => {
      if (sched.date) {
        const dateStr = sched.date.includes('T') ? sched.date.split('T')[0] : sched.date;
        map[dateStr] = sched;
      }
    });
    return map;
  }, [scheduleData]);

  const attendanceMap = useMemo<Record<string, any>>(() => {
    const records = (attendanceData as any)?.records || (attendanceData as any)?.data || [];
    if (!Array.isArray(records)) return {};
    const map: Record<string, any> = {};
    records.forEach((record: any) => {
      if (record.date) {
        const dateValue = String(record.date).trim();
        let dateStr = '';
        if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
        } else {
          const dateRegex = /(\d{1,2})\s*(?:tháng|[/-])\s*(\d{1,2})(?:,\s*|\s+|[/-])\s*(\d{4})/;
          const match = dateRegex.exec(dateValue);
          if (match) {
            const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
            if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
          } else {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
          }
        }
        if (dateStr) map[dateStr] = record;
      }
    });
    return map;
  }, [attendanceData]);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shift.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    }, [queryClient])
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const result: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let i = 1; i <= days; i++) result.push(new Date(year, month, i));
    return result;
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getDayStatus = (date: Date): DayStatus => {
    const dateStr = formatDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    const schedule = scheduleMap[dateStr];
    const attendance = attendanceMap[dateStr];

    if (!schedule) {
      if (attendance) {
        const checkIn = attendance.checkIn || attendance.check_in;
        const hasCheckIn = checkIn && String(checkIn).trim() !== '' &&
          String(checkIn).trim() !== '—' && String(checkIn).trim() !== 'null';
        if (hasCheckIn) return 'completed';
      }
      return 'off';
    }

    if (schedule.status === 'off') return 'off';

    if (attendance) {
      if (attendance.status === 'absent' || attendance.status === 'weekend') return 'off';
      if (attendance.status === 'LATE') return 'late';
      const checkIn = attendance.checkIn || attendance.check_in;
      const hasCheckIn = checkIn && String(checkIn).trim() !== '' &&
        String(checkIn).trim() !== '—' && String(checkIn).trim() !== 'null' &&
        String(checkIn).trim() !== 'undefined';
      if (hasCheckIn) return 'completed';
    }

    if (dateStr === todayStr) return 'today';

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    if (dateOnly < today) return 'off';

    return 'scheduled';
  };

  const getDayColors = (status: DayStatus, isSelected: boolean) => {
    if (isSelected) {
      return { backgroundColor: t.colors.brand.primary, textColor: '#ffffff', borderColor: t.colors.brand.primary };
    }
    switch (status) {
      case 'completed':
        return { backgroundColor: t.colors.status.success, textColor: '#ffffff', borderColor: t.colors.status.success };
      case 'late':
        return { backgroundColor: t.colors.status.warning, textColor: '#ffffff', borderColor: t.colors.status.warning };
      case 'today':
        return { backgroundColor: t.colors.brand.primary, textColor: '#ffffff', borderColor: t.colors.brand.primary };
      case 'scheduled':
        return { backgroundColor: t.colors.brand.primary, textColor: '#ffffff', borderColor: t.colors.brand.primary };
      case 'off':
        return { backgroundColor: 'rgba(148,163,184,0.25)', textColor: t.colors.text.secondary, borderColor: 'rgba(148,163,184,0.3)' };
      default:
        return { backgroundColor: 'transparent', textColor: t.colors.text.primary, borderColor: 'transparent' };
    }
  };

  const days = getDaysInMonth(currentDate);
  const selectedSchedule = selectedDate ? scheduleMap[selectedDate] : null;
  const selectedAttendance = selectedDate ? attendanceMap[selectedDate] : null;

  const legendItems = [
    { color: t.colors.status.success, label: 'Đã làm' },
    { color: t.colors.status.warning, label: 'Đi muộn' },
    { color: t.colors.brand.primary, label: 'Hôm nay' },
    { color: t.colors.brand.primary, label: 'Đã lên lịch' },
    { color: 'rgba(148,163,184,0.4)', label: 'Nghỉ' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background.base }}>
      <LinearGradient
        colors={[t.colors.brand.primary, t.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 48, paddingBottom: 20, paddingHorizontal: 16 }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>Lịch làm việc</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Xem lịch và ca làm việc của bạn</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={{ padding: 8, backgroundColor: t.colors.background.surface, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 }}
          >
            <Icon name="chevron-back-outline" size={22} color={t.colors.text.primary} library="ionicons" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.colors.text.primary }}>
            {MONTHS[currentDate.getMonth()]}, {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={{ padding: 8, backgroundColor: t.colors.background.surface, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 }}
          >
            <Icon name="chevron-forward-outline" size={22} color={t.colors.text.primary} library="ionicons" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={t.colors.brand.primary} style={{ marginTop: 20 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 }}>
              {DAYS_OF_WEEK.map((day, index) => (
                <View key={index} style={{ width: CALENDAR_ITEM_SIZE, alignItems: 'center', marginRight: index < 6 ? GAP_SIZE : 0 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: index === 0 || index === 6 ? t.colors.status.danger : t.colors.text.secondary }}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
              {days.map((date, index) => {
                const isLastInRow = (index + 1) % 7 === 0;
                if (!date) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={{ width: CALENDAR_ITEM_SIZE, height: CALENDAR_ITEM_SIZE, marginRight: isLastInRow ? 0 : GAP_SIZE, marginBottom: GAP_SIZE }}
                    />
                  );
                }
                const dateStr = formatDate(date);
                const isSelected = selectedDate === dateStr;
                const isTodayDate = isToday(date);
                const dayStatus = getDayStatus(date);
                const dayColors = getDayColors(dayStatus, isSelected);
                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => setSelectedDate(dateStr)}
                    style={{
                      width: CALENDAR_ITEM_SIZE,
                      height: CALENDAR_ITEM_SIZE,
                      borderRadius: 12,
                      backgroundColor: dayColors.backgroundColor,
                      borderWidth: isTodayDate && !isSelected ? 2 : 1,
                      borderColor: isTodayDate && !isSelected ? t.colors.brand.primary : dayColors.borderColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: isLastInRow ? 0 : GAP_SIZE,
                      marginBottom: GAP_SIZE,
                      ...(isSelected ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 } : {}),
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: isTodayDate || isSelected ? '700' : '600', color: dayColors.textColor }}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <View style={{ backgroundColor: t.colors.background.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.colors.border.default }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: t.colors.text.secondary, marginBottom: 12 }}>Chú giải</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {legendItems.map((item, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 8 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 8 }} />
                      <Text style={{ fontSize: 12, color: t.colors.text.primary }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {selectedSchedule && selectedDate && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.brand.primary, marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.text.primary }}>Chi tiết ca làm</Text>
                </View>
                <View style={{ backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.colors.border.default, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <View>
                      <Text style={{ fontSize: 11, color: t.colors.text.secondary, marginBottom: 2 }}>Ngày làm việc</Text>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: t.colors.text.primary }}>
                        {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: selectedSchedule.status === 'completed' ? t.colors.status.successBg : selectedSchedule.status === 'off' ? 'rgba(148,163,184,0.15)' : t.colors.status.infoBg,
                      borderWidth: 1,
                      borderColor: selectedSchedule.status === 'completed' ? t.colors.status.successBorder : selectedSchedule.status === 'off' ? 'rgba(148,163,184,0.3)' : t.colors.status.infoBorder,
                      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: selectedSchedule.status === 'completed' ? t.colors.status.success : selectedSchedule.status === 'off' ? t.colors.text.secondary : t.colors.brand.primary }}>
                        {selectedSchedule.status === 'completed' ? 'Hoàn thành' : selectedSchedule.status === 'off' ? 'Nghỉ' : selectedSchedule.status === 'missed' ? 'Vắng' : 'Đã lên lịch'}
                      </Text>
                    </View>
                  </View>

                  {selectedSchedule.shiftName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: t.colors.status.infoBg, marginBottom: 8 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.status.infoBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Icon name="id-card-outline" size={20} color={t.colors.brand.primary} library="ionicons" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, color: t.colors.text.secondary, marginBottom: 2 }}>Tên ca</Text>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: t.colors.text.primary }}>{selectedSchedule.shiftName}</Text>
                      </View>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: t.colors.status.infoBg, marginBottom: 8 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.status.infoBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Icon name="time-outline" size={20} color={t.colors.brand.primary} library="ionicons" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 11, color: t.colors.text.secondary, marginBottom: 2 }}>Giờ làm việc</Text>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: t.colors.text.primary }}>{selectedSchedule.startTime} - {selectedSchedule.endTime}</Text>
                    </View>
                  </View>

                  {selectedAttendance && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: t.colors.status.successBg, marginBottom: 8 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.status.successBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Icon name="checkmark-circle-outline" size={20} color={t.colors.status.success} library="ionicons" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, color: t.colors.text.secondary, marginBottom: 2 }}>Chấm công</Text>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: t.colors.text.primary }}>{selectedAttendance.checkIn || '—'} → {selectedAttendance.checkOut || '—'}</Text>
                      </View>
                    </View>
                  )}

                  {selectedSchedule.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: t.colors.status.warningBg }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.status.warningBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Icon name="location-outline" size={20} color={t.colors.status.warning} library="ionicons" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, color: t.colors.text.secondary, marginBottom: 2 }}>Địa điểm</Text>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: t.colors.text.primary }}>{selectedSchedule.location}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {!selectedSchedule && selectedDate && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={{ backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: t.colors.border.default, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(148,163,184,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Icon name="time-outline" size={32} color={t.colors.text.secondary} library="ionicons" />
                  </View>
                  <Text style={{ fontSize: 14, color: t.colors.text.secondary, textAlign: 'center' }}>Không có ca làm việc trong ngày này</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
