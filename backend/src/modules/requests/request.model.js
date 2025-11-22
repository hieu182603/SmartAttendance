import mongoose from "mongoose";

/**
 * Schema cho Request (Yêu cầu / Đơn xin phép / Tăng ca / Làm từ xa)
 */
const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["leave", "sick", "unpaid", "compensatory", "maternity", "overtime", "remote", "late", "correction", "other"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    approvalComments: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index giúp tối ưu truy vấn
requestSchema.index({ userId: 1, createdAt: -1 });
requestSchema.index({ status: 1 });

/**
 * ✅ Method phê duyệt yêu cầu
 * @param {ObjectId} managerId - ID của người duyệt
 */
requestSchema.methods.approve = function (managerId, comments) {
  this.status = "approved";
  this.approvedBy = managerId;
  this.approvedAt = new Date();
  this.rejectionReason = undefined;
  if (comments) {
    this.approvalComments = comments;
  }
};

/**
 * ❌ Method từ chối yêu cầu
 * @param {String} reason - Lý do từ chối
 */
requestSchema.methods.reject = function (reason) {
  this.status = "rejected";
  this.rejectionReason = reason;
  this.approvedAt = new Date();
};

/**
 * 🕒 Hook kiểm tra logic ngày tháng trước khi lưu
 */
requestSchema.pre("save", function (next) {
  if (this.startDate > this.endDate) {
    return next(new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc"));
  }
  next();
});

export const RequestModel = mongoose.model("Request", requestSchema);
