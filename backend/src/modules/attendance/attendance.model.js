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
      // Chỉ lưu ngày (không giờ phút giây)
      set: (v) => {
        const d = new Date(v);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      },
    },
    checkIn: { type: Date }, // Giờ vào
    checkOut: { type: Date }, // Giờ ra
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "absent",
    },
    workHours: {
      type: Number,
      default: 0,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
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
    const diff = (this.checkOut - this.checkIn) / (1000 * 60 * 60); // giờ
    this.workHours = Math.round(diff * 100) / 100; // làm tròn 2 chữ số
  } else {
    this.workHours = 0;
  }
  return this.workHours;
};

// === Tự động cập nhật status và giờ làm ===
attendanceSchema.pre("save", function (next) {
  // Chuẩn hóa ngày
  const d = new Date(this.date);
  this.date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Tính giờ
  this.calculateWorkHours();

  // Cập nhật trạng thái
  if (this.checkIn && this.checkOut) {
    this.status = "present";
    // Giả sử đi muộn nếu vào sau 8:30
    const lateTime = new Date(this.date);
    lateTime.setHours(8, 30, 0, 0);
    if (this.checkIn > lateTime) {
      this.status = "late";
    }
  } else if (this.checkIn && !this.checkOut) {
    this.status = "present"; // đang làm
  }

  next();
});

export const AttendanceModel = mongoose.model("Attendance", attendanceSchema);
