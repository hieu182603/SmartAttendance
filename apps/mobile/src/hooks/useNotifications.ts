import { useState, useEffect, useCallback, useMemo } from 'react';
import { Notification } from '../types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

// Mock notifications data

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.unread).length;
  }, [notifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { NotificationService } = await import('../services/notification.service');
      const data = await NotificationService.getAll();

      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications.map((item: any) => ({
          id: item._id || item.id,
          type: item.type,
          title: item.title,
          message: item.message,
          time: new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(item.createdAt).getTime(),
          icon: item.type === 'approved' || item.type === 'success' || item.type === 'request_approved' ? '✅' : item.type === 'rejected' || item.type === 'error' || item.type === 'request_rejected' ? '❌' : item.type === 'warning' || item.type === 'reminder' ? '⚠️' : 'ℹ️',
          unread: !item.isRead,
        })));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { NotificationService } = await import('../services/notification.service');
      await NotificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, unread: false } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const { NotificationService } = await import('../services/notification.service');
      await NotificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, unread: false }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const { NotificationService } = await import('../services/notification.service');
      await NotificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

