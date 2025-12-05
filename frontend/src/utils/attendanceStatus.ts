/**
 * Attendance Status Utility
 * Centralized color and badge management for attendance statuses across all pages
 */

export type AttendanceStatus = 
  | "ontime" 
  | "late" 
  | "absent" 
  | "overtime" 
  | "weekend" 
  | "on_leave"
  | "unknown";

export type ShiftStatus = "completed" | "scheduled" | "missed" | "off";

/**
 * Get badge className for attendance status
 * Uses consistent color scheme across all pages
 */
export function getAttendanceStatusBadgeClass(status: AttendanceStatus): string {
  const badgeClasses: Record<AttendanceStatus, string> = {
    ontime: "bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30",
    late: "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30",
    absent: "bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30",
    overtime: "bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30",
    weekend: "bg-[var(--text-sub)]/20 text-[var(--text-sub)] border-[var(--text-sub)]/30",
    on_leave: "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30",
    unknown: "bg-[var(--text-sub)]/20 text-[var(--text-sub)] border-[var(--text-sub)]/30",
  };

  return badgeClasses[status] || badgeClasses.unknown;
}

/**
 * Get badge className for shift status
 * Uses consistent color scheme across all pages
 */
export function getShiftStatusBadgeClass(status: ShiftStatus): string {
  const badgeClasses: Record<ShiftStatus, string> = {
    completed: "bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/40 dark:bg-[var(--success)]/10 dark:border-[var(--success)]/25",
    scheduled: "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/40 dark:bg-[var(--accent-cyan)]/10 dark:border-[var(--accent-cyan)]/25",
    missed: "bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/40 dark:bg-[var(--error)]/10 dark:border-[var(--error)]/25",
    off: "bg-[var(--text-sub)]/20 text-[var(--text-sub)] border border-[var(--text-sub)]/40 dark:bg-[var(--text-sub)]/10 dark:border-[var(--text-sub)]/25",
  };

  return badgeClasses[status] || "bg-[var(--surface)] border border-[var(--border)]";
}

/**
 * Get status color for charts/visualizations
 */
export function getAttendanceStatusColor(status: AttendanceStatus): string {
  const colors: Record<AttendanceStatus, string> = {
    ontime: "var(--success)",
    late: "var(--warning)",
    absent: "var(--error)",
    overtime: "var(--primary)",
    weekend: "var(--text-sub)",
    on_leave: "var(--accent-cyan)",
    unknown: "var(--text-sub)",
  };

  return colors[status] || colors.unknown;
}

