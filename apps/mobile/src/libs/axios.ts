import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import { DeviceEventEmitter } from 'react-native';
import { API_URL, AUTH_endpoints } from '../constants/api';
import {
  getSecureItem,
  setSecureItem,
  removeSecureItem,
  STORAGE_KEYS,
} from '../utils/secureStorage';

export const AUTH_EXPIRED_EVENT = 'auth:session_expired';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processRefreshQueue = (err: unknown, token: string | null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token!);
  });
  refreshQueue = [];
};

const clearSession = async () => {
  await removeSecureItem(STORAGE_KEYS.TOKEN);
  await removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
  await removeSecureItem(STORAGE_KEYS.USER);
};

api.interceptors.request.use(
  async (config) => {
    const token = await getSecureItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const skipRefresh = error.config?.headers?.['X-Skip-Auth-Refresh'];

    if (status !== 401 || skipRefresh) {
      return Promise.reject(error);
    }

    if (url.includes(AUTH_endpoints.LOGIN) || url.includes(AUTH_endpoints.REFRESH)) {
      if (!url.includes(AUTH_endpoints.LOGIN)) {
        await clearSession();
        DeviceEventEmitter.emit(AUTH_EXPIRED_EVENT);
      }
      return Promise.reject(error);
    }

    const refreshToken = await getSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      await clearSession();
      DeviceEventEmitter.emit(AUTH_EXPIRED_EVENT);
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        if (error.config?.headers) {
          error.config.headers.Authorization = `Bearer ${token}`;
        }
        return api(error.config!);
      });
    }

    isRefreshing = true;
    try {
      const { data } = await api.post(
        AUTH_endpoints.REFRESH,
        { refreshToken },
        { headers: { 'X-Skip-Auth-Refresh': '1' } },
      );
      const newToken: string = data.token;
      const newRefresh: string = data.refreshToken;
      await setSecureItem(STORAGE_KEYS.TOKEN, newToken);
      if (newRefresh) {
        await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);
      }
      processRefreshQueue(null, newToken);
      if (error.config?.headers) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
      }
      return api(error.config!);
    } catch (refreshErr) {
      processRefreshQueue(refreshErr, null);
      await clearSession();
      DeviceEventEmitter.emit(AUTH_EXPIRED_EVENT);
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
