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
  getPositions,
} from "./payroll.controller.js";
import {
  getSalaryMatrix,
  getSalaryMatrixById,
  createSalaryMatrix,
  updateSalaryMatrix,
  deleteSalaryMatrix,
  updateUserBaseSalary,
  getUserSalaryInfo,
} from "./payroll-salary.controller.js";

export const payrollRouter = Router();

payrollRouter.use(authMiddleware);

// Reports endpoint
payrollRouter.get(
  "/reports",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getPayrollReports
);

// ============================================================================
// Specific routes (MUST be defined BEFORE dynamic routes like /:id)
// ============================================================================

// Get departments
payrollRouter.get(
  "/meta/departments",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getDepartments
);

// Get positions
payrollRouter.get(
  "/meta/positions",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getPositions
);

// ============================================================================
// Salary Matrix Management (Quản lý thang lương)
// ============================================================================

// Salary Matrix CRUD - MUST be before /:id route
payrollRouter.get(
  "/salary-matrix",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getSalaryMatrix
);

payrollRouter.post(
  "/salary-matrix",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  createSalaryMatrix
);

payrollRouter.get(
  "/salary-matrix/:id",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getSalaryMatrixById
);

payrollRouter.put(
  "/salary-matrix/:id",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  updateSalaryMatrix
);

payrollRouter.delete(
  "/salary-matrix/:id",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  deleteSalaryMatrix
);

// ============================================================================
// User Base Salary Management (Quản lý lương cơ bản của user)
// ============================================================================

payrollRouter.get(
  "/users/:id/salary-info",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getUserSalaryInfo
);

payrollRouter.put(
  "/users/:id/base-salary",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  updateUserBaseSalary
);

// ============================================================================
// Payroll records endpoints (Dynamic routes - MUST be LAST)
// ============================================================================

// Payroll records list
payrollRouter.get(
  "/",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getPayrollRecords
);

// Payroll record by ID - This MUST be after all specific routes
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

