import api from '@/services/api'
import type { AxiosRequestConfig } from 'axios'

interface DashboardSummary {
  shift: string | null
  location: string | null
  workingDays: string | number | { used: number; total: number } | null
}

interface PendingActions {
  hasPendingRequests: boolean
  hasUnreadNotifications: boolean
}

interface AttendanceRecord {
  date?: string
  checkIn?: string
  checkOut?: string
  status?: string
  location?: string
}

const parse = <T>(response: unknown, fallback: T): T => {
  if (!response || typeof response !== 'object') return fallback
  return response as T
}

export const getDashboardSummary = async (config: AxiosRequestConfig = {}): Promise<DashboardSummary> => {
  try {
    const { data } = await api.get('/dashboard/summary', config)
    return parse<DashboardSummary>(data, {
      shift: null,
      location: null,
      workingDays: null,
    })
  } catch (error) {
    console.warn('[dashboard] summary unavailable', (error as Error).message)
    return {
      shift: null,
      location: null,
      workingDays: null,
    }
  }
}

export const getRecentAttendance = async (config: AxiosRequestConfig = {}): Promise<AttendanceRecord[]> => {
  try {
    const { data } = await api.get('/attendance/recent', config)
    if (!Array.isArray(data)) return []
    return data as AttendanceRecord[]
  } catch (error) {
    console.warn('[dashboard] recent attendance unavailable', (error as Error).message)
    return []
  }
}

export const getPendingActions = async (config: AxiosRequestConfig = {}): Promise<PendingActions> => {
  try {
    const { data } = await api.get('/dashboard/pending-actions', config)
    return parse<PendingActions>(data, {
      hasPendingRequests: false,
      hasUnreadNotifications: false,
    })
  } catch (error) {
    console.warn('[dashboard] pending actions unavailable', (error as Error).message)
    return {
      hasPendingRequests: false,
      hasUnreadNotifications: false,
    }
  }
}

export const getDashboardData = async (config: AxiosRequestConfig = {}): Promise<{
  summary: DashboardSummary
  recentAttendance: AttendanceRecord[]
  pendingActions: PendingActions
}> => {
  const axiosConfig = config || {}
  const [summary, recentAttendance, pendingActions] = await Promise.all([
    getDashboardSummary(axiosConfig),
    getRecentAttendance(axiosConfig),
    getPendingActions(axiosConfig),
  ])

  return {
    summary,
    recentAttendance,
    pendingActions,
  }
}

export const getLeaveBalance = async (config: AxiosRequestConfig = {}): Promise<unknown[]> => {
  try {
    const { data } = await api.get('/leave/balance', config)
    if (!Array.isArray(data)) return []
    return data
  } catch (error) {
    console.warn('[leave] balance unavailable', (error as Error).message)
    return []
  }
}

export const getLeaveHistory = async (config: AxiosRequestConfig = {}): Promise<unknown[]> => {
  try {
    const { data } = await api.get('/leave/history', config)
    if (!Array.isArray(data)) return []
    return data
  } catch (error) {
    console.warn('[leave] history unavailable', (error as Error).message)
    return []
  }
}

export const getDashboardStats = async (config: AxiosRequestConfig = {}): Promise<unknown> => {
  try {
    const { data } = await api.get('/dashboard/stats', config)
    return data
  } catch (error) {
    console.error('[dashboard] stats error:', error)
    throw error
  }
}




