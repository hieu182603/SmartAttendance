import mongoose from "mongoose";

/**
 * Schema cho PerformanceReview (Đánh giá hiệu suất nhân viên)
 */
const performanceReviewSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      type: String,
      required: true,
      trim: true,
      // Format: "Q1 2025", "Q2 2025", "2025", etc.
    },
    reviewDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Điểm đánh giá theo từng category (0-100)
    categories: {
      technical: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      communication: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      teamwork: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      leadership: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      problemSolving: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },

    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Nội dung đánh giá
    achievements: [
      {
        type: String,
        trim: true,
      },
    ],
    improvements: [
      {
        type: String,
        trim: true,
      },
    ],
    comments: {
      type: String,
      trim: true,
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["draft", "pending", "completed"],
      default: "draft",
    },

    // Lịch sử
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
performanceReviewSchema.index({ employeeId: 1, period: -1 });
performanceReviewSchema.index({ reviewerId: 1, status: 1 });
performanceReviewSchema.index({ status: 1, reviewDate: -1 });
performanceReviewSchema.index({ period: 1 });

// Tính overall score tự động (trung bình các categories)
performanceReviewSchema.pre("save", function (next) {
  const categories = this.categories;
  const scores = [
    categories.technical,
    categories.communication,
    categories.teamwork,
    categories.leadership,
    categories.problemSolving,
  ];
  const validScores = scores.filter((score) => score > 0);
  
  if (validScores.length > 0) {
    this.overallScore = Math.round(
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length
    );
  }
  
  next();
});

export const PerformanceReviewModel = mongoose.model(
  "PerformanceReview",
  performanceReviewSchema
);

