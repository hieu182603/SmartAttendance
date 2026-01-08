/**
 * Role-Based Access Control (RBAC) Configuration
 * Centralized role definitions and hierarchy for backend
 * This ensures consistency across all backend modules
 */

export const ROLES = {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    HR_MANAGER: "HR_MANAGER",
    MANAGER: "MANAGER",
    EMPLOYEE: "EMPLOYEE",
    TRIAL: "TRIAL"
};

/**
 * Role hierarchy - higher number = more permissions
 * This must match the frontend role hierarchy in frontend/src/utils/roles.ts
 */
export const ROLE_HIERARCHY = {
    [ROLES.TRIAL]: 0,        // Trial users have minimal permissions
    [ROLES.EMPLOYEE]: 1,
    [ROLES.MANAGER]: 2,
    [ROLES.HR_MANAGER]: 3,
    [ROLES.ADMIN]: 4,
    [ROLES.SUPER_ADMIN]: 5
};

/**
 * Check if a role has minimum required level
 * @param {string} userRole - The user's role
 * @param {string} minimumRole - The minimum required role
 * @returns {boolean} - True if userRole has at least the minimum level
 */
export const hasMinimumRole = (userRole, minimumRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0;
    return userLevel >= minimumLevel;
};

/**
 * Check if a role can manage another role
 * A role can only manage roles below their level
 * @param {string} managerRole - The role trying to manage
 * @param {string} targetRole - The role being managed
 * @returns {boolean} - True if managerRole can manage targetRole
 */
export const canManageRole = (managerRole, targetRole) => {
    // SUPER_ADMIN can manage all
    if (managerRole === ROLES.SUPER_ADMIN) return true;
    
    // Others can only manage roles below them
    const managerLevel = ROLE_HIERARCHY[managerRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    return managerLevel > targetLevel;
};

