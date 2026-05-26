import {
  getBaseSalaryFromConfig,
  PAYROLL_RULES,
  SALARY_MATRIX,
  POSITION_DEFAULT_SALARY,
  DEPARTMENT_DEFAULT_SALARY,
  FEATURE_FLAGS,
} from "../../config/payroll.config.js";
import { getPayrollRulesAsync } from "../config/config.service.js";
import { calculateInsurance, calculatePersonalIncomeTax } from "./insurance-tax.service.js";
import { AttendanceModel } from "../attendance/attendance.model.js";
import { CalendarEventModel } from "../calendar/calendar.model.js";
import { RequestModel } from "../requests/request.model.js";
import { UserModel } from "../users/user.model.js";
import { DepartmentModel } from "../departments/department.model.js";
import { PayrollRecordModel, PayrollReportModel } from "./payroll.model.js";
import { SalaryMatrixModel } from "./salary-matrix.model.js";

/**
 * Payroll Service - Tính toán và quản lý bảng lương
 * 
 * Hỗ trợ nhiều chức vụ với mức lương khác nhau:
 * 1. Ưu tiên baseSalary từ User model (nếu có)
 * 2. Lookup từ Salary Matrix (Department + Position)
 * 3. Fallback về default salary
 */

// ============================================================================
// BASE SALARY CALCULATION
// ============================================================================

/**
 * Tính lương cơ bản cho nhân viên
 * Logic: Ưu tiên User.baseSalary → Database Salary Matrix → Config (Department + Position) → Default
 * 
 * @param {Object} user - User object (có thể là lean hoặc document)
 * @param {Object} department - Department object (optional, để tối ưu query)
 * @returns {Promise<Object>} { baseSalary, source } - Base salary và nguồn của nó
 */
export async function calculateBaseSalary(user, department = null) {
  // ✅ FIX: Chỉ fallback khi baseSalary === null hoặc undefined
  // Nếu baseSalary === 0, vẫn return 0 (để phân biệt với "chưa set lương")
  if (user.baseSalary !== null && user.baseSalary !== undefined) {
    return {
      baseSalary: user.baseSalary,
      source: "USER_OVERRIDE",
    };
  }

  let departmentCode = null;
  if (!department && user.department) {
    if (user.department && typeof user.department === "object") {
      departmentCode = user.department.code;
    } else {
      const dept = await DepartmentModel.findById(user.department).lean();
      departmentCode = dept?.code;
    }
  } else if (department) {
    departmentCode = typeof department === "object" ? department.code : null;
  }

  const position = user.position || "";

  if (departmentCode && position) {
    try {
      // Normalize position for case-insensitive matching
      const normalizedPosition = position.trim().toLowerCase();
      const matrixRecord = await SalaryMatrixModel.findOne({
        departmentCode: departmentCode.toUpperCase(),
        positionKey: normalizedPosition,
        isActive: true,
      }).lean();

      if (matrixRecord && matrixRecord.baseSalary > 0) {
        return {
          baseSalary: matrixRecord.baseSalary,
          source: "SALARY_MATRIX",
        };
      }
    } catch (error) {
      console.error("[payroll] Error querying salary matrix:", error);
    }
  }

  // getBaseSalaryFromConfig trả về salary, cần xác định source
  const deptCode = departmentCode?.toUpperCase() || "OTHER";
  const pos = position?.trim() || "";

  let source = "GLOBAL_DEFAULT";
  let configSalary = 0;

  // Helper function to find matching key in object (case-insensitive)
  const findMatchingKey = (obj, searchKey) => {
    if (!obj || !searchKey) return null;
    const normalizedSearch = searchKey.toLowerCase();
    return Object.keys(obj).find(key => key.toLowerCase() === normalizedSearch);
  };

  // Xác định source theo logic giống getBaseSalaryFromConfig (case-insensitive)
  // 1. SALARY_MATRIX[departmentCode][position] - normalized matching
  if (pos && SALARY_MATRIX[deptCode]) {
    const matchingPosition = findMatchingKey(SALARY_MATRIX[deptCode], pos);
    if (matchingPosition && SALARY_MATRIX[deptCode][matchingPosition]) {
      configSalary = SALARY_MATRIX[deptCode][matchingPosition];
      source = "SALARY_MATRIX"; // Từ config, nhưng logic giống SALARY_MATRIX
    }
  }

  // 2. SALARY_MATRIX[departmentCode].DEFAULT (if no position match found)
  if (source === "GLOBAL_DEFAULT" && SALARY_MATRIX[deptCode] && SALARY_MATRIX[deptCode].DEFAULT) {
    configSalary = SALARY_MATRIX[deptCode].DEFAULT;
    source = "DEPT_DEFAULT";
  }

  // 3. POSITION_DEFAULT_SALARY - normalized matching (if no department match)
  if (source === "GLOBAL_DEFAULT" && pos) {
    const matchingPosKey = findMatchingKey(POSITION_DEFAULT_SALARY, pos);
    if (matchingPosKey && POSITION_DEFAULT_SALARY[matchingPosKey]) {
      configSalary = POSITION_DEFAULT_SALARY[matchingPosKey];
      source = "POS_DEFAULT";
    }
  }

  // 4. DEPARTMENT_DEFAULT_SALARY (if no position match found)
  if (source === "GLOBAL_DEFAULT" && DEPARTMENT_DEFAULT_SALARY[deptCode]) {
    configSalary = DEPARTMENT_DEFAULT_SALARY[deptCode];
    source = "DEPT_DEFAULT";
  }

  // 5. GLOBAL_DEFAULT_SALARY (fallback)
  if (source === "GLOBAL_DEFAULT") {
    configSalary = getBaseSalaryFromConfig(departmentCode, position);
    source = "GLOBAL_DEFAULT";
  }

  return {
    baseSalary: configSalary,
    source,
  };
}

