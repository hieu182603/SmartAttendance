import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useFaviconBadge } from '@/hooks/useFaviconBadge'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '@/services/notificationService'

// Create context for notifications
interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  loadNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { setBadge } = useFaviconBadge()

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length
  }, [notifications])

  // Update favicon badge when unreadCount changes
  useEffect(() => {
    if (unreadCount > 0) {
      setBadge(unreadCount)
    } else {
      setBadge(null)
    }
  }, [unreadCount, setBadge])

  const loadNotifications = useCallback(async () => {
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('sa_token')
    if (!token) {
      setLoading(false)
      setNotifications([])
      return
    }

    try {
      setLoading(true)
      const data = await getNotifications({ limit: 50 })
      setNotifications(data.notifications)
    } catch (error) {
      console.error('[useNotifications] loadNotifications error:', error)
      // If 401 error, clear notifications (user logged out)
      const err = error as Error & { response?: { status?: number } }
      if (err.response?.status === 401) {
        setNotifications([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only load notifications if user is authenticated
    const token = localStorage.getItem('sa_token')
    if (token) {
      loadNotifications()
    } else {
      setLoading(false)
      setNotifications([])
    }
  }, [loadNotifications])

  // Listen for token changes (login/logout) to reload notifications
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sa_token') {
        if (e.newValue) {
          // Token was added (user logged in)
          loadNotifications()
        } else {
          // Token was removed (user logged out)
          setNotifications([])
          setLoading(false)
        }
      }
    }

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom events (from same tab)
    const handleTokenChange = () => {
      const token = localStorage.getItem('sa_token')
      if (token) {
        loadNotifications()
      } else {
        setNotifications([])
        setLoading(false)
      }
    }

    window.addEventListener('auth-token-changed', handleTokenChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-token-changed', handleTokenChange)
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!socket) return

    const handleNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev])

      try {
        if (typeof window !== 'undefined') {
          if (notification.relatedEntityType === 'request') {
            const event = new CustomEvent('request-status-changed', {
              detail: notification,
            })
            window.dispatchEvent(event)
          } else if (notification.relatedEntityType === 'payroll') {
            const event = new CustomEvent('payroll-status-changed', {
              detail: notification,
            })
            window.dispatchEvent(event)
          }
        }
      } catch {
      }
    }

    const handleAttendanceUpdate = (data: any) => {
      try {
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('attendance-updated', {
            detail: data,
          })
          window.dispatchEvent(event)
        }
      } catch {
      }
    }

    const handlePayrollUpdate = (data: any) => {
      try {
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('payroll-updated', {
            detail: data,
          })
          window.dispatchEvent(event)
        }
      } catch {
      }
    }

    socket.on('notification', handleNotification)
    socket.on('attendance-updated', handleAttendanceUpdate)
    socket.on('payroll-updated', handlePayrollUpdate)

    return () => {
      socket.off('notification', handleNotification)
      socket.off('attendance-updated', handleAttendanceUpdate)
      socket.off('payroll-updated', handlePayrollUpdate)
    }
  }, [socket])

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

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

// Hook to use notifications context
export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

