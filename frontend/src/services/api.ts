import axios, { type InternalAxiosRequestConfig, type AxiosError, type AxiosResponse } from 'axios'

// Get base URLs from environment variables or use defaults
const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const ragServiceUrl = import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:8001'

// Ensure backend baseURL always ends with /api for backend routes
const backendBaseURL = envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`

export interface ValidationError extends Error {
    fieldErrors?: Record<string, string[]>
    response?: AxiosResponse
}

// Helper function to determine base URL based on endpoint
const getBaseURL = (url: string) => {
    // If URL starts with /rag/, use RAG service URL
    if (url.startsWith('/rag/')) {
        return ragServiceUrl;
    }
    // Otherwise use backend API URL
    return backendBaseURL;
};

export const api = axios.create({
    baseURL: backendBaseURL, // Default to backend
    withCredentials: false,
})

// Override baseURL dynamically based on request URL
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.url) {
        config.baseURL = getBaseURL(config.url);
    }
    return config;
});

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
            // Check if this is a RAG service error (API key issue) rather than user auth
            const isRAGError = error.config?.url?.includes('/rag/') ||
                              error.config?.url?.includes('rag/health');

            if (isRAGError) {
                // For RAG service API key errors, don't log user out - surface the server message
                const message = responseData?.message || 'RAG AI service authentication failed. Please contact support.'
                const apiError = new Error(message) as ValidationError
                apiError.response = error.response
                return Promise.reject(apiError)
            }

            // Clear auth state for user authentication errors
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




