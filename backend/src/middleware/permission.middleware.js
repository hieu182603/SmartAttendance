import { SystemConfigModel } from "../modules/config/config.model.js";
import { ROLE_PERMISSIONS, hasPermissionFromList } from "../config/permissions.config.js";
import { ROLES } from "../config/roles.config.js";

const ROLE_PERMISSION_CONFIG_KEY = "SECURITY_ROLE_PERMISSIONS";
const CACHE_TTL_MS = 60_000;
let cachedRolePermissions = null;
let cacheExpiresAt = 0;

const getRolePermissionsMap = async () => {
  const now = Date.now();
  if (cachedRolePermissions && cacheExpiresAt > now) {
    return cachedRolePermissions;
  }

  const defaults = {};
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    defaults[role] = [...perms];
  }

  const doc = await SystemConfigModel.findOne({ key: ROLE_PERMISSION_CONFIG_KEY }).lean();
  if (!doc || typeof doc.value !== "object" || doc.value == null) {
    cachedRolePermissions = defaults;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return cachedRolePermissions;
  }

  const merged = { ...defaults };
  for (const [role, perms] of Object.entries(doc.value)) {
    if (Array.isArray(perms)) {
      merged[role] = Array.from(new Set(perms.filter((p) => typeof p === "string")));
    }
  }

  cachedRolePermissions = merged;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return merged;
};

export const invalidatePermissionCache = () => {
  cachedRolePermissions = null;
  cacheExpiresAt = 0;
};

export const getEffectivePermissionsByRole = async (role) => {
  const rolePerms = await getRolePermissionsMap();
  return rolePerms[role] ?? [];
};

export const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      if (!userRole) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (userRole === ROLES.SUPER_ADMIN) {
        return next();
      }

      const effectivePermissions = await getEffectivePermissionsByRole(userRole);
      req.user.permissions = effectivePermissions;

      if (!hasPermissionFromList(effectivePermissions, requiredPermission)) {
        return res.status(403).json({
          message: `Insufficient permission: ${requiredPermission}`,
        });
      }

      next();
    } catch (error) {
      console.error("[permissionMiddleware] Error:", error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
};

export const requireAnyPermission = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      if (!userRole) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (userRole === ROLES.SUPER_ADMIN) {
        return next();
      }

      const effectivePermissions = await getEffectivePermissionsByRole(userRole);
      req.user.permissions = effectivePermissions;

      const hasAny = requiredPermissions.some((permission) =>
        hasPermissionFromList(effectivePermissions, permission)
      );
      if (!hasAny) {
        return res.status(403).json({
          message: `Insufficient permissions. Need one of: ${requiredPermissions.join(", ")}`,
        });
      }

      next();
    } catch (error) {
      console.error("[permissionMiddleware] Error:", error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
};

