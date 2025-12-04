import express from "express";
import { NotificationController } from "./notification.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

export const notificationRouter = express.Router();

// Tất cả routes đều cần authentication
notificationRouter.use(authMiddleware);

// GET /api/notifications - Lấy danh sách thông báo
notificationRouter.get("/", NotificationController.getNotifications);

// GET /api/notifications/unread-count - Lấy số lượng chưa đọc
notificationRouter.get("/unread-count", NotificationController.getUnreadCount);

// PUT /api/notifications/:id/read - Đánh dấu đã đọc
notificationRouter.put("/:id/read", NotificationController.markAsRead);

// PUT /api/notifications/read-all - Đánh dấu tất cả đã đọc
notificationRouter.put("/read-all", NotificationController.markAllAsRead);

// DELETE /api/notifications/:id - Xóa thông báo
notificationRouter.delete("/:id", NotificationController.deleteNotification);