// ============================================================================
// ATTENDANCE DATA CALCULATION
// ============================================================================

/**
 * Tính số ngày làm việc, giờ làm thêm (phân biệt loại), số ngày đi muộn từ attendance
 * 
 * @param {string} userId - User ID
 * @param {Date} periodStart - Ngày bắt đầu
 * @param {Date} periodEnd - Ngày kết thúc
 * @returns {Promise<Object>} { workDays, totalDays, overtimeHours, overtimeDetails, lateDays, leaveDays }
 */
export async function calculateAttendanceData(userId, periodStart, periodEnd, rules = PAYROLL_RULES) {
  const attendances = await AttendanceModel.find({
    userId,
    date: {
      $gte: periodStart,
      $lte: periodEnd,
    },
  }).lean();

  // ✅ FIX: Warning khi không có attendance data
  const hasAttendanceData = attendances.length > 0;
  if (!hasAttendanceData) {
    console.warn(
      `[payroll] No attendance data found for user ${userId} in period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`
    );
  }

  // Tính ngày công theo workCredit (0.5 = nửa công, 1.0 = đủ công)
  const workDays = attendances
    .filter((a) => (a.workCredit ?? 0) > 0)
    .reduce((sum, a) => sum + (a.workCredit ?? 1), 0);

  // Đi muộn vẫn đếm theo ngày (không theo credit)
  const lateDays = attendances.filter(
    (a) => a.status === "late" && (a.workCredit ?? 0) > 0
  ).length;

  // ✅ FIX: Phân biệt OT theo loại ngày (Điều 98 BLLĐ): holiday > weekend > weekday
  const overtimeDetails = { weekday: 0, weekend: 0, holiday: 0 };
  let totalOvertimeHours = 0;

  // Fetch holidays in period once for all attendances
  const holidays = await CalendarEventModel.find({
    type: "holiday",
    isActive: true,
    date: { $gte: periodStart, $lte: periodEnd },
  }).lean();
  const holidayDates = new Set(
    holidays.map((h) => new Date(h.date).toISOString().slice(0, 10))
  );

  for (const a of attendances) {
    const dateKey = new Date(a.date).toISOString().slice(0, 10);
    const dayOfWeek = new Date(a.date).getUTCDay();

    // Ngày lễ: toàn bộ giờ làm tính OT 300%
    if (holidayDates.has(dateKey)) {
      if ((a.workHours ?? 0) > 0) {
        totalOvertimeHours += a.workHours;
        overtimeDetails.holiday += a.workHours;
      }
      continue;
    }

    // Ngày thường (T2–T6): chỉ tính OT cho phần vượt quá 8h
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (a.workHours > 8) {
        const otHours = a.workHours - 8;
        totalOvertimeHours += otHours;
        overtimeDetails.weekday += otHours;
      }
      continue;
    }

    // Cuối tuần (T7/CN): toàn bộ giờ làm được tính là OT weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if ((a.workHours ?? 0) > 0) {
        totalOvertimeHours += a.workHours;
        overtimeDetails.weekend += a.workHours;
      }
    }
  }

  const maxOT = rules.OVERTIME.MAX_PER_MONTH || Infinity;
  if (totalOvertimeHours > maxOT) {
    const ratio = maxOT / totalOvertimeHours;
    overtimeDetails.weekday = Math.round(overtimeDetails.weekday * ratio * 10) / 10;
    overtimeDetails.weekend = Math.round(overtimeDetails.weekend * ratio * 10) / 10;
    overtimeDetails.holiday = Math.round(overtimeDetails.holiday * ratio * 10) / 10;
    const originalOT = Math.round(totalOvertimeHours * 10) / 10;
    totalOvertimeHours = maxOT;
    console.warn(
      `[payroll] OT capped at ${maxOT}h/month for user ${userId} (was ${originalOT}h)`
    );
  }

  const totalDays = rules.STANDARD_WORK_DAYS;

  // Split leave by type: paid (leave/sick/compensatory/maternity) vs unpaid
  const PAID_LEAVE_TYPES = ["leave", "sick", "compensatory", "maternity"];
  const approvedLeaves = await RequestModel.find({
    userId,
    status: "approved",
    type: { $in: [...PAID_LEAVE_TYPES, "unpaid"] },
    startDate: { $lte: periodEnd },
    endDate: { $gte: periodStart },
  }).lean();

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  for (const leave of approvedLeaves) {
    const leaveStart = new Date(Math.max(new Date(leave.startDate), periodStart));
    const leaveEnd = new Date(Math.min(new Date(leave.endDate), periodEnd));
    const days = Math.max(0, Math.round((leaveEnd - leaveStart) / 86400000) + 1);
    if (PAID_LEAVE_TYPES.includes(leave.type)) {
      paidLeaveDays += days;
    } else {
      unpaidLeaveDays += days;
    }
  }

  const totalAbsence = Math.max(0, totalDays - workDays);
  const unauthorizedAbsenceDays = Math.max(0, totalAbsence - paidLeaveDays - unpaidLeaveDays);
  const leaveDays = totalAbsence; // backward compat: total non-working days

  return {
    workDays,
    totalDays,
    overtimeHours: Math.round(totalOvertimeHours * 10) / 10,
    overtimeDetails, // ✅ Chi tiết OT theo loại ngày
    lateDays,
    leaveDays,
    paidLeaveDays,
    unpaidLeaveDays,
    unauthorizedAbsenceDays,
    hasAttendanceData,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Làm tròn lương đến hàng nghìn VNĐ (precision = 1000)
 * VD: 13,636,364 → 13,636,000
 * 
 * @param {number} amount - Số tiền cần làm tròn
 * @param {number} precision - Độ chính xác (mặc định 1000)
 * @returns {number} Số tiền đã làm tròn
 */
export function roundSalary(amount, precision = 1000) {
  if (!amount && amount !== 0) return 0;
  return Math.round(amount / precision) * precision;
}

// ============================================================================
// PAYROLL COMPONENTS CALCULATION
// ============================================================================

/**
 * Tính lương cơ bản thực tế (theo số ngày làm việc)
 * 
 * @param {number} baseSalary - Lương cơ bản
 * @param {number} workDays - Số ngày làm việc
 * @returns {number} Actual base salary
 */
export function calculateActualBaseSalary(baseSalary, workDays, rules = PAYROLL_RULES) {
  if (!rules.CALCULATE_BY_WORK_DAYS) {
    return baseSalary;
  }

  const actualSalary =
    baseSalary * (workDays / rules.STANDARD_WORK_DAYS);
  return roundSalary(actualSalary);
}

/**
 * Tính lương làm thêm giờ — phân biệt hệ số theo loại ngày (Điều 98 BLLĐ)
 * 
 * @param {Object} overtimeDetails - { weekday, weekend, holiday } giờ OT theo loại
 * @param {number} baseSalary - Lương cơ bản
 * @returns {number} Overtime pay
 */
export function calculateOvertimePay(overtimeDetails, baseSalary, rules = PAYROLL_RULES) {
  const hourlyRate =
    baseSalary /
    (rules.STANDARD_WORK_DAYS * rules.STANDARD_WORK_HOURS_PER_DAY);

  if (typeof overtimeDetails === "number") {
    return roundSalary(overtimeDetails * hourlyRate * rules.OVERTIME.MULTIPLIER);
  }

  const weekdayOT = (overtimeDetails.weekday || 0) * hourlyRate * rules.OVERTIME.MULTIPLIER;
  const weekendOT = (overtimeDetails.weekend || 0) * hourlyRate * rules.OVERTIME.WEEKEND_MULTIPLIER;
  const holidayOT = (overtimeDetails.holiday || 0) * hourlyRate * rules.OVERTIME.HOLIDAY_MULTIPLIER;

  return roundSalary(weekdayOT + weekendOT + holidayOT);
}

/**
 * Tính khấu trừ
 *
 * @param {number} lateDays - Số ngày đi muộn
 * @param {number} unpaidAbsenceDays - Số ngày nghỉ không lương (unpaid + unauthorized)
 * @param {number} baseSalary - Lương cơ bản
 * @returns {number} Total deductions
 */
export function calculateDeductions(lateDays, unpaidAbsenceDays, baseSalary, rules = PAYROLL_RULES) {
  let deductions = 0;

  if (rules.DEDUCTIONS.LATE_ARRIVAL) {
    deductions += lateDays * rules.DEDUCTIONS.LATE_ARRIVAL;
  }

  if (rules.DEDUCTIONS.UNAUTHORIZED_ABSENCE?.PER_DAY) {
    const perDayDeduction = baseSalary / rules.STANDARD_WORK_DAYS;
    deductions += unpaidAbsenceDays * perDayDeduction;
  }

  return roundSalary(deductions);
}

/**
 * Tính thưởng
 * 
 * @param {Object} attendanceData - { workDays, lateDays, leaveDays }
 * @param {number} baseSalary - Lương cơ bản
 * @returns {number} Total bonus
 */
export function calculateBonus(attendanceData, baseSalary, rules = PAYROLL_RULES) {
  let bonus = 0;

  if (rules.BONUS.ATTENDANCE?.ENABLED) {
    const req = rules.BONUS.ATTENDANCE.REQUIREMENTS;
    let eligible = true;

    if (req.NO_LATE_DAYS && attendanceData.lateDays > 0) eligible = false;
    if (req.NO_ABSENCE && (attendanceData.unauthorizedAbsenceDays ?? attendanceData.leaveDays) > 0) eligible = false;
    if (req.MIN_WORK_DAYS && attendanceData.workDays < req.MIN_WORK_DAYS) eligible = false;

    if (eligible) bonus += rules.BONUS.ATTENDANCE.AMOUNT;
  }

  return roundSalary(bonus);
}

// ============================================================================
// PAYROLL RECORD GENERATION
// ============================================================================

/**
 * Tạo hoặc cập nhật bảng lương cho 1 nhân viên
 * 
 * @param {string} userId - User ID
 * @param {string} month - Tháng (format: YYYY-MM)
 * @returns {Promise<Object>} Payroll record
 */
export async function generatePayrollRecord(userId, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month format must be YYYY-MM");
  }

  // ✅ FIX: Validate monthNum (1-12)
  const [year, monthNum] = month.split("-").map(Number);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error("Invalid month number. Must be between 1-12");
  }

  const periodStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const periodEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

  const user = await UserModel.findById(userId)
    .populate("department", "code name")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const rules = await getPayrollRulesAsync();
  const { baseSalary, source: salarySource } = await calculateBaseSalary(user, user.department);
  const attendanceData = await calculateAttendanceData(userId, periodStart, periodEnd, rules);

  // Paid leave counts as worked days for salary calculation
  const effectiveWorkDays = attendanceData.workDays + (attendanceData.paidLeaveDays ?? 0);
  const actualBaseSalary = calculateActualBaseSalary(baseSalary, effectiveWorkDays, rules);
  const overtimePay = calculateOvertimePay(
    attendanceData.overtimeDetails || attendanceData.overtimeHours,
    baseSalary,
    rules
  );
  const unpaidAbsence = (attendanceData.unpaidLeaveDays ?? 0) + (attendanceData.unauthorizedAbsenceDays ?? 0);
  const deductions = calculateDeductions(attendanceData.lateDays, unpaidAbsence, baseSalary, rules);
  const bonus = calculateBonus(attendanceData, baseSalary, rules);
  const grossSalary = actualBaseSalary + overtimePay + bonus - deductions;

  let insurance = { social: 0, health: 0, unemployment: 0, total: 0, base: 0 };
  let tax = { taxableIncome: 0, personalDeduction: 0, dependentCount: 0, dependentDeduction: 0, taxableAfterDeduction: 0, amount: 0, bracketBreakdown: [] };
  if (FEATURE_FLAGS.INSURANCE_TAX) {
    insurance = calculateInsurance(baseSalary);
    tax = calculatePersonalIncomeTax(grossSalary, insurance.total, user.dependentCount ?? 0);
  }
  const totalSalary = grossSalary - insurance.total - tax.amount;

  let payrollRecord = await PayrollRecordModel.findOne({
    userId,
    month,
  });

  const recordData = {
    userId,
    companyId: user.companyId,
    month,
    periodStart,
    periodEnd,
    workDays: attendanceData.workDays,
    totalDays: attendanceData.totalDays,
    overtimeHours: attendanceData.overtimeHours,
    leaveDays: attendanceData.leaveDays,
    lateDays: attendanceData.lateDays,
    paidLeaveDays: attendanceData.paidLeaveDays ?? 0,
    unpaidLeaveDays: attendanceData.unpaidLeaveDays ?? 0,
    unauthorizedAbsenceDays: attendanceData.unauthorizedAbsenceDays ?? 0,
    baseSalary, // Lương tháng đầy đủ
    actualBaseSalary, // Lương cơ bản thực tế (theo số ngày làm việc)
    salarySource, // ✅ Nguồn của baseSalary
    overtimeDetails: attendanceData.overtimeDetails || { weekday: 0, weekend: 0, holiday: 0 }, // ✅ Chi tiết OT
    overtimePay,
    bonus,
    deductions,
    grossSalary,
    insurance,
    tax,
    totalSalary,
    department: user.department?.name || "N/A",
    departmentId: user.department?._id || user.department || null, // Store departmentId for filtering
    position: user.position || "N/A",
    employeeId: user.employeeId || `EMP${userId.toString().slice(-6)}`,
    status: payrollRecord?.status || "pending",
  };

  if (payrollRecord) {
    if (payrollRecord.status === "paid") {
      console.warn(`[payroll] Skipping locked payroll ${payrollRecord._id} (status: paid)`);
      return payrollRecord;
    } else if (payrollRecord.status === "approved") {
      console.warn(`[payroll] Skipping re-calc for approved payroll ${payrollRecord._id}`);
      return payrollRecord;
    } else if (payrollRecord.status === "pending") {
      Object.assign(payrollRecord, recordData);
      await payrollRecord.save();
    } else {
      // ✅ FIX: Update attendance và tính lại actualBaseSalary, overtimePay, etc.
      payrollRecord.workDays = recordData.workDays;
      payrollRecord.overtimeHours = recordData.overtimeHours;
      payrollRecord.overtimeDetails = recordData.overtimeDetails;
      payrollRecord.leaveDays = recordData.leaveDays;
      payrollRecord.lateDays = recordData.lateDays;
      payrollRecord.paidLeaveDays = recordData.paidLeaveDays;
      payrollRecord.unpaidLeaveDays = recordData.unpaidLeaveDays;
      payrollRecord.unauthorizedAbsenceDays = recordData.unauthorizedAbsenceDays;

      // Tính lại actualBaseSalary dựa trên workDays mới (paid leave counts as worked)
      const updatedEffectiveWorkDays = recordData.workDays + recordData.paidLeaveDays;
      payrollRecord.actualBaseSalary = calculateActualBaseSalary(
        payrollRecord.baseSalary,
        updatedEffectiveWorkDays
      );

      // Recalculate các components
      payrollRecord.overtimePay = calculateOvertimePay(
        recordData.overtimeDetails || recordData.overtimeHours,
        payrollRecord.baseSalary
      );
      const updatedUnpaidAbsence = recordData.unpaidLeaveDays + recordData.unauthorizedAbsenceDays;
      payrollRecord.deductions = calculateDeductions(
        recordData.lateDays,
        updatedUnpaidAbsence,
        payrollRecord.baseSalary
      );
      payrollRecord.bonus = calculateBonus(
        {
          workDays: recordData.workDays,
          lateDays: recordData.lateDays,
          leaveDays: recordData.leaveDays,
          unauthorizedAbsenceDays: recordData.unauthorizedAbsenceDays,
        },
        payrollRecord.baseSalary
      );

      // Pre-save hook sẽ tự động tính lại totalSalary từ actualBaseSalary
      await payrollRecord.save();
    }
  } else {
    payrollRecord = await PayrollRecordModel.create(recordData);
  }

  return payrollRecord;
}

