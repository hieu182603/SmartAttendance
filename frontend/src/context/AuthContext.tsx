import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as loginApi, logoutApi } from '@/services/authService'
import type { User, LoginResponse } from '@/types'

const REFRESH_TOKEN_KEY = 'sa_refresh_token'

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
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)

      // Retry once on transient errors (network blip, 5xx, 429).
      // Only give up immediately on 401 (the api interceptor already tried refresh).
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          await new Promise<void>((r) => setTimeout(r, 1500))
        }
        try {
          const me = await getMe()
          setUser(me)
          if (me?.role) {
            localStorage.setItem('sa_user_role', me.role)
          }
          setLoading(false)
          return
        } catch (e: any) {
          const status = (e as any)?.response?.status
          // 401 = definitive auth failure (interceptor already tried refresh) → bail out
          if (status === 401) break
          // Any other error → retry once, then bail
        }
      }

      // All attempts failed → clear auth state
      localStorage.removeItem('sa_token')
      localStorage.removeItem('sa_user_role')
      setToken('')
      setUser(null)
      setLoading(false)
    }
    bootstrap()
  }, [token])

  useEffect(() => {
    if (token) localStorage.setItem('sa_token', token)
  }, [token])

  const login = async ({ email, password }: { email: string; password: string }) => {
    const data = await loginApi({ email, password })
    setToken(data.token)
    setUser(data.user)
    if (data.user?.role) {
      localStorage.setItem('sa_user_role', data.user.role)
    }
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    }
    window.dispatchEvent(new CustomEvent('auth-token-changed'))
    return data
  }

  const logout = () => {
    // Best-effort server-side revoke (fire-and-forget)
    logoutApi().catch(() => {})

    localStorage.removeItem('sa_token')
    localStorage.removeItem('sa_user_role')
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.clear()

    setToken('')
    setUser(null)
    setLoading(false)

    window.dispatchEvent(new CustomEvent('auth-token-changed'))

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

