import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as loginApi } from '../services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('sa_token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (token) {
          const me = await getMe()
          setUser(me)
        }
      } catch (e) {
        localStorage.removeItem('sa_token')
        setToken('')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
    
  }, [])

  useEffect(() => {
    if (token) localStorage.setItem('sa_token', token)
  }, [token])

  const login = async ({ email, password }) => {
    const data = await loginApi({ email, password })
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('sa_token')
    setToken('')
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, loading, login, logout, setUser, setToken }), [token, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


