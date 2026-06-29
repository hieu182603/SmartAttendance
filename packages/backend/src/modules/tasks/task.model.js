import mongoose from "mongoose";

/**
 * Task Model - Giao và quản lý công việc cho nhân viên.
 * Vòng đời: assigned → in_progress → pending_review → completed | rejected
 */
const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:MM
    endTime: { type: String, required: true }, // HH:MM
 
    status: {
      type: String,
      enum: [
        "assigned",
        "in_progress",
        "pending_review",
        "completed",
        "rejected",
      ],
      default: "assigned",
    },

    employeeFeedback: {
      note: { type: String, default: "" },
      submittedAt: { type: Date, default: null },
    },

    managerReview: {
      decision: {
        type: String,
        enum: ["approved", "rejected"],
        default: null,
      },
      note: { type: String, default: "" },
      reviewedAt: { type: Date, default: null },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    requiresReview: {
      type: Boolean,
      default: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String },
        size: { type: Number },
      }
    ],
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, startDate: 1, endDate: 1 });
taskSchema.index({ companyId: 1, startDate: 1, endDate: 1 });

export const TaskModel = mongoose.model("Task", taskSchema);
