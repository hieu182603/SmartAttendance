import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { API_URL } from '../constants/api';

// Event name for auth session expiry
export const AUTH_EXPIRED_EVENT = 'auth:session_expired';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 second timeout to avoid hanging
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: attach token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('smartattendance_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: handle 401 (token expired / unauthorized)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Don't trigger logout for login endpoint itself
            const url = error.config?.url || '';
            if (!url.includes('/auth/login')) {
                console.warn('[Axios] 401 Unauthorized – session expired, logging out');
                await AsyncStorage.removeItem('smartattendance_token');
                await AsyncStorage.removeItem('smartattendance_user');
                // Emit event so AuthContext can react and reset state
                DeviceEventEmitter.emit(AUTH_EXPIRED_EVENT);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
