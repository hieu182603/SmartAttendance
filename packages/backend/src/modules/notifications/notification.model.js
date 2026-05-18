import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "request_approved",
        "request_rejected",
        "request_created",
        "attendance_reminder",
        "attendance_updated",
        "performance_review_approved",
        "performance_review_rejected",
        "shift_assigned",
        "shift_removed",
        "shift_updated",
        "system",
        "other"
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedEntityType: {
      type: String,
      enum: ["request", "attendance", "user", "performance_review", "shift", "other"],
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

export const NotificationModel = mongoose.model("Notification", notificationSchema);

