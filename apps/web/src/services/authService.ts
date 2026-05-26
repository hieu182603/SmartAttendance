import api from '@/services/api'
import type { LoginResponse, RegisterResponse, VerifyOtpResponse, VerifyResetOtpResponse, ForgotPasswordResponse, ResetPasswordResponse, ResendOtpResponse, User } from '@/types'
export const register = async (data: { name: string; email: string; password: string }): Promise<RegisterResponse> => {
    return (await api.post('/auth/register', data)).data
}

export const verifyOtp = async ({ email, otp }: { email: string; otp: string }): Promise<VerifyOtpResponse> => {
    return (await api.post('/auth/verify-otp', { email, otp })).data
}

export const resendOtp = async ({ email }: { email: string }): Promise<ResendOtpResponse> => {
    return (await api.post('/auth/resend-otp', { email })).data
}

export const login = async ({ email, password }: { email: string; password: string }): Promise<LoginResponse> => {
    return (await api.post('/auth/login', { email, password })).data
}

export const getMe = async (): Promise<User> => {
    return (await api.get('/auth/me')).data
}

export const forgotPassword = async ({ email }: { email: string }): Promise<ForgotPasswordResponse> => {
    return (await api.post('/auth/forgot-password', { email })).data
}

export const verifyResetOtp = async ({ email, otp }: { email: string; otp: string }): Promise<VerifyResetOtpResponse> => {
    return (await api.post('/auth/verify-reset-otp', { email, otp })).data
}

export const resetPassword = async ({ email, password, resetToken }: { email: string; password: string; resetToken: string }): Promise<ResetPasswordResponse> => {
    return (await api.post('/auth/reset-password', { email, password, resetToken })).data
}

export const refreshTokenApi = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
    return (await api.post('/auth/refresh', { refreshToken })).data
}

export const logoutApi = async (): Promise<void> => {
    try {
        await api.post('/auth/logout')
    } catch {
        // Token có thể đã hết hạn — vẫn xóa httpOnly refresh cookie
        await api.post('/auth/logout/clear')
    }
}

export interface ActiveSession {
    userId: string
    userName: string
    userEmail: string
    userRole: string
    ipAddress: string | null
    userAgent: string | null
    loginAt: string
    lastActiveAt: string
}

export interface AdminSessionsPayload {
    sessions: ActiveSession[]
    /** Backend: REDIS_DISABLED — cần cấu hình Redis để lưu phiên */
    sessionsUnavailableReason?: string
    message?: string
}

export const getAdminSessions = async (): Promise<AdminSessionsPayload> => {
    const { data } = await api.get('/auth/admin/sessions')
    return {
        sessions: Array.isArray(data?.sessions) ? (data.sessions as ActiveSession[]) : [],
        sessionsUnavailableReason: data?.sessionsUnavailableReason as string | undefined,
        message: data?.message as string | undefined,
    }
}

export const forceLogoutUser = async (userId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/auth/admin/sessions/${userId}`)
    return data
}