/**
 * Tạo bảng lương cho tất cả nhân viên trong tháng
 * 
 * @param {string} month - Tháng (format: YYYY-MM)
 * @returns {Promise<Object>} { success, processed, errors }
 */
export async function generatePayrollForMonth(month, companyId = null) {
  const employeeQuery = {
    role: { $in: ["EMPLOYEE", "MANAGER", "SUPERVISOR", "HR_MANAGER"] },
    isActive: true,
    isTrial: { $ne: true },
  };
  if (companyId) employeeQuery.companyId = companyId;
  const employees = await UserModel.find(employeeQuery).select("_id name employeeId");

  const results = {
    success: [],
    errors: [],
    processed: 0,
  };

  for (const employee of employees) {
    try {
      const record = await generatePayrollRecord(
        employee._id.toString(),
        month
      );
      results.success.push({
        userId: employee._id.toString(),
        name: employee.name,
        recordId: record._id.toString(),
      });
      results.processed++;
    } catch (error) {
      results.errors.push({
        userId: employee._id.toString(),
        name: employee.name,
        error: error.message,
      });
    }
  }

  await generatePayrollReport(month, companyId);

  return results;
}

/**
 * Xem trước bảng lương (không lưu vào database)
 * 
 * @param {string} userId - User ID
 * @param {string} month - Tháng (format: YYYY-MM)
 * @returns {Promise<Object>} Preview payroll data
 */
