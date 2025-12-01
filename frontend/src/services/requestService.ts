import api from '@/services/api'


interface RequestParams {
  page?: number
  limit?: number
  status?: string
  type?: string
  search?: string
  [key: string]: unknown
}

interface Request {
  [key: string]: unknown
}

interface AllRequestsResponse {
  requests: Request[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface CreateRequestPayload {
  type: string
  startDate?: string
  endDate?: string
  reason?: string
  [key: string]: unknown
}

export const getMyRequests = async (params: RequestParams = {}): Promise<AllRequestsResponse> => {
  try {
    const { data } = await api.get('/requests/my', { params })
    // Backend trả về { requests: [...], pagination: {...} }
    // Hoặc có thể trả về array trực tiếp (backward compatibility)
    if (Array.isArray(data)) {
      return {
        requests: data,
        pagination: {
          page: 1,
          limit: data.length,
          total: data.length,
          totalPages: 1
        }
      }
    }
    return data as AllRequestsResponse
  } catch (error) {
    console.warn('[requests] fetch failed', (error as Error).message)
    return { requests: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export const createRequest = async (payload: CreateRequestPayload): Promise<unknown> => {
  const { data } = await api.post('/requests', payload)
  return data
}

export const getAllRequests = async (params: RequestParams = {}): Promise<AllRequestsResponse> => {
  try {
    const { data } = await api.get('/requests', { params })
    return data as AllRequestsResponse
  } catch (error) {
    console.warn('[requests] getAllRequests failed', (error as Error).message)
    return { requests: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export const approveRequest = async (id: string, comments = ''): Promise<unknown> => {
  const { data } = await api.post(`/requests/${id}/approve`, { comments })
  return data
}

export const rejectRequest = async (id: string, comments = ''): Promise<unknown> => {
  const { data } = await api.post(`/requests/${id}/reject`, { comments })
  return data
}

export interface RequestType {
  value: string
  label: string
}

export const getRequestTypes = async (): Promise<{ types: RequestType[] }> => {
  try {
    const { data } = await api.get('/requests/types')
    return data
  } catch (error) {
    console.warn('[requests] getRequestTypes failed', (error as Error).message)
    return { types: [] }
  }
}




