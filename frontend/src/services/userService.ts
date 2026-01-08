import api from '@/services/api'
import type { User, ValidationError } from '@/types'
import type { AxiosRequestConfig } from 'axios'

interface UpdateUserData {
  name?: string
  phone?: string
  address?: string
  birthday?: string
  bankAccount?: string
  bankName?: string
}

interface UpdateUserByAdminData {
  name?: string
  email?: string
  phone?: string
  role?: string
  department?: string // ObjectId or empty string for null
  branch?: string // ObjectId or empty string for null
  isActive?: boolean
  avatar?: string
  avatarUrl?: string
  defaultShiftId?: string
}

interface CreateUserByAdminData {
  email: string
  password: string
  name: string
  role: string
  department?: string
  branch?: string
  phone?: string
  defaultShiftId?: string
  isActive?: boolean
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

export const uploadAvatar = async (file: File): Promise<UpdateUserResponse> => {
  const formData = new FormData()
  formData.append('avatar', file)
  
  return (await api.post('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
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

export const updateUserByAdmin = async (id: string, userData: UpdateUserByAdminData): Promise<unknown> => {
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

export const createUserByAdmin = async (userData: CreateUserByAdminData): Promise<unknown> => {
  try {
    const { data } = await api.post('/users', userData)
    return data
  } catch (error) {
    console.error('[userService] createUserByAdmin error:', error)
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




