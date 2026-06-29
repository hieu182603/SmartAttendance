import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { User, Clock } from "lucide-react";
import type { ManagerTask, EmployeeSchedule } from "@/types/schedule";

interface WeeklyTimetableGridProps {
  weekStart: Date;
  shifts: EmployeeSchedule[];
  tasks: ManagerTask[];
  onItemClick: (item: ManagerTask | EmployeeSchedule) => void;
}

const HOUR_HEIGHT = 90; // Height of each slot in px
const START_HOUR = 7;   // 07:00
const END_HOUR = 19;    // 19:00 (12 slots)
const TOTAL_SLOTS = END_HOUR - START_HOUR;

const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseTimeToMinutes = (timeStr: string): number => {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const WeeklyTimetableGrid: React.FC<WeeklyTimetableGridProps> = ({
  weekStart,
  tasks,
  onItemClick,
}) => {
  const { t } = useTranslation(["dashboard", "common"]);

  // Generate 7 days of the week starting from weekStart (Monday)
  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayStr = formatDateLocal(new Date());

  // Hours array from 07:00 to 18:00 (representing slots 07:00-08:00, ..., 18:00-19:00)
  const hours = Array.from({ length: TOTAL_SLOTS }).map((_, i) => START_HOUR + i);

  // Position calculation helpers
  const getCardPosition = (startTime: string, endTime: string) => {
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);
    const gridStartMins = START_HOUR * 60;

    const topOffsetMins = startMins - gridStartMins;
    const top = (topOffsetMins / 60) * HOUR_HEIGHT;

    const durationMins = Math.max(endMins - startMins, 30); // Min 30 mins
    const height = (durationMins / 60) * HOUR_HEIGHT - 8; // Subtract 8px for spacing/gap

    return { top, height };
  };

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <span>📅</span>
          <span>
            {t("dashboard:schedule.weeklyGrid.title") || "Chi tiết bảng phân công việc tuần"} ({daysOfWeek[0].getDate()}/{daysOfWeek[0].getMonth() + 1} - {daysOfWeek[6].getDate()}/{daysOfWeek[6].getMonth() + 1})
          </span>
        </h2>
        <p className="text-xs text-[var(--text-sub)]">
          {t("dashboard:schedule.weeklyGrid.hint") || "Mẹo: Nhấp vào từng công việc để xem chi tiết, báo cáo hoàn thành hoặc báo lỗi kèm ghi chú cho quản lý."}
        </p>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-[#0f172a] scrollbar-thin">
        <div 
          className="grid min-w-[900px]" 
          style={{ gridTemplateColumns: "60px repeat(7, minmax(110px, 1fr))" }}
        >
          {/* Header corner cell */}
          <div className="bg-white/[0.01] border-b border-r border-[var(--border)] py-3"></div>

          {/* Day Column Headers */}
          {daysOfWeek.map((day, index) => {
            const isToday = formatDateLocal(day) === todayStr;
            const dayNamesVi = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
            const dayNamesEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const currentLang = localStorage.getItem("i18nextLng") || "vi";
            const dayName = currentLang.startsWith("vi") ? dayNamesVi[index] : dayNamesEn[index];

            return (
              <div
                key={index}
                className={`bg-white/[0.01] border-b border-r border-[var(--border)] py-3 text-center flex flex-col gap-1 ${
                  index === 6 ? "border-r-0" : ""
                }`}
              >
                <span className="text-[11px] text-[var(--text-sub)] uppercase tracking-wider font-medium">
                  {dayName}
                </span>
                <span
                  className={`text-lg font-semibold w-8 h-8 flex items-center justify-center mx-auto rounded-full ${
                    isToday ? "bg-[var(--accent-cyan)] text-[#0b0f19] shadow-[0_0_10px_rgba(0,210,255,0.4)]" : "text-[var(--text-main)]"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}

          {/* Time column labels */}
          <div className="flex flex-col">
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-r border-[var(--border)] text-right pr-3 text-[11px] text-[var(--text-sub)] flex items-start justify-end pt-2"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns containing grid cells and cards */}
          {daysOfWeek.map((day, colIdx) => {
            const dateStr = formatDateLocal(day);

            // Filter tasks overlapping this specific day
            const dayTasks = tasks.filter((t) => {
              const start = t.startDate;
              const end = t.endDate || t.startDate;
              return dateStr >= start && dateStr <= end;
            });

            return (
              <div
                key={colIdx}
                className={`relative border-r border-[var(--border)] ${
                  colIdx === 6 ? "border-r-0" : ""
                }`}
                style={{ height: `${TOTAL_SLOTS * HOUR_HEIGHT}px` }}
              >
                {/* Render background grid cells */}
                {hours.map((hour) => {
                  const isLunch = hour === 12; // 12:00 - 13:00
                  return (
                    <div
                      key={hour}
                      className={`border-b border-[var(--border)] w-full relative ${
                        isLunch ? "bg-white/[0.015]" : ""
                      }`}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  );
                })}

                {/* Render Lunch Break Overlay */}
                <div
                  className="absolute left-0 right-0 pointer-events-none border-y border-dashed border-[var(--border)] flex items-center justify-center select-none"
                  style={{
                    top: `${(12 - START_HOUR) * HOUR_HEIGHT}px`,
                    height: `${HOUR_HEIGHT}px`,
                    zIndex: 15,
                    backgroundColor: "rgba(11, 15, 25, 0.65)",
                    backdropFilter: "blur(0.5px)",
                  }}
                >
                  <span className="text-[10px] text-[var(--text-sub)] font-medium">
                    {t("dashboard:schedule.weeklyGrid.lunchBreak") || "Nghỉ trưa"}
                  </span>
                </div>

                {/* Render Task Cards */}
                {dayTasks.map((task) => {
                  const { startTime, endTime } = task;
                  const { top, height } = getCardPosition(startTime, endTime);

                  let borderClass = "border-l-4";
                  let bgClass = "bg-[var(--warning)]/15 border-[var(--warning)]/30 text-[var(--warning)]";
                  let titlePrefix = "⚙️ ";

                  // Border color based on priority
                  switch (task.priority) {
                    case "high":
                      borderClass += " border-l-[var(--error)]";
                      break;
                    case "low":
                      borderClass += " border-l-[var(--success)]";
                      break;
                    default:
                      borderClass += " border-l-[var(--warning)]";
                  }

                  // Handle different statuses
                  if (task.status === "completed") {
                    bgClass = "bg-white/[0.02] border-[var(--border)] text-[var(--text-sub)] opacity-60";
                    titlePrefix = "✓ ";
                  } else if (task.status === "rejected") {
                    bgClass = "bg-[var(--error)]/15 border-[var(--error)]/30 text-[var(--error)] animate-pulse";
                    titlePrefix = "⚠️ ";
                  } else if (task.status === "pending_review") {
                    bgClass = "bg-[var(--warning)]/15 border-[var(--warning)] text-[var(--warning)]";
                    titlePrefix = "⏳ ";
                  } else if (task.status === "in_progress") {
                    bgClass = "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)] shadow-[0_0_12px_rgba(59,130,246,0.3)]";
                    titlePrefix = "⚙️ ";
                  }

                  return (
                    <motion.div
                      key={task._id}
                      className={`absolute left-1.5 right-1.5 rounded-lg border p-2 flex flex-col justify-between cursor-pointer shadow-md overflow-hidden ${borderClass} ${bgClass}`}
                      style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      onClick={() => onItemClick(task)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold truncate text-[var(--text-main)]">
                          {titlePrefix}
                          {task.title}
                        </span>
                        <span className="text-[10px] opacity-80 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {startTime} - {endTime}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] truncate opacity-70 max-w-[70%]">
                          👤 {task.assignedBy?.name || t("common:roles.manager")}
                        </span>
                        {task.assignedBy?.avatarUrl ? (
                          <img
                            src={task.assignedBy.avatarUrl}
                            alt="avatar"
                            className="w-5 h-5 rounded-full border border-[var(--border)] object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-[var(--border)] bg-white/10 flex items-center justify-center">
                            <User className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyTimetableGrid;
