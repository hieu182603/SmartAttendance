import { useEffect, useMemo, useState } from 'react'
import { getDashboardData } from '../services/dashboardService'

const initialState = {
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
  const [data, setData] = useState(initialState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const dashboardData = await getDashboardData({ signal: controller.signal })
        setData((prev) => ({
          ...prev,
          ...dashboardData,
        }))
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          setError(err)
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


