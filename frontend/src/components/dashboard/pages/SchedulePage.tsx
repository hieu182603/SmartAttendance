import React, { useState, useEffect } from "react";
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
  CheckCircle2,
  StickyNote,
  Target,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Progress } from "../../ui/progress";

type ShiftStatus = "completed" | "scheduled" | "missed" | "off";
type WeekDayStatus = "completed" | "today" | "scheduled" | "off" | "none";

interface Shift {
  id: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  location: string;
  status: ShiftStatus;
  team?: string;
  notes?: string;
}

interface Stats {
  thisMonth: number;
  completed: number;
  upcoming: number;
  totalHours: number;
  performance: number;
}

interface Countdown {
  hours: number;
  minutes: number;
  remaining: number;
}

interface StatCard {
  label: string;
  value: string | number;
  color: string;
  icon: string;
  delay: number;
}

// Mock data - updated với ngày tháng 11/2025
const mockShifts: Shift[] = [
  // Completed shifts
  {
    id: "1",
    date: "2025-11-04",
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  {
    id: "2",
    date: "2025-11-04",
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  {
    id: "3",
    date: "2025-11-05",
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  {
    id: "4",
    date: "2025-11-05",
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  {
    id: "5",
    date: "2025-11-06",
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  {
    id: "6",
    date: "2025-11-06",
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  {
    id: "7",
    date: "2025-11-07",
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  {
    id: "8",
    date: "2025-11-20",
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
  },
  // Today's shifts
  {
    id: "9",
    date: "2025-11-08",
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
    notes: "Họp stand-up 9:00 AM",
  },
  {
    id: "10",
    date: "2025-11-08",
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "scheduled",
    team: "Dev Team",
    notes: "Code review 2:00 PM",
  },
  // Upcoming shifts
  {
    id: "11",
    date: "2025-11-09",
    shift: "Làm từ xa",
    startTime: "09:00",
    endTime: "17:00",
    location: "Làm từ xa",
    status: "scheduled",
    team: "Dev Team",
    notes: "Submit code review trước 5PM",
  },
  {
    id: "12",
    date: "2025-11-10",
    shift: "Nghỉ",
    startTime: "--",
    endTime: "--",
    location: "--",
    status: "off",
  },
  {
    id: "13",
    date: "2025-11-11",
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "scheduled",
    team: "Dev Team",
  },
  {
    id: "14",
    date: "2025-11-11",
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "scheduled",
    team: "Dev Team",
  },
  {
    id: "15",
    date: "2025-11-18",
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "scheduled",
    team: "Dev Team",
  },
  {
    id: "16",
    date: "2025-11-18",
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "scheduled",
    team: "Dev Team",
  },
];

const SchedulePage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date(); // Mock today
  const todayStr = today.toISOString().split("T")[0];

  const todayShiftMorning: Shift = {
    id: `today-morning-${todayStr}`,
    date: todayStr,
    shift: "Ca sáng",
    startTime: "08:00",
    endTime: "12:00",
    location: "Văn phòng HN",
    status: "completed",
    team: "Dev Team",
    notes: "Họp stand-up 9:00 AM",
  };

  const todayShiftAfternoon: Shift = {
    id: `today-afternoon-${todayStr}`,
    date: todayStr,
    shift: "Ca chiều",
    startTime: "13:00",
    endTime: "17:00",
    location: "Văn phòng HN",
    status: "scheduled",
    team: "Dev Team",
    notes: "Code review 2:00 PM",
  };

  const hasTodayData = mockShifts.some((s) => s.date === todayStr);

  // Dùng finalShifts để render
  const finalShifts: Shift[] = hasTodayData
    ? mockShifts
    : [todayShiftMorning, todayShiftAfternoon, ...mockShifts];

  // Calculate stats for this month
  const monthShifts = finalShifts.filter((s) => s.date.startsWith("2025-11"));
  const stats: Stats = {
    thisMonth: monthShifts.filter((s) => s.status !== "off").length,
    completed: monthShifts.filter((s) => s.status === "completed").length,
    upcoming: monthShifts.filter((s) => s.status === "scheduled").length,
    totalHours: monthShifts
      .filter((s) => s.status === "completed")
      .reduce((acc, shift) => {
        const start = parseInt(shift.startTime.split(":")[0]);
        const end = parseInt(shift.endTime.split(":")[0]);
        return acc + (end - start);
      }, 0),
    performance: 97.2, // Mock performance percentage
  };

  // Today's shifts
  const todayShifts = finalShifts.filter((shift) => shift.date === todayStr);
  const currentShift = todayShifts.find((shift) => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const start =
      parseInt(shift.startTime.split(":")[0]) * 60 +
      parseInt(shift.startTime.split(":")[1] || "0");
    const end =
      parseInt(shift.endTime.split(":")[0]) * 60 +
      parseInt(shift.endTime.split(":")[1] || "0");
    return shift.status === "scheduled" && now >= start - 120 && now <= end; // 2 hours before to end
  });

  // Get upcoming shifts (next 7 days)
  const upcomingShifts = finalShifts
    .filter((shift) => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= today && shift.status === "scheduled";
    })
    .slice(0, 6);

  // Week overview (Mon-Sun)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  const getWeekDayStatus = (date: Date): WeekDayStatus => {
    const dateStr = date.toISOString().split("T")[0];
    const dayShifts = mockShifts.filter((s) => s.date === dateStr);
    if (dayShifts.length === 0) return "none";
    if (dayShifts.every((s) => s.status === "completed")) return "completed";
    if (dayShifts.some((s) => s.status === "off")) return "off";
    if (dateStr === todayStr) return "today";
    return "scheduled";
  };

  const getWeekDayColor = (status: WeekDayStatus): string => {
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
    switch (status) {
      case "completed":
        return "bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/40 dark:bg-[var(--success)]/10 dark:border-[var(--success)]/25";
      case "scheduled":
        return "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/40 dark:bg-[var(--accent-cyan)]/10 dark:border-[var(--accent-cyan)]/25";
      case "missed":
        return "bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/40 dark:bg-[var(--error)]/10 dark:border-[var(--error)]/25";
      case "off":
        return "bg-[var(--text-sub)]/20 text-[var(--text-sub)] border border-[var(--text-sub)]/40 dark:bg-[var(--text-sub)]/10 dark:border-[var(--text-sub)]/25";
      default:
        return "bg-[var(--surface)] border border-[var(--border)]";
    }
  };

  const getStatusLabel = (status: ShiftStatus): string => {
    switch (status) {
      case "completed":
        return "Hoàn thành";
      case "scheduled":
        return "Đã lên lịch";
      case "missed":
        return "Vắng mặt";
      case "off":
        return "Nghỉ";
      default:
        return status;
    }
  };

  // Calculate countdown for next shift
  const getCountdown = (): Countdown | null => {
    if (!currentShift) return null;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const end =
      parseInt(currentShift.endTime.split(":")[0]) * 60 +
      parseInt(currentShift.endTime.split(":")[1] || "0");
    const remaining = end - now;
    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    return { hours, minutes, remaining };
  };

  const countdown = getCountdown();

  const statCards: StatCard[] = [
    {
      label: "Tháng này",
      value: stats.thisMonth,
      color: "primary",
      icon: "📋",
      delay: 0.1,
    },
    {
      label: "Đã điểm danh",
      value: stats.completed,
      color: "success",
      icon: "✅",
      delay: 0.2,
    },
    {
      label: "Sắp tới",
      value: stats.upcoming,
      color: "accent-cyan",
      icon: "🔜",
      delay: 0.3,
    },
    {
      label: "Tổng giờ",
      value: stats.totalHours + "h",
      color: "warning",
      icon: "⏰",
      delay: 0.4,
    },
    {
      label: "Hiệu suất",
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
              <span>Lịch làm việc</span>
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
            {upcomingShifts.length} ca sắp tới
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
                  <span>Ca làm hôm nay</span>
                </div>
                {countdown && (
                  <Badge className="bg-[var(--warning)]/30 text-[var(--warning)] border border-[var(--warning)]/50 dark:bg-[var(--warning)]/20 dark:border-[var(--warning)]/30">
                    <Clock className="h-3 w-3 mr-1" />
                    Còn {countdown.hours}h {countdown.minutes}m
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Time Range */}
              <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-sub)] mb-2">
                    Khung giờ làm việc
                  </p>
                  <motion.div
                    className="text-3xl text-[var(--text-main)]"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    08:00 - 17:00
                  </motion.div>
                  {countdown && (
                    <div className="mt-3">
                      <Progress
                        value={(countdown.remaining / (9 * 60)) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-[var(--text-sub)] mt-2">
                        Đang trong ca làm việc
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Today's Shifts Details */}
              <div className="space-y-3">
                {todayShifts.map((shift, index) => (
                  <motion.div
                    key={shift.id}
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
                            {shift.shift.includes("sáng") ? "🌅" : "🌆"}
                          </div>
                          <div>
                            <h4 className="text-[var(--text-main)]">
                              {shift.shift}
                            </h4>
                            <Badge className={getStatusColor(shift.status)}>
                              {shift.status === "completed"
                                ? "✅ Đã điểm"
                                : "🔵 Chưa điểm"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 ml-11">
                        <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                          <Clock className="h-4 w-4 text-[var(--accent-cyan)]" />
                          <span>
                            {shift.startTime} - {shift.endTime}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                          <MapPin className="h-4 w-4 text-[var(--success)]" />
                          <span>{shift.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                          <Users className="h-4 w-4 text-[var(--primary)]" />
                          <span>{shift.team}</span>
                        </div>
                        {shift.notes && (
                          <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                            <StickyNote className="h-4 w-4 text-[var(--warning)]" />
                            <span>{shift.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button className="px-4 py-2 rounded-lg bg-[var(--accent-cyan)] text-white hover:opacity-90 transition-opacity text-sm">
                  <CheckCircle2 className="h-4 w-4 inline mr-1" />
                  Điểm danh
                </button>
                <button className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--accent-cyan)] transition-colors duration-200 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Báo nghỉ
                </button>
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
                <span>Lịch tuần này</span>
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
                  <span className="text-[var(--text-sub)]">Hoàn thành</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--accent-cyan)]" />
                  <span className="text-[var(--text-sub)]">Hôm nay</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--primary)]" />
                  <span className="text-[var(--text-sub)]">Sắp tới</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--text-sub)]" />
                  <span className="text-[var(--text-sub)]">Nghỉ</span>
                </div>
              </div>

              {/* Week Stats */}
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-sub)]">Tuần này</p>
                  <p className="text-xl text-[var(--text-main)] mt-1">5/5 ca</p>
                  <p className="text-xs text-[var(--success)]">100%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-sub)]">Đúng giờ</p>
                  <p className="text-xl text-[var(--text-main)] mt-1">
                    {stats.completed}/{stats.thisMonth}
                  </p>
                  <p className="text-xs text-[var(--success)]">
                    {stats.thisMonth > 0 ? ((stats.completed / stats.thisMonth) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-sub)]">Avg giờ</p>
                  <p className="text-xl text-[var(--text-main)] mt-1">8.0h</p>
                  <p className="text-xs text-[var(--text-sub)]">/ngày</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Progress */}
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent-cyan)]" />
                <span>Thống kê tháng 11</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-sub)]">
                    Tiến độ tháng
                  </span>
                  <span className="text-sm text-[var(--text-main)]">
                    {stats.completed}/{stats.thisMonth} ca (
                    {stats.thisMonth > 0 ? ((stats.completed / stats.thisMonth) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <Progress
                  value={stats.thisMonth > 0 ? (stats.completed / stats.thisMonth) * 100 : 0}
                  className="h-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--shell)] rounded-lg p-3 border border-[var(--border)]/50 dark:border-transparent">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4 text-[var(--warning)]" />
                    <span className="text-sm text-[var(--text-sub)]">
                      Tổng giờ
                    </span>
                  </div>
                  <p className="text-2xl text-[var(--text-main)]">
                    {stats.totalHours}h
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    Trung bình{" "}
                    {stats.completed > 0 ? (stats.totalHours / (stats.completed / 2)).toFixed(1) : 0}
                    h/ngày
                  </p>
                </div>

                <div className="bg-[var(--shell)] rounded-lg p-3 border border-[var(--border)]/50 dark:border-transparent">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="h-4 w-4 text-[var(--warning)]" />
                    <span className="text-sm text-[var(--text-sub)]">
                      Hiệu suất
                    </span>
                  </div>
                  <p className="text-2xl text-[var(--success)]">
                    {stats.performance}%
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    +2.5% so với tháng trước
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
              <span>Ca làm sắp tới ({upcomingShifts.length} ca)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingShifts.map((shift, index) => (
                <motion.div
                  key={shift.id}
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
                          : shift.shift.includes("xa")
                          ? "💻"
                          : shift.shift.includes("sáng")
                          ? "🌅"
                          : "🌆"}
                      </span>
                    </div>
                    <h4 className="text-[var(--text-main)] mb-1">
                      {shift.shift}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-[var(--text-sub)]">
                      <Clock className="h-3 w-3" />
                      <span>
                        {shift.startTime} - {shift.endTime}
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

      {/* Bottom Row - Notes & Tips */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <StickyNote className="h-5 w-5 text-[var(--warning)]" />
                <span>Ghi chú</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { text: "Họp team 9:00 AM", time: "9:00", icon: "👥" },
                { text: "Code review 2:00 PM", time: "14:00", icon: "💻" },
                { text: "Submit report 5:00 PM", time: "17:00", icon: "📄" },
              ].map((note, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-[var(--shell)] border border-[var(--border)]/50 dark:border-transparent"
                >
                  <span className="text-xl">{note.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-main)]">
                      {note.text}
                    </p>
                  </div>
                  <Badge className="text-xs border border-[var(--border)]">
                    {note.time}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Motivational Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card className="bg-gradient-to-br from-[var(--primary)]/[0.15] to-[var(--success)]/[0.15] dark:from-[var(--primary)]/[0.08] dark:to-[var(--success)]/[0.08] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <Award className="h-5 w-5 text-[var(--warning)]" />
                <span>Thành tích</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-[var(--surface)]/70 border border-[var(--border)]/70 dark:bg-[var(--surface)]/50 dark:border-[var(--border)]/50">
                <div className="w-10 h-10 rounded-full bg-[var(--success)]/30 dark:bg-[var(--success)]/20 flex items-center justify-center text-xl">
                  🎯
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-main)]">
                    Bạn đang on-time 97.2%
                  </p>
                  <p className="text-xs text-[var(--text-sub)]">Xuất sắc!</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-[var(--surface)]/70 border border-[var(--border)]/70 dark:bg-[var(--surface)]/50 dark:border-[var(--border)]/50">
                <div className="w-10 h-10 rounded-full bg-[var(--warning)]/30 dark:bg-[var(--warning)]/20 flex items-center justify-center text-xl">
                  🔥
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-main)]">
                    Streak: 5 ngày liên tiếp
                  </p>
                  <p className="text-xs text-[var(--text-sub)]">
                    Giữ vững phong độ!
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-[var(--surface)]/70 border border-[var(--border)]/70 dark:bg-[var(--surface)]/50 dark:border-[var(--border)]/50">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-cyan)]/30 dark:bg-[var(--accent-cyan)]/20 flex items-center justify-center text-xl">
                  ⭐
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-main)]">
                    Top 10% công ty
                  </p>
                  <p className="text-xs text-[var(--text-sub)]">
                    Về chuyên cần
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SchedulePage;




