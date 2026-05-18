import api from '@/services/api'

interface LeaveParams {
  page?: number
  limit?: number
  status?: 'pending' | 'approved' | 'rejected'
  type?: string
  search?: string
  [key: string]: unknown
}

export interface LeaveBalance {
  id: string
  name: string
  total: number
  used: number
  remaining: number
  pending: number
  description: string
}

export interface LeaveRequest {
  id: string
  employeeId?: string
  employeeName?: string
  employeeEmail?: string
  department?: string
  branch?: string
  type: 'leave' | 'sick' | 'unpaid' | 'compensatory' | 'maternity'
  title: string
  startDate: string
  endDate: string
  duration: string
  reason: string
  description?: string
  status: 'pending' | 'approved' | 'rejected'
  urgency?: 'low' | 'medium' | 'high'
  submittedAt?: string
  approver?: string
  approvedAt?: string
  comments?: string
}

interface LeaveHistoryItem {
  id: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  approver: string | null
  approvedAt: string | null
}

interface LeaveRequestsResponse {
  requests: LeaveRequest[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface CreateLeaveRequestPayload {
  type: 'leave' | 'sick' | 'unpaid' | 'compensatory' | 'maternity'
  startDate: string
  endDate: string
  reason: string
  description?: string
  urgency?: 'low' | 'medium' | 'high'
}

export const getLeaveBalance = async (): Promise<LeaveBalance[]> => {
  try {
    const { data } = await api.get('/leave/balance')
    return data as LeaveBalance[]
  } catch (error) {
    console.warn('[leave] balance unavailable', (error as Error).message)
    return []
  }
}

export const getLeaveHistory = async (params: LeaveParams = {}): Promise<LeaveHistoryItem[]> => {
  try {
    const { data } = await api.get('/leave/history', { params })
    return data as LeaveHistoryItem[]
  } catch (error) {
    console.warn('[leave] history unavailable', (error as Error).message)
    return []
  }
}

export const createLeaveRequest = async (payload: CreateLeaveRequestPayload): Promise<LeaveRequest> => {
  try {
    const { data } = await api.post('/requests', payload)
    return data as LeaveRequest
  } catch (error) {
    console.error('[leave] create error', error)
    throw error
  }
}

export const getMyLeaveRequests = async (params: LeaveParams = {}): Promise<LeaveRequestsResponse> => {
  try {
    const { data } = await api.get('/requests/my', {
      params: {
        ...params,
        type: params.type || 'leave', // Filter chỉ lấy đơn nghỉ
      },
    })
    return data as LeaveRequestsResponse
  } catch (error) {
    console.warn('[leave] getMyLeaveRequests unavailable', (error as Error).message)
    return { requests: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export const getAllLeaveRequests = async (params: LeaveParams = {}): Promise<LeaveRequestsResponse> => {
  try {
    const { data } = await api.get('/requests', {
      params: {
        ...params,
        type: params.type || 'leave',
      },
    })
    return data as LeaveRequestsResponse
  } catch (error) {
    console.warn('[leave] getAllLeaveRequests unavailable', (error as Error).message)
    return { requests: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export const approveLeaveRequest = async (id: string, comments?: string): Promise<{ id: string; status: string; message: string }> => {
  try {
    const { data } = await api.patch(`/requests/${id}/approve`, { comments })
    return data as { id: string; status: string; message: string }
  } catch (error) {
    console.error('[leave] approve error', error)
    throw error
  }
}

export const rejectLeaveRequest = async (id: string, comments?: string): Promise<{ id: string; status: string; message: string }> => {
  try {
    const { data } = await api.patch(`/requests/${id}/reject`, { comments })
    return data as { id: string; status: string; message: string }
  } catch (error) {
    console.error('[leave] reject error', error)
    throw error
  }
}

