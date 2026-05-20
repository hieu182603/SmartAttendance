import { SystemConfigModel } from "./config.model.js";
import { PAYROLL_RULES } from "../../config/payroll.config.js";

// In-memory cache: `${companyId ?? "global"}:${key}` → { value, expiresAt }
const _cache = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute

// Lookup order: company-specific → global (null) → hardcoded fallback
async function _getConfigValue(key, fallback, companyId = null) {
  const upperKey = key.toUpperCase();
  const cacheKey = `${companyId ?? "global"}:${upperKey}`;
  const now = Date.now();
  const cached = _cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    let value = null;
    if (companyId) {
      const doc = await SystemConfigModel.findOne({ companyId, key: upperKey }).lean();
      if (doc != null) value = doc.value;
    }
    if (value == null) {
      const globalDoc = await SystemConfigModel.findOne({ companyId: null, key: upperKey }).lean();
      value = globalDoc == null ? fallback : globalDoc.value;
    }
    _cache.set(cacheKey, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch {
    return fallback;
  }
}

/**
 * Returns payroll rules merged with any DB overrides.
 * Falls back to hardcoded PAYROLL_RULES for missing keys.
 * @param {string|null} companyId - company-specific overrides; null = global defaults only
 */
export async function getPayrollRulesAsync(companyId = null) {
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
    _getConfigValue("payroll.standard_work_days", PAYROLL_RULES.STANDARD_WORK_DAYS, companyId),
    _getConfigValue("payroll.standard_work_hours_per_day", PAYROLL_RULES.STANDARD_WORK_HOURS_PER_DAY, companyId),
    _getConfigValue("payroll.ot_multiplier", PAYROLL_RULES.OVERTIME.MULTIPLIER, companyId),
    _getConfigValue("payroll.ot_weekend_multiplier", PAYROLL_RULES.OVERTIME.WEEKEND_MULTIPLIER, companyId),
    _getConfigValue("payroll.ot_holiday_multiplier", PAYROLL_RULES.OVERTIME.HOLIDAY_MULTIPLIER, companyId),
    _getConfigValue("payroll.ot_max_per_month", PAYROLL_RULES.OVERTIME.MAX_PER_MONTH, companyId),
    _getConfigValue("payroll.late_penalty", PAYROLL_RULES.DEDUCTIONS.LATE_ARRIVAL, companyId),
    _getConfigValue("payroll.attendance_bonus_amount", PAYROLL_RULES.BONUS.ATTENDANCE.AMOUNT, companyId),
    _getConfigValue("payroll.attendance_bonus_min_work_days", PAYROLL_RULES.BONUS.ATTENDANCE.REQUIREMENTS.MIN_WORK_DAYS, companyId),
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
 * @param {string|null} companyId
 */
export async function getGeofenceRadiusAsync(companyId = null) {
  const value = await _getConfigValue("attendance.geofence_radius", 100, companyId);
  return Number(value);
}

/** Invalidate entire cache (call after any config write). */
export function invalidateConfigCache() {
  _cache.clear();
}
