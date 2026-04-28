import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
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
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER]),
  listConfigs
);

configRouter.get(
  "/:key",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER]),
  getConfigByKey
);

configRouter.post(
  "/",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  createConfig
);

configRouter.put(
  "/:key",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER]),
  updateConfig
);

configRouter.delete(
  "/:key",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  deleteConfig
);
