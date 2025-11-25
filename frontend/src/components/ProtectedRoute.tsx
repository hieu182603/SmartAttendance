import React, { useEffect, useState, useMemo } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasMinimumLevel, UserRole, getRoleBasePath, type UserRoleType } from '../utils/roles'
import { motion } from 'framer-motion'
import { AlertTriangle, Shield } from 'lucide-react'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  minimumRole?: string
}

export default function ProtectedRoute({ allowedRoles, minimumRole }: ProtectedRouteProps) {
  const { token, loading, user } = useAuth()
  const navigate = useNavigate()
  const [showUnauthorized, setShowUnauthorized] = useState(false)

  // Synchronously check access before rendering - prevent race condition
  const hasAccess = useMemo(() => {
    // Don't check if still loading or no user
    if (loading || !user || !user.role) {
      return null // Still checking
    }

    // Check role-based access if specified
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user.role
      if (!allowedRoles.includes(userRole)) {
        return false
      }
    }

    // Check minimum role level if specified
    if (minimumRole) {
      if (!hasMinimumLevel(user.role as UserRoleType, minimumRole as UserRoleType)) {
        return false
      }
    }

    return true
  }, [loading, user, allowedRoles, minimumRole])

  // Handle redirect after unauthorized access
  useEffect(() => {
    if (hasAccess === false) {
      setShowUnauthorized(true)
      const timer = setTimeout(() => {
        const userRole = user?.role as UserRoleType | undefined
        const redirectPath = userRole ? getRoleBasePath(userRole) : '/employee'
        navigate(redirectPath, { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [hasAccess, user, navigate])

  // Not authenticated - check this FIRST to avoid showing loading screen on logout
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Loading state - show while checking authentication or access
  if (loading || hasAccess === null) {
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

  // Show unauthorized message if needed
  if (hasAccess === false || showUnauthorized) {
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
            <p className="text-sm text-[var(--text-sub)]">
              {minimumRole 
                ? `Trang này yêu cầu quyền tối thiểu: ${minimumRole}`
                : 'Bạn không có quyền truy cập trang này'}
            </p>
            <p className="text-xs text-[var(--text-sub)] mt-4">Đang chuyển hướng...</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // User has access - render child routes
  return <Outlet />
}

