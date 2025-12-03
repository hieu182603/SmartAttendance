// modules/shifts/shift.router.js
import express from "express";
import {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  assignShiftToEmployee,
  bulkAssignShift,
  getEmployeesByShift,
  removeShiftFromEmployee,
  getShiftEmployeeCounts,
  getUserAssignments,
  updateAssignment,
  deactivateAssignment,
  getMyShift,
  getMySchedule,
} from "./shift.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";

const router = express.Router();

// Routes đặc biệt phải đặt TRƯỚC route /:id
// Employee routes (cho phép tất cả authenticated users)
router.get("/my-shift", authMiddleware, getMyShift);
router.get("/my-schedule", authMiddleware, getMySchedule);
// Admin routes
router.get("/employee-counts", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), getShiftEmployeeCounts);
router.get("/assignments/user/:userId", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), getUserAssignments);
router.put("/assignments/:assignmentId", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), updateAssignment);
router.delete("/assignments/:assignmentId", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), deactivateAssignment);
router.get("/:shiftId/employees", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), getEmployeesByShift);
router.post("/:shiftId/assign", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), assignShiftToEmployee);
router.post("/:shiftId/assign/bulk", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), bulkAssignShift);
router.delete("/:shiftId/assign/:userId", authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), removeShiftFromEmployee);

// Routes CRUD cơ bản
router.get("/", getAllShifts);
router.get("/:id", getShiftById);
router.post("/", authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), createShift);
router.put("/:id", authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), updateShift);
router.delete("/:id", authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), deleteShift);

export const shiftRouter = router;
