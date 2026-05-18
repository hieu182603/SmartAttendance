import mongoose from "mongoose";

/**
 * Schema cho Department (Phòng ban)
 */
const departmentSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes để tối ưu truy vấn
// Note: code đã có unique: true trong schema nên không cần tạo index lại
departmentSchema.index({ branchId: 1 });
departmentSchema.index({ status: 1 });
departmentSchema.index({ managerId: 1 });
departmentSchema.index({ branchId: 1, status: 1 });

export const DepartmentModel = mongoose.model("Department", departmentSchema);

