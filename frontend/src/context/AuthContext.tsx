import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as loginApi } from '@/services/authService'
import type { User, LoginResponse } from '@/types'

interface AuthContextType {
  token: string
  user: User | null
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<LoginResponse>
  logout: () => void
  setUser: (user: User | null) => void
  setToken: (token: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState(() => localStorage.getItem('sa_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      // If no token, immediately set user to null without loading state
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      // Only show loading when we actually need to fetch user data
      setLoading(true)
      try {
        const me = await getMe()
        setUser(me)
        // Update role in localStorage when user data is refreshed
        // Update role in localStorage when user data is refreshed
        if (me?.role) {
          localStorage.setItem('sa_user_role', me.role)
        }
      } catch (e) {
        // Token invalid or expired - clear auth state
        localStorage.removeItem('sa_token')
        localStorage.removeItem('sa_user_role')
        setToken('')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [token]) // Re-run when token changes

  useEffect(() => {
    if (token) localStorage.setItem('sa_token', token)
  }, [token])

  const login = async ({ email, password }: { email: string; password: string }) => {
    const data = await loginApi({ email, password })
    setToken(data.token)
    setUser(data.user)
    // Store user role in localStorage for API interceptor to use
    if (data.user?.role) {
      localStorage.setItem('sa_user_role', data.user.role)
    }
    // Dispatch custom event to notify other contexts (e.g., NotificationsContext)
    window.dispatchEvent(new CustomEvent('auth-token-changed'))
    return data
  }

  const logout = () => {
    // Clear all storage immediately
    localStorage.removeItem('sa_token')
    localStorage.removeItem('sa_user_role')
    sessionStorage.clear()
    
    // Clear state immediately
    setToken('')
    setUser(null)
    setLoading(false)
    
    // Dispatch custom event to notify other contexts
    window.dispatchEvent(new CustomEvent('auth-token-changed'))
    
    // Cancel any pending API requests by clearing token in interceptor
    // The API interceptor will handle this automatically
    
    // Redirect to login immediately (don't wait for React state updates)
    // Use window.location for immediate redirect to prevent any delays
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  const value = useMemo(() => ({ token, user, loading, login, logout, setUser, setToken }), [token, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

