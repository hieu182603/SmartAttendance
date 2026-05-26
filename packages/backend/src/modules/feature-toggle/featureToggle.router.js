import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import { getAll, update, create, remove, checkFeature } from "./featureToggle.controller.js";

export const featureToggleRouter = Router();

// Public check (any authenticated user)
featureToggleRouter.get("/check/:featureKey", authMiddleware, checkFeature);

// SUPER_ADMIN only
featureToggleRouter.get("/", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), getAll);
featureToggleRouter.post("/", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), create);
featureToggleRouter.put("/:featureKey", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), update);
featureToggleRouter.delete("/:featureKey", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), remove);
