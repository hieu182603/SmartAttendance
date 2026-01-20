import {
  getBaseSalaryFromConfig,
  PAYROLL_RULES,
  SALARY_MATRIX,
  POSITION_DEFAULT_SALARY,
  DEPARTMENT_DEFAULT_SALARY,
} from "../../config/payroll.config.js";
import { AttendanceModel } from "../attendance/attendance.model.js";
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
 * Tính số ngày làm việc, giờ làm thêm, số ngày đi muộn từ attendance
 * 
 * @param {string} userId - User ID
 * @param {Date} periodStart - Ngày bắt đầu
 * @param {Date} periodEnd - Ngày kết thúc
 * @returns {Promise<Object>} { workDays, totalDays, overtimeHours, lateDays, leaveDays }
 */
export async function calculateAttendanceData(userId, periodStart, periodEnd) {
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

  const workDays = attendances.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;

  const lateDays = attendances.filter((a) => a.status === "late").length;

  const overtimeHours = attendances.reduce((sum, a) => {
    if (a.workHours > 8) {
      return sum + (a.workHours - 8);
    }
    return sum;
  }, 0);

  const totalDays = PAYROLL_RULES.STANDARD_WORK_DAYS;
  const leaveDays = Math.max(0, totalDays - workDays);

  return {
    workDays,
    totalDays,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
    lateDays,
    leaveDays,
    hasAttendanceData, // ✅ Flag để frontend có thể hiển thị warning
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
export function calculateActualBaseSalary(baseSalary, workDays) {
  if (!PAYROLL_RULES.CALCULATE_BY_WORK_DAYS) {
    return baseSalary;
  }

  const actualSalary =
    baseSalary * (workDays / PAYROLL_RULES.STANDARD_WORK_DAYS);
  return roundSalary(actualSalary);
}

/**
 * Tính lương làm thêm giờ
 * 
 * @param {number} overtimeHours - Số giờ làm thêm
 * @param {number} baseSalary - Lương cơ bản
 * @returns {number} Overtime pay
 */
export function calculateOvertimePay(overtimeHours, baseSalary) {
  const hourlyRate =
    baseSalary /
    (PAYROLL_RULES.STANDARD_WORK_DAYS *
      PAYROLL_RULES.STANDARD_WORK_HOURS_PER_DAY);
  const overtimePay =
    overtimeHours * hourlyRate * PAYROLL_RULES.OVERTIME.MULTIPLIER;
  return roundSalary(overtimePay);
}

/**
 * Tính khấu trừ
 * 
 * @param {number} lateDays - Số ngày đi muộn
 * @param {number} leaveDays - Số ngày nghỉ không phép
 * @param {number} baseSalary - Lương cơ bản
 * @returns {number} Total deductions
 */
export function calculateDeductions(lateDays, leaveDays, baseSalary) {
  let deductions = 0;

  if (PAYROLL_RULES.DEDUCTIONS.LATE_ARRIVAL) {
    deductions += lateDays * PAYROLL_RULES.DEDUCTIONS.LATE_ARRIVAL;
  }

  if (
    PAYROLL_RULES.DEDUCTIONS.UNAUTHORIZED_ABSENCE &&
    PAYROLL_RULES.DEDUCTIONS.UNAUTHORIZED_ABSENCE.PER_DAY
  ) {
    const perDayDeduction =
      baseSalary / PAYROLL_RULES.STANDARD_WORK_DAYS;
    deductions += leaveDays * perDayDeduction;
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
export function calculateBonus(attendanceData, baseSalary) {
  let bonus = 0;

  if (PAYROLL_RULES.BONUS.ATTENDANCE?.ENABLED) {
    const req = PAYROLL_RULES.BONUS.ATTENDANCE.REQUIREMENTS;
    let eligible = true;

    if (req.NO_LATE_DAYS && attendanceData.lateDays > 0) {
      eligible = false;
    }
    if (req.NO_ABSENCE && attendanceData.leaveDays > 0) {
      eligible = false;
    }
    if (
      req.MIN_WORK_DAYS &&
      attendanceData.workDays < req.MIN_WORK_DAYS
    ) {
      eligible = false;
    }

    if (eligible) {
      bonus += PAYROLL_RULES.BONUS.ATTENDANCE.AMOUNT;
    }
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

  const { baseSalary, source: salarySource } = await calculateBaseSalary(user, user.department);
  const attendanceData = await calculateAttendanceData(
    userId,
    periodStart,
    periodEnd
  );

  const actualBaseSalary = calculateActualBaseSalary(
    baseSalary,
    attendanceData.workDays
  );
  const overtimePay = calculateOvertimePay(
    attendanceData.overtimeHours,
    baseSalary
  );
  const deductions = calculateDeductions(
    attendanceData.lateDays,
    attendanceData.leaveDays,
    baseSalary
  );
  const bonus = calculateBonus(attendanceData, baseSalary);
  const totalSalary = actualBaseSalary + overtimePay + bonus - deductions;

  let payrollRecord = await PayrollRecordModel.findOne({
    userId,
    month,
  });

  const recordData = {
    userId,
    month,
    periodStart,
    periodEnd,
    workDays: attendanceData.workDays,
    totalDays: attendanceData.totalDays,
    overtimeHours: attendanceData.overtimeHours,
    leaveDays: attendanceData.leaveDays,
    lateDays: attendanceData.lateDays,
    baseSalary, // Lương tháng đầy đủ
    actualBaseSalary, // Lương cơ bản thực tế (theo số ngày làm việc)
    salarySource, // ✅ Nguồn của baseSalary
    overtimePay,
    bonus,
    deductions,
    totalSalary,
    department: user.department?.name || "N/A",
    departmentId: user.department?._id || user.department || null, // Store departmentId for filtering
    position: user.position || "N/A",
    employeeId: user.employeeId || `EMP${userId.toString().slice(-6)}`,
    status: payrollRecord?.status || "pending",
  };

  if (payrollRecord) {
    if (payrollRecord.status === "pending") {
      Object.assign(payrollRecord, recordData);
      await payrollRecord.save();
    } else {
      // ✅ FIX: Update attendance và tính lại actualBaseSalary, overtimePay, etc.
      payrollRecord.workDays = recordData.workDays;
      payrollRecord.overtimeHours = recordData.overtimeHours;
      payrollRecord.leaveDays = recordData.leaveDays;
      payrollRecord.lateDays = recordData.lateDays;
      
      // Tính lại actualBaseSalary dựa trên workDays mới
      payrollRecord.actualBaseSalary = calculateActualBaseSalary(
        payrollRecord.baseSalary,
        recordData.workDays
      );
      
      // Recalculate các components
      payrollRecord.overtimePay = calculateOvertimePay(
        recordData.overtimeHours,
        payrollRecord.baseSalary
      );
      payrollRecord.deductions = calculateDeductions(
        recordData.lateDays,
        recordData.leaveDays,
        payrollRecord.baseSalary
      );
      payrollRecord.bonus = calculateBonus(
        {
          workDays: recordData.workDays,
          lateDays: recordData.lateDays,
          leaveDays: recordData.leaveDays,
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
export async function generatePayrollForMonth(month) {
  const employees = await UserModel.find({
    role: { $in: ["EMPLOYEE", "MANAGER", "SUPERVISOR"] },
    isActive: true,
    isTrial: { $ne: true },
  }).select("_id name employeeId");

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

  await generatePayrollReport(month);

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

  const actualBaseSalary = calculateActualBaseSalary(
    baseSalary,
    attendanceData.workDays
  );
  const overtimePay = calculateOvertimePay(
    attendanceData.overtimeHours,
    baseSalary
  );
  const deductions = calculateDeductions(
    attendanceData.lateDays,
    attendanceData.leaveDays,
    baseSalary
  );
  const bonus = calculateBonus(attendanceData, baseSalary);
  const totalSalary = actualBaseSalary + overtimePay + bonus - deductions;

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
      salarySource, // ✅ Thêm source vào preview
      overtimePay,
      bonus,
      deductions,
      totalSalary,
    },
    calculation: {
      hourlyRate: Math.round(
        baseSalary /
          (PAYROLL_RULES.STANDARD_WORK_DAYS *
            PAYROLL_RULES.STANDARD_WORK_HOURS_PER_DAY)
      ),
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
export async function generatePayrollReport(month) {
  const records = await PayrollRecordModel.find({ month }).lean();

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

