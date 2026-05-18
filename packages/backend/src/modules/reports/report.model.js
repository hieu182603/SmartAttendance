// src/models/report.model.js
import mongoose from "mongoose";

/**
 * Báo cáo chấm công (tổng hợp theo tuần/tháng)
 * Không lưu dữ liệu thô → chỉ lưu kết quả
 */
const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Thống kê
    totalDays: { type: Number, default: 0 }, // Tổng ngày làm việc
    presentDays: { type: Number, default: 0 }, // Có mặt
    absentDays: { type: Number, default: 0 }, // Vắng
    lateDays: { type: Number, default: 0 }, // Đi muộn
    totalHours: { type: Number, default: 0 }, // Tổng giờ làm

    // Chi tiết từng ngày (dễ hiển thị bảng)
    dailySummary: [
      {
        date: { type: Date, required: true },
        checkIn: { type: Date },
        checkOut: { type: Date },
        status: { type: String, enum: ["present", "absent", "late"] },
        workHours: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Index để tìm báo cáo nhanh
reportSchema.index({ userId: 1, type: 1, startDate: -1 });

// Kiểm tra ngày hợp lệ
reportSchema.pre("save", function (next) {
  if (this.startDate > this.endDate) {
    return next(new Error("startDate phải nhỏ hơn endDate"));
  }
  next();
});

export const ReportModel = mongoose.model("Report", reportSchema);
