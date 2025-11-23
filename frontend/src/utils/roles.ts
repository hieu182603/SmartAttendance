// Role-Based Access Control (RBAC) System
// Defines roles, permissions, and helper functions

export const UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    HR_MANAGER: 'HR_MANAGER',
    MANAGER: 'MANAGER',
    EMPLOYEE: 'EMPLOYEE'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Role hierarchy - higher number = more permissions
export const ROLE_HIERARCHY: Record<UserRoleType, number> = {
    [UserRole.SUPER_ADMIN]: 5,
    [UserRole.ADMIN]: 4,
    [UserRole.HR_MANAGER]: 3,
    [UserRole.MANAGER]: 2,
    [UserRole.EMPLOYEE]: 1,
};

// Role display names (English)
export const ROLE_NAMES: Record<UserRoleType, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.HR_MANAGER]: 'HR Manager',
    [UserRole.MANAGER]: 'Manager',
    [UserRole.EMPLOYEE]: 'Employee',
};

// Role badge colors
export interface RoleColor {
    bg: string;
    text: string;
}

export const ROLE_COLORS: Record<UserRoleType, RoleColor> = {
    [UserRole.SUPER_ADMIN]: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
    [UserRole.ADMIN]: { bg: 'bg-red-500/20', text: 'text-red-500' },
    [UserRole.HR_MANAGER]: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
    [UserRole.MANAGER]: { bg: 'bg-green-500/20', text: 'text-green-500' },
    [UserRole.EMPLOYEE]: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
};

// Permission types
export const Permission = {
    // Attendance
    VIEW_OWN_ATTENDANCE: 'VIEW_OWN_ATTENDANCE',
    VIEW_ALL_ATTENDANCE: 'VIEW_ALL_ATTENDANCE',
    MANUAL_CHECKIN: 'MANUAL_CHECKIN',

    // Requests
    CREATE_REQUEST: 'CREATE_REQUEST',
    APPROVE_REQUEST: 'APPROVE_REQUEST',
    APPROVE_ALL_REQUESTS: 'APPROVE_ALL_REQUESTS',

    // Analytics
    VIEW_ANALYTICS: 'VIEW_ANALYTICS',
    VIEW_REPORTS: 'VIEW_REPORTS',

    // User Management
    VIEW_USERS: 'VIEW_USERS',
    MANAGE_USERS: 'MANAGE_USERS',

    // System
    MANAGE_SYSTEM: 'MANAGE_SYSTEM',
} as const;

export type PermissionType = typeof Permission[keyof typeof Permission];

// Role to Permissions mapping
export const ROLE_PERMISSIONS: Record<UserRoleType, PermissionType[]> = {
    [UserRole.EMPLOYEE]: [
        Permission.VIEW_OWN_ATTENDANCE,
        Permission.CREATE_REQUEST,
    ],

    [UserRole.MANAGER]: [
        Permission.VIEW_OWN_ATTENDANCE,
        Permission.VIEW_ALL_ATTENDANCE,
        Permission.CREATE_REQUEST,
        Permission.APPROVE_REQUEST,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_REPORTS,
    ],

    [UserRole.HR_MANAGER]: [
        Permission.VIEW_OWN_ATTENDANCE,
        Permission.VIEW_ALL_ATTENDANCE,
        Permission.CREATE_REQUEST,
        Permission.APPROVE_ALL_REQUESTS,
        Permission.MANUAL_CHECKIN,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_USERS,
        Permission.MANAGE_USERS,
    ],

    [UserRole.ADMIN]: [
        Permission.VIEW_OWN_ATTENDANCE,
        Permission.VIEW_ALL_ATTENDANCE,
        Permission.CREATE_REQUEST,
        Permission.APPROVE_ALL_REQUESTS,
        Permission.MANUAL_CHECKIN,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_USERS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_SYSTEM,
    ],

    [UserRole.SUPER_ADMIN]: Object.values(Permission) as PermissionType[], // All permissions
};

// Helper Functions

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRoleType, permission: PermissionType): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions.includes(permission) : false;
}

/**
 * Check if a role has minimum required level
 */
export function hasMinimumLevel(userRole: UserRoleType, requiredRole: UserRoleType): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a role can manage another role
 * A role can only manage roles below their level
 */
export function canManageRole(managerRole: UserRoleType, targetRole: UserRoleType): boolean {
    // SUPER_ADMIN can manage all
    if (managerRole === UserRole.SUPER_ADMIN) return true;

    // Others can only manage roles below them
    return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get display name for a role
 */
export function getRoleName(role: UserRoleType): string {
    return ROLE_NAMES[role] || role;
}

/**
 * Get color for role badge
 */
export function getRoleColor(role: UserRoleType): RoleColor {
    return ROLE_COLORS[role] || { bg: 'bg-gray-500/20', text: 'text-gray-500' };
}

/**
 * Check if user can access admin panel
 */
export function canAccessAdminPanel(role: UserRoleType): boolean {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[UserRole.MANAGER];
}

/**
 * Check if user can approve requests
 */
export function canApproveRequests(role: UserRoleType): boolean {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[UserRole.MANAGER];
}

/**
 * Get scope for a role (what data they can access)
 */
export function getRoleScope(role: UserRoleType): 'all' | 'department' | 'own' {
    switch (role) {
        case UserRole.SUPER_ADMIN:
        case UserRole.ADMIN:
        case UserRole.HR_MANAGER:
            return 'all';
        case UserRole.MANAGER:
            return 'department';
        case UserRole.EMPLOYEE:
        default:
            return 'own';
    }
}




