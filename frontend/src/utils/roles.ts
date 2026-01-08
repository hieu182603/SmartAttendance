// Role-Based Access Control (RBAC) System
// Defines roles, permissions, and helper functions

export const UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    HR_MANAGER: 'HR_MANAGER',
    MANAGER: 'MANAGER',
    EMPLOYEE: 'EMPLOYEE',
    TRIAL: 'TRIAL'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Role hierarchy - higher number = more permissions
// IMPORTANT: This must match backend/src/config/roles.config.js ROLE_HIERARCHY
// If you change this, you must also update the backend file
export const ROLE_HIERARCHY: Record<UserRoleType, number> = {
    [UserRole.SUPER_ADMIN]: 5,
    [UserRole.ADMIN]: 4,
    [UserRole.HR_MANAGER]: 3,
    [UserRole.MANAGER]: 2,
    [UserRole.EMPLOYEE]: 1,
    [UserRole.TRIAL]: 0,      // Trial users have minimal permissions
};

// Role display names (English)
export const ROLE_NAMES: Record<UserRoleType, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.HR_MANAGER]: 'HR Manager',
    [UserRole.MANAGER]: 'Manager',
    [UserRole.EMPLOYEE]: 'Employee',
    [UserRole.TRIAL]: 'Trial User',
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
    [UserRole.TRIAL]: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
};

// Permission types - Fine-grained permissions
export const Permission = {
    // Attendance - Fine-grained
    ATTENDANCE_VIEW_OWN: 'ATTENDANCE_VIEW_OWN',
    ATTENDANCE_VIEW_DEPARTMENT: 'ATTENDANCE_VIEW_DEPARTMENT',
    ATTENDANCE_VIEW_ALL: 'ATTENDANCE_VIEW_ALL',
    ATTENDANCE_MANUAL_CHECKIN: 'ATTENDANCE_MANUAL_CHECKIN',
    ATTENDANCE_APPROVE: 'ATTENDANCE_APPROVE',

    // Requests - Fine-grained
    REQUESTS_CREATE: 'REQUESTS_CREATE',
    REQUESTS_VIEW_OWN: 'REQUESTS_VIEW_OWN',
    REQUESTS_APPROVE_DEPARTMENT: 'REQUESTS_APPROVE_DEPARTMENT',
    REQUESTS_APPROVE_ALL: 'REQUESTS_APPROVE_ALL',

    // Analytics
    ANALYTICS_VIEW_DEPARTMENT: 'ANALYTICS_VIEW_DEPARTMENT',
    ANALYTICS_VIEW_ALL: 'ANALYTICS_VIEW_ALL',
    VIEW_REPORTS: 'VIEW_REPORTS',

    // User Management - Fine-grained
    USERS_VIEW: 'USERS_VIEW',
    USERS_CREATE: 'USERS_CREATE',
    USERS_UPDATE: 'USERS_UPDATE',
    USERS_DELETE: 'USERS_DELETE',
    USERS_MANAGE_ROLE: 'USERS_MANAGE_ROLE',

    // Payroll
    PAYROLL_VIEW: 'PAYROLL_VIEW',
    PAYROLL_MANAGE: 'PAYROLL_MANAGE',
    PAYROLL_EXPORT: 'PAYROLL_EXPORT',

    // Departments
    DEPARTMENTS_VIEW: 'DEPARTMENTS_VIEW',
    DEPARTMENTS_MANAGE: 'DEPARTMENTS_MANAGE',

    // Branches
    BRANCHES_VIEW: 'BRANCHES_VIEW',
    BRANCHES_MANAGE: 'BRANCHES_MANAGE',

    // System
    SYSTEM_SETTINGS_VIEW: 'SYSTEM_SETTINGS_VIEW',
    SYSTEM_SETTINGS_UPDATE: 'SYSTEM_SETTINGS_UPDATE',
    AUDIT_LOGS_VIEW: 'AUDIT_LOGS_VIEW',

    // Legacy permissions (keep for backward compatibility)
    VIEW_OWN_ATTENDANCE: 'ATTENDANCE_VIEW_OWN',
    VIEW_ALL_ATTENDANCE: 'ATTENDANCE_VIEW_ALL',
    MANUAL_CHECKIN: 'ATTENDANCE_MANUAL_CHECKIN',
    CREATE_REQUEST: 'REQUESTS_CREATE',
    APPROVE_REQUEST: 'REQUESTS_APPROVE_DEPARTMENT',
    APPROVE_ALL_REQUESTS: 'REQUESTS_APPROVE_ALL',
    VIEW_ANALYTICS: 'ANALYTICS_VIEW_DEPARTMENT',
    VIEW_USERS: 'USERS_VIEW',
    MANAGE_USERS: 'USERS_CREATE', // Default to CREATE for backward compatibility
    MANAGE_SYSTEM: 'SYSTEM_SETTINGS_UPDATE',
} as const;

