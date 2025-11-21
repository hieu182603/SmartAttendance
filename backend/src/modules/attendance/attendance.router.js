import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { requireRole, ROLES } from '../../middleware/role.middleware.js'
import { getAttendanceHistory, checkIn, getAttendanceAnalytics, getAllAttendance, exportAttendanceAnalytics } from './attendance.controller.js'

export const attendanceRouter = Router()

attendanceRouter.use(authMiddleware)

attendanceRouter.get('/history', getAttendanceHistory)
attendanceRouter.post('/checkin', checkIn)

attendanceRouter.get('/analytics', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]), getAttendanceAnalytics)
attendanceRouter.get('/analytics/export', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]), exportAttendanceAnalytics)
attendanceRouter.get('/all', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]), getAllAttendance)

