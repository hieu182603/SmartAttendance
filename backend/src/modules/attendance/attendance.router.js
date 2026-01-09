import { Router } from "express";
import { upload } from "../../middleware/upload.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import {
  getAttendanceHistory,
  getRecentAttendance,
  checkIn,
  checkOut,
  getAttendanceAnalytics,
  getAllAttendance,
  exportAttendanceAnalytics,
  getDepartmentAttendance,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  approveEarlyCheckout,
  getPendingEarlyCheckouts,
} from "./attendance.controller.js";

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware);

attendanceRouter.get("/history", getAttendanceHistory);
attendanceRouter.get("/recent", getRecentAttendance);
attendanceRouter.post("/checkin", upload.single("photo"), checkIn);
attendanceRouter.post("/checkout", upload.single("photo"), checkOut);

attendanceRouter.get(
  "/analytics",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.SUPER_ADMIN,
  ]),
  getAttendanceAnalytics
);
attendanceRouter.get(
  "/analytics/export",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.SUPER_ADMIN,
  ]),
  exportAttendanceAnalytics
);
attendanceRouter.get(
  "/all",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  getAllAttendance
);
attendanceRouter.patch(
  "/:id",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  updateAttendanceRecord
);
attendanceRouter.delete(
  "/:id",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  deleteAttendanceRecord
);
attendanceRouter.get(
  "/department",
  requireRole([ROLES.MANAGER, ROLES.SUPERVISOR]),
  getDepartmentAttendance
);
attendanceRouter.get(
  "/pending-early-checkouts",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.SUPER_ADMIN,
  ]),
  getPendingEarlyCheckouts
);
attendanceRouter.patch(
  "/:id/approve",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.SUPER_ADMIN,
  ]),
  approveEarlyCheckout
);
