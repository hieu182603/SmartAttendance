import axios, { type AxiosRequestConfig, type AxiosError, type AxiosResponse } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export interface ValidationError extends Error {
    fieldErrors?: Record<string, string[]>
    response?: AxiosResponse
}

export const api = axios.create({
    baseURL,
    withCredentials: false,
})

api.interceptors.request.use((config: AxiosRequestConfig) => {
    const token = localStorage.getItem('sa_token')
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (res: AxiosResponse) => res,
    (error: AxiosError) => {
        // Xử lý validation errors từ backend (Zod validation)
        if (error?.response?.status === 400 && (error.response.data as { errors?: unknown })?.errors) {
            const errors = (error.response.data as { errors: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }).errors
            const fieldErrors = errors.fieldErrors || {}
            const formErrors = errors.formErrors || []
            
            // Lấy message từ field errors hoặc form errors
            let message = (error.response.data as { message?: string })?.message || 'Dữ liệu không hợp lệ'
            
            // Nếu có field errors, hiển thị chi tiết
            if (Object.keys(fieldErrors).length > 0) {
                const firstError = Object.values(fieldErrors)[0]
                if (Array.isArray(firstError) && firstError.length > 0) {
                    message = firstError[0]
                } else if (typeof firstError === 'string') {
                    message = firstError
                }
            } else if (formErrors.length > 0) {
                message = formErrors[0]
            }
            
            // Tạo error object với fieldErrors để component có thể sử dụng
            const validationError = new Error(message) as ValidationError
            validationError.fieldErrors = fieldErrors
            validationError.response = error.response
            return Promise.reject(validationError)
        }
        
        // Xử lý các lỗi khác (401, 403, 404, 500, etc.)
        const message = (error?.response?.data as { message?: string })?.message || error.message || 'Request failed'
        const apiError = new Error(message) as ValidationError
        apiError.response = error.response
        return Promise.reject(apiError)
    },
)

export default api




