import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { Permission, type PermissionType } from '@/utils/roles'
import { UserRole, type UserRoleType } from '@/utils/roles'
import { Lock } from 'lucide-react'

interface RoleGuardProps {
  children: React.ReactNode
  permission?: PermissionType
  permissions?: PermissionType[]
  requireAll?: boolean
  minimumRole?: UserRoleType
  requireAdminAccess?: boolean
  fallback?: React.ReactNode
  showDisabled?: boolean
  disabledMessage?: string
}

export default function RoleGuard({ 
  children, 
  permission,
  permissions,
  requireAll = false,
  minimumRole, 
  requireAdminAccess = false,
  fallback = null,
  showDisabled = false,
  disabledMessage = 'Bạn không có quyền thực hiện hành động này'
}: RoleGuardProps) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    hasMinimumRole,
    isAdmin 
  } = usePermissions()
  
  let hasAccess = true
  
  if (requireAdminAccess && !isAdmin()) {
    hasAccess = false
  }
  
  if (minimumRole && !hasMinimumRole(minimumRole)) {
    hasAccess = false
  }
  
  if (permission && !hasPermission(permission)) {
    hasAccess = false
  }
  
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAccess && hasAllPermissions(permissions)
    } else {
      hasAccess = hasAccess && hasAnyPermission(permissions)
    }
  }
  
  if (!hasAccess && showDisabled) {
    return (
      <div className="relative inline-block">
        <div className="opacity-50 cursor-not-allowed pointer-events-none">
          {children}
        </div>
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
          title={disabledMessage}
        >
          <div className="flex items-center gap-2 text-white text-xs px-2 py-1">
            <Lock className="h-3 w-3" />
            <span>{disabledMessage}</span>
          </div>
        </div>
      </div>
    )
  }
  
  if (!hasAccess) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

