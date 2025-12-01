import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  QrCode,
  MapPin,
  Clock,
  Calendar,
  History,
  Sparkles,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

type AttendanceStatus = "ontime" | "late" | "absent" | "unknown";

const getStatusBadge = (status: AttendanceStatus, t: (key: string) => string): React.JSX.Element | null => {
  switch (status) {
    case "ontime":
      return (
        <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30">
          {t('dashboard:employeeHome.status.ontime')}
        </Badge>
      );
    case "late":
      return (
        <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30">
          {t('dashboard:employeeHome.status.late')}
        </Badge>
      );
    case "absent":
      return (
        <Badge className="bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30">
          {t('dashboard:employeeHome.status.absent')}
        </Badge>
      );
    default:
      return null;
  }
};

interface InfoCard {
  icon: LucideIcon;
  color: string;
  label: string;
  key: "shift" | "location" | "workingDays";
  delay: number;
}

// infoCards will be created inside component to use translations

const formatWorkingDays = (
  value: string | number | { used: number; total: number } | null,
  t: (key: string) => string
): string => {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.used != null && value.total != null) {
    return `${value.used}/${value.total} ${t('dashboard:employeeHome.info.days')}`;
  }
  return String(value);
};

interface AttendanceRow {
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  location: string;
}

export const EmployeeHome: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { summary, recentAttendance, loading, error } = useDashboardData();
  
  // Get current locale for date/time formatting
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  
  const currentTime = new Date().toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentDate = new Date().toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard:employeeHome.greeting.morning');
    if (hour < 17) return t('dashboard:employeeHome.greeting.afternoon');
    if (hour < 21) return t('dashboard:employeeHome.greeting.evening');
    return t('dashboard:employeeHome.greeting.night');
  };
  
  // Create infoCards with translations
  const infoCards: InfoCard[] = [
    {
      icon: Clock,
      color: "accent-cyan",
      label: t('dashboard:employeeHome.info.shift'),
      key: "shift",
      delay: 0.5,
    },
    {
      icon: MapPin,
      color: "success",
      label: t('dashboard:employeeHome.info.location'),
      key: "location",
      delay: 0.6,
    },
    {
      icon: Calendar,
      color: "primary",
      label: t('dashboard:employeeHome.info.workingDays'),
      key: "workingDays",
      delay: 0.7,
    },
  ];

  const attendanceRows = useMemo<AttendanceRow[]>(() => {
    if (!Array.isArray(recentAttendance) || recentAttendance.length === 0) {
      return [];
    }
    return recentAttendance.map((record) => ({
      date: record?.date ?? "—",
      checkIn: record?.checkIn ?? "—",
      checkOut: record?.checkOut ?? "—",
      status: (record?.status ?? "unknown") as AttendanceStatus,
      location: record?.location ?? "—",
    }));
  }, [recentAttendance]);

  // Check if user has checked in today
  const todayAttendance = useMemo(() => {
    if (attendanceRows.length === 0) return null;

    const today = new Date();
    const todayStr = `${today.getDate()}/${
      today.getMonth() + 1
    }/${today.getFullYear()}`;

    const latestRecord = attendanceRows[0];
    // Parse date from format like "Thứ Hai, 25 tháng 11, 2025" or "25/11/2025"
    const dateMatch = latestRecord.date.match(
      /(\d{1,2})\s*(?:tháng\s*)?(\d{1,2})(?:,\s*|\s+)(\d{4})/
    );

    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const recordDateStr = `${parseInt(day)}/${parseInt(month)}/${year}`;

      if (recordDateStr === todayStr) {
        return {
          hasCheckedIn: latestRecord.checkIn !== "—",
          hasCheckedOut: latestRecord.checkOut !== "—",
          checkInTime: latestRecord.checkIn,
          checkOutTime: latestRecord.checkOut,
          location: latestRecord.location,
        };
      }
    }

    return null;
  }, [attendanceRows]);

  const loadingState = loading && (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 text-sm text-[var(--text-sub)]">
      {t('dashboard:employeeHome.loading')}
    </div>
  );

  const errorState = !loading && error && (
    <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 p-6 text-sm text-[var(--error)]">
      {t('dashboard:employeeHome.error')}
    </div>
  );

  return (
    <div className="space-y-6">
      {loadingState}
      {errorState}

      {/* Welcome Section */}
      <motion.div
        className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] rounded-2xl p-8 text-white relative overflow-hidden animate-gradient"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Floating particles */}
        <motion.div
          className="absolute top-4 right-4 text-2xl"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ✨
        </motion.div>

        <motion.div
          className="absolute bottom-4 left-4 text-2xl"
          animate={{
            y: [0, 10, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🌟
        </motion.div>

        <div className="flex items-center justify-between relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl mb-2">{getGreeting()} 👋</h1>
            <p className="opacity-90">{currentDate}</p>
          </motion.div>

          <motion.div
            className="text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="text-5xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {currentTime}
            </motion.div>

            <p className="opacity-90 mt-2">
              Ca:{" "}
              {(summary.shift as { timeRange?: string; label?: string })
                ?.timeRange ||
                (summary.shift as { timeRange?: string; label?: string })
                  ?.label ||
                (summary.shift as string) ||
                "08:00 - 17:00"}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Check-in CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)] relative overflow-hidden">
          {/* Animated glow effect */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-r ${
              todayAttendance?.hasCheckedIn
                ? "from-[var(--success)]/5 to-[var(--accent-cyan)]/5"
                : "from-[var(--primary)]/5 to-[var(--accent-cyan)]/5"
            }`}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <CardContent className="p-8 relative z-10 mt-4">
            {todayAttendance?.hasCheckedIn ? (
              // Đã điểm danh
              <div className="text-center space-y-6">
                <motion.div
                  animate={{
                    scale: [0.7, 0.8, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[var(--success)] to-[var(--accent-cyan)] mb-4 shadow-lg shadow-[var(--success)]/30"
                >
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl text-[var(--text-main)] mb-2">
                    {t('dashboard:employeeHome.attendance.checkedIn')}
                  </h2>
                  <p className="text-[var(--text-sub)] mb-4">
                    {t('dashboard:employeeHome.attendance.completed')}
                  </p>

                  {/* Thông tin chi tiết */}
                  <div className="bg-[var(--shell)]/50 rounded-xl p-4 space-y-3 text-left max-w-md mx-auto">
                    {!todayAttendance.hasCheckedOut && (
                      <div className="pt-2 border-t border-[var(--border)]">
                        <p className="text-[15px] text-[var(--warning)] text-center">
                          {t('dashboard:employeeHome.attendance.notCheckedOut')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Chưa điểm danh
              <div className="text-center space-y-6">
                <motion.div
                  animate={{
                    scale: [0.8, 0.7, 0.8],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] mb-4 shadow-lg shadow-[var(--primary)]/30 animate-glow"
                >
                  <QrCode className="h-10 w-10 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl text-[var(--text-main)] mb-2">
                    {t('dashboard:employeeHome.attendance.notCheckedIn')}
                  </h2>
                  <p className="text-[var(--text-sub)]">
                    {t('dashboard:employeeHome.attendance.scanQR')}
                  </p>
                </div>
                <motion.button
                  onClick={() => navigate("/employee/scan")}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity text-white shadow-lg shadow-[var(--primary)]/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>{t('dashboard:employeeHome.attendance.scanQRButton')}</span>
                  </span>
                </motion.button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
        {infoCards.map((item) => {
          const summaryValue = summary[item.key];
          const value =
            item.key === "workingDays"
              ? formatWorkingDays(summaryValue, t)
              : (summaryValue as { name?: string })?.name ||
                (summaryValue as string) ||
                "—";

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: item.delay }}
              whileHover={{ y: -5 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all">
                <CardContent className="p-6 mt-4">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className={`p-3 rounded-xl bg-[var(--${item.color})]/10`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <item.icon
                        className={`h-6 w-6 text-[var(--${item.color})]`}
                      />
                    </motion.div>
                    <div>
                      <p className="text-sm text-[var(--text-sub)]">
                        {item.label}
                      </p>
                      <p className="text-lg text-[var(--text-main)]">{value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">
              {t('dashboard:employeeHome.quickActions.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: t('dashboard:employeeHome.quickActions.schedule'),
                icon: Calendar,
                page: "schedule",
                color: "accent-cyan",
              },
              {
                label: t('dashboard:employeeHome.quickActions.requests'),
                icon: FileText,
                page: "requests",
                color: "warning",
              },
              {
                label: t('dashboard:employeeHome.quickActions.history'),
                icon: History,
                page: "history",
                color: "success",
              },
              {
                label: t('dashboard:employeeHome.quickActions.leaveBalance'),
                icon: CheckCircle2,
                page: "leave-balance",
                color: "primary",
              },
            ].map((action) => (
              <motion.button
                key={action.page}
                onClick={() => navigate(`/employee/${action.page}`)}
                className="p-4 rounded-xl bg-[var(--shell)] border border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all text-left"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay:
                    0.9 +
                    (action.page === "schedule"
                      ? 0
                      : action.page === "requests"
                      ? 0.1
                      : action.page === "history"
                      ? 0.2
                      : 0.3),
                }}
              >
                <action.icon
                  className={`h-8 w-8 text-[var(--${action.color})] mb-2`}
                />
                <p className="text-sm text-[var(--text-main)]">
                  {action.label}
                </p>
              </motion.button>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Attendance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[var(--text-main)]">
                {t('dashboard:employeeHome.recentHistory.title')}
              </CardTitle>
              <button
                onClick={() => navigate("/employee/history")}
                className="text-sm text-[var(--accent-cyan)] hover:underline flex items-center space-x-1"
              >
                <span>{t('dashboard:employeeHome.recentHistory.viewAll')}</span>
                <History className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      {t('dashboard:employeeHome.recentHistory.date')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      {t('dashboard:employeeHome.recentHistory.checkIn')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      {t('dashboard:employeeHome.recentHistory.checkOut')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      {t('dashboard:employeeHome.recentHistory.location')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      {t('dashboard:employeeHome.recentHistory.status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-sm text-[var(--text-sub)]"
                      >
                        {t('dashboard:employeeHome.recentHistory.noData')}
                      </td>
                    </tr>
                  ) : (
                    attendanceRows.map((record, index) => (
                      <tr
                        key={`${record.date}-${record.checkIn}-${index}`}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--shell)] transition-colors"
                      >
                        <td className="py-3 px-4 text-[var(--text-main)]">
                          {record.date}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-main)]">
                          {record.checkIn}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-main)]">
                          {record.checkOut}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-sub)]">
                          {record.location}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(record.status, t)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default EmployeeHome;
