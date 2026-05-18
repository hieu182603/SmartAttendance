import React, { createContext, useContext, useState, useCallback } from 'react';
import { type UserRoleType, type PermissionType, ROLE_PERMISSIONS, UserRole } from '@/utils/roles';

export interface CustomRole {
  id: string;
  name: string;
  key: string;
  colorBg: string;
  colorText: string;
  level: number;
  permissions: PermissionType[];
}

interface PermissionsContextType {
  getEffectivePermissions: (roleKey: string) => PermissionType[];
  rolePerms: Record<string, PermissionType[]>;
  setRolePerms: React.Dispatch<React.SetStateAction<Record<string, PermissionType[]>>>;
  customRoles: CustomRole[];
  setCustomRoles: React.Dispatch<React.SetStateAction<CustomRole[]>>;
}

export const LS_PERMS_KEY = 'sm_role_permissions_v1';
export const LS_CUSTOM_ROLES_KEY = 'sm_custom_roles_v1';

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}

function initRolePerms(): Record<string, PermissionType[]> {
  const overrides = loadFromLS<Record<string, PermissionType[]>>(LS_PERMS_KEY, {});
  const crs = loadFromLS<CustomRole[]>(LS_CUSTOM_ROLES_KEY, []);
  const result: Record<string, PermissionType[]> = {};
  for (const role of Object.values(UserRole)) {
    result[role] = overrides[role] ?? [...(ROLE_PERMISSIONS[role as UserRoleType] ?? [])];
  }
  for (const cr of crs) {
    result[cr.key] = [...cr.permissions];
  }
  return result;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [rolePerms, setRolePerms] = useState<Record<string, PermissionType[]>>(initRolePerms);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() =>
    loadFromLS<CustomRole[]>(LS_CUSTOM_ROLES_KEY, [])
  );

  const getEffectivePermissions = useCallback((roleKey: string): PermissionType[] => {
    return rolePerms[roleKey] ?? ROLE_PERMISSIONS[roleKey as UserRoleType] ?? [];
  }, [rolePerms]);

  return (
    <PermissionsContext.Provider value={{ getEffectivePermissions, rolePerms, setRolePerms, customRoles, setCustomRoles }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsOverride() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissionsOverride must be used within PermissionsProvider');
  return ctx;
}
