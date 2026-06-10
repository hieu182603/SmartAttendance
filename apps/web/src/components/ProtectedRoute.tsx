import { useEffect, useState, useMemo } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getRoleBasePath, type UserRoleType } from '@/utils/roles'
import { type PermissionType } from '@/utils/roles'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatureToggles } from '@/hooks/useFeatureToggles'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import UnauthorizedPage from '@/components/UnauthorizedPage'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  minimumRole?: string
  permission?: PermissionType // Check specific permission
  permissions?: PermissionType[] // Check multiple permissions
  requireAll?: boolean // If true, require all permissions (AND logic)
  /**
   * Canonical feature key (from DEFAULT_FEATURES vocabulary).
   * When provided, the route is also gated on the feature toggle effective
   * state for the current user. A disabled toggle renders UnauthorizedPage
   * and redirects, identical to a permission denial.
   */
  featureKey?: string
}

export default function ProtectedRoute({ 
  allowedRoles, 
  minimumRole,
  permission,
  permissions,
  requireAll = false,
  featureKey,
}: ProtectedRouteProps) {
  const { loading, user } = useAuth()
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    hasMinimumRole 
  } = usePermissions()
  const { isEnabled: isFeatureEnabled, status: toggleStatus } = useFeatureToggles()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUnauthorized, setShowUnauthorized] = useState(false)

  const paymentReturnRedirect =
    !loading &&
    !user &&
    (location.search.includes('payment=success') || location.search.includes('payment=cancelled'))
      ? `/payment/return${location.search}`
      : null

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

  // Feature-toggle gate — evaluated after role/permission checks.
  //
  // Returns a three-state value that mirrors the hook's status:
  //   null  → fetch in flight, can't decide yet — caller must wait
  //   false → definitively denied (feature disabled OR fetch failed)
  //   true  → definitively allowed
  //
  // This eliminates the previous bug where an unresolved (null) toggle map was
  // coalesced to {} and treated as "no toggles loaded yet → allow", which let
  // direct-URL navigation bypass a disabled toggle during the first fetch.
  const featureAllowed = useMemo(() => {
    // No featureKey — this route is not toggle-gated at all.
    if (!featureKey) return true

    if (toggleStatus === 'loading') {
      // Fetch is still in progress — return null so the component knows to wait.
      return null
    }

    if (toggleStatus === 'error') {
      // Initial fetch failed with no stale cache — fail closed.
      return false
    }

    // status === 'resolved': the map is trustworthy; evaluate normally.
    return isFeatureEnabled(featureKey)
  }, [featureKey, toggleStatus, isFeatureEnabled])

  // Handle redirect after unauthorized access (role/permission OR feature toggle).
  // featureAllowed === null means "still loading" — do not trigger a redirect.
  useEffect(() => {
    if ((hasAccess === false || featureAllowed === false) && userRole) {
      setShowUnauthorized(true)
      const timer = setTimeout(() => {
        const redirectPath = getRoleBasePath(userRole)
        navigate(redirectPath, { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [hasAccess, featureAllowed, userRole, navigate])

  // Loading state — wait for auth bootstrap (including silent refresh) to complete FIRST.
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

  // Feature-toggle loading state — featureKey provided but the fetch hasn't settled yet.
  // Show the same Shield spinner so the UX is consistent and the route stays
  // closed until we have a definitive answer from the server.
  if (featureKey && featureAllowed === null) {
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
            <h3 className="text-xl text-[var(--text-main)]">Đang kiểm tra tính năng...</h3>
            <p className="text-sm text-[var(--text-sub)]">Vui lòng đợi</p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (paymentReturnRedirect) {
    return <Navigate to={paymentReturnRedirect} replace />
  }

  // Not authenticated - redirect BEFORE checking hasAccess (which is null when user is null)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // hasAccess can only be null here if userRole is missing while user exists — defensive fallback
  if (hasAccess === null) {
    return <Navigate to="/login" replace />
  }

  // Show unauthorized message if needed (role denial OR feature toggle denial)
  if (hasAccess === false || featureAllowed === false || showUnauthorized) {
    return <UnauthorizedPage />
  }

  // User has access - render child routes
  return <Outlet />
}

