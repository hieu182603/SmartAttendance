import api from './api'

export const getAttendanceHistory = async (params = {}) => {
  try {
    const { data } = await api.get('/attendance/history', { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.warn('[attendance] history unavailable', error.message)
    return []
  }
}