export type PermissionType = typeof Permission[keyof typeof Permission];

// Role to Permissions mapping
export const ROLE_PERMISSIONS: Record<UserRoleType, PermissionType[]> = {
    [UserRole.TRIAL]: [
        Permission.ATTENDANCE_VIEW_OWN,
        Permission.REQUESTS_CREATE,
        Permission.REQUESTS_VIEW_OWN,
    ],

    [UserRole.EMPLOYEE]: [
        Permission.ATTENDANCE_VIEW_OWN,
        Permission.REQUESTS_CREATE,
        Permission.REQUESTS_VIEW_OWN,
    ],

    [UserRole.MANAGER]: [
        Permission.ATTENDANCE_VIEW_OWN,
        Permission.ATTENDANCE_VIEW_DEPARTMENT,
        Permission.REQUESTS_CREATE,
        Permission.REQUESTS_VIEW_OWN,
        Permission.REQUESTS_APPROVE_DEPARTMENT,
        Permission.ANALYTICS_VIEW_DEPARTMENT,
        Permission.VIEW_REPORTS,
    ],

    [UserRole.HR_MANAGER]: [
        Permission.ATTENDANCE_VIEW_OWN,
        Permission.ATTENDANCE_VIEW_ALL,
        Permission.ATTENDANCE_MANUAL_CHECKIN,
        Permission.REQUESTS_CREATE,
        Permission.REQUESTS_VIEW_OWN,
        Permission.REQUESTS_APPROVE_ALL,
        Permission.ANALYTICS_VIEW_ALL,
        Permission.VIEW_REPORTS,
        Permission.USERS_VIEW,
        Permission.USERS_CREATE,
        Permission.USERS_UPDATE,
        Permission.PAYROLL_VIEW,
    ],

    [UserRole.ADMIN]: [
        Permission.ATTENDANCE_VIEW_ALL,
        Permission.ATTENDANCE_MANUAL_CHECKIN,
        Permission.ATTENDANCE_APPROVE,
        Permission.REQUESTS_APPROVE_ALL,
        Permission.ANALYTICS_VIEW_ALL,
        Permission.VIEW_REPORTS,
        Permission.USERS_VIEW,
        Permission.USERS_CREATE,
        Permission.USERS_UPDATE,
        Permission.USERS_DELETE,
        Permission.USERS_MANAGE_ROLE,
        Permission.PAYROLL_VIEW,
        Permission.PAYROLL_MANAGE,
        Permission.PAYROLL_EXPORT,
        Permission.DEPARTMENTS_VIEW,
        Permission.DEPARTMENTS_MANAGE,
        Permission.BRANCHES_VIEW,
        Permission.BRANCHES_MANAGE,
        Permission.SYSTEM_SETTINGS_VIEW,
        Permission.SYSTEM_SETTINGS_UPDATE,
        Permission.AUDIT_LOGS_VIEW,
    ],

    [UserRole.SUPER_ADMIN]: [
        // Attendance
        Permission.ATTENDANCE_VIEW_OWN,
        Permission.ATTENDANCE_VIEW_DEPARTMENT,
        Permission.ATTENDANCE_VIEW_ALL,
        Permission.ATTENDANCE_MANUAL_CHECKIN,
        Permission.ATTENDANCE_APPROVE,
        // Requests
        Permission.REQUESTS_CREATE,
        Permission.REQUESTS_VIEW_OWN,
        Permission.REQUESTS_APPROVE_DEPARTMENT,
        Permission.REQUESTS_APPROVE_ALL,
        // Analytics
        Permission.ANALYTICS_VIEW_DEPARTMENT,
        Permission.ANALYTICS_VIEW_ALL,
        Permission.VIEW_REPORTS,
        // User Management
        Permission.USERS_VIEW,
        Permission.USERS_CREATE,
        Permission.USERS_UPDATE,
        Permission.USERS_DELETE,
        Permission.USERS_MANAGE_ROLE,
        // Payroll
        Permission.PAYROLL_VIEW,
        Permission.PAYROLL_MANAGE,
        Permission.PAYROLL_EXPORT,
        // Departments
        Permission.DEPARTMENTS_VIEW,
        Permission.DEPARTMENTS_MANAGE,
        // Branches
        Permission.BRANCHES_VIEW,
        Permission.BRANCHES_MANAGE,
        // System
        Permission.SYSTEM_SETTINGS_VIEW,
        Permission.SYSTEM_SETTINGS_UPDATE,
        Permission.AUDIT_LOGS_VIEW,
    ] as PermissionType[], // All permissions (explicit list to avoid duplicates from legacy permissions)
};

