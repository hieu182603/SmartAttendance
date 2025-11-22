import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

dashboardRouter.get(
  "/stats",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]),
  DashboardController.getDashboardStats
);


