import api from '@/services/api'

interface LogParams {
  page?: number
  limit?: number
  search?: string
  action?: string
  status?: string
  category?: string
  userId?: string
  startDate?: string
  endDate?: string
}

interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: string
  action: string
  category: string
  resource: string
  description: string
  ipAddress: string
  status: 'success' | 'failed' | 'warning'
  metadata?: Record<string, unknown>
}

interface LogsResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface LogStats {
  total: number
  success: number
  failed: number
  warning: number
}

export const getAllLogs = async (params: LogParams = {}): Promise<LogsResponse> => {
  try {
    const { data } = await api.get('/logs', { params })
    return data as LogsResponse
  } catch (error) {
    console.warn('[logs] getAllLogs failed', (error as Error).message)
    return {
      logs: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    }
  }
}

export const getLogStats = async (params: { startDate?: string; endDate?: string } = {}): Promise<LogStats> => {
  try {
    const { data } = await api.get('/logs/stats', { params })
    return data as LogStats
  } catch (error) {
    console.warn('[logs] getLogStats failed', (error as Error).message)
    return {
      total: 0,
      success: 0,
      failed: 0,
      warning: 0,
    }
  }
}

export const getLogById = async (id: string): Promise<{ log: AuditLog }> => {
  try {
    const { data } = await api.get(`/logs/${id}`)
    return data as { log: AuditLog }
  } catch (error) {
    console.error('[logService] getLogById error:', error)
    throw error
  }
}

export type { AuditLog, LogParams, LogsResponse, LogStats }


