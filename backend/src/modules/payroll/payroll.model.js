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

payrollReportSchema.index({ month: 1 }, { unique: true });
payrollReportSchema.index({ periodStart: -1 });

export const PayrollReportModel = mongoose.model(
  "PayrollReport",
  payrollReportSchema
);

