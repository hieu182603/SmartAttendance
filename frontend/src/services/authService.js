import api from './api'

export const register = async ({ name, email, password }) => {
    return (await api.post('/auth/register', { name, email, password })).data
}

export const verifyOtp = async ({ email, otp }) => {
    return (await api.post('/auth/verify-otp', { email, otp })).data
}

export const resendOtp = async ({ email }) => {
    return (await api.post('/auth/resend-otp', { email })).data
}

export const login = async ({ email, password }) => {
    return (await api.post('/auth/login', { email, password })).data
}

export const getMe = async () => {
    return (await api.get('/auth/me')).data
}


