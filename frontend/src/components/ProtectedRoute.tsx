import React, { useEffect, useState, useMemo } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { hasMinimumLevel, UserRole, getRoleBasePath, type UserRoleType } from '@/utils/roles'
import { type PermissionType } from '@/utils/roles'
import { usePermissions } from '@/hooks/usePermissions'
import { motion } from 'framer-motion'
import { AlertTriangle, Shield } from 'lucide-react'
import UnauthorizedPage from '@/components/UnauthorizedPage'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  minimumRole?: string
  permission?: PermissionType // NEW: Check specific permission
  permissions?: PermissionType[] // NEW: Check multiple permissions
  requireAll?: boolean // NEW: If true, require all permissions (AND logic)
}

export default function ProtectedRoute({ 
  allowedRoles, 
  minimumRole,
  permission,
  permissions,
  requireAll = false,
}: ProtectedRouteProps) {
  const { token, loading, user } = useAuth()
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    hasMinimumRole 
  } = usePermissions()
  const navigate = useNavigate()
  const [showUnauthorized, setShowUnauthorized] = useState(false)

  // Synchronously check access before rendering - prevent race condition
  const hasAccess = useMemo(() => {
    // Don't check if still loading or no user
    if (loading || !user || !user.role) {
      return null // Still checking
    }

    // Check permission (NEW - priority)
    if (permission && !hasPermission(permission)) {
      return false
    }
    
    // Check multiple permissions (NEW)
    if (permissions && permissions.length > 0) {
      if (requireAll) {
        if (!hasAllPermissions(permissions)) return false
      } else {
        if (!hasAnyPermission(permissions)) return false
      }
    }

    // Check role-based access if specified (backward compatibility)
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user.role
      if (!allowedRoles.includes(userRole)) {
        return false
      }
    }

    // Check minimum role level if specified (backward compatibility)
    if (minimumRole) {
      if (!hasMinimumRole(minimumRole as UserRoleType)) {
        return false
      }
    }

    return true
  }, [loading, user, allowedRoles, minimumRole, permission, permissions, requireAll, hasPermission, hasAnyPermission, hasAllPermissions, hasMinimumRole])

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
    // Use UnauthorizedPage component for better UX
    return <UnauthorizedPage />
  }

  // User has access - render child routes
  return <Outlet />
}

