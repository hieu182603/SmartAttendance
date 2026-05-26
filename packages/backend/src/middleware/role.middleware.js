import { UserModel } from "../modules/users/user.model.js";
import { ROLES, ROLE_HIERARCHY, hasMinimumRole, canManageRole } from "../config/roles.config.js";

/**
 * Helper function to get user role from token or DB (with caching per request)
 * This prevents multiple DB queries for the same request
 */
const getUserRole = async (req) => {
    // Prefer role loaded from DB in authMiddleware (userContext / req.user.role)
    if (req.user?.userContext?.role) {
        return req.user.userContext.role;
    }
    if (req.user?.role) {
        return req.user.role;
    }

    // Legacy tokens: fetch from DB once and cache in req.user
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

// Re-export ROLES and hasMinimumRole for backward compatibility
export { ROLES, hasMinimumRole, canManageRole };

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

