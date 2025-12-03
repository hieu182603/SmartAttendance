// src/models/attendance.model.js
import mongoose from "mongoose";

/**
 * Chấm công - Mỗi nhân viên 1 bản ghi / ngày
 */
const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      set: (v) => {
        const d = new Date(v);
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      },
    },
    checkIn: { type: Date }, 
    checkOut: { type: Date }, 
    status: {
      type: String,
      enum: ["present", "absent", "late", "on_leave"],
      default: "absent",
    },
    workHours: {
      type: Number,
      default: 0,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch", // Đã chuyển từ Location sang Branch
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// === Đảm bảo 1 người chỉ chấm công 1 lần/ngày ===
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// === Tính giờ làm việc tự động ===
attendanceSchema.methods.calculateWorkHours = function () {
  if (this.checkIn && this.checkOut) {
    const diff = (this.checkOut - this.checkIn) / (1000 * 60 * 60);
    this.workHours = Math.round(diff * 100) / 100; 
  } else {
    this.workHours = 0;
  }
  return this.workHours;
};

// === Tự động cập nhật status và giờ làm ===
attendanceSchema.pre("save", function (next) {
  const d = new Date(this.date);
  this.date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

  // Tính giờ
  this.calculateWorkHours();

  // Cập nhật trạng thái cơ bản
  // Note: Logic đi muộn sẽ được xử lý ở controller (cần async để lấy schedule)
  if (this.checkIn) {
    // Nếu status chưa được set từ controller, mặc định là present
    if (!this.status || this.status === "absent") {
      this.status = "present";
    }
  } else {
    this.status = "absent";
  }

  next();
});

export const AttendanceModel = mongoose.model("Attendance", attendanceSchema);
