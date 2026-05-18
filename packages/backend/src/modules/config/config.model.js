import mongoose from "mongoose";

/**
 * Schema cho SystemConfig (Cấu hình hệ thống)
 */
const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
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

// Note: key already has unique: true in schema, category already has index: true
// No need to create duplicate indexes

export const SystemConfigModel = mongoose.model(
  "SystemConfig",
  systemConfigSchema
);

