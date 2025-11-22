import api from './api'
import type { LoginResponse, RegisterResponse, VerifyOtpResponse, VerifyResetOtpResponse, ForgotPasswordResponse, ResetPasswordResponse, ResendOtpResponse, User } from '../types'

export const register = async ({ name, email, password }: { name: string; email: string; password: string }): Promise<RegisterResponse> => {
    return (await api.post('/auth/register', { name, email, password })).data
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

export const resetPassword = async ({ email, password }: { email: string; password: string }): Promise<ResetPasswordResponse> => {
    return (await api.post('/auth/reset-password', { email, password })).data
}


