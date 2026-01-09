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
      enum: ["present", "absent", "late", "on_leave", "weekend", "overtime"],
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

    // ⚠️ MỚI: Work credit (tính công)
    workCredit: {
      type: Number,
      default: 0,
      min: 0,
      // 0 = không tính công
      // 0.5 = nửa công
      // 1.0 = đủ công
      // > 1.0 = part-time (tính theo giờ thực tế)
    },

    // ⚠️ MỚI: Early checkout reason
    // Note: Field is optional (not required), so null/undefined is allowed
    // Enum validation only applies when a value is provided
    earlyCheckoutReason: {
      type: String,
      enum: ["machine_issue", "personal_emergency", "manager_request"],
      default: null,
    },

    // ⚠️ MỚI: Approval status
    // Note: Field is optional (not required), so null/undefined is allowed
    // Enum validation only applies when a value is provided
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: null,
    },

    // ⚠️ MỚI: Approved by (HR/Leader)
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ⚠️ MỚI: Approved at
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// === Đảm bảo 1 người chỉ chấm công 1 lần/ngày ===
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// === Tính giờ làm việc tự động ===
attendanceSchema.methods.calculateWorkHours = function () {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut - this.checkIn;
    let hours = diffMs / (1000 * 60 * 60);

    // Trừ 1h break time nếu làm việc > 6 giờ (lunch break)
    // Example: 8:00-17:00 = 9h → -1h break = 8h
    if (hours > 6) {
      hours -= 1;
    }

    this.workHours = Math.max(0, Math.round(hours * 100) / 100);
  } else {
    this.workHours = 0;
  }
  return this.workHours;
};

// === Tự động cập nhật status và giờ làm ===
// Pre-save hook để tự động tính toán work hours và set status
attendanceSchema.pre("save", function (next) {
  // Normalize date to UTC start of day
  const d = new Date(this.date);
  this.date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

  // Chỉ calculate khi checkIn hoặc checkOut thay đổi
  if (this.isModified("checkIn") || this.isModified("checkOut")) {
    this.calculateWorkHours();

    // Auto-determine status nếu chưa set hoặc đang là "absent"
    // Note: Logic đi muộn sẽ được xử lý ở controller (cần async để lấy schedule)
    if (!this.status || this.status === "absent") {
      if (this.checkIn && this.checkOut) {
        this.status = "present";
      } else if (this.checkIn) {
        // If only checkIn is present, assume present for now
        this.status = "present";
      } else {
        this.status = "absent";
      }
    }
  }

  next();
});

export const AttendanceModel = mongoose.model("Attendance", attendanceSchema);