// Helper Functions

/**
 * Check if a role has a specific permission (with hierarchy support)
 * Higher level permissions automatically grant access to lower level permissions
 */
export function hasPermission(role: UserRoleType, permission: PermissionType): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    
    // Direct permission check
    if (permissions.includes(permission)) return true;
    
    // Check for higher level permissions (hierarchy)
    const permissionHierarchy: Record<string, string[]> = {
        [Permission.REQUESTS_APPROVE_DEPARTMENT]: [Permission.REQUESTS_APPROVE_ALL],
        [Permission.ATTENDANCE_VIEW_DEPARTMENT]: [Permission.ATTENDANCE_VIEW_ALL],
        [Permission.ANALYTICS_VIEW_DEPARTMENT]: [Permission.ANALYTICS_VIEW_ALL],
        [Permission.ATTENDANCE_VIEW_OWN]: [Permission.ATTENDANCE_VIEW_DEPARTMENT, Permission.ATTENDANCE_VIEW_ALL],
        [Permission.REQUESTS_VIEW_OWN]: [Permission.REQUESTS_APPROVE_DEPARTMENT, Permission.REQUESTS_APPROVE_ALL],
    };
    
    const higherPermissions = permissionHierarchy[permission] || [];
    return higherPermissions.some(perm => permissions.includes(perm as PermissionType));
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

/**
 * Get base path for a role (URL prefix)
 */
export function getRoleBasePath(role: UserRoleType): string {
    switch (role) {
        case UserRole.SUPER_ADMIN:
        case UserRole.ADMIN:
            return '/admin';
        case UserRole.HR_MANAGER:
            return '/hr';
        case UserRole.MANAGER:
            return '/manager';
        case UserRole.EMPLOYEE:
        default:
            return '/employee';
    }
}

/**
 * Get all base paths that a role can access (including lower level paths)
 */
export function getAccessibleBasePaths(role: UserRoleType): string[] {
    const paths: string[] = ['/employee']; // All roles can access employee routes
    
    if (hasMinimumLevel(role, UserRole.MANAGER)) {
        paths.push('/manager');
    }
    if (hasMinimumLevel(role, UserRole.HR_MANAGER)) {
        paths.push('/hr');
    }
    if (hasMinimumLevel(role, UserRole.ADMIN)) {
        paths.push('/admin');
    }
    
    return paths;
}

/**
 * Get position/chức danh display name for a role
 */
export function getRolePosition(role: UserRoleType): string {
    switch (role) {
        case UserRole.SUPER_ADMIN:
            return 'Super Admin';
        case UserRole.ADMIN:
            return 'Admin Manager';
        case UserRole.HR_MANAGER:
            return 'HR Manager';
        case UserRole.MANAGER:
            return 'Manager';
        case UserRole.EMPLOYEE:
        default:
            return 'Employee';
    }
}




