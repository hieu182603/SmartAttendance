
import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { getAttendanceHistory, checkIn } from "./attendance.controller.js";

import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { requireRole, ROLES } from '../../middleware/role.middleware.js'
import { getAttendanceHistory, checkIn, getAttendanceAnalytics, getAllAttendance, exportAttendanceAnalytics } from './attendance.controller.js'

export const attendanceRouter = Router();

// multer in memory storage (we'll upload buffer directly to cloud)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

attendanceRouter.use(authMiddleware);


attendanceRouter.get("/history", getAttendanceHistory);
// Accept optional file field named 'photo'
attendanceRouter.post("/checkin", upload.single("photo"), checkIn);

attendanceRouter.get('/analytics', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]), getAttendanceAnalytics)
attendanceRouter.get('/analytics/export', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]), exportAttendanceAnalytics)
attendanceRouter.get('/all', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), getAllAttendance)
