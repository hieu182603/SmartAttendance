import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasMinimumLevel, UserRole } from '../utils/roles'
import { motion } from 'framer-motion'
import { AlertTriangle, Shield } from 'lucide-react'

export default function ProtectedRoute({ allowedRoles, minimumRole }) {
  const { token, loading, user } = useAuth()
  const navigate = useNavigate()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Shield className="h-16 w-16 text-[var(--accent-cyan)] mx-auto" />
          </motion.div>
          <div className="space-y-2">
            <h3 className="text-xl text-[var(--text-main)]">Đang xác thực...</h3>
            <p className="text-sm text-[var(--text-sub)]">Vui lòng đợi</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Not authenticated
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role
    if (!userRole || !allowedRoles.includes(userRole)) {
      useEffect(() => {
        const timer = setTimeout(() => {
          navigate('/employee', { replace: true })
        }, 2000)
        return () => clearTimeout(timer)
      }, [navigate])

      return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 max-w-md mx-auto p-6"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="h-16 w-16 text-[var(--warning)] mx-auto" />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-xl text-[var(--text-main)]">Không có quyền truy cập</h3>
              <p className="text-sm text-[var(--text-sub)]">Bạn không có quyền truy cập trang này</p>
              <p className="text-xs text-[var(--text-sub)] mt-4">Đang chuyển hướng...</p>
            </div>
          </motion.div>
        </div>
      )
    }
  }

  // Check minimum role level if specified
  if (minimumRole && user?.role) {
    if (!hasMinimumLevel(user.role, minimumRole)) {
      useEffect(() => {
        const timer = setTimeout(() => {
          navigate('/employee', { replace: true })
        }, 2000)
        return () => clearTimeout(timer)
      }, [navigate])

      return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 max-w-md mx-auto p-6"
          >
            <AlertTriangle className="h-16 w-16 text-[var(--warning)] mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl text-[var(--text-main)]">Không có quyền truy cập</h3>
              <p className="text-sm text-[var(--text-sub)]">
                Trang này yêu cầu quyền tối thiểu: {minimumRole}
              </p>
              <p className="text-xs text-[var(--text-sub)] mt-4">Đang chuyển hướng...</p>
            </div>
          </motion.div>
        </div>
      )
    }
  }

  return <Outlet />
}


