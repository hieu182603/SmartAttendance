import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { token, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-center text-slate-400">Đang tải...</div>
  return token ? <Outlet /> : <Navigate to="/login" replace />
}


