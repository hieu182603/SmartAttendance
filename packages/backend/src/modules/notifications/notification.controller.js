import { NotificationService } from "./notification.service.js";

export class NotificationController {
  /**
   * GET /api/notifications
   * Lấy danh sách thông báo của user
   */
  static async getNotifications(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, isRead } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const notifications = await NotificationService.getUserNotifications(userId, {
        limit: parseInt(limit),
        skip,
        isRead: isRead !== undefined ? isRead === "true" : undefined,
      });

      const total = await NotificationService.getUnreadCount(userId);

      res.json({
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
        },
      });
    } catch (error) {
      console.error("[notifications] getNotifications error:", error);
      res.status(500).json({ message: error.message || "Không lấy được thông báo" });
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Lấy số lượng thông báo chưa đọc
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.userId;
      const count = await NotificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("[notifications] getUnreadCount error:", error);
      res.status(500).json({ message: error.message || "Không lấy được số lượng" });
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Đánh dấu thông báo đã đọc
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      await NotificationService.markAsRead(id, userId);
      res.json({ message: "Đã đánh dấu đã đọc" });
    } catch (error) {
      console.error("[notifications] markAsRead error:", error);
      if (error.message === "Notification not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không đánh dấu được" });
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Đánh dấu tất cả thông báo đã đọc
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.userId;
      await NotificationService.markAllAsRead(userId);
      res.json({ message: "Đã đánh dấu tất cả đã đọc" });
    } catch (error) {
      console.error("[notifications] markAllAsRead error:", error);
      res.status(500).json({ message: error.message || "Không đánh dấu được" });
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Xóa thông báo
   */
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { NotificationModel } = await import("./notification.model.js");
      
      const notification = await NotificationModel.findOne({
        _id: id,
        userId,
      });

      if (!notification) {
        return res.status(404).json({ message: "Không tìm thấy thông báo" });
      }

      await NotificationModel.findByIdAndDelete(id);
      res.json({ message: "Đã xóa thông báo" });
    } catch (error) {
      console.error("[notifications] deleteNotification error:", error);
      res.status(500).json({ message: error.message || "Không xóa được thông báo" });
    }
  }
}






