import { Router } from "express";
import { upload } from "../../middleware/upload.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import {
  getAttendanceHistory,
  getRecentAttendance,
  checkIn,
  getAttendanceAnalytics,
  getAllAttendance,
  exportAttendanceAnalytics,
  getDepartmentAttendance,
} from "./attendance.controller.js";

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware);

attendanceRouter.get("/history", getAttendanceHistory);
attendanceRouter.get("/recent", getRecentAttendance);
attendanceRouter.post("/checkin", upload.single("photo"), checkIn);

attendanceRouter.get(
  "/analytics",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
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
    ROLES.SUPER_ADMIN,
  ]),
  exportAttendanceAnalytics
);
attendanceRouter.get(
  "/all",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  getAllAttendance
);
attendanceRouter.get(
  "/department",
  requireRole([ROLES.MANAGER]),
  getDepartmentAttendance
);
