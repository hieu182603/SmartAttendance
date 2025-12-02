import axios, { type InternalAxiosRequestConfig, type AxiosError, type AxiosResponse } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export interface ValidationError extends Error {
    fieldErrors?: Record<string, string[]>
    response?: AxiosResponse
}

export const api = axios.create({
    baseURL,
    withCredentials: false,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('sa_token')
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (res: AxiosResponse) => res,
    (error: AxiosError) => {
        const status = error?.response?.status
        const responseData = error?.response?.data as { message?: string; errors?: unknown } | undefined

        // Handle 401 Unauthorized - Token expired or invalid
        if (status === 401) {
            // Clear auth state
            localStorage.removeItem('sa_token')
            
            // Only redirect if we're not already on login page
            if (window.location.pathname !== '/login') {
                // Use setTimeout to avoid navigation during render
                setTimeout(() => {
                    window.location.href = '/login'
                }, 0)
            }
            
            const message = responseData?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            const apiError = new Error(message) as ValidationError
            apiError.response = error.response
            return Promise.reject(apiError)
        }

        // Handle 403 Forbidden - Insufficient permissions
        if (status === 403) {
            const message = responseData?.message || 'Bạn không có quyền thực hiện hành động này.'
            const apiError = new Error(message) as ValidationError
            apiError.response = error.response
            
            // Store error message for toast notification (components will handle this)
            // Redirect to user's base path if not already there
            const currentPath = window.location.pathname
            const userRole = localStorage.getItem('sa_user_role')
            const basePaths = ['/employee', '/manager', '/hr', '/admin']
            const isOnBasePath = basePaths.some(path => currentPath.startsWith(path))
            
            if (!isOnBasePath && userRole) {
                const roleBasePaths: Record<string, string> = {
                    'EMPLOYEE': '/employee',
                    'MANAGER': '/manager',
                    'HR_MANAGER': '/hr',
                    'ADMIN': '/admin',
                    'SUPER_ADMIN': '/admin'
                }
                const redirectPath = roleBasePaths[userRole] || '/employee'
                // Use window.location.href for redirect in interceptor (can't use navigate hook here)
                setTimeout(() => {
                    window.location.href = redirectPath
                }, 2000) // Redirect after 2 seconds to show error message
            }
            
            return Promise.reject(apiError)
        }

        // Handle 400 Bad Request - Validation errors
        if (status === 400 && responseData?.errors) {
            const errors = (responseData as { errors: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }).errors
            const fieldErrors = errors.fieldErrors || {}
            const formErrors = errors.formErrors || []
            
            // Lấy message từ field errors hoặc form errors
            let message = responseData?.message || 'Dữ liệu không hợp lệ'
            
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
        
        // Handle other errors (404, 500, etc.)
        const message = responseData?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.'
        const apiError = new Error(message) as ValidationError
        apiError.response = error.response
        return Promise.reject(apiError)
    },
)

export default api




