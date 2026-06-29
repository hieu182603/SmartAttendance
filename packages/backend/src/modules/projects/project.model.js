import mongoose from "mongoose";

/**
 * Project Model - Nhóm các công việc (task) theo dự án trong một công ty.
 */
const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
    },
    members: [{ type: String, trim: true }], // Tên hiển thị của thành viên

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

projectSchema.index({ companyId: 1, createdAt: -1 });

export const ProjectModel = mongoose.model("Project", projectSchema);
