import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  TrendingUp,
  Award,
  Zap,
  StickyNote,
  Target,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import shiftService from "@/services/shiftService";
import { getAttendanceHistory } from "@/services/attendanceService";
import { useAuth } from "@/context/AuthContext";
import { getShiftStatusBadgeClass, type ShiftStatus } from "@/utils/attendanceStatus";


interface AttendanceRecord {
  id?: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  location: string;
  status: "ontime" | "late" | "absent" | "overtime" | "weekend";
  notes: string;
}

interface EmployeeSchedule {
  _id: string;
  date: string;
  shift: {
    _id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
  };
  status: ShiftStatus;
  location: string;
  team?: string;
  notes?: string;
  attendanceRecord?: AttendanceRecord; // Thêm attendance record nếu có
}

// Utility: làm sạch ghi chú để không hiển thị raw URL (đặc biệt là link ảnh check-in)
const sanitizeNotes = (notes?: string): string | null => {
  if (!notes) return null;
  // Loại bỏ mọi URL trong chuỗi
  const cleaned = notes.replace(/https?:\/\/\S+/g, "").trim();
  if (!cleaned) return null;
  return cleaned;
};

const calculateShiftHours = (shift: EmployeeSchedule["shift"]): number => {
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin < startMin) {
    endMin += 24 * 60;
  }
  const totalMinutes = endMin - startMin - (shift.breakDuration || 0);
  return Math.max(totalMinutes, 0) / 60;
};

