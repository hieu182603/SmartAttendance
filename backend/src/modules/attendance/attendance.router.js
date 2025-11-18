import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { getAttendanceHistory, checkIn } from './attendance.controller.js'

export const attendanceRouter = Router()

attendanceRouter.use(authMiddleware)

attendanceRouter.get('/history', getAttendanceHistory)
attendanceRouter.post('/checkin', checkIn)

