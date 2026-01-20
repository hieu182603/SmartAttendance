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
  // Minimum work hours required for checkout (legacy, giữ để backward compatibility)
  MIN_WORK_HOURS: parseFloat(process.env.MIN_WORK_HOURS || "4.0"),

  // ⚠️ MỚI: Minimum work minutes required for checkout
  MIN_WORK_MINUTES: parseInt(process.env.MIN_WORK_MINUTES || "30", 10),

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

  // Face verification requirement (default: false for backward compatibility)
  REQUIRE_FACE_VERIFICATION: process.env.REQUIRE_FACE_VERIFICATION === 'true',
};

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100, // Maximum records per page
};

export const FACE_RECOGNITION_CONFIG = {
  ENABLED: process.env.ENABLE_FACE_RECOGNITION === 'true',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  API_KEY: process.env.AI_SERVICE_API_KEY || '',
  VERIFICATION_THRESHOLD: parseFloat(process.env.FACE_VERIFICATION_THRESHOLD) || 0.6,
  TIMEOUT: parseInt(process.env.AI_SERVICE_TIMEOUT) || 5000,
  // Image registration limits (centralized configuration)
  MIN_REGISTRATION_IMAGES: parseInt(process.env.MIN_REGISTRATION_IMAGES || "5", 10),
  MAX_REGISTRATION_IMAGES: parseInt(process.env.MAX_REGISTRATION_IMAGES || "10", 10),
  // Threshold presets
  THRESHOLD_STRICT: 0.75,  // High security
  THRESHOLD_BALANCED: 0.6, // Default
  THRESHOLD_LENIENT: 0.5,  // User-friendly
};