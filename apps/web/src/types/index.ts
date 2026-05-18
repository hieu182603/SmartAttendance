// Common types for the application

// User types
export interface User {
  _id: string
  id?: string
  userId?: string
  name: string
  email: string
  role: string
  isVerified?: boolean
  isActive?: boolean
  avatar?: string
  avatarUrl?: string
  phone?: string
  address?: string
  birthday?: string
  position?: string
  department?: string | { _id: string; name: string; code?: string }
  branchId?: string | { _id: string; name: string }
  defaultShiftId?: string | { _id: string; name: string }
  createdAt?: string
  bankAccount?: string
  bankName?: string
  taxId?: string
  leaveBalance?: {
    annual?: {
      used: number
      total: number
    }
  }
}

// API Response types
export interface ApiError {
  message: string
  errors?: Record<string, unknown>
}

export interface LoginResponse {
  token: string
  refreshToken?: string
  user: User
}

export interface RegisterResponse {
  message: string
  userId: string
  email: string
}

export interface VerifyOtpResponse {
  message: string
  token: string
  user: User
}

export interface VerifyResetOtpResponse {
  success: boolean
  message?: string
  resetToken?: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message?: string
}

export interface ResetPasswordResponse {
  success: boolean
  message?: string
}

export interface ResendOtpResponse {
  message: string
}

// Location state types for React Router
export interface LocationState {
  email?: string
  purpose?: 'register' | 'reset'
  resetToken?: string
}

export interface ValidationError {
  message?: string
  fieldErrors?: Record<string, string | string[]>
  response?: {
    status?: number
    data?: {
      message?: string
      errors?: Record<string, string>
    }
  }
}

// Error types
export interface ErrorWithMessage extends Error {
  message: string
  response?: {
    status?: number
    data?: {
      message?: string
    }
  }
}




