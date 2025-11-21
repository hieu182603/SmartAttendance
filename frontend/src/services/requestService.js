import api from './api'

export const getMyRequests = async () => {
  try {
    const { data } = await api.get('/requests/my')
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.warn('[requests] fetch failed', error.message)
    return []
  }
}

export const createRequest = async (payload) => {
  const { data } = await api.post('/requests', payload)
  return data
}

export const getAllRequests = async (params = {}) => {
  try {
    const { data } = await api.get('/requests', { params })
    return data
  } catch (error) {
    console.warn('[requests] getAllRequests failed', error.message)
    return { requests: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export const approveRequest = async (id, comments = '') => {
  const { data } = await api.post(`/requests/${id}/approve`, { comments })
  return data
}

export const rejectRequest = async (id, comments = '') => {
  const { data } = await api.post(`/requests/${id}/reject`, { comments })
  return data
}

