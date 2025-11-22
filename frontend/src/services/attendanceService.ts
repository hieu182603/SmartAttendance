import api from './api'
import type { AxiosRequestConfig } from 'axios'

interface AttendanceParams {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  [key: string]: unknown
}

interface AttendanceRecord {
  [key: string]: unknown
}

interface AnalyticsSummary {
  attendanceRate: number
  avgPresent: number
  avgLate: number
  avgAbsent: number
  trend: number
}

interface AttendanceAnalytics {
  dailyData: unknown[]
  departmentStats: unknown[]
  topPerformers: unknown[]
  summary: AnalyticsSummary
}

interface AllAttendanceResponse {
  records: AttendanceRecord[]
  summary: {
    total: number
    present: number
    late: number
    absent: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const getAttendanceHistory = async (params: AttendanceParams = {}): Promise<AttendanceRecord[]> => {
  try {
    const { data } = await api.get('/attendance/history', { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.warn('[attendance] history unavailable', (error as Error).message)
    return []
  }
}

export const getAttendanceAnalytics = async (params: AttendanceParams = {}): Promise<AttendanceAnalytics> => {
  try {
    const { data } = await api.get('/attendance/analytics', { params })
    return data as AttendanceAnalytics
  } catch (error) {
    console.warn('[attendance] analytics unavailable', (error as Error).message)
    return {
      dailyData: [],
      departmentStats: [],
      topPerformers: [],
      summary: { attendanceRate: 0, avgPresent: 0, avgLate: 0, avgAbsent: 0, trend: 0 }
    }
  }
}

export const getAllAttendance = async (params: AttendanceParams = {}): Promise<AllAttendanceResponse> => {
  try {
    const { data } = await api.get('/attendance/all', { params })
    return data as AllAttendanceResponse
  } catch (error) {
    console.warn('[attendance] getAllAttendance unavailable', (error as Error).message)
    return { records: [], summary: { total: 0, present: 0, late: 0, absent: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export const exportAttendanceAnalytics = async (params: AttendanceParams = {}): Promise<{ success: boolean; fileName: string }> => {
  try {
    const response = await api.get('/attendance/analytics/export', {
      params,
      responseType: 'blob'
    } as AxiosRequestConfig)

    const blob = new Blob([response.data as BlobPart], {
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




