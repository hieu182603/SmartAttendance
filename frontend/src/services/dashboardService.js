import api from './api'

const parse = (response, fallback) => {
  if (!response || typeof response !== 'object') return fallback
  return response
}

export const getDashboardSummary = async (config = {}) => {
  try {
    const { data } = await api.get('/dashboard/summary', config)
    return parse(data, {
      shift: null,
      location: null,
      workingDays: null,
    })
  } catch (error) {
    console.warn('[dashboard] summary unavailable', error.message)
    return {
      shift: null,
      location: null,
      workingDays: null,
    }
  }
}

export const getRecentAttendance = async (config = {}) => {
  try {
    const { data } = await api.get('/attendance/recent', config)
    if (!Array.isArray(data)) return []
    return data
  } catch (error) {
    console.warn('[dashboard] recent attendance unavailable', error.message)
    return []
  }
}

export const getPendingActions = async (config = {}) => {
  try {
    const { data } = await api.get('/dashboard/pending-actions', config)
    return parse(data, {
      hasPendingRequests: false,
      hasUnreadNotifications: false,
    })
  } catch (error) {
    console.warn('[dashboard] pending actions unavailable', error.message)
    return {
      hasPendingRequests: false,
      hasUnreadNotifications: false,
    }
  }
}

export const getDashboardData = async (config = {}) => {
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

export const getLeaveBalance = async (config = {}) => {
  try {
    const { data } = await api.get('/leave/balance', config)
    if (!Array.isArray(data)) return []
    return data
  } catch (error) {
    console.warn('[leave] balance unavailable', error.message)
    return []
  }
}

export const getLeaveHistory = async (config = {}) => {
  try {
    const { data } = await api.get('/leave/history', config)
    if (!Array.isArray(data)) return []
    return data
  } catch (error) {
    console.warn('[leave] history unavailable', error.message)
    return []
  }
}

export const getDashboardStats = async (config = {}) => {
  try {
    const { data } = await api.get('/dashboard/stats', config)
    return data
  } catch (error) {
    console.error('[dashboard] stats error:', error)
    throw error
  }
}


