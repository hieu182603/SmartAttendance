import React from 'react'
import { useAuth } from '../context/AuthContext'
import { hasPermission, hasMinimumLevel, canAccessAdminPanel, Permission } from '../utils/roles'

interface RoleGuardProps {
  children: React.ReactNode
  permission?: string
  minimumRole?: string
  requireAdminAccess?: boolean
  fallback?: React.ReactNode
}

/**
 * Component wrapper để ẩn/hiện UI elements dựa trên permissions
 * 
 * @example
 * // Chỉ hiển thị cho users có permission VIEW_ANALYTICS
 * <RoleGuard permission={Permission.VIEW_ANALYTICS}>
 *   <AnalyticsButton />
 * </RoleGuard>
 * 
 * @example
 * // Chỉ hiển thị cho MANAGER trở lên
 * <RoleGuard minimumRole={UserRole.MANAGER}>
 *   <ApproveButton />
 * </RoleGuard>
 * 
 * @example
 * // Chỉ hiển thị cho admin panel
 * <RoleGuard requireAdminAccess>
 *   <AdminSettings />
 * </RoleGuard>
 */
export default function RoleGuard({ 
  children, 
  permission, 
  minimumRole, 
  requireAdminAccess = false,
  fallback = null 
}: RoleGuardProps) {
  const { user } = useAuth()
  
  if (!user || !user.role) {
    return <>{fallback}</>
  }

  // Check admin access requirement
  if (requireAdminAccess && !canAccessAdminPanel(user.role)) {
    return <>{fallback}</>
  }

  // Check specific permission
  if (permission && !hasPermission(user.role, permission)) {
    return <>{fallback}</>
  }

  // Check minimum role level
  if (minimumRole && !hasMinimumLevel(user.role, minimumRole)) {
    return <>{fallback}</>
  }

  // All checks passed, render children
  return <>{children}</>
}

