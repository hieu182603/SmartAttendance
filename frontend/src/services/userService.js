import api from './api'

export const updateUserProfile = async (userData) => {
  return (await api.put('/users/me', userData)).data
}

export const getUserProfile = async () => {
  return (await api.get('/users/me')).data
}

export const changePassword = async (currentPassword, newPassword) => {
  return (await api.post('/users/change-password', {
    currentPassword,
    newPassword
  })).data
}

// Admin/HR Manager functions
export const getAllUsers = async (params = {}) => {
  try {
    const { data } = await api.get('/users', { params })
    return data
  } catch (error) {
    console.error('[userService] getAllUsers error:', error)
    throw error
  }
}

export const getUserById = async (id) => {
  try {
    const { data } = await api.get(`/users/${id}`)
    return data
  } catch (error) {
    console.error('[userService] getUserById error:', error)
    throw error
  }
}

export const updateUserByAdmin = async (id, userData) => {
  try {
    const { data } = await api.put(`/users/${id}`, userData)
    return data
  } catch (error) {
    console.error('[userService] updateUserByAdmin error:', error)
    throw error
  }
}

