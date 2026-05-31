import React, { createContext, useState, useEffect, useContext } from 'react';
import { DeviceEventEmitter } from 'react-native';
import api from '../libs/axios';
import { AUTH_EXPIRED_EVENT } from '../libs/axios';
import { AUTH_endpoints } from '../constants/api';
import { AuthResponse, User } from '../types/auth';
import { UserRole } from '../types';
import {
  getSecureItem,
  setSecureItem,
  removeSecureItem,
  STORAGE_KEYS,
} from '../utils/secureStorage';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(AUTH_EXPIRED_EVENT, () => {
      setToken(null);
      setUser(null);
    });
    return () => subscription.remove();
  }, []);

  const persistSession = async (auth: AuthResponse) => {
    const { user: u, token: t, refreshToken } = auth;
    setToken(t);
    setUser(u);
    await setSecureItem(STORAGE_KEYS.TOKEN, t);
    if (refreshToken) {
      await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(u));
  };

  const checkAuth = async () => {
    try {
      const storedToken = await getSecureItem(STORAGE_KEYS.TOKEN);
      const storedUser = await getSecureItem(STORAGE_KEYS.USER);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        try {
          const response = await api.get(AUTH_endpoints.ME);
          const fresh = response.data.user || response.data;
          setUser(fresh);
          await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(fresh));
        } catch (verifyErr: unknown) {
          const status = (verifyErr as { response?: { status?: number } })?.response?.status;
          if (status === 401) {
            await removeSecureItem(STORAGE_KEYS.TOKEN);
            await removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
            await removeSecureItem(STORAGE_KEYS.USER);
            setToken(null);
            setUser(null);
          }
        }
      } else if (storedToken && !storedUser) {
        await removeSecureItem(STORAGE_KEYS.TOKEN);
        await removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.log('Auth check error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post<AuthResponse>(AUTH_endpoints.LOGIN, { email, password });
      await persistSession(response.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Đăng nhập thất bại';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout').catch(() => undefined);
    } finally {
      await removeSecureItem(STORAGE_KEYS.TOKEN);
      await removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
      await removeSecureItem(STORAGE_KEYS.USER);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole: (user?.role as UserRole) || null,
        token,
        isLoading,
        error,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
