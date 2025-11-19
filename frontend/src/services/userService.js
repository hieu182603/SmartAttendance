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

