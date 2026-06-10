import mongoose from "mongoose";

const companyOverrideSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    enabled: { type: Boolean, required: true },
  },
  { _id: false }
);

const featureToggleSchema = new mongoose.Schema(
  {
    featureKey: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
    disabledForRoles: [{ type: String, enum: ["EMPLOYEE", "TRIAL", "MANAGER", "HR_MANAGER", "ADMIN"] }],
    companyOverrides: [companyOverrideSchema],
    category: { type: String, enum: ["core", "advanced", "ai"], default: "core" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const FeatureToggleModel = mongoose.model("FeatureToggle", featureToggleSchema);

/**
 * Canonical feature-key vocabulary.
 * ─────────────────────────────────────────────────────────────────────────────
 * These keys are the single source of truth shared by:
 *   • featureToggle.model.js  (this file – seeded defaults)
 *   • scripts/seed.js         (inserts these records)
 *   • apps/web/src/utils/menuItems.ts  (MenuItem.featureKey references)
 *   • FeatureToggle admin UI  (displays featureKey as identifier)
 *
 * Key → menu items it gates
 * ─────────────────────────
 * attendance          → scan (employee), history, admin-attendance
 * leave_management    → requests (employee), leave-balance, approve-requests
 * chatbot             → chatbot (employee), ai-billing (admin), company-regulations
 * payroll             → my-payslip (employee), payroll, payroll-reports, salary-matrix
 * performance_review  → performance-review
 * attendance_analytics→ attendance-analytics
 * employee_management → employee-management
 * company_calendar    → company-calendar
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const DEFAULT_FEATURES = [
  { featureKey: "attendance",          name: "Chấm công",              description: "Chấm công, lịch sử và quản lý chấm công",           category: "core"     },
  { featureKey: "leave_management",    name: "Quản lý nghỉ phép",      description: "Đơn nghỉ phép, phê duyệt, số dư phép năm",          category: "core"     },
  { featureKey: "chatbot",             name: "Chatbot AI",              description: "Trợ lý AI hỗ trợ nhân viên và quản lý AI billing",  category: "ai"       },
  { featureKey: "payroll",             name: "Bảng lương",              description: "Quản lý bảng lương, thang lương, xuất lương",       category: "core"     },
  { featureKey: "performance_review",  name: "Đánh giá hiệu suất",     description: "Hệ thống đánh giá KPI nhân viên",                   category: "advanced" },
  { featureKey: "attendance_analytics",name: "Phân tích chấm công",    description: "Báo cáo và phân tích dữ liệu chấm công",            category: "core"     },
  { featureKey: "employee_management", name: "Quản lý nhân viên",      description: "Danh sách, hồ sơ và quản lý thông tin nhân viên",   category: "core"     },
  { featureKey: "company_calendar",    name: "Lịch công ty",           description: "Sự kiện, ngày nghỉ và lịch chung toàn công ty",     category: "core"     },
];
