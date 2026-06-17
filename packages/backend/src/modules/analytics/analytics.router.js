import { Router } from "express";
import { AnalyticsController } from "./analytics.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

analyticsRouter.get(
  "/report",
  requireRole([ROLES.SUPER_ADMIN]),
  AnalyticsController.getReport
);

analyticsRouter.get(
  "/realtime",
  requireRole([ROLES.SUPER_ADMIN]),
  AnalyticsController.getRealtime
);
