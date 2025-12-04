import api from '@/services/api'

export interface Notification {
  _id: string
  id?: string
  userId: string
  type: 'request_approved' | 'request_rejected' | 'attendance_reminder' | 'system' | 'other'
  title: string
  message: string
  relatedEntityType?: 'request' | 'attendance' | 'user' | 'other'
  relatedEntityId?: string
  isRead: boolean
  readAt?: string
  createdAt: string
  metadata?: Record<string, any>
}

export interface NotificationsResponse {
  notifications: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export interface UnreadCountResponse {
  count: number
}

/**
 * Get user notifications
 */
export const getNotifications = async (params: {
  page?: number
  limit?: number
  isRead?: boolean
} = {}): Promise<NotificationsResponse> => {
  try {
    const { data } = await api.get('/notifications', { params })
    return data
  } catch (error) {
    console.error('[notificationService] getNotifications error:', error)
    throw error
  }
}

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const { data } = await api.get<UnreadCountResponse>('/notifications/unread-count')
    return data.count
  } catch (error) {
    console.error('[notificationService] getUnreadCount error:', error)
    throw error
  }
}

/**
 * Mark notification as read
 */
export const markAsRead = async (id: string): Promise<{ message: string }> => {
  try {
    const { data } = await api.put(`/notifications/${id}/read`)
    return data
  } catch (error) {
    console.error('[notificationService] markAsRead error:', error)
    throw error
  }
}

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<{ message: string }> => {
  try {
    const { data } = await api.put('/notifications/read-all')
    return data
  } catch (error) {
    console.error('[notificationService] markAllAsRead error:', error)
    throw error
  }
}

/**
 * Delete notification
 */
export const deleteNotification = async (id: string): Promise<{ message: string }> => {
  try {
    const { data } = await api.delete(`/notifications/${id}`)
    return data
  } catch (error) {
    console.error('[notificationService] deleteNotification error:', error)
    throw error
  }
}





