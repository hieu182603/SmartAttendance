import { useEffect, useState, useMemo } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getRoleBasePath, type UserRoleType } from '@/utils/roles'
import { type PermissionType } from '@/utils/roles'
import { usePermissions } from '@/hooks/usePermissions'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
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
  const { loading, user } = useAuth()
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    hasMinimumRole 
  } = usePermissions()
  const navigate = useNavigate()
  const [showUnauthorized, setShowUnauthorized] = useState(false)

  // Get user role once to avoid repeated access
  const userRole = user?.role as UserRoleType | undefined

  // Synchronously check access before rendering - prevent race condition
  const hasAccess = useMemo(() => {
    // Don't check if still loading or no user
    if (loading || !user || !userRole) {
      return null // Still checking
    }

    // Priority 1: Check specific permission (most granular)
    if (permission) {
      return hasPermission(permission)
    }
    
    // Priority 2: Check multiple permissions
    if (permissions && permissions.length > 0) {
      return requireAll 
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions)
    }

    // Priority 3: Check minimum role level (backward compatibility)
    if (minimumRole) {
      return hasMinimumRole(minimumRole as UserRoleType)
    }

    // Priority 4: Check allowed roles (backward compatibility)
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(userRole)
    }

    // Default: allow access if authenticated
    return true
  }, [loading, user, userRole, allowedRoles, minimumRole, permission, permissions, requireAll, hasPermission, hasAnyPermission, hasAllPermissions, hasMinimumRole])

  // Handle redirect after unauthorized access
  useEffect(() => {
    if (hasAccess === false && userRole) {
      setShowUnauthorized(true)
      const timer = setTimeout(() => {
        const redirectPath = getRoleBasePath(userRole)
        navigate(redirectPath, { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [hasAccess, userRole, navigate])

  // Loading state - wait for auth bootstrap (including silent refresh) to complete FIRST
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

  // Not authenticated - redirect BEFORE checking hasAccess (which is null when user is null)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // hasAccess can only be null here if userRole is missing while user exists — defensive fallback
  if (hasAccess === null) {
    return <Navigate to="/login" replace />
  }

  // Show unauthorized message if needed
  if (hasAccess === false || showUnauthorized) {
    // Use UnauthorizedPage component for better UX
    return <UnauthorizedPage />
  }

  // User has access - render child routes
  return <Outlet />
}

