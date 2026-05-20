import mongoose from "mongoose";

const departmentStatSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    employees: { type: Number, default: 0 },
    totalSalary: { type: Number, default: 0 },
    avgSalary: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const monthlyTrendSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    total: { type: Number, default: 0 }, // đơn vị: triệu VND
    employees: { type: Number, default: 0 },
  },
  { _id: false }
);

const payrollReportSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    month: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalEmployees: { type: Number, default: 0 },
    totalSalary: { type: Number, default: 0 },
    totalBonuses: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    avgSalary: { type: Number, default: 0 },
    departmentStats: [departmentStatSchema],
    monthlyTrend: [monthlyTrendSchema],
  },
  { timestamps: true }
);

payrollReportSchema.index({ companyId: 1, month: 1 }, { unique: true });
payrollReportSchema.index({ companyId: 1, periodStart: -1 });

export const PayrollReportModel = mongoose.model(

  "PayrollReports",



  payrollReportSchema
);

/**
 * Schema cho PayrollRecord (Bảng lương chi tiết từng nhân viên)
 */
const payrollRecordSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/, // Format: YYYY-MM
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },

    // Thông tin chấm công
    workDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    unauthorizedAbsenceDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Chi tiết giờ OT theo loại ngày (Điều 98 BLLĐ)
    overtimeDetails: {
      weekday: { type: Number, default: 0, min: 0 },   // Giờ OT ngày thường (150%)
      weekend: { type: Number, default: 0, min: 0 },   // Giờ OT cuối tuần (200%)
      holiday: { type: Number, default: 0, min: 0 },   // Giờ OT ngày lễ (300%)
    },

    // Thông tin lương
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    // Lương cơ bản thực tế (theo số ngày làm việc)
    // Nếu null thì tính từ baseSalary, workDays, totalDays (backward compatibility)
    actualBaseSalary: {
      type: Number,
      required: false, // Optional để backward compatible với records cũ
      min: 0,
    },
    // Nguồn của baseSalary (để audit và debug)
    salarySource: {
      type: String,
      enum: ["USER_OVERRIDE", "SALARY_MATRIX", "DEPT_DEFAULT", "POS_DEFAULT", "GLOBAL_DEFAULT"],
      default: null, // Optional để backward compatible
    },
    overtimePay: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Lương gross (trước BHXH + thuế)
    grossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Bảo hiểm (BHXH/BHYT/BHTN người lao động đóng)
    insurance: {
      social:       { type: Number, default: 0, min: 0 },
      health:       { type: Number, default: 0, min: 0 },
      unemployment: { type: Number, default: 0, min: 0 },
      total:        { type: Number, default: 0, min: 0 },
      base:         { type: Number, default: 0, min: 0 },
    },
    // Thuế TNCN bậc thang
    tax: {
      taxableIncome:         { type: Number, default: 0 },
      personalDeduction:     { type: Number, default: 0 },
      dependentCount:        { type: Number, default: 0 },
      dependentDeduction:    { type: Number, default: 0 },
      taxableAfterDeduction: { type: Number, default: 0 },
      amount:                { type: Number, default: 0, min: 0 },
      bracketBreakdown:      [{ bracket: String, amount: Number, tax: Number }],
    },
    // Lương net (thực lĩnh = gross - BHXH - thuế)
    netSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    // totalSalary = netSalary khi có insurance/tax, ngược lại = gross (backward compat)
    totalSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["pending", "approved", "paid"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },

    // Thông tin bổ sung (denormalized để dễ query)
    department: {
      type: String,
      trim: true,
    },
    // Department ID for filtering (added for Comment 4 fix)
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    position: {
      type: String,
      trim: true,
    },
    employeeId: {
      type: String, // Mã nhân viên
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
payrollRecordSchema.index({ companyId: 1, userId: 1, month: -1 }, { unique: true });
payrollRecordSchema.index({ companyId: 1, month: -1, status: 1 });
payrollRecordSchema.index({ department: 1, month: -1 });
payrollRecordSchema.index({ status: 1, createdAt: -1 });
// ✅ FIX: Thêm compound indexes cho performance
payrollRecordSchema.index({ department: 1, status: 1, month: -1 });
payrollRecordSchema.index({ departmentId: 1, month: -1 }); // Index for departmentId filtering
payrollRecordSchema.index({ departmentId: 1, status: 1, month: -1 }); // Compound index for departmentId queries
payrollRecordSchema.index({ position: 1, month: -1 });

// Tính tổng lương tự động
payrollRecordSchema.pre("save", function (next) {
  const baseSalaryForCalculation = this.actualBaseSalary ?? this.baseSalary;
  this.grossSalary = baseSalaryForCalculation + this.overtimePay + this.bonus - this.deductions;

  // insurance và tax được gán từ service trước khi save
  const insuranceTotal = this.insurance?.total ?? 0;
  const taxAmount = this.tax?.amount ?? 0;
  this.netSalary = Math.max(0, this.grossSalary - insuranceTotal - taxAmount);
  this.totalSalary = this.netSalary; // backward compat: totalSalary = thực lĩnh
  next();
});

export const PayrollRecordModel = mongoose.model(

  "PayrollRecords",
  payrollRecordSchema
);




