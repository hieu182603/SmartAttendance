import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import { getAll, update, checkFeature, getEffectiveToggles } from "./featureToggle.controller.js";

export const featureToggleRouter = Router();

// Public check (any authenticated user)
featureToggleRouter.get("/check/:featureKey", authMiddleware, checkFeature);

// Effective state for all features, scoped to the requesting user (any authenticated user)
featureToggleRouter.get("/effective", authMiddleware, getEffectiveToggles);

// SUPER_ADMIN only
featureToggleRouter.get("/", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), getAll);
featureToggleRouter.put("/:featureKey", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), update);
