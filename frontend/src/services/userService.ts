import api from './api'
import type { User, ValidationError } from '../types'
import type { AxiosRequestConfig } from 'axios'

interface UpdateUserData {
  name?: string
  phone?: string
  address?: string
  birthday?: string
  bankAccount?: string
  bankName?: string
}

interface UpdateUserResponse {
  user: User
}

export const updateUserProfile = async (userData: UpdateUserData): Promise<UpdateUserResponse> => {
  return (await api.put('/users/me', userData)).data
}

export const getUserProfile = async (): Promise<User> => {
  return (await api.get('/users/me')).data
}

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  return (await api.post('/users/change-password', {
    currentPassword,
    newPassword
  })).data
}

// Admin/HR Manager functions
export const getAllUsers = async (params: Record<string, unknown> = {}): Promise<unknown> => {
  try {
    const { data } = await api.get('/users', { params })
    return data
  } catch (error) {
    console.error('[userService] getAllUsers error:', error)
    throw error
  }
}

export const getUserById = async (id: string): Promise<unknown> => {
  try {
    const { data } = await api.get(`/users/${id}`)
    return data
  } catch (error) {
    console.error('[userService] getUserById error:', error)
    throw error
  }
}

export const updateUserByAdmin = async (id: string, userData: UpdateUserData): Promise<unknown> => {
  try {
    const { data } = await api.put(`/users/${id}`, userData)
    return data
  } catch (error) {
    console.error('[userService] updateUserByAdmin error:', error)
    // Nếu có validation errors từ backend, throw với message chi tiết
    const err = error as ValidationError
    if (err?.response?.data && typeof err.response.data === 'object') {
      const responseData = err.response.data as { errors?: { fieldErrors?: Record<string, string[]> } }
      if (responseData.errors) {
        const errors = responseData.errors
        const fieldErrors = errors.fieldErrors || {}
        // Lấy message đầu tiên từ field errors
        const firstErrorField = Object.keys(fieldErrors)[0]
        if (firstErrorField && fieldErrors[firstErrorField]?.[0]) {
          err.message = fieldErrors[firstErrorField][0]
        }
        // Lưu field errors để frontend có thể hiển thị
        err.fieldErrors = fieldErrors
      }
    }
    throw err
  }
}


