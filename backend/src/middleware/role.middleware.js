import { UserModel } from "../modules/users/user.model.js";

export const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            let userRole = req.user.role;

            if (!userRole) {
                const user = await UserModel.findById(req.user.userId).select("role");
                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                }
                userRole = user.role;
                req.user.role = userRole;
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

            let userRole = req.user.role;
            if (!userRole) {
                const user = await UserModel.findById(req.user.userId).select("role");
                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                }
                userRole = user.role;
                req.user.role = userRole;
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

            let userRole = req.user.role;
            if (!userRole) {
                const user = await UserModel.findById(req.user.userId).select("role");
                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                }
                userRole = user.role;
                req.user.role = userRole;
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

