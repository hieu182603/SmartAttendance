import React, { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Check,
  X,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification as APINotification } from "@/services/notificationService";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  category: "attendance" | "leave" | "payroll" | "todo" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// Helper function to format time
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
};

// Map API notification type to UI type
const mapNotificationType = (
  type: APINotification["type"]
): Notification["type"] => {
  switch (type) {
    case "request_approved":
      return "success";
    case "request_rejected":
      return "error";
    case "attendance_reminder":
      return "warning";
    default:
      return "info";
  }
};

// Map API notification to UI notification
const mapNotification = (apiNotif: APINotification): Notification => {
  let category: Notification["category"] = "system";
  if (apiNotif.type === "request_approved" || apiNotif.type === "request_rejected") {
    category = "leave";
  } else if (apiNotif.type === "attendance_reminder") {
    category = "attendance";
  }

  return {
    id: apiNotif._id || apiNotif.id || "",
    type: mapNotificationType(apiNotif.type),
    category,
    title: apiNotif.title,
    message: apiNotif.message,
    time: formatTime(apiNotif.createdAt),
    read: apiNotif.isRead,
  };
};

const categoryIcon: Record<Notification["category"], LucideIcon> = {
  attendance: Clock,
  leave: Calendar,
  payroll: FileText,
  todo: AlertCircle,
  system: AlertCircle,
};

const typeColor: Record<Notification["type"], string> = {
  success: "var(--success)",
  error: "var(--error)",
  warning: "var(--warning)",
  info: "var(--accent-cyan)",
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onDelete,
  index,
}) => {
  const Icon = categoryIcon[notification.category] || Bell;
  const color = typeColor[notification.type] || typeColor.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 rounded-lg border transition-all cursor-pointer ${
        notification.read
          ? "bg-[var(--surface)] border-[var(--border)] opacity-60"
          : "bg-[var(--surface)] border-[var(--accent-cyan)] shadow-lg shadow-[var(--accent-cyan)]/10"
      }`}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm text-[var(--text-main)] pr-2">
              {notification.title}
            </h3>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] mt-1" />
            )}
          </div>
          <p className="text-xs text-[var(--text-sub)] mb-2 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-sub)]">
              {notification.time}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 hover:bg-[var(--error)]/10 hover:text-[var(--error)]"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(notification.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const {
    notifications: apiNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
  } = useNotifications();

  // Reload notifications when panel opens to ensure data is fresh
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Map API notifications to UI format
  const notifications = useMemo(
    () => apiNotifications.map(mapNotification),
    [apiNotifications]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-[var(--shell)] border-l border-[var(--border)] shadow-2xl z-50"
          >
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg text-[var(--text-main)]">
                        Thông báo
                      </h2>
                      <p className="text-xs text-[var(--text-sub)]">
                        {unreadCount} chưa đọc
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-[var(--surface)]"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5 text-[var(--text-sub)]" />
                  </Button>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-[var(--border)] text-[var(--accent-cyan)]"
                    onClick={markAllAsRead}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Đánh dấu tất cả đã đọc
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="text-center py-12 text-[var(--text-sub)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                    <p>Đang tải thông báo...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      index={index}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12 text-[var(--text-sub)]"
                  >
                    <div className="text-6xl mb-4">🔔</div>
                    <p>Không có thông báo mới</p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
