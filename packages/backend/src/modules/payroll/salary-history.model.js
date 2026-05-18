import mongoose from "mongoose";

/**
 * Salary History Model
 * Lưu lịch sử thay đổi lương của nhân viên để audit
 */
const salaryHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    oldSalary: {
      type: Number,
      default: null, // null nếu là lương đầu tiên (chưa có lương cũ)
      validate: {
        validator: function (v) {
          return v === null || (typeof v === "number" && v >= 0);
        },
        message: "oldSalary must be null or a number >= 0",
      },
    },
    newSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    effectiveDate: {
      type: Date,
      default: Date.now, // Ngày có hiệu lực
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: null, // Lý do thay đổi (optional)
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Người thực hiện thay đổi (admin/HR)
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Thông tin bổ sung (optional)
    },
  },
  { timestamps: true }
);

// Indexes cho performance
salaryHistorySchema.index({ userId: 1, effectiveDate: -1 });
salaryHistorySchema.index({ changedBy: 1, createdAt: -1 });

export const SalaryHistoryModel = mongoose.model(
  "SalaryHistory",
  salaryHistorySchema
);

