import { useAuth } from '../context/AuthContext';
import { 
  hasPermission, 
  hasMinimumLevel, 
  canManageRole,
  getRoleScope,
  canAccessAdminPanel,
  type UserRoleType,
  type PermissionType 
} from '../utils/roles';
import { UserRole } from '../utils/roles';

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as UserRoleType) || UserRole.EMPLOYEE;
  
  return {
    hasPermission: (permission: PermissionType) => 
      hasPermission(role, permission),
    
    hasAnyPermission: (permissions: PermissionType[]) =>
      permissions.some(p => hasPermission(role, p)),
    
    hasAllPermissions: (permissions: PermissionType[]) =>
      permissions.every(p => hasPermission(role, p)),
    
    hasMinimumRole: (requiredRole: UserRoleType) =>
      hasMinimumLevel(role, requiredRole),
    
    canManageRole: (targetRole: UserRoleType) =>
      canManageRole(role, targetRole),
    
    getScope: () => getRoleScope(role),
    
    isAdmin: () => canAccessAdminPanel(role),
    
    role,
    user,
  };
}

