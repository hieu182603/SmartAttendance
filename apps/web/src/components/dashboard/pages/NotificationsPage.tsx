import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, Clock, Calendar, AlertCircle, CheckCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import * as notificationService from '@/services/notificationService'
import type { Notification } from '@/services/notificationService'

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'request_approved': return Calendar
    case 'request_rejected': return AlertCircle
    case 'attendance_reminder': return Clock
    default: return Bell
  }
}

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'request_approved': return 'var(--success)'
    case 'request_rejected': return 'var(--error)'
    case 'attendance_reminder': return 'var(--warning)'
    default: return 'var(--accent-cyan)'
  }
}

const ITEMS_PER_PAGE = 15

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchNotifications = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await notificationService.getNotifications({ page: p, limit: ITEMS_PER_PAGE })
      setNotifications(res.notifications)
      setTotal(res.pagination.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(page)
  }, [page, fetchNotifications])

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
    } catch {
      // silent
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {
      // silent
    } finally {
      setMarkingAll(false)
    }
  }

  const handleItemClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id)
    }
    if (notification.relatedEntityType === 'request') {
      navigate('../../requests', { relative: 'path' })
    } else if (notification.relatedEntityType === 'attendance') {
      navigate('../../history', { relative: 'path' })
    } else if (notification.relatedEntityType === 'payroll') {
      navigate('../../my-payslip', { relative: 'path' })
    }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const hasUnread = notifications.some(n => !n.isRead)

  return (
    <Card className="border-[var(--border)] bg-[var(--surface)]">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-[var(--text-main)]">{t('notifications.title')}</CardTitle>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="gap-1.5 text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markingAll ? 'Đang xử lý...' : t('notifications.markAsRead')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] animate-pulse">
                <div className="h-9 w-9 rounded-lg flex-shrink-0 bg-[var(--border)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
                  <div className="h-3 w-full rounded bg-[var(--border)]" />
                  <div className="h-3 w-1/4 rounded bg-[var(--border)]" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="rounded-full bg-[var(--warning)]/15 p-4 text-[var(--warning)]">
              <Bell className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[var(--text-main)]">{t('notifications.noNotifications')}</p>
              <p className="text-sm text-[var(--text-sub)]">{t('notifications.description')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              const color = getNotificationColor(notification.type)
              return (
                <div
                  key={notification._id}
                  className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-[var(--surface-hover,_var(--border))]/30 ${
                    !notification.isRead ? 'bg-[var(--accent-cyan)]/5' : ''
                  }`}
                  onClick={() => handleItemClick(notification)}
                >
                  <div
                    className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${notification.isRead ? 'text-[var(--text-sub)]' : 'text-[var(--text-main)] font-medium'}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-[var(--accent-cyan)] flex-shrink-0" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-sub)] line-clamp-2">{notification.message}</p>
                    <p className="mt-1 text-xs text-[var(--text-sub)]/60">{formatTime(notification.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <p className="text-xs text-[var(--text-sub)]">
              Trang {page}/{totalPages} · {total} thông báo
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="text-xs"
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="text-xs"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationsPage
