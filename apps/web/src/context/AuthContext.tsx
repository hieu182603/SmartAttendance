import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as loginApi, logoutApi } from '@/services/authService'
import { setAccessToken, getAccessToken, setLoggingOut } from '@/services/api'
import type { User, LoginResponse } from '@/types'
import { normalizeAuthUser } from '@/utils/userId'

interface AuthContextType {
  token: string
  user: User | null
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<LoginResponse>
  logout: () => void | Promise<void>
  setUser: (user: User | null) => void
  setToken: (token: string) => void
  /** Khôi phục phiên sau redirect ngoài (PayOS) — dùng httpOnly refresh cookie */
  restoreSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Access token in React state only — NOT in localStorage
  const [token, setTokenState] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Keep api.ts in-memory variable in sync with React state
  useEffect(() => {
    setAccessToken(token)
  }, [token])

  // On mount: call /me — if 401, interceptor silently refreshes via httpOnly cookie
  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true)
      if (sessionStorage.getItem('sa_logged_out') === '1') {
        sessionStorage.removeItem('sa_logged_out')
        setAccessToken('')
        setUser(null)
        localStorage.removeItem('sa_user_role')
        setLoading(false)
        return
      }
      try {
        const me = await getMe()
        setUser(normalizeAuthUser(me))
        if (me?.role) localStorage.setItem('sa_user_role', me.role)
        const memToken = getAccessToken()
        if (memToken) setTokenState(memToken)
      } catch {
        setUser(null)
        localStorage.removeItem('sa_user_role')
      } finally {
        setLoading(false)
      }
    }
    bootstrap()

    // Sync token state when interceptor silently refreshes it
    const onRefresh = (e: Event) => {
      const newToken = (e as CustomEvent<{ token: string }>).detail.token
      setTokenState(newToken)
    }
    window.addEventListener('auth-token-refreshed', onRefresh)
    return () => window.removeEventListener('auth-token-refreshed', onRefresh)
  }, [])

  const setToken = (t: string) => setTokenState(t)

  const login = async ({ email, password }: { email: string; password: string }) => {
    const data = await loginApi({ email, password })
    // refreshToken is now an httpOnly cookie set by backend — no localStorage
    setTokenState(data.token)
    setUser(normalizeAuthUser(data.user as User))
    if (data.user?.role) localStorage.setItem('sa_user_role', data.user.role)
    window.dispatchEvent(new CustomEvent('auth-token-changed'))
    return data
  }

  const restoreSession = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      if (!getAccessToken()) {
        const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const base = envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`
        const { default: axios } = await import('axios')
        const { data } = await axios.post(
          `${base}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        setTokenState(data.token)
        setAccessToken(data.token)
        window.dispatchEvent(new CustomEvent('auth-token-refreshed', { detail: { token: data.token } }))
      }
      const me = await getMe()
      setUser(normalizeAuthUser(me))
      if (me?.role) localStorage.setItem('sa_user_role', me.role)
      return true
    } catch {
      setUser(null)
      localStorage.removeItem('sa_user_role')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = async () => {
    sessionStorage.setItem('sa_logged_out', '1')
    setLoggingOut(true)
    try {
      await logoutApi()
    } catch {
      /* cookie clear attempted in logoutApi fallback */
    } finally {
      setLoggingOut(false)
      setAccessToken('')
      setTokenState('')
      setUser(null)
      setLoading(false)
      localStorage.removeItem('sa_user_role')
      window.dispatchEvent(new CustomEvent('auth-token-changed'))
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
  }

  const value = useMemo(
    () => ({ token, user, loading, login, logout, setUser, setToken, restoreSession }),
    [token, user, loading, restoreSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
