import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import api from '../libs/axios';
import { AUTH_EXPIRED_EVENT } from '../libs/axios';
import { AUTH_endpoints } from '../constants/api';
import { AuthResponse, User } from '../types/auth';
import { UserRole } from '../types';

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

// Key for storage
const TOKEN_KEY = 'smartattendance_token';
const USER_KEY = 'smartattendance_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    // Listen for 401 session expired events from axios interceptor
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(AUTH_EXPIRED_EVENT, () => {
            console.log('[Auth] Session expired event received, clearing state');
            setToken(null);
            setUser(null);
        });

        return () => subscription.remove();
    }, []);

    const checkAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
            const storedUser = await AsyncStorage.getItem(USER_KEY);

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));

                // Verify token with backend (non-blocking)
                try {
                    const response = await api.get(AUTH_endpoints.ME);
                    if (response.data) {
                        // Update user data with fresh info from server
                        setUser(response.data.user || response.data);
                        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.user || response.data));
                    }
                } catch (verifyErr: any) {
                    // If 401, token is invalid → clear everything
                    if (verifyErr.response?.status === 401) {
                        console.log('[Auth] Stored token is invalid, clearing');
                        await AsyncStorage.removeItem(TOKEN_KEY);
                        await AsyncStorage.removeItem(USER_KEY);
                        setToken(null);
                        setUser(null);
                    }
                    // Other errors (network etc.) → keep cached user for now
                }
            } else if (storedToken && !storedUser) {
                // Orphaned token: token exists but user data is missing
                // Clean up the orphaned token to avoid broken state on restart
                console.log('[Auth] Orphaned token found (no user data), clearing');
                await AsyncStorage.removeItem(TOKEN_KEY);
                setToken(null);
                setUser(null);
            }
        } catch (e) {
            console.log('Auth check error', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string, rememberMe?: boolean) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.post<AuthResponse>(AUTH_endpoints.LOGIN, { email, password });
            const { user, token } = response.data;

            console.log('Login success:', user.email);

            setToken(token);
            setUser(user);

            // Always persist token so axios interceptor can attach it to requests.
            // rememberMe only controls whether we restore the session on app restart
            // (checkAuth reads from storage on mount — clearing on logout handles expiry).
            await AsyncStorage.setItem(TOKEN_KEY, token);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

        } catch (err: any) {
            console.error('Login error', err.response?.data || err.message);
            const msg = err.response?.data?.message || err.message || 'Đăng nhập thất bại';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem(TOKEN_KEY);
            await AsyncStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
        } catch (e) {
            console.log('Logout error', e);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userRole: user?.role || null, // Derived from user
            token,
            isLoading,
            error,
            login,
            logout,
            checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

