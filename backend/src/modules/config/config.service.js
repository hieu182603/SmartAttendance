import { SystemConfigModel } from "./config.model.js";
import { PAYROLL_RULES } from "../../config/payroll.config.js";

// In-memory cache: key → { value, expiresAt }
const _cache = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute

async function _getConfigValue(key, fallback) {
  const upperKey = key.toUpperCase();
  const now = Date.now();
  const cached = _cache.get(upperKey);
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const doc = await SystemConfigModel.findOne({ key: upperKey }).lean();
    const value = doc == null ? fallback : doc.value;
    _cache.set(upperKey, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch {
    return fallback;
  }
}

/**
 * Returns payroll rules merged with any DB overrides.
 * Falls back to hardcoded PAYROLL_RULES for missing keys.
 */
export async function getPayrollRulesAsync() {
  const [
    standardWorkDays,
    standardWorkHoursPerDay,
    otMultiplier,
    otWeekendMultiplier,
    otHolidayMultiplier,
    otMaxPerMonth,
    latePenalty,
    attendanceBonusAmount,
    attendanceBonusMinWorkDays,
  ] = await Promise.all([
    _getConfigValue("payroll.standard_work_days", PAYROLL_RULES.STANDARD_WORK_DAYS),
    _getConfigValue("payroll.standard_work_hours_per_day", PAYROLL_RULES.STANDARD_WORK_HOURS_PER_DAY),
    _getConfigValue("payroll.ot_multiplier", PAYROLL_RULES.OVERTIME.MULTIPLIER),
    _getConfigValue("payroll.ot_weekend_multiplier", PAYROLL_RULES.OVERTIME.WEEKEND_MULTIPLIER),
    _getConfigValue("payroll.ot_holiday_multiplier", PAYROLL_RULES.OVERTIME.HOLIDAY_MULTIPLIER),
    _getConfigValue("payroll.ot_max_per_month", PAYROLL_RULES.OVERTIME.MAX_PER_MONTH),
    _getConfigValue("payroll.late_penalty", PAYROLL_RULES.DEDUCTIONS.LATE_ARRIVAL),
    _getConfigValue("payroll.attendance_bonus_amount", PAYROLL_RULES.BONUS.ATTENDANCE.AMOUNT),
    _getConfigValue("payroll.attendance_bonus_min_work_days", PAYROLL_RULES.BONUS.ATTENDANCE.REQUIREMENTS.MIN_WORK_DAYS),
  ]);

  return {
    ...PAYROLL_RULES,
    STANDARD_WORK_DAYS: Number(standardWorkDays),
    STANDARD_WORK_HOURS_PER_DAY: Number(standardWorkHoursPerDay),
    OVERTIME: {
      ...PAYROLL_RULES.OVERTIME,
      MULTIPLIER: Number(otMultiplier),
      WEEKEND_MULTIPLIER: Number(otWeekendMultiplier),
      HOLIDAY_MULTIPLIER: Number(otHolidayMultiplier),
      MAX_PER_MONTH: Number(otMaxPerMonth),
    },
    DEDUCTIONS: {
      ...PAYROLL_RULES.DEDUCTIONS,
      LATE_ARRIVAL: Number(latePenalty),
    },
    BONUS: {
      ...PAYROLL_RULES.BONUS,
      ATTENDANCE: {
        ...PAYROLL_RULES.BONUS.ATTENDANCE,
        AMOUNT: Number(attendanceBonusAmount),
        REQUIREMENTS: {
          ...PAYROLL_RULES.BONUS.ATTENDANCE.REQUIREMENTS,
          MIN_WORK_DAYS: Number(attendanceBonusMinWorkDays),
        },
      },
    },
  };
}

/**
 * Returns geofence radius in metres, from DB or fallback (100m).
 */
export async function getGeofenceRadiusAsync() {
  const value = await _getConfigValue("attendance.geofence_radius", 100);
  return Number(value);
}

/** Invalidate entire cache (call after any config write). */
export function invalidateConfigCache() {
  _cache.clear();
}