const SchedulePage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedule, setSchedule] = useState<EmployeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!user?._id) {
          setSchedule([]);
          setLoading(false);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(0, 0, 0, 0);

        const currentDayOfWeek = today.getDay();
        const mondayDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const weekReference = new Date(today);
        weekReference.setDate(today.getDate() + mondayDiff);
        weekReference.setHours(0, 0, 0, 0);

        const futureEnd = new Date(today);
        futureEnd.setDate(today.getDate() + 30);
        futureEnd.setHours(0, 0, 0, 0);

        const rangeEnd = futureEnd > monthEnd ? futureEnd : monthEnd;
        const rangeStart =
          weekReference < monthStart ? weekReference : monthStart;

        // Fetch schedule from assignments and attendance data in parallel
        const startDateStr = rangeStart.toISOString().split("T")[0];
        const endDateStr = rangeEnd.toISOString().split("T")[0];

        // Fetch schedule, attendance, and available shifts in parallel
        const [scheduleData, attendanceData, availableShifts] = await Promise.all([
          shiftService.getMySchedule(startDateStr, endDateStr).catch(() => []),
          getAttendanceHistory({ limit: 1000 }).catch(() => ({ records: [], pagination: null })),
          shiftService.getAllShifts().catch(() => []),
        ]);

        // Store attendance records
        const records = (attendanceData.records || []) as AttendanceRecord[];

        // Create a map of attendance by date (YYYY-MM-DD)
        const attendanceMap = new Map<string, AttendanceRecord>();
        records.forEach((record) => {
          try {
            // Parse date from different possible formats
            let dateStr = "";
            if (record.date) {
              const dateValue = String(record.date).trim();
              
              // Try ISO format first (YYYY-MM-DD)
              if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
                const d = new Date(dateValue);
                if (!Number.isNaN(d.getTime())) {
                  dateStr = d.toISOString().split("T")[0];
                }
              } 
              // Try format like "24 tháng 11, 2024" or "24/11/2024" or "24-11-2024"
              else {
                const dateRegex = /(\d{1,2})\s*(?:tháng|[/-])\s*(\d{1,2})(?:,\s*|\s+|[/-])\s*(\d{4})/;
                const dateMatch = dateRegex.exec(dateValue);
                if (dateMatch) {
                  const day = Number.parseInt(dateMatch[1], 10);
                  const month = Number.parseInt(dateMatch[2], 10);
                  const year = Number.parseInt(dateMatch[3], 10);
                  const d = new Date(year, month - 1, day);
                  if (!Number.isNaN(d.getTime())) {
                    dateStr = d.toISOString().split("T")[0];
                  }
                } else {
                  // Try generic date parsing
                  const d = new Date(dateValue);
                  if (!Number.isNaN(d.getTime())) {
                    dateStr = d.toISOString().split("T")[0];
                  }
                }
              }
              
              if (dateStr) {
                attendanceMap.set(dateStr, record);
              }
            }
          } catch (err) {
            // Silently skip invalid date records
          }
        });

        // Create a map of schedule by date from API response
        const scheduleMap = new Map<string, any>();
        scheduleData.forEach((sched: any) => {
          if (sched && sched.date) {
            try {
              const dateObj = sched.date instanceof Date ? sched.date : new Date(sched.date);
              if (!Number.isNaN(dateObj.getTime())) {
                const dateStr = dateObj.toISOString().split("T")[0];
                scheduleMap.set(dateStr, sched);
              }
            } catch (err) {
              // Silently skip invalid schedule dates
            }
          }
        });

        // Fallback: Nếu có schedule từ assignments nhưng thiếu một số ngày,
        // có thể dùng default shift để lấp khoảng trống.
        // Không dùng fallback nếu hoàn toàn không có schedule nào (tài khoản mới),
        // để tránh hiển thị lịch "ảo" cho user mới đăng ký.
        let fallbackShift = null;
        if (availableShifts && availableShifts.length > 0 && scheduleMap.size > 0) {
          fallbackShift =
            availableShifts.find((s: any) => s.name === t('dashboard:schedule.defaults.shiftName')) ||
            availableShifts[0];
        }

        // Generate schedule for all days in range
        const finalSchedule: EmployeeSchedule[] = [];
        const cursor = new Date(rangeStart);

        while (cursor <= rangeEnd) {
          const currentDate = new Date(cursor);
          const dayOfWeek = currentDate.getDay();

          // Chỉ hiển thị từ Thứ 2 đến Thứ 6 (loại bỏ Thứ 7 và Chủ nhật)
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const dateStr = currentDate.toISOString().split("T")[0];
            const isPast = currentDate < today;
            const attendance = attendanceMap.get(dateStr);
            const assignedSchedule = scheduleMap.get(dateStr);

            // Nếu có schedule được gán, sử dụng nó
            let scheduleToUse = assignedSchedule;
            
            // Fallback: Chỉ dùng default shift khi đã có ít nhất 1 schedule thật
            // (scheduleMap.size > 0) để lấp các ngày trống.
            if (!scheduleToUse && fallbackShift && scheduleMap.size > 0) {
              scheduleToUse = {
                shiftId: fallbackShift._id,
                shiftName: fallbackShift.name,
                startTime: fallbackShift.startTime,
                endTime: fallbackShift.endTime,
                breakDuration: fallbackShift.breakDuration || 60,
                description: fallbackShift.description || "",
              };
            }

            if (scheduleToUse) {
              const shiftId = scheduleToUse.shiftId?._id || scheduleToUse.shiftId || "";
              const shiftName = scheduleToUse.shiftName || scheduleToUse.shiftId?.name || "";
              const startTime = scheduleToUse.startTime || scheduleToUse.shiftId?.startTime || "";
              const endTime = scheduleToUse.endTime || scheduleToUse.shiftId?.endTime || "";
              const breakDuration = scheduleToUse.shiftId?.breakDuration || scheduleToUse.breakDuration || 60;
              const description = scheduleToUse.shiftId?.description || scheduleToUse.description || "";
              const dbStatus = scheduleToUse.status as ShiftStatus | undefined;

              let status: ShiftStatus = (dbStatus && ["scheduled", "completed", "missed", "off"].includes(dbStatus)) 
                ? dbStatus 
                : "scheduled";
              
              if (status === "off") {
                // Giữ nguyên status "off" từ database (từ leave request)
              } else if (attendance) {
                const hasCheckIn = attendance.checkIn &&
                                   String(attendance.checkIn).trim() !== "" &&
                                   String(attendance.checkIn).trim() !== "—" &&
                                   String(attendance.checkIn).trim() !== "null" &&
                                   String(attendance.checkIn).trim() !== "undefined";
                
                if (hasCheckIn) {
                  status = "completed";
                } else if (attendance.status === "absent" || attendance.status === "weekend") {
                  status = "off";
                } else if (isPast) {
                  status = "missed";
                }
              } else if (isPast && dbStatus !== "off") {
                status = "missed";
              }

              if (shiftId && shiftName && startTime && endTime) {
                finalSchedule.push({
                  _id: `${dateStr}-${shiftId}`,
                  date: dateStr,
                  shift: {
                    _id: shiftId,
                    name: shiftName,
                    startTime: startTime,
                    endTime: endTime,
                    breakDuration: breakDuration,
                  },
                  status,
                  location: scheduleToUse.location || attendance?.location || t('dashboard:schedule.defaults.location'),
                  team: scheduleToUse.team || t('dashboard:schedule.defaults.team'),
                  notes: scheduleToUse.notes || description,
                  attendanceRecord: attendance,
                });
              }
            } else if (
              // Chỉ tạo "virtual shift" từ attendance cho NGÀY HÔM NAY
              // trong trường hợp user chưa có bất kỳ schedule nào (scheduleMap.size === 0).
              // Tránh làm các ngày trước đó trong tuần cũng xanh.
              !scheduleToUse &&
              attendance &&
              scheduleMap.size === 0 &&
              dateStr === today.toISOString().split("T")[0]
            ) {
              // Trường hợp không có lịch nhưng user vẫn có chấm công (ví dụ: ngày đầu tiên làm việc,
              // chưa được admin set lịch). Tạo một "virtual shift" dựa trên attendance để:
              // - Hiển thị đúng trong lịch tuần (màu xanh đã hoàn thành).
              // - Thống kê tháng/tuần vẫn tính ca đã làm.

              const extractTime = (value: unknown): string => {
                const raw = String(value ?? "").trim();
                const match = /(\d{1,2}:\d{2})/.exec(raw);
                return match ? match[1] : "00:00";
              };

              const virtualShiftId = attendance.id || `attendance-${dateStr}`;
              const virtualStartTime = extractTime(attendance.checkIn);
              const virtualEndTime = extractTime(attendance.checkOut);

              const hasCheckIn = attendance.checkIn &&
                                 String(attendance.checkIn).trim() !== "" &&
                                 String(attendance.checkIn).trim() !== "—" &&
                                 String(attendance.checkIn).trim() !== "null" &&
                                 String(attendance.checkIn).trim() !== "undefined";
              const virtualStatus: ShiftStatus = hasCheckIn ? "completed" : "scheduled";

              finalSchedule.push({
                _id: `${dateStr}-${virtualShiftId}`,
                date: dateStr,
                shift: {
                  _id: String(virtualShiftId),
                  name: "Ca theo chấm công",
                  startTime: virtualStartTime,
                  endTime: virtualEndTime,
                  breakDuration: 0,
                },
                status: virtualStatus,
                location: attendance.location || t('dashboard:schedule.defaults.location'),
                team: t('dashboard:schedule.defaults.team'),
                notes: attendance.notes || "",
                attendanceRecord: attendance,
              });
            }
            // Nếu không có schedule được gán và không có fallback, không tạo entry
          }

          cursor.setDate(cursor.getDate() + 1);
        }

        finalSchedule.sort((a, b) => a.date.localeCompare(b.date));
        setSchedule(finalSchedule);
      } catch (err) {
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchData();
    }
  }, [user, t]);

  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        <p className="text-lg">{t('dashboard:schedule.loading')}</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const todayShifts = schedule.filter((s) => s.date === todayStr);
  const upcomingShifts = schedule
    .filter((s) => {
      const date = new Date(s.date);
      date.setHours(0, 0, 0, 0);
      const dayOfWeek = date.getDay();
      // Chỉ hiển thị từ Thứ 2 đến Thứ 6 (loại bỏ Thứ 7 và Chủ nhật)
      // Loại bỏ các ca có status = "off" (đã được duyệt nghỉ)
      return date > today && s.status === "scheduled" && dayOfWeek >= 1 && dayOfWeek <= 5 && s.shift._id;
    })
    .slice(0, 6);

  const currentMonthKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
  const monthShifts = schedule.filter((s) =>
    s.date.startsWith(currentMonthKey)
  );

  // Calculate month stats based on actual attendance
  const monthAttended = monthShifts.filter((s) => {
    if (!s.attendanceRecord) return false;
    const checkIn = s.attendanceRecord.checkIn;
    if (!checkIn) return false;
    const checkInStr = String(checkIn).trim();
    return checkInStr !== "" && 
           checkInStr !== "—" && 
           checkInStr !== "null" && 
           checkInStr !== "undefined";
  });

  const monthOnTime = monthAttended.filter((s) => {
    return s.attendanceRecord?.status === "ontime";
  });

  // Calculate total hours from attendance records
  const monthTotalHours = monthAttended.reduce((acc, s) => {
    if (s.attendanceRecord?.hours) {
      const hoursStr = s.attendanceRecord.hours;
      // Parse hours string like "8.0h" or "8.0"
      const hoursRegex = /(\d+\.?\d*)/;
      const hoursMatch = hoursRegex.exec(hoursStr);
      if (hoursMatch) {
        return acc + Number.parseFloat(hoursMatch[1]);
      }
    }
    // Fallback to calculated hours
    return acc + calculateShiftHours(s.shift);
  }, 0);

  // Count upcoming shifts (not yet attended and in the future)
  const monthUpcoming = monthShifts.filter((s) => {
    const date = new Date(s.date);
    date.setHours(0, 0, 0, 0);
    const hasAttended = s.attendanceRecord && 
                        s.attendanceRecord.checkIn && 
                        String(s.attendanceRecord.checkIn).trim() !== "" && 
                        String(s.attendanceRecord.checkIn).trim() !== "—" &&
                        String(s.attendanceRecord.checkIn).trim() !== "null" &&
                        String(s.attendanceRecord.checkIn).trim() !== "undefined";
    return !hasAttended && date >= today;
  });

  const stats = {
    thisMonth: monthShifts.length,
    completed: monthAttended.length,
    upcoming: monthUpcoming.length,
    totalHours: monthTotalHours,
    performance:
      monthShifts.length > 0
        ? Math.round((monthAttended.length / monthShifts.length) * 100)
        : 0,
    onTimeCount: monthOnTime.length,
    onTimeRate: monthAttended.length > 0
      ? Math.round((monthOnTime.length / monthAttended.length) * 100)
      : 0,
  };

  const formattedTotalHours =
    Math.round((stats.totalHours + Number.EPSILON) * 10) / 10;

  const currentMonthLabel = today.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  const currentDayOfWeek = today.getDay();
  const mondayDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayDiff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  const weekShiftEntries = schedule.filter((s) => {
    const date = new Date(s.date);
    date.setHours(0, 0, 0, 0);
    return date >= weekStart && date <= weekEnd;
  });

  // Total shifts in week (excluding weekends)
  const expectedWeekdays = weekShiftEntries.length;

  // Count week attended shifts (has checkIn)
  const weekAttendedShifts = weekShiftEntries.filter((s) => {
    if (!s.attendanceRecord) return false;
    const checkIn = s.attendanceRecord.checkIn;
    if (!checkIn) return false;
    const checkInStr = String(checkIn).trim();
    return checkInStr !== "" && 
           checkInStr !== "—" && 
           checkInStr !== "null" && 
           checkInStr !== "undefined";
  });

  // Count week on-time shifts
  const weekOnTimeShifts = weekAttendedShifts.filter((s) => {
    return s.attendanceRecord?.status === "ontime";
  });

  // Calculate week total hours from attendance records
  const weekTotalHours = weekAttendedShifts.reduce((acc, s) => {
    if (s.attendanceRecord?.hours) {
      const hoursStr = s.attendanceRecord.hours;
      const hoursMatch = hoursStr.match(/(\d+\.?\d*)/);
      if (hoursMatch) {
        return acc + parseFloat(hoursMatch[1]);
      }
    }
    return acc + calculateShiftHours(s.shift);
  }, 0);

  // Avg hours: total hours / number of attended shifts (not total shifts)
  const avgWeekHours =
    weekAttendedShifts.length > 0
      ? (weekTotalHours / weekAttendedShifts.length).toFixed(1)
      : "0.0";

  // Week attendance: attended / total shifts in week
  const weekAttendancePercent =
    expectedWeekdays > 0
      ? ((weekAttendedShifts.length / expectedWeekdays) * 100).toFixed(0)
      : "0";
  const weekAttendanceLabel =
    expectedWeekdays > 0
      ? `${weekAttendedShifts.length}/${expectedWeekdays} ${t('dashboard:schedule.shift')}`
      : `0/0 ${t('dashboard:schedule.shift')}`;

  // On-time: on-time shifts / total shifts in week
  const weekOnTimePercent =
    expectedWeekdays > 0
      ? ((weekOnTimeShifts.length / expectedWeekdays) * 100).toFixed(0)
      : "0";
  const weekOnTimeLabel =
    expectedWeekdays > 0
      ? `${weekOnTimeShifts.length}/${expectedWeekdays}`
      : "0/0";

  const getWeekDayStatus = (
    date: Date
  ): "completed" | "today" | "scheduled" | "off" | "none" => {
    const dateStr = date.toISOString().split("T")[0];
    const dayShifts = schedule.filter((s) => s.date === dateStr);

    if (dayShifts.length === 0) return "off";
    
    // Ưu tiên check status = "off" trước (từ leave request đã được approve)
    // Nếu schedule có status = "off" thì luôn hiển thị off, dù là hôm nay hay ngày khác
    if (dayShifts.some((s) => s.status === "off")) return "off";
    
    // Check if today
    if (dateStr === todayStr) {
      // Check if has attendance record with checkIn
      const hasAttended = dayShifts.some((s) => 
        s.attendanceRecord && s.attendanceRecord.checkIn && 
        s.attendanceRecord.checkIn !== "—" && s.attendanceRecord.checkIn !== ""
      );
      return hasAttended ? "completed" : "today";
    }

    // Check if has attendance (completed)
    const hasAttended = dayShifts.some((s) => {
      if (!s.attendanceRecord) return false;
      const checkIn = s.attendanceRecord.checkIn;
      if (!checkIn) return false;
      const checkInStr = String(checkIn).trim();
      return checkInStr !== "" && 
             checkInStr !== "—" && 
             checkInStr !== "null" && 
             checkInStr !== "undefined";
    });
    if (hasAttended) return "completed";
    
    // Check if no attendance and in the past (should be "off"/nghỉ)
    const isPast = date < today;
    if (isPast && !hasAttended) return "off";

    return "scheduled";
  };

  const getWeekDayColor = (
    status: "completed" | "today" | "scheduled" | "off" | "none"
  ): string => {
    switch (status) {
      case "completed":
        return "bg-[var(--success)] text-white";
      case "today":
        return "bg-[var(--accent-cyan)] text-white";
      case "scheduled":
        return "bg-[var(--primary)] text-white";
      case "off":
        return "bg-[var(--text-sub)] text-white";
      default:
        return "bg-[var(--shell)] text-[var(--text-main)] border border-[var(--border)]";
    }
  };

  const getStatusColor = (status: ShiftStatus): string => {
    return getShiftStatusBadgeClass(status);
  };


  // Tìm ca hiện tại (đang diễn ra)
  const currentShift = todayShifts.find((s) => {
    let now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [sh, sm] = s.shift.startTime.split(":").map(Number);
    const [eh, em] = s.shift.endTime.split(":").map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;

    // Xử lý ca đêm (22:00 → 06:00)
    if (endMin < startMin) {
      endMin += 24 * 60;
      if (now < startMin) now += 24 * 60; // Bây giờ hợp lệ!
    }

    return now >= startMin && now < endMin;
  });

  const countdown = currentShift
    ? (() => {
        let now = currentTime.getHours() * 60 + currentTime.getMinutes();
        const [sh, sm] = currentShift.shift.startTime.split(":").map(Number);
        const [eh, em] = currentShift.shift.endTime.split(":").map(Number);
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;

        // Xử lý ca đêm
        if (endMin < startMin) {
          endMin += 24 * 60;
          if (now < startMin) now += 24 * 60;
        }

        const remaining = endMin - now;
        if (remaining <= 0) return null;

        return {
          hours: Math.floor(remaining / 60),
          minutes: remaining % 60,
          remaining,
        };
      })()
    : null;

  interface StatCard {
    label: string;
    value: string | number;
    color: string;
    icon: string;
    delay: number;
  }

  const statCards: StatCard[] = [
    {
      label: t('dashboard:schedule.stats.thisMonth'),
      value: stats.thisMonth,
      color: "primary",
      icon: "📋",
      delay: 0.1,
    },
    {
      label: t('dashboard:schedule.stats.checkedIn'),
      value: stats.completed,
      color: "success",
      icon: "✅",
      delay: 0.2,
    },
    {
      label: t('dashboard:schedule.stats.upcoming'),
      value: stats.upcoming,
      color: "accent-cyan",
      icon: "🔜",
      delay: 0.3,
    },
    {
      label: t('dashboard:schedule.stats.totalHours'),
      value: `${formattedTotalHours}h`,
      color: "warning",
      icon: "⏰",
      delay: 0.4,
    },
    {
      label: t('dashboard:schedule.stats.performance'),
      value: stats.performance + "%",
      color: "success",
      icon: "📊",
      delay: 0.5,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-[var(--text-main)] flex items-center space-x-3">
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                📆
              </motion.span>
              <span>{t('dashboard:schedule.title')}</span>
            </h1>
            <p className="text-[var(--text-sub)] mt-1">
              {today.toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Badge className="bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/40 dark:bg-[var(--accent-cyan)]/10 dark:border-[var(--accent-cyan)]/25 px-4 py-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            {upcomingShifts.length} {t('dashboard:schedule.upcomingShifts')}
          </Badge>
        </div>
      </motion.div>

      {/* Stats - 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: stat.delay }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-colors duration-200">
              <CardContent className="p-4 mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-sub)]">
                      {stat.label}
                    </p>
                    <motion.p
                      className={`text-2xl mt-1 text-[var(--${stat.color})]`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: stat.delay + 0.2, type: "spring" }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                  <motion.div
                    className="text-3xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {stat.icon}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Dashboard - 2 Columns */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column - Today's Shifts Widget (2 cols) */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* Today's Shift Card */}
          <Card className="bg-gradient-to-br from-[var(--primary)]/[0.15] to-[var(--accent-cyan)]/[0.15] dark:from-[var(--primary)]/[0.08] dark:to-[var(--accent-cyan)]/[0.08] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-[var(--accent-cyan)]" />
                  <span>{t('dashboard:schedule.todayShift')}</span>
                </div>
                {countdown && (
                  <Badge className="bg-[var(--warning)]/30 text-[var(--warning)] border border-[var(--warning)]/50 dark:bg-[var(--warning)]/20 dark:border-[var(--warning)]/30">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('dashboard:schedule.timeRemaining')} {countdown.hours}{t('dashboard:schedule.hours')} {countdown.minutes}{t('dashboard:schedule.minutes')}
                  </Badge>
                )}
              </CardTitle>

              <div className="flex items-center text-4xl text-[var(--text-sub)] justify-center mt-8 mb-8">
                <Clock className="h-8 w-8 mr-2 text-[var(--accent-cyan)] animate-pulse" />
                <span>
                  {liveTime.toLocaleTimeString("vi-VN", { hour12: false })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Time Range */}
              {todayShifts.length > 0 && (
                <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
                  <div className="text-center">
                    <p className="text-sm text-[var(--text-sub)] mb-4">
                      {t('dashboard:schedule.timeRange')}
                    </p>
                    <motion.div
                      className="text-3xl text-[var(--text-main)]"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {todayShifts[0].shift.startTime} -{" "}
                      {todayShifts[0].shift.endTime}
                    </motion.div>
                    {countdown &&
                      currentShift &&
                      (() => {
                        const [sh, sm] = currentShift.shift.startTime
                          .split(":")
                          .map(Number);
                        const [eh, em] = currentShift.shift.endTime
                          .split(":")
                          .map(Number);
                        let startMin = sh * 60 + sm;
                        let endMin = eh * 60 + em;
                        let now =
                          currentTime.getHours() * 60 +
                          currentTime.getMinutes();

                        if (endMin < startMin) {
                          endMin += 24 * 60;
                          if (now < startMin) now += 24 * 60;
                        }

                        const totalDuration = endMin - startMin;
                        const elapsed = now - startMin;
                        const progress = (elapsed / totalDuration) * 100;

                        return (
                          <div className="mt-3">
                            <Progress
                              value={Math.min(100, Math.max(0, progress))}
                              className="h-2"
                            />
                            <p className="text-xs text-[var(--text-sub)] mt-2">
                              {t('dashboard:schedule.inShift')}
                            </p>
                          </div>
                        );
                      })()}
                  </div>
                </div>
              )}

              {/* Today's Shifts Details */}
              <div className="space-y-3">
                {todayShifts.length > 0 ? (
                  todayShifts.map((shift, index) => (
                    <motion.div
                      key={shift._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                    >
                      <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] hover:border-[var(--accent-cyan)] transition-colors duration-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-lg ${
                                shift.status === "completed"
                                  ? "bg-[var(--success)]/30 dark:bg-[var(--success)]/20"
                                  : "bg-[var(--accent-cyan)]/30 dark:bg-[var(--accent-cyan)]/20"
                              }`}
                            >
                              {shift.shift.name.toLowerCase().includes("sáng")
                                ? "🌅"
                                : "🌆"}
                            </div>
                            <div>
                              <h4 className="text-[var(--text-main)]">
                                {shift.shift.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getStatusColor(shift.status)}>
                                  {shift.status === "completed"
                                    ? `✅ ${t('dashboard:schedule.checkedInStatus')}`
                                    : shift.status === "off" && shift.notes?.includes("Nghỉ")
                                    ? `🏖️ ${shift.notes.split(":")[0] || "Nghỉ phép"}`
                                    : `🔵 ${t('dashboard:schedule.notCheckedIn')}`}
                                </Badge>
                                {shift.status === "off" && shift.notes?.includes("Nghỉ") && (
                                  <span className="text-xs text-[var(--text-sub)]" title={shift.notes}>
                                    {shift.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 ml-11">
                          <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                            <Clock className="h-4 w-4 text-[var(--accent-cyan)]" />
                            <span>
                              {shift.shift.startTime} - {shift.shift.endTime}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                            <MapPin className="h-4 w-4 text-[var(--success)]" />
                            <span>{shift.location}</span>
                          </div>
                          {/* Với user mới (ca tạo từ chấm công), chỉ hiển thị giờ + trụ sở */}
                          {shift.shift.name !== "Ca theo chấm công" && (
                            <>
                              <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                                <Users className="h-4 w-4 text-[var(--primary)]" />
                                <span>{shift.team}</span>
                              </div>
                              {sanitizeNotes(shift.notes) && (
                                <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                                  <StickyNote className="h-4 w-4 text-[var(--warning)]" />
                                  <span>{sanitizeNotes(shift.notes) as string}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--text-sub)] text-lg">
                    {new Date().getDay() === 0
                      ? t('dashboard:schedule.offToday')
                      : t('dashboard:schedule.noWorkToday')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Stats & Week Overview (3 cols) */}
        <motion.div
          className="lg:col-span-3 space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          {/* Week Overview */}
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-[var(--accent-cyan)]" />
                <span>{t('dashboard:schedule.thisWeek')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day, index) => {
                  const status = getWeekDayStatus(day);
                  const isToday = day.toISOString().split("T")[0] === todayStr;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      whileHover={{ scale: 1.1 }}
                      className="text-center"
                    >
                      <div className="text-xs text-[var(--text-sub)] mb-2">
                        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}
                      </div>
                      <div
                        className={`
                        w-full aspect-square rounded-lg flex items-center justify-center
                        ${getWeekDayColor(status)}
                        ${
                          isToday
                            ? "ring-2 ring-[var(--accent-cyan)] ring-offset-2 ring-offset-[var(--background)]"
                            : ""
                        }
                        transition-all cursor-pointer
                      `}
                      >
                        <span>{day.getDate()}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--success)]" />
                  <span className="text-[var(--text-sub)]">
                    {t('dashboard:schedule.legend.done')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--accent-cyan)]" />
                  <span className="text-[var(--text-sub)]">
                    {t('dashboard:schedule.legend.today')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--primary)]" />
                  <span className="text-[var(--text-sub)]">
                    {t('dashboard:schedule.legend.upcoming')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--text-sub)]" />
                  <span className="text-[var(--text-sub)]">
                    {t('dashboard:schedule.legend.off')}
                  </span>
                </div>
              </div>

              {/* Week Stats */}
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:schedule.thisWeekLabel')}</p>
                  <p className="text-xl text-[var(--text-main)] mt-1">
                    {weekAttendanceLabel}
                  </p>
                  <p className="text-xs text-[var(--success)]">
                    {weekAttendancePercent}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-sub)]">
                    {t('dashboard:schedule.weekStats.onTime')}
                  </p>
                  <p className="text-xl text-[var(--text-main)] mt-1">
                    {weekOnTimeLabel}
                  </p>
                  <p className="text-xs text-[var(--success)]">
                    {weekOnTimePercent}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-sub)]">
                    {t('dashboard:schedule.weekStats.avgHoursShort')}
                  </p>
                  <p className="text-xl text-[var(--text-main)] mt-1">
                    {avgWeekHours}h
                  </p>
                  <p className="text-xs text-[var(--text-sub)]">{t('dashboard:schedule.perDay')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Progress */}
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent-cyan)]" />
                <span>
                  {t('dashboard:schedule.monthStats.title', {
                    month: currentMonthLabel,
                  })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-sub)]">
                    {t('dashboard:schedule.monthProgress')}
                  </span>
                  <span className="text-sm text-[var(--text-main)]">
                    {stats.completed}/{stats.thisMonth} {t('dashboard:schedule.shift')} (
                    {stats.thisMonth > 0
                      ? ((stats.completed / stats.thisMonth) * 100).toFixed(0)
                      : 0}
                    %)
                  </span>
                </div>
                <Progress
                  value={
                    stats.thisMonth > 0
                      ? (stats.completed / stats.thisMonth) * 100
                      : 0
                  }
                  className="h-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--shell)] rounded-lg p-3 border border-[var(--border)]/50 dark:border-transparent">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4 text-[var(--warning)]" />
                    <span className="text-sm text-[var(--text-sub)]">
                      {t('dashboard:schedule.monthStats.totalHours')}
                    </span>
                  </div>
                  <p className="text-2xl text-[var(--text-main)]">
                    {formattedTotalHours}h
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    {t('dashboard:schedule.monthStats.averageLabel')}{" "}
                    {stats.completed > 0
                      ? (stats.totalHours / stats.completed).toFixed(1)
                      : 0}
                    {t('dashboard:schedule.hoursPerDay')}
                  </p>
                </div>

                <div className="bg-[var(--shell)] rounded-lg p-3 border border-[var(--border)]/50 dark:border-transparent">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="h-4 w-4 text-[var(--warning)]" />
                    <span className="text-sm text-[var(--text-sub)]">
                      {t('dashboard:schedule.stats.performance')}
                    </span>
                  </div>
                  <p className="text-2xl text-[var(--success)]">
                    {stats.performance}%
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    {t('dashboard:schedule.updatedFromMonth')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Shifts - Compact List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-[var(--warning)]" />
              <span>{t('dashboard:schedule.upcomingShiftsTitle')} ({upcomingShifts.length} {t('dashboard:schedule.upcomingShifts')})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingShifts.map((shift, index) => (
                <motion.div
                  key={shift._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0 + index * 0.05 }}
                  whileHover={{ scale: 1.03, y: -3 }}
                >
                  <div className="bg-[var(--shell)] rounded-lg p-4 border border-[var(--border)]/50 dark:border-transparent hover:border-[var(--accent-cyan)] transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/40 dark:bg-[var(--accent-cyan)]/10 dark:border-[var(--accent-cyan)]/25 text-xs">
                        {new Date(shift.date).toLocaleDateString("vi-VN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </Badge>
                      <span className="text-xl">
                        {shift.status === "off"
                          ? "🏖️"
                          : shift.shift.name.toLowerCase().includes("xa")
                          ? "💻"
                          : shift.shift.name.toLowerCase().includes("sáng")
                          ? "🌅"
                          : "🌆"}
                      </span>
                    </div>
                    <h4 className="text-[var(--text-main)] mb-1">
                      {shift.shift.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                      <Clock className="h-3 w-3" />
                      <span>
                        {shift.shift.startTime} - {shift.shift.endTime}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)] mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{shift.location}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievements Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Card className="bg-gradient-to-br from-[var(--primary)]/[0.15] to-[var(--success)]/[0.15] dark:from-[var(--primary)]/[0.08] dark:to-[var(--success)]/[0.08] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
              <Award className="h-5 w-5 text-[var(--warning)]" />
              <span>{t('dashboard:schedule.achievements')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const onTimeRate = stats.onTimeRate;
              let onTimeMessage = t('dashboard:schedule.stats.performanceMessages.excellent');
              if (onTimeRate < 50) onTimeMessage = t('dashboard:schedule.stats.performanceMessages.needsImprovement');
              else if (onTimeRate < 80) onTimeMessage = t('dashboard:schedule.stats.performanceMessages.good');
              else if (onTimeRate < 95) onTimeMessage = t('dashboard:schedule.stats.performanceMessages.veryGood');

              let currentStreak = 0;
              const sortedAttended = [...monthAttended].sort((a, b) => 
                b.date.localeCompare(a.date)
              );
              
              const checkDate = new Date(today);
              for (let i = 0; i < 365; i++) {
                const dateStr = checkDate.toISOString().split("T")[0];
                const hasAttended = sortedAttended.some((s) => s.date === dateStr);
                
                if (hasAttended) {
                  currentStreak++;
                  checkDate.setDate(checkDate.getDate() - 1);
                } else {
                  break;
                }
              }

              const avgHoursPerDay = stats.completed > 0
                ? (stats.totalHours / stats.completed).toFixed(1)
                : "0.0";

              return (
                <div className="grid md:grid-cols-3 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 }}
                    className="flex flex-col items-center text-center p-4 rounded-lg bg-[var(--surface)]/70 border border-[var(--border)]/70 dark:bg-[var(--surface)]/50 dark:border-[var(--border)]/50"
                  >
                    <div className="w-16 h-16 rounded-full bg-[var(--success)]/30 dark:bg-[var(--success)]/20 flex items-center justify-center text-3xl mb-3">
                      🎯
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-main)] mb-1">
                      {onTimeRate}%
                    </p>
                    <p className="text-sm text-[var(--text-sub)] mb-1">
                      {t('dashboard:schedule.stats.onTimeRateMessage', { rate: onTimeRate })}
                    </p>
                    <p className="text-xs text-[var(--text-sub)]">
                      {onTimeMessage}
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.3 }}
                    className="flex flex-col items-center text-center p-4 rounded-lg bg-[var(--surface)]/70 border border-[var(--border)]/70 dark:bg-[var(--surface)]/50 dark:border-[var(--border)]/50"
                  >
                    <div className="w-16 h-16 rounded-full bg-[var(--warning)]/30 dark:bg-[var(--warning)]/20 flex items-center justify-center text-3xl mb-3">
                      🔥
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-main)] mb-1">
                      {currentStreak}
                    </p>
                    <p className="text-sm text-[var(--text-sub)] mb-1">
                      {t('dashboard:schedule.stats.streak')}
                    </p>
                    <p className="text-xs text-[var(--text-sub)]">
                      {currentStreak > 0 ? t('dashboard:schedule.stats.streakMessages.keepGoing') : t('dashboard:schedule.stats.streakMessages.startNew')}
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4 }}
                    className="flex flex-col items-center text-center p-4 rounded-lg bg-[var(--surface)]/70 border border-[var(--border)]/70 dark:bg-[var(--surface)]/50 dark:border-[var(--border)]/50"
                  >
                    <div className="w-16 h-16 rounded-full bg-[var(--accent-cyan)]/30 dark:bg-[var(--accent-cyan)]/20 flex items-center justify-center text-3xl mb-3">
                      ⭐
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-main)] mb-1">
                      {avgHoursPerDay}h
                    </p>
                    <p className="text-sm text-[var(--text-sub)] mb-1">
                      {t('dashboard:schedule.avgHoursPerDay')}
                    </p>
                    <p className="text-xs text-[var(--text-sub)]">
                      {t('dashboard:schedule.monthLabel', { month: currentMonthLabel })}
                    </p>
                  </motion.div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SchedulePage;