export async function previewPayrollRecord(userId, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month format must be YYYY-MM");
  }

  // ✅ FIX: Validate monthNum (1-12)
  const [year, monthNum] = month.split("-").map(Number);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error("Invalid month number. Must be between 1-12");
  }

  const periodStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const periodEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

  const user = await UserModel.findById(userId)
    .populate("department", "code name")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const { baseSalary, source: salarySource } = await calculateBaseSalary(user, user.department);
  const attendanceData = await calculateAttendanceData(
    userId,
    periodStart,
    periodEnd
  );

  const previewEffectiveWorkDays = attendanceData.workDays + (attendanceData.paidLeaveDays ?? 0);
  const actualBaseSalary = calculateActualBaseSalary(baseSalary, previewEffectiveWorkDays);
  const hourlyRate = Math.round(
    baseSalary / (PAYROLL_RULES.STANDARD_WORK_DAYS * PAYROLL_RULES.STANDARD_WORK_HOURS_PER_DAY)
  );
  const otDetails = attendanceData.overtimeDetails || { weekday: 0, weekend: 0, holiday: 0 };
  const overtimePay = calculateOvertimePay(otDetails, baseSalary);
  const previewUnpaidAbsence = (attendanceData.unpaidLeaveDays ?? 0) + (attendanceData.unauthorizedAbsenceDays ?? 0);
  const deductions = calculateDeductions(attendanceData.lateDays, previewUnpaidAbsence, baseSalary);
  const bonus = calculateBonus(attendanceData, baseSalary);
  const grossSalary = actualBaseSalary + overtimePay + bonus - deductions;

  let insurance = { social: 0, health: 0, unemployment: 0, total: 0, base: 0 };
  let tax = { taxableIncome: 0, personalDeduction: 0, dependentCount: 0, dependentDeduction: 0, taxableAfterDeduction: 0, amount: 0, bracketBreakdown: [] };
  if (FEATURE_FLAGS.INSURANCE_TAX) {
    insurance = calculateInsurance(baseSalary);
    tax = calculatePersonalIncomeTax(grossSalary, insurance.total, user.dependentCount ?? 0);
  }
  const netSalary = grossSalary - insurance.total - tax.amount;

  const paidLeaveSuffix = (attendanceData.paidLeaveDays ?? 0) > 0 ? `+${attendanceData.paidLeaveDays}NP` : "";
  const absenceDays = (attendanceData.unpaidLeaveDays ?? 0) + (attendanceData.unauthorizedAbsenceDays ?? 0);
  const breakdown = [
    { label: "Lương cơ bản", formula: `${baseSalary.toLocaleString("vi-VN")} [${salarySource}]`, value: baseSalary },
    { label: "Ngày công", formula: `${attendanceData.workDays}${paidLeaveSuffix} / ${PAYROLL_RULES.STANDARD_WORK_DAYS} ngày`, value: actualBaseSalary },
    ...(otDetails.weekday > 0 ? [{ label: "OT ngày thường (150%)", formula: `${otDetails.weekday}h × ${hourlyRate.toLocaleString("vi-VN")} × 1.5`, value: Math.round(otDetails.weekday * hourlyRate * PAYROLL_RULES.OVERTIME.MULTIPLIER) }] : []),
    ...(otDetails.weekend > 0 ? [{ label: "OT cuối tuần (200%)", formula: `${otDetails.weekend}h × ${hourlyRate.toLocaleString("vi-VN")} × 2.0`, value: Math.round(otDetails.weekend * hourlyRate * PAYROLL_RULES.OVERTIME.WEEKEND_MULTIPLIER) }] : []),
    ...(otDetails.holiday > 0 ? [{ label: "OT ngày lễ (300%)", formula: `${otDetails.holiday}h × ${hourlyRate.toLocaleString("vi-VN")} × 3.0`, value: Math.round(otDetails.holiday * hourlyRate * PAYROLL_RULES.OVERTIME.HOLIDAY_MULTIPLIER) }] : []),
    ...(bonus > 0 ? [{ label: "Thưởng chuyên cần", formula: "+1 lần/tháng đủ điều kiện", value: bonus }] : []),
    ...(deductions > 0 ? [{ label: "Khấu trừ", formula: `${attendanceData.lateDays} ngày muộn + ${absenceDays} ngày vắng có phí`, value: -deductions }] : []),
    { label: "Lương gross", formula: "actualBase + OT + thưởng - khấu trừ", value: grossSalary },
    ...(FEATURE_FLAGS.INSURANCE_TAX ? [
      { label: "BHXH/BHYT/BHTN (10.5%)", formula: `${insurance.base.toLocaleString("vi-VN")} × 10.5%`, value: -insurance.total },
      { label: "Thuế TNCN", formula: `${tax.bracketBreakdown.length} bậc, ${tax.dependentCount} người phụ thuộc`, value: -tax.amount },
      { label: "Thực lĩnh (net)", formula: "gross - BHXH - thuế", value: netSalary },
    ] : []),
  ];

  return {
    userId: user._id.toString(),
    userName: user.name,
    employeeId: user.employeeId || `EMP${userId.slice(-6)}`,
    department: user.department?.name || "N/A",
    position: user.position || "N/A",
    month,
    periodStart,
    periodEnd,
    attendance: attendanceData,
    salary: {
      baseSalary,
      actualBaseSalary,
      salarySource,
      overtimePay,
      bonus,
      deductions,
      grossSalary,
      insurance,
      tax,
      netSalary,
      totalSalary: netSalary,
    },
    overtimeDetails: otDetails,
    breakdown,
    calculation: {
      hourlyRate,
      workDaysRatio: attendanceData.workDays / PAYROLL_RULES.STANDARD_WORK_DAYS,
    },
  };
}

