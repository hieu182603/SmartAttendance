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
import { globalStyles, COLORS, SPACING, BORDER_RADIUS, SHADOWS, useTheme } from '../../utils/styles';
import { useTranslation } from '../../i18n';
import { Icon } from '../../components/ui/Icon';
import { EmployeeSchedule } from '../../services/shift.service';
import { useShiftSchedule } from '../../hooks/useShiftQueries';
import { useAttendanceHistory } from '../../hooks/useAttendanceQueries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/queryKeys';

type ScheduleScreenNavigationProp = BottomTabNavigationProp<EmployeeTabParamList, 'Schedule'>;

interface ScheduleScreenProps {
  navigation: ScheduleScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const SPACING_LG = SPACING.lg;
const GAP_SIZE = SPACING.sm;
const TOTAL_HORIZONTAL_PADDING = SPACING_LG * 2;
const CALENDAR_ITEM_SIZE = Math.floor((width - TOTAL_HORIZONTAL_PADDING - (GAP_SIZE * 6)) / 7) - 1;

// Day status type matching the web version
type DayStatus = 'completed' | 'today' | 'scheduled' | 'off' | 'none' | 'late';

export default function ScheduleScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Compute date range for query
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0));
    return { startDate, endDate };
  }, [currentDate]);

  // TanStack Query hooks
  const { data: scheduleData, isLoading: scheduleLoading } = useShiftSchedule(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceHistory(
    { from: dateRange.startDate, to: dateRange.endDate, limit: 100 }
  );

  const loading = scheduleLoading || attendanceLoading;

  // Build schedule map keyed by date
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

  // Build attendance map keyed by date
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
          if (!isNaN(d.getTime())) {
            dateStr = d.toISOString().split('T')[0];
          }
        } else {
          const dateRegex = /(\d{1,2})\s*(?:tháng|[/-])\s*(\d{1,2})(?:,\s*|\s+|[/-])\s*(\d{4})/;
          const match = dateRegex.exec(dateValue);
          if (match) {
            const day = parseInt(match[1], 10);
            const mo = parseInt(match[2], 10);
            const yr = parseInt(match[3], 10);
            const d = new Date(yr, mo - 1, day);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().split('T')[0];
            }
          } else {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().split('T')[0];
            }
          }
        }

        if (dateStr) {
          map[dateStr] = record;
        }
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
    for (let i = 0; i < firstDay; i++) {
      result.push(null);
    }
    for (let i = 1; i <= days; i++) {
      result.push(new Date(year, month, i));
    }
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

  /**
   * Get the status of a calendar day — matching the web's getWeekDayStatus() logic.
   */
  const getDayStatus = (date: Date): DayStatus => {
    const dateStr = formatDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const schedule = scheduleMap[dateStr];
    const attendance = attendanceMap[dateStr];

    // If no schedule for this day
    if (!schedule) {
      // Check if has attendance record anyway
      if (attendance) {
        const checkIn = attendance.checkIn || attendance.check_in;
        const hasCheckIn = checkIn &&
          String(checkIn).trim() !== '' &&
          String(checkIn).trim() !== '—' &&
          String(checkIn).trim() !== 'null';
        if (hasCheckIn) return 'completed';
      }
      return 'off';
    }

    // If schedule status is "off" (from approved leave requests)
    if (schedule.status === 'off') return 'off';

    // Check attendance for this day
    if (attendance) {
      if (attendance.status === 'absent' || attendance.status === 'weekend') return 'off';
      if (attendance.status === 'LATE') return 'late';

      const checkIn = attendance.checkIn || attendance.check_in;
      const hasCheckIn = checkIn &&
        String(checkIn).trim() !== '' &&
        String(checkIn).trim() !== '—' &&
        String(checkIn).trim() !== 'null' &&
        String(checkIn).trim() !== 'undefined';

      if (hasCheckIn) return 'completed';
    }

    // Today
    if (dateStr === todayStr) return 'today';

    // Past day without attendance = missed (show as off)
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    if (dateOnly < today) return 'off';

    // Future scheduled
    return 'scheduled';
  };

  /**
   * Get colors for a day status — matching the web's getWeekDayColor() logic.
   */
  const getDayColors = (status: DayStatus, isSelected: boolean, isTodayDate: boolean) => {
    if (isSelected) {
      return {
        backgroundColor: COLORS.primary,
        textColor: '#ffffff',
        borderColor: COLORS.primaryLight,
      };
    }

    switch (status) {
      case 'completed':
        return {
          backgroundColor: COLORS.accent.green,
          textColor: '#ffffff',
          borderColor: COLORS.accent.green,
        };
      case 'late':
        return {
          backgroundColor: COLORS.accent.yellow,
          textColor: '#ffffff',
          borderColor: COLORS.accent.yellow,
        };
      case 'today':
        return {
          backgroundColor: COLORS.accent.cyan,
          textColor: '#ffffff',
          borderColor: COLORS.accent.cyan,
        };
      case 'scheduled':
        return {
          backgroundColor: COLORS.primary,
          textColor: '#ffffff',
          borderColor: COLORS.primary,
        };
      case 'off':
        return {
          backgroundColor: 'rgba(148, 163, 184, 0.25)',
          textColor: COLORS.text.secondary,
          borderColor: 'rgba(148, 163, 184, 0.3)',
        };
      default:
        return {
          backgroundColor: 'transparent',
          textColor: theme.text.primary,
          borderColor: 'transparent',
        };
    }
  };

  const days = getDaysInMonth(currentDate);
  const selectedSchedule = selectedDate ? scheduleMap[selectedDate] : null;
  const selectedAttendance = selectedDate ? attendanceMap[selectedDate] : null;

  // Legend items matching the web version
  const legendItems = [
    { color: COLORS.accent.green, label: t.schedule.legend.completed },
    { color: COLORS.accent.yellow, label: t.schedule.legend.late || 'Đi muộn' },
    { color: COLORS.accent.cyan, label: t.schedule.legend.today },
    { color: COLORS.primary, label: t.schedule.legend.scheduled },
    { color: 'rgba(148, 163, 184, 0.4)', label: t.schedule.legend.off },
  ];

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: SPACING.xxl * 2,
          paddingBottom: SPACING.xl,
          paddingHorizontal: SPACING.lg,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#ffffff' }}>
          {t.schedule.title}
        </Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
          {t.schedule.subtitle}
        </Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Calendar Navigation */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: SPACING.lg,
          }}
        >
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={{
              padding: SPACING.sm,
              backgroundColor: theme.surface,
              borderRadius: BORDER_RADIUS.md,
              ...SHADOWS.sm,
            }}
          >
            <Icon name="chevron_left" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text.primary }}>
            {t.schedule.months[currentDate.getMonth()]}, {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={{
              padding: SPACING.sm,
              backgroundColor: theme.surface,
              borderRadius: BORDER_RADIUS.md,
              ...SHADOWS.sm,
            }}
          >
            <Icon name="chevron_right" size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : (
          <>
            {/* Days Header */}
            <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
              {t.schedule.daysOfWeek.map((day, index) => (
                <View
                  key={index}
                  style={{
                    width: CALENDAR_ITEM_SIZE,
                    alignItems: 'center',
                    marginRight: index < 6 ? GAP_SIZE : 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: index === 0 || index === 6 ? COLORS.accent.red : theme.text.secondary,
                    }}
                  >
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg }}>
              {days.map((date, index) => {
                const isLastInRow = (index + 1) % 7 === 0;

                if (!date) {
                  return <View
                    key={`empty-${index}`}
                    style={{
                      width: CALENDAR_ITEM_SIZE,
                      height: CALENDAR_ITEM_SIZE,
                      marginRight: isLastInRow ? 0 : GAP_SIZE,
                      marginBottom: GAP_SIZE,
                    }}
                  />;
                }

                const dateStr = formatDate(date);
                const isSelected = selectedDate === dateStr;
                const isTodayDate = isToday(date);
                const dayStatus = getDayStatus(date);
                const colors = getDayColors(dayStatus, isSelected, isTodayDate);
                const day = date.getDate();

                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => setSelectedDate(dateStr)}
                    style={{
                      width: CALENDAR_ITEM_SIZE,
                      height: CALENDAR_ITEM_SIZE,
                      borderRadius: BORDER_RADIUS.lg,
                      backgroundColor: colors.backgroundColor,
                      borderWidth: isTodayDate && !isSelected ? 2 : 1,
                      borderColor: isTodayDate && !isSelected ? COLORS.accent.cyan : colors.borderColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: isLastInRow ? 0 : GAP_SIZE,
                      marginBottom: GAP_SIZE,
                      ...(isSelected ? SHADOWS.lg : {}),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isTodayDate || isSelected ? '700' : '600',
                        color: colors.textColor,
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: BORDER_RADIUS.lg,
                  padding: SPACING.md,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: theme.text.secondary,
                    marginBottom: SPACING.md,
                  }}
                >
                  {t.schedule.legend.title}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {legendItems.map((item, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '50%',
                        marginBottom: SPACING.sm,
                      }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: item.color,
                          marginRight: SPACING.sm,
                        }}
                      />
                      <Text style={{ fontSize: 12, color: theme.text.primary }}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Shift Details */}
            {selectedSchedule && selectedDate && (
              <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: SPACING.md,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: COLORS.primary,
                      marginRight: SPACING.sm,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: theme.text.primary,
                    }}
                  >
                    {t.schedule.detail.title}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: BORDER_RADIUS.xl,
                    padding: SPACING.lg,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    ...SHADOWS.lg,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: SPACING.lg,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.text.secondary,
                          marginBottom: SPACING.xs / 2,
                        }}
                      >
                        {t.schedule.detail.workDate}
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: theme.text.primary,
                        }}
                      >
                        {new Date(selectedDate).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: selectedSchedule.status === 'completed'
                          ? 'rgba(34, 197, 94, 0.15)'
                          : selectedSchedule.status === 'off'
                            ? 'rgba(148, 163, 184, 0.15)'
                            : 'rgba(66, 69, 240, 0.15)',
                        borderWidth: 1,
                        borderColor: selectedSchedule.status === 'completed'
                          ? 'rgba(34, 197, 94, 0.3)'
                          : selectedSchedule.status === 'off'
                            ? 'rgba(148, 163, 184, 0.3)'
                            : 'rgba(66, 69, 240, 0.3)',
                        borderRadius: BORDER_RADIUS.md,
                        paddingHorizontal: SPACING.sm,
                        paddingVertical: SPACING.xs / 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: selectedSchedule.status === 'completed'
                            ? COLORS.accent.green
                            : selectedSchedule.status === 'off'
                              ? COLORS.text.secondary
                              : COLORS.primary,
                        }}
                      >
                        {selectedSchedule.status === 'completed' ? t.schedule.detail.completed
                          : selectedSchedule.status === 'off' ? t.schedule.detail.off
                            : selectedSchedule.status === 'missed' ? t.schedule.detail.missed
                              : t.schedule.detail.scheduled}
                      </Text>
                    </View>
                  </View>

                  <View>
                    {/* Shift Name */}
                    {selectedSchedule.shiftName && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: SPACING.md,
                          borderRadius: BORDER_RADIUS.lg,
                          backgroundColor: 'rgba(34, 211, 238, 0.1)',
                          marginBottom: SPACING.sm,
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: 'rgba(34, 211, 238, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: SPACING.md,
                          }}
                        >
                          <Icon name="badge" size={20} color={COLORS.accent.cyan} />
                        </View>
                        <View>
                          <Text
                            style={{
                              fontSize: 11,
                              color: theme.text.secondary,
                              marginBottom: SPACING.xs / 2,
                            }}
                          >
                            {t.schedule.detail.shiftName}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '500',
                              color: theme.text.primary,
                            }}
                          >
                            {selectedSchedule.shiftName}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Working Hours */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: SPACING.md,
                        borderRadius: BORDER_RADIUS.lg,
                        backgroundColor: 'rgba(66, 69, 240, 0.1)',
                        marginBottom: SPACING.sm,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: 'rgba(66, 69, 240, 0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: SPACING.md,
                        }}
                      >
                        <Icon name="schedule" size={20} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.text.secondary,
                            marginBottom: SPACING.xs / 2,
                          }}
                        >
                          Giờ làm việc
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: theme.text.primary,
                          }}
                        >
                          {selectedSchedule.startTime} - {selectedSchedule.endTime}
                        </Text>
                      </View>
                    </View>

                    {/* Attendance Info (if available) */}
                    {selectedAttendance && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: SPACING.md,
                          borderRadius: BORDER_RADIUS.lg,
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          marginBottom: SPACING.sm,
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: SPACING.md,
                          }}
                        >
                          <Icon name="check_circle" size={20} color={COLORS.accent.green} />
                        </View>
                        <View>
                          <Text
                            style={{
                              fontSize: 11,
                              color: theme.text.secondary,
                              marginBottom: SPACING.xs / 2,
                            }}
                          >
                            {t.schedule.detail.attendance}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '500',
                              color: theme.text.primary,
                            }}
                          >
                            {selectedAttendance.checkIn || '—'} → {selectedAttendance.checkOut || '—'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Location */}
                    {selectedSchedule.location && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: SPACING.md,
                          borderRadius: BORDER_RADIUS.lg,
                          backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: 'rgba(249, 115, 22, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: SPACING.md,
                          }}
                        >
                          <Icon name="location_on" size={20} color={COLORS.accent.yellow} />
                        </View>
                        <View>
                          <Text
                            style={{
                              fontSize: 11,
                              color: theme.text.secondary,
                              marginBottom: SPACING.xs / 2,
                            }}
                          >
                            {t.schedule.detail.location}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '500',
                              color: theme.text.primary,
                            }}
                          >
                            {selectedSchedule.location}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* No Shift Message (when selected a day with no schedule) */}
            {!selectedSchedule && selectedDate && (
              <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg }}>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: BORDER_RADIUS.xl,
                    padding: SPACING.xxl,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    alignItems: 'center',
                    ...SHADOWS.lg,
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      backgroundColor: 'rgba(148, 163, 184, 0.2)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: SPACING.md,
                    }}
                  >
                    <Icon name="schedule" size={32} color={theme.text.secondary} />
                  </View>
                  <Text style={{ fontSize: 14, color: theme.text.secondary, textAlign: 'center' }}>
                    {t.schedule.noShift}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
