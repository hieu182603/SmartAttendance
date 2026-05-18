import api from '@/services/api'
import type { User, ValidationError } from '@/types'
import type { PermissionType } from '@/utils/roles'

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
  position?: string
  branch?: string // ObjectId or empty string for null
  isActive?: boolean
  avatar?: string
  avatarUrl?: string
  taxId?: string
  defaultShiftId?: string
}

interface CreateUserByAdminData {
  email: string
  password: string
  name: string
  role: string
  department?: string
  position?: string
  branch?: string
  phone?: string
  taxId?: string
  defaultShiftId?: string
  isActive?: boolean
}

interface UpdateUserResponse {
  user: User
}

interface RolePermissionsResponse {
  rolePerms: Record<string, PermissionType[]>
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

export const deactivateUser = async (id: string): Promise<unknown> => {
  const { data } = await api.patch(`/users/${id}/deactivate`)
  return data
}

export const activateUser = async (id: string): Promise<unknown> => {
  const { data } = await api.patch(`/users/${id}/activate`)
  return data
}

export interface BulkImportResult {
  message: string
  created: Array<{ row: number; email: string; name: string }>
  failed: Array<{ row: number; email: string; reason: string }>
}

export const bulkImportUsers = async (file: File): Promise<BulkImportResult> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/users/bulk-import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data as BulkImportResult
}

export const downloadImportTemplate = async (): Promise<void> => {
  const res = await api.get('/users/import-template', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = 'import-template.xlsx'
  a.click()
  URL.revokeObjectURL(url)
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

export const getRolePermissions = async (): Promise<RolePermissionsResponse> => {
  const { data } = await api.get('/users/role-permissions')
  return data
}

export const updateRolePermissions = async (
  rolePerms: Record<string, PermissionType[]>
): Promise<RolePermissionsResponse> => {
  const { data } = await api.put('/users/role-permissions', { rolePerms })
  return data
}




