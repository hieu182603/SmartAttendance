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
    // Normalized position key for case-insensitive matching
    positionKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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

// Partial unique index: only apply uniqueness constraint to active records
// Partial unique index: only apply uniqueness constraint to active records (using positionKey for normalized matching)
// Normalize positionKey before saving
salaryMatrixSchema.pre("save", function (next) {
  // Normalize positionKey when position is set/modified OR when positionKey is missing
  // This handles both new records and legacy records being updated
  if (this.isModified("position") || !this.positionKey) {
    this.positionKey = this.position ? this.position.trim().toLowerCase() : null;
  }
  next();
});

salaryMatrixSchema.index(
  { departmentCode: 1, positionKey: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
salaryMatrixSchema.index({ departmentCode: 1, isActive: 1 });
// Index for positionKey lookups
salaryMatrixSchema.index({ positionKey: 1 });

salaryMatrixSchema.virtual("key").get(function () {
  return `${this.departmentCode}:${this.position}`;
});

export const SalaryMatrixModel = mongoose.model("SalaryMatrix", salaryMatrixSchema);

