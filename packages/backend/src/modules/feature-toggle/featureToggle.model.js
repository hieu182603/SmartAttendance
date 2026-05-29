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

export const DEFAULT_FEATURES = [
  { featureKey: "payroll", name: "Bảng lương", description: "Quản lý bảng lương, thang lương, xuất lương", category: "core" },
  { featureKey: "chatbot", name: "Chatbot AI", description: "Trợ lý AI hỗ trợ nhân viên", category: "ai" },
  { featureKey: "face_recognition", name: "Nhận diện khuôn mặt", description: "Chấm công bằng nhận diện khuôn mặt", category: "ai" },
  { featureKey: "performance_review", name: "Đánh giá hiệu suất", description: "Hệ thống đánh giá KPI nhân viên", category: "advanced" },
  { featureKey: "attendance_analytics", name: "Phân tích chấm công", description: "Báo cáo và phân tích dữ liệu chấm công", category: "core" },
  { featureKey: "leave_management", name: "Quản lý nghỉ phép", description: "Đơn nghỉ phép, số dư phép năm", category: "core" },
  { featureKey: "billing", name: "Thanh toán & Gói dịch vụ", description: "Nâng cấp gói, lịch sử thanh toán", category: "advanced" },
];
