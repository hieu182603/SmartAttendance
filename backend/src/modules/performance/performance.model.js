import mongoose from "mongoose";

/**
 * Schema đánh giá hiệu suất nhân viên
 */
const performanceReviewSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      type: String,
      required: true,
      trim: true,
    },
    reviewDate: {
      type: Date,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "draft", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    categories: {
      technical: { type: Number, min: 0, max: 100, default: 0 },
      communication: { type: Number, min: 0, max: 100, default: 0 },
      teamwork: { type: Number, min: 0, max: 100, default: 0 },
      leadership: { type: Number, min: 0, max: 100, default: 0 },
      problemSolving: { type: Number, min: 0, max: 100, default: 0 },
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    achievements: [{ type: String, trim: true }],
    improvements: [{ type: String, trim: true }],
    comments: {
      type: String,
      trim: true,
    },
    // Audit log
    history: [
      {
        action: {
          type: String,
          enum: ["created", "updated", "approved", "rejected"],
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        at: {
          type: Date,
          default: Date.now,
        },
        changes: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
performanceReviewSchema.index({ employeeId: 1, period: 1 });
performanceReviewSchema.index({ status: 1 });

// Method để tính điểm tổng quan
performanceReviewSchema.methods.calculateOverallScore = function () {
  const { technical, communication, teamwork, leadership, problemSolving } =
    this.categories;
  this.overallScore = Math.round(
    (technical + communication + teamwork + leadership + problemSolving) / 5
  );
  return this.overallScore;
};

// Tự động tính điểm tổng quan khi save
performanceReviewSchema.pre("save", function (next) {
  this.calculateOverallScore();
  next();
});

// Tự động tính điểm tổng quan khi update
performanceReviewSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.categories || update.$set?.categories) {
    const categories = update.categories || update.$set.categories;
    const { technical, communication, teamwork, leadership, problemSolving } =
      categories;
    const overallScore = Math.round(
      (technical + communication + teamwork + leadership + problemSolving) / 5
    );
    this.set({ overallScore });
  }
  next();
});

export const PerformanceReviewModel = mongoose.model(
  "PerformanceReview",
  performanceReviewSchema
);
