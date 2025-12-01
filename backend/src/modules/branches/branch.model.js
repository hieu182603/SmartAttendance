import mongoose from "mongoose";

/**
 * Schema cho Branch (Chi nhánh công ty)
 */
const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: "Việt Nam",
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    establishedDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    timezone: {
      type: String,
      default: "GMT+7",
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes để tối ưu truy vấn
// Note: code đã có unique: true trong schema nên không cần tạo index lại
branchSchema.index({ status: 1 });
branchSchema.index({ managerId: 1 });
branchSchema.index({ city: 1 });

export const BranchModel = mongoose.model("Branch", branchSchema);

