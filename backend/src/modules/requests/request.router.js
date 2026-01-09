import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { requireRole, ROLES } from '../../middleware/role.middleware.js'
import { createRequest, getMyRequests, getAllRequests, approveRequest, rejectRequest, getRequestTypes, bulkApproveRequests, bulkRejectRequests } from './request.controller.js'

export const requestRouter = Router()

requestRouter.use(authMiddleware)

requestRouter.get('/types', getRequestTypes)
requestRouter.get('/my', getMyRequests)
requestRouter.post('/', createRequest)

requestRouter.get('/', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]), getAllRequests)
requestRouter.post('/:id/approve', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]), approveRequest)
requestRouter.post('/:id/reject', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]), rejectRequest)
requestRouter.post('/bulk-approve', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]), bulkApproveRequests)
requestRouter.post('/bulk-reject', requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]), bulkRejectRequests)

