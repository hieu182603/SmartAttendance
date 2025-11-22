// Common types for the application

// User types
export interface User {
  _id: string
  id?: string
  name: string
  email: string
  role: string
  isVerified?: boolean
}

// API Response types
export interface ApiError {
  message: string
  errors?: Record<string, unknown>
}

export interface LoginResponse {
  token: string
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
}

// Error types
export interface ErrorWithMessage extends Error {
  message: string
  response?: {
    data?: {
      message?: string
    }
  }
}


