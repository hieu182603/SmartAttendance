import { Router } from "express";
import { upload } from "../../middleware/upload.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permission.middleware.js";
import { PERMISSIONS } from "../../config/permissions.config.js";
import { checkinRateLimiter } from "../../middleware/security.middleware.js";
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
  createManualAttendance,
} from "./attendance.controller.js";

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware);

attendanceRouter.get("/history", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN), getAttendanceHistory);
attendanceRouter.get("/recent", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN), getRecentAttendance);
attendanceRouter.post("/checkin", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN), checkinRateLimiter, upload.single("photo"), checkIn);
attendanceRouter.post("/checkout", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN), checkinRateLimiter, upload.single("photo"), checkOut);

// HR/Admin tạo bản ghi chấm công thủ công (cho nhân viên quên check-in)
attendanceRouter.post(
  "/",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.ATTENDANCE_MANUAL_CHECKIN),
  createManualAttendance
);

attendanceRouter.get(
  "/analytics",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.SUPER_ADMIN,
  ]),
  requireAnyPermission([PERMISSIONS.ANALYTICS_VIEW_DEPARTMENT, PERMISSIONS.ANALYTICS_VIEW_ALL]),
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
  requirePermission(PERMISSIONS.VIEW_REPORTS),
  exportAttendanceAnalytics
);
attendanceRouter.get(
  "/all",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW_ALL),
  getAllAttendance
);
// ⚠️ Specific routes MUST be defined BEFORE generic parameterized routes
// to prevent Express from matching them incorrectly
attendanceRouter.get(
  "/department",
  requireRole([ROLES.MANAGER, ROLES.SUPERVISOR]),
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW_DEPARTMENT),
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
  requirePermission(PERMISSIONS.ATTENDANCE_APPROVE),
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
  requirePermission(PERMISSIONS.ATTENDANCE_APPROVE),
  approveEarlyCheckout
);
// Generic parameterized routes should be defined LAST
attendanceRouter.patch(
  "/:id",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.ATTENDANCE_MANUAL_CHECKIN),
  updateAttendanceRecord
);
attendanceRouter.delete(
  "/:id",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.ATTENDANCE_MANUAL_CHECKIN),
  deleteAttendanceRecord
);
