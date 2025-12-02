import { UserModel } from "../modules/users/user.model.js";

/**
 * Helper function to get user role from token or DB (with caching per request)
 * This prevents multiple DB queries for the same request
 */
const getUserRole = async (req) => {
    // Role should always be in JWT token (from generateTokenFromUser)
    // But handle legacy tokens that might not have role
    if (req.user?.role) {
        return req.user.role;
    }

    // If role not in token, fetch from DB once and cache in req.user
    // This prevents race condition and multiple queries for the same request
    if (!req.user?.userId) {
        return null;
    }

    try {
        const user = await UserModel.findById(req.user.userId).select("role").lean();
        if (!user) {
            return null;
        }

        // Cache role in req.user to avoid future queries in the same request
        if (!req.user.role) {
            req.user.role = user.role;
        }

        return user.role;
    } catch (error) {
        console.error("[roleMiddleware] Error fetching user role:", error);
        return null;
    }
};

export const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            const userRole = await getUserRole(req);

            if (!userRole) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    message: "Insufficient permissions. Required roles: " + allowedRoles.join(", ")
                });
            }

            next();
        } catch (error) {
            console.error("[roleMiddleware] Error:", error);
            return res.status(500).json({
                message: "Authorization check failed"
            });
        }
    };
};

export const requireAnyRole = (allowedRoles) => {
    return requireRole(allowedRoles);
};

export const requireAllRoles = (requiredRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            const userRole = await getUserRole(req);

            if (!userRole) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            if (!requiredRoles.includes(userRole)) {
                return res.status(403).json({
                    message: "Insufficient permissions. Required all roles: " + requiredRoles.join(", ")
                });
            }

            next();
        } catch (error) {
            console.error("[roleMiddleware] Error:", error);
            return res.status(500).json({
                message: "Authorization check failed"
            });
        }
    };
};

export const ROLES = {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    HR_MANAGER: "HR_MANAGER",
    MANAGER: "MANAGER",
    EMPLOYEE: "EMPLOYEE"
};

export const hasMinimumRole = (userRole, minimumRole) => {
    const roleHierarchy = {
        [ROLES.EMPLOYEE]: 1,
        [ROLES.MANAGER]: 2,
        [ROLES.HR_MANAGER]: 3,
        [ROLES.ADMIN]: 4,
        [ROLES.SUPER_ADMIN]: 5
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const minimumLevel = roleHierarchy[minimumRole] || 0;

    return userLevel >= minimumLevel;
};

export const requireMinimumRole = (minimumRole) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            const userRole = await getUserRole(req);

            if (!userRole) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            if (!hasMinimumRole(userRole, minimumRole)) {
                return res.status(403).json({
                    message: `Insufficient permissions. Minimum role required: ${minimumRole}`
                });
            }

            next();
        } catch (error) {
            console.error("[roleMiddleware] Error:", error);
            return res.status(500).json({
                message: "Authorization check failed"
            });
        }
    };
};

