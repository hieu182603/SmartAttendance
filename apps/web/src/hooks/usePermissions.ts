import { useAuth } from '@/context/AuthContext';
import {
  hasPermissionFromList,
  hasMinimumLevel,
  canManageRole,
  getRoleScope,
  canAccessAdminPanel,
  type UserRoleType,
  type PermissionType,
  UserRole,
} from '@/utils/roles';
import { usePermissionsOverride } from '@/context/PermissionsContext';

const SERVER_MANAGED_ROLES = new Set<string>(Object.values(UserRole));

export function usePermissions() {
  const { user } = useAuth();
  const { getEffectivePermissions } = usePermissionsOverride();
  const role = (user?.role as UserRoleType) || UserRole.EMPLOYEE;
  const serverPerms = user?.permissions as PermissionType[] | undefined;
  const effectivePerms = SERVER_MANAGED_ROLES.has(role)
    ? (serverPerms ?? [])
    : serverPerms && serverPerms.length > 0
      ? serverPerms
      : getEffectivePermissions(role);

  return {
    hasPermission: (permission: PermissionType) =>
      hasPermissionFromList(effectivePerms, permission),

    hasAnyPermission: (permissions: PermissionType[]) =>
      permissions.some(p => hasPermissionFromList(effectivePerms, p)),

    hasAllPermissions: (permissions: PermissionType[]) =>
      permissions.every(p => hasPermissionFromList(effectivePerms, p)),

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
