import { useEffect, useMemo, useState } from 'react'
import { getDashboardData } from '../services/dashboardService'
import type { AxiosRequestConfig } from 'axios'

interface DashboardSummary {
  shift: string | null
  location: string | null
  workingDays: string | number | { used: number; total: number } | null
}

interface AttendanceRecord {
  date?: string
  checkIn?: string
  checkOut?: string
  status?: string
  location?: string
}

interface PendingActions {
  hasPendingRequests: boolean
  hasUnreadNotifications: boolean
}

interface DashboardData {
  summary: DashboardSummary
  recentAttendance: AttendanceRecord[]
  pendingActions: PendingActions
}

const initialState: DashboardData = {
  summary: {
    shift: null,
    location: null,
    workingDays: null,
  },
  recentAttendance: [],
  pendingActions: {
    hasPendingRequests: false,
    hasUnreadNotifications: false,
  },
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData>(initialState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const config: AxiosRequestConfig = { signal: controller.signal }
        const dashboardData = await getDashboardData(config)
        setData((prev) => ({
          ...prev,
          ...dashboardData,
        }))
      } catch (err) {
        const error = err as Error & { name?: string; code?: string }
        if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          setError(error)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  return useMemo(
    () => ({
      ...data,
      loading,
      error,
    }),
    [data, loading, error],
  )
}




