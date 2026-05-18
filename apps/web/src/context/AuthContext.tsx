import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as loginApi, logoutApi } from '@/services/authService'
import { setAccessToken } from '@/services/api'
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
      try {
        const me = await getMe()
        setUser(me)
        if (me?.role) localStorage.setItem('sa_user_role', me.role)
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
    setUser(data.user)
    if (data.user?.role) localStorage.setItem('sa_user_role', data.user.role)
    window.dispatchEvent(new CustomEvent('auth-token-changed'))
    return data
  }

  const logout = () => {
    logoutApi().catch(() => {})
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

  const value = useMemo(
    () => ({ token, user, loading, login, logout, setUser, setToken }),
    [token, user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
