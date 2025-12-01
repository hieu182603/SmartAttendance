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
      } catch (e) {
        // Token invalid or expired - clear auth state
        localStorage.removeItem('sa_token')
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
    return data
  }

  const logout = () => {
    localStorage.removeItem('sa_token')
    setToken('')
    setUser(null)
    setLoading(false) 
  }

  const value = useMemo(() => ({ token, user, loading, login, logout, setUser, setToken }), [token, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

