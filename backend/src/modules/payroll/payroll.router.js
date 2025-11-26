import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import {
  requireRole,
  ROLES,
} from "../../middleware/role.middleware.js";
import { getPayrollReports } from "./payroll.controller.js";

export const payrollRouter = Router();

payrollRouter.use(authMiddleware);

payrollRouter.get(
  "/reports",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getPayrollReports
);

