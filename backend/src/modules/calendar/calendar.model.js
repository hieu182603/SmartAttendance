import mongoose from "mongoose";

/**
 * Schema cho CalendarEvent (Sự kiện công ty)
 */
const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // Format: HH:mm
      default: "09:00",
    },
    endTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // Format: HH:mm
      default: "17:00",
    },
    isAllDay: {
      type: Boolean,
      default: false,
    },

    type: {
      type: String,
      enum: ["holiday", "meeting", "event", "deadline", "training"],
      required: true,
      index: true,
    },

    location: {
      type: String,
      trim: true,
    },
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attendeeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Màu sắc và hiển thị
    color: {
      type: String,
      default: "#3B82F6", // Blue default
    },

    // Quyền truy cập
    visibility: {
      type: String,
      enum: ["public", "department", "branch", "private"],
      default: "public",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },

    // Người tạo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Trạng thái
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
calendarEventSchema.index({ date: 1, type: 1 });
calendarEventSchema.index({ createdBy: 1, date: -1 });
calendarEventSchema.index({ departmentId: 1, date: 1 });
calendarEventSchema.index({ branchId: 1, date: 1 });
calendarEventSchema.index({ visibility: 1, date: 1 });
calendarEventSchema.index({ isActive: 1, date: 1 });

// Tự động cập nhật attendeeCount nếu có attendees array
calendarEventSchema.pre("save", function (next) {
  if (this.attendees && Array.isArray(this.attendees) && this.attendees.length > 0) {
    this.attendeeCount = this.attendees.length;
  }
  // Nếu không có attendees array, giữ nguyên attendeeCount từ input
  next();
});

export const CalendarEventModel = mongoose.model(
  "CalendarEvent",
  calendarEventSchema
);

