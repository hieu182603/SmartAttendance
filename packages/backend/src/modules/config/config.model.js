import mongoose from "mongoose";

/**
 * Schema cho SystemConfig (Cấu hình hệ thống)
 */
const systemConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      enum: ["attendance", "payroll", "general", "security", "notification"],
      required: true,
      index: true,
    },

    // Giá trị có thể là string, number, boolean, object
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Mô tả
    description: {
      type: String,
      trim: true,
    },

    // Quyền chỉnh sửa (roles có thể chỉnh sửa)
    editableBy: [
      {
        type: String,
        enum: ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER"],
      },
    ],

    // Lịch sử thay đổi
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Unique per (companyId, key): null companyId = global defaults, non-null = company override
systemConfigSchema.index({ companyId: 1, key: 1 }, { unique: true });

export const SystemConfigModel = mongoose.model(
  "SystemConfig",
  systemConfigSchema
);

