import React, { useMemo, useState } from "react";
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

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  category: "attendance" | "leave" | "payroll" | "todo" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "warning",
    category: "attendance",
    title: "Nhắc nhở check-out",
    message: "Bạn chưa check-out hôm nay. Vui lòng check-out trước 18:00",
    time: "5 phút trước",
    read: false,
  },
  {
    id: "2",
    type: "success",
    category: "leave",
    title: "Yêu cầu được duyệt",
    message: "Yêu cầu nghỉ phép ngày 30/10 đã được quản lý phê duyệt",
    time: "1 giờ trước",
    read: false,
  },
  {
    id: "3",
    type: "info",
    category: "payroll",
    title: "Bảng lương tháng 10",
    message: "Bảng lương tháng 10 đã được tính. Vui lòng kiểm tra",
    time: "2 giờ trước",
    read: true,
  },
  {
    id: "4",
    type: "info",
    category: "todo",
    title: "Deadline sắp tới",
    message: 'Công việc "Hoàn thành báo cáo tháng" sẽ hết hạn vào ngày mai',
    time: "3 giờ trước",
    read: true,
  },
];

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
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
                {notifications.length > 0 ? (
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
