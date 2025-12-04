import { NotificationModel } from "./notification.model.js";
import { emitNotification } from "../../config/socket.js";

export class NotificationService {
  static async createNotification(data) {
    const notification = await NotificationModel.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      metadata: data.metadata || {},
    });

    // Emit real-time notification via Socket.io
    try {
      emitNotification(data.userId, {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedEntityType: notification.relatedEntityType,
        relatedEntityId: notification.relatedEntityId,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      });
    } catch (error) {
      console.error("[NotificationService] Error emitting notification:", error);
      // Don't fail if socket emit fails
    }

    return notification;
  }

  static async createRequestApprovalNotification(request, approverName, isApproved, comments) {
    const notification = await NotificationModel.create({
      userId: request.userId,
      type: isApproved ? "request_approved" : "request_rejected",
      title: isApproved
        ? "✅ Yêu cầu đã được phê duyệt"
        : "❌ Yêu cầu đã bị từ chối",
      message: isApproved
        ? `Yêu cầu "${request.reason.substring(0, 50)}${request.reason.length > 50 ? "..." : ""}" đã được ${approverName} phê duyệt.${comments ? `\n\nNhận xét: ${comments}` : ""}`
        : `Yêu cầu "${request.reason.substring(0, 50)}${request.reason.length > 50 ? "..." : ""}" đã bị ${approverName} từ chối.${comments ? `\n\nLý do: ${comments}` : ""}`,
      relatedEntityType: "request",
      relatedEntityId: request._id,
      metadata: {
        requestType: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        approverName,
        comments,
      },
    });
    return notification;
  }

  static async getUserNotifications(userId, options = {}) {
    const { limit = 50, skip = 0, isRead } = options;
    const query = { userId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return notifications;
  }

  static async markAsRead(notificationId, userId) {
    const notification = await NotificationModel.findOne({
      _id: notificationId,
      userId,
    });
    if (!notification) {
      throw new Error("Notification not found");
    }
    return notification.markAsRead();
  }

  static async markAllAsRead(userId) {
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  }

  static async getUnreadCount(userId) {
    return NotificationModel.countDocuments({ userId, isRead: false });
  }

  /**
   * Create and emit notification (convenience method)
   */
  static async createAndEmitNotification(data) {
    return this.createNotification(data);
  }
}

