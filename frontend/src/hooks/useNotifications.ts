import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSocket } from './useSocket'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '@/services/notificationService'

export function useNotifications() {
  const socket = useSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Calculate unread count from notifications array (source of truth)
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length
  }, [notifications])

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getNotifications({ limit: 50 })
      setNotifications(data.notifications)
    } catch (error) {
      console.error('[useNotifications] loadNotifications error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return

    const handleNotification = (notification: Notification) => {
      // Add new notification to the beginning of the list
      setNotifications((prev) => [notification, ...prev])

      // Emit custom browser event để các màn hình khác (ví dụ: RequestsPage)
      // có thể lắng nghe và refetch dữ liệu liên quan mà không phụ thuộc trực tiếp vào hook này
      try {
        if (typeof window !== 'undefined' && notification.relatedEntityType === 'request') {
          const event = new CustomEvent('request-status-changed', {
            detail: notification,
          })
          window.dispatchEvent(event)
        }
      } catch {
        // Fail silently nếu môi trường không hỗ trợ CustomEvent (rất hiếm)
      }
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [socket])

  // Mark as read
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      )
    } catch (error) {
      console.error('[useNotifications] markAsRead error:', error)
    }
  }, [])

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('[useNotifications] markAllAsRead error:', error)
    }
  }, [])

  // Delete notification
  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id))
    } catch (error) {
      console.error('[useNotifications] deleteNotification error:', error)
    }
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
  }
}

