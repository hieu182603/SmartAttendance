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

