import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { getAttendanceHistory } from './attendance.controller.js'

export const attendanceRouter = Router()

attendanceRouter.use(authMiddleware)

attendanceRouter.get('/history', getAttendanceHistory)

