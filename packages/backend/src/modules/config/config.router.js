import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { PERMISSIONS } from "../../config/permissions.config.js";
import {
  listConfigs,
  getConfigByKey,
  createConfig,
  updateConfig,
  deleteConfig,
} from "./config.controller.js";

export const configRouter = Router();

configRouter.use(authMiddleware);

configRouter.get(
  "/",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.SYSTEM_SETTINGS_VIEW),
  listConfigs
);

configRouter.get(
  "/:key",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.SYSTEM_SETTINGS_VIEW),
  getConfigByKey
);

configRouter.post(
  "/",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.SYSTEM_SETTINGS_UPDATE),
  createConfig
);

configRouter.put(
  "/:key",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.SYSTEM_SETTINGS_UPDATE),
  updateConfig
);

configRouter.delete(
  "/:key",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.SYSTEM_SETTINGS_UPDATE),
  deleteConfig
);
