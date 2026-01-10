import mongoose from "mongoose";

const salaryMatrixSchema = new mongoose.Schema(
  {
    departmentCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

salaryMatrixSchema.index({ departmentCode: 1, position: 1 }, { unique: true });
salaryMatrixSchema.index({ departmentCode: 1, isActive: 1 });

salaryMatrixSchema.virtual("key").get(function () {
  return `${this.departmentCode}:${this.position}`;
});

export const SalaryMatrixModel = mongoose.model("SalaryMatrix", salaryMatrixSchema);

