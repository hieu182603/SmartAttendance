import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import {
  requireRole,
  ROLES,
} from "../../middleware/role.middleware.js";
import {
  getPayrollReports,
  getPayrollRecords,
  getPayrollRecordById,
  approvePayrollRecord,
  markPayrollAsPaid,
  getDepartments,
} from "./payroll.controller.js";

export const payrollRouter = Router();

payrollRouter.use(authMiddleware);

// Reports endpoint
payrollRouter.get(
  "/reports",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getPayrollReports
);

// Payroll records endpoints
payrollRouter.get(
  "/",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getPayrollRecords
);

payrollRouter.get(
  "/:id",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getPayrollRecordById
);

payrollRouter.put(
  "/:id/approve",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  approvePayrollRecord
);

payrollRouter.put(
  "/:id/pay",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  markPayrollAsPaid
);

// Get departments
payrollRouter.get(
  "/meta/departments",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getDepartments
);

