import mongoose from "mongoose";

/**
 * Schema cho EmployeeSchedule (Lịch làm việc nhân viên)
 */
const employeeScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      set: (v) => {
        const d = new Date(v);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      },
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },

    // Thông tin ca làm (denormalized để dễ query)
    shiftName: {
      type: String,
      trim: true,
    },
    startTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // Format: HH:mm
    },
    endTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // Format: HH:mm
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["scheduled", "completed", "missed", "off"],
      default: "scheduled",
      index: true,
    },

    // Thông tin bổ sung
    location: {
      type: String,
      trim: true,
    },
    team: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },

    // Liên kết với attendance (optional)
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
    },
  },
  { timestamps: true }
);

// Indexes
employeeScheduleSchema.index({ userId: 1, date: 1 }, { unique: true });
employeeScheduleSchema.index({ date: 1, status: 1 });
employeeScheduleSchema.index({ shiftId: 1, date: 1 });
employeeScheduleSchema.index({ status: 1, date: 1 });

// Chuẩn hóa ngày trước khi lưu
employeeScheduleSchema.pre("save", function (next) {
  const d = new Date(this.date);
  this.date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next();
});

export const EmployeeScheduleModel = mongoose.model(
  "EmployeeSchedule",
  employeeScheduleSchema
);

