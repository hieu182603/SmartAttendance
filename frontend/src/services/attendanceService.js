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

export const getAttendanceAnalytics = async (params = {}) => {
  try {
    const { data } = await api.get('/attendance/analytics', { params })
    return data
  } catch (error) {
    console.warn('[attendance] analytics unavailable', error.message)
    return {
      dailyData: [],
      departmentStats: [],
      topPerformers: [],
      summary: { attendanceRate: 0, avgPresent: 0, avgLate: 0, avgAbsent: 0, trend: 0 }
    }
  }
}

export const getAllAttendance = async (params = {}) => {
  try {
    const { data } = await api.get('/attendance/all', { params })
    return data
  } catch (error) {
    console.warn('[attendance] getAllAttendance unavailable', error.message)
    return { records: [], summary: { total: 0, present: 0, late: 0, absent: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export const exportAttendanceAnalytics = async (params = {}) => {
  try {
    const response = await api.get('/attendance/analytics/export', {
      params,
      responseType: 'blob'
    })

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const contentDisposition = response.headers['content-disposition']
    let fileName = `BaoCaoPhanTichChamCong_${new Date().toISOString().split('T')[0]}.xlsx`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (fileNameMatch) {
        fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''))
      }
    }

    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    return { success: true, fileName }
  } catch (error) {
    console.error('[attendance] export error', error)
    throw error
  }
}

