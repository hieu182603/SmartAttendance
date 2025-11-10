import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const api = axios.create({
    baseURL,
    withCredentials: false,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('sa_token')
    if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (res) => res,
    (error) => {
        // Xử lý validation errors
        if (error?.response?.status === 400 && error?.response?.data?.errors) {
            const errors = error.response.data.errors
            const fieldErrors = errors.fieldErrors || {}
            const formErrors = errors.formErrors || []
            
            // Lấy message từ field errors hoặc form errors
            let message = error.response.data.message || 'Dữ liệu không hợp lệ'
            
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
            
            return Promise.reject(new Error(message))
        }
        
        // Xử lý các lỗi khác
        const message = error?.response?.data?.message || error.message || 'Request failed'
        return Promise.reject(new Error(message))
    },
)

export default api


