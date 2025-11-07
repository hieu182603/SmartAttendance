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
        const message = error?.response?.data?.message || error.message || 'Request failed'
        return Promise.reject(new Error(message))
    },
)

export default api


