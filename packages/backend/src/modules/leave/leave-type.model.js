import mongoose from "mongoose";

/**
 * Loại nghỉ phép — cho phép HR/Admin tự cấu hình runtime
 * Mặc định seed: annual, sick, unpaid, compensatory, maternity
 */
const leaveTypeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 32,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    defaultQuotaDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 365,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

leaveTypeSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const LeaveTypeModel = mongoose.model("LeaveType", leaveTypeSchema);
