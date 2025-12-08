/**
 * Application configuration constants
 * Centralized configuration for hardcoded values
 */

// Global timezone configuration
export const APP_CONFIG = {
  TIMEZONE: process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh",
};

export const SHIFT_CONFIG = {
  // Default shift times (fallback khi không tìm thấy shift trong DB)
  DEFAULT_START_TIME: process.env.DEFAULT_SHIFT_START_TIME || "08:00",
  DEFAULT_END_TIME: process.env.DEFAULT_SHIFT_END_TIME || "17:00",
  DEFAULT_BREAK_DURATION: parseInt(
    process.env.DEFAULT_SHIFT_BREAK_DURATION || "60",
    10
  ), // minutes
  DEFAULT_SHIFT_NAME:
    process.env.DEFAULT_SHIFT_NAME || "Ca hành chính (mặc định)",

  // Early check-in tolerance (minutes before shift start)
  EARLY_CHECKIN_MINUTES: parseInt(
    process.env.EARLY_CHECKIN_MINUTES || "20",
    10
  ),

  // Late tolerance (minutes after shift start)
  LATE_TOLERANCE_MINUTES: parseInt(
    process.env.LATE_TOLERANCE_MINUTES || "30",
    10
  ),

  // Early leave tolerance (minutes before shift end)
  EARLY_LEAVE_TOLERANCE_MINUTES: parseInt(
    process.env.EARLY_LEAVE_TOLERANCE_MINUTES || "15",
    10
  ),

  // Overtime threshold (minutes after shift end)
  OVERTIME_THRESHOLD_MINUTES: parseInt(
    process.env.OVERTIME_THRESHOLD_MINUTES || "30",
    10
  ),
};

export const ATTENDANCE_CONFIG = {
  // Minimum work hours required for checkout
  MIN_WORK_HOURS: parseFloat(process.env.MIN_WORK_HOURS || "4.0"),

  // Break duration in hours (lunch break)
  BREAK_DURATION_HOURS: parseFloat(process.env.BREAK_DURATION_HOURS || "1.0"),

  // GPS accuracy threshold (meters)
  GPS_ACCURACY_THRESHOLD: parseInt(
    process.env.GPS_ACCURACY_THRESHOLD || "100",
    10
  ),

  // Default checkout time for auto-checkout (cron job)
  DEFAULT_CHECKOUT_HOUR: parseInt(
    process.env.DEFAULT_CHECKOUT_HOUR || "18",
    10
  ),
  DEFAULT_CHECKOUT_MINUTE: parseInt(
    process.env.DEFAULT_CHECKOUT_MINUTE || "0",
    10
  ),
};

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100, // Maximum records per page
};