// ============================================================================
// PAYROLL REPORT GENERATION
// ============================================================================

/**
 * Tạo báo cáo tổng hợp cho tháng
 * 
 * @param {string} month - Tháng (format: YYYY-MM)
 * @returns {Promise<Object>} Payroll report
 */
export async function generatePayrollReport(month, companyId = null) {
  const reportQuery = { month };
  if (companyId) reportQuery.companyId = companyId;
  const records = await PayrollRecordModel.find(reportQuery).lean();

  if (records.length === 0) {
    return null;
  }

  const [year, monthNum] = month.split("-").map(Number);
  const periodStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const periodEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

  const totalEmployees = records.length;
  const totalSalary = records.reduce((sum, r) => sum + (r.totalSalary || 0), 0);
  const totalBonuses = records.reduce((sum, r) => sum + (r.bonus || 0), 0);
  const totalDeductions = records.reduce(
    (sum, r) => sum + (r.deductions || 0),
    0
  );
  const netPay = totalSalary;
  const avgSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;

  const departmentStats = {};
  records.forEach((record) => {
    const dept = record.department || "N/A";
    if (!departmentStats[dept]) {
      departmentStats[dept] = {
        department: dept,
        employees: 0,
        totalSalary: 0,
        avgSalary: 0,
        percentage: 0,
      };
    }
    departmentStats[dept].employees++;
    departmentStats[dept].totalSalary += record.totalSalary || 0;
  });

  Object.keys(departmentStats).forEach((dept) => {
    const stat = departmentStats[dept];
    stat.avgSalary = stat.employees > 0 ? stat.totalSalary / stat.employees : 0;
    stat.percentage =
      totalSalary > 0 ? (stat.totalSalary / totalSalary) * 100 : 0;
  });

  const departmentStatsArray = Object.values(departmentStats);

  const previousReports = await PayrollReportModel.find({})
    .sort({ periodStart: -1 })
    .limit(5)
    .lean();

  const monthlyTrend = previousReports
    .slice(0, 5)
    .map((r) => ({
      month: r.month,
      total: Math.round(r.totalSalary / 1_000_000), // Triệu VND
      employees: r.totalEmployees,
    }))
    .reverse();

  let report = await PayrollReportModel.findOne({ month });

  const reportData = {
    month,
    periodStart,
    periodEnd,
    totalEmployees,
    totalSalary,
    totalBonuses,
    totalDeductions,
    netPay,
    avgSalary,
    departmentStats: departmentStatsArray,
    monthlyTrend,
  };

  if (report) {
    Object.assign(report, reportData);
    await report.save();
  } else {
    report = await PayrollReportModel.create(reportData);
  }

  return report;
}

