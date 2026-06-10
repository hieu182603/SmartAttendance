import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { requireRole, ROLES } from '../../middleware/role.middleware.js'
import { requireAnyPermission, requirePermission } from '../../middleware/permission.middleware.js'
import { PERMISSIONS } from '../../config/permissions.config.js'
import { requireFeatureEnabled } from '../../middleware/featureToggle.middleware.js'
import { createRequest, getMyRequests, getAllRequests, approveRequest, rejectRequest, getRequestTypes, bulkApproveRequests, bulkRejectRequests } from './request.controller.js'

export const requestRouter = Router()

requestRouter.use(authMiddleware)
// Gate the entire requests module on the 'leave_management' feature toggle.
requestRouter.use(requireFeatureEnabled('leave_management'))

requestRouter.get('/types', requirePermission(PERMISSIONS.REQUESTS_VIEW_OWN), getRequestTypes)
requestRouter.get('/my', requirePermission(PERMISSIONS.REQUESTS_VIEW_OWN), getMyRequests)
requestRouter.post('/', requirePermission(PERMISSIONS.REQUESTS_CREATE), createRequest)

requestRouter.get(
  '/',
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]),
  requireAnyPermission([PERMISSIONS.REQUESTS_APPROVE_DEPARTMENT, PERMISSIONS.REQUESTS_APPROVE_ALL]),
  getAllRequests
)
requestRouter.post(
  '/:id/approve',
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]),
  requireAnyPermission([PERMISSIONS.REQUESTS_APPROVE_DEPARTMENT, PERMISSIONS.REQUESTS_APPROVE_ALL]),
  approveRequest
)
requestRouter.post(
  '/:id/reject',
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]),
  requireAnyPermission([PERMISSIONS.REQUESTS_APPROVE_DEPARTMENT, PERMISSIONS.REQUESTS_APPROVE_ALL]),
  rejectRequest
)
requestRouter.post(
  '/bulk-approve',
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]),
  requireAnyPermission([PERMISSIONS.REQUESTS_APPROVE_DEPARTMENT, PERMISSIONS.REQUESTS_APPROVE_ALL]),
  bulkApproveRequests
)
requestRouter.post(
  '/bulk-reject',
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER, ROLES.SUPER_ADMIN]),
  requireAnyPermission([PERMISSIONS.REQUESTS_APPROVE_DEPARTMENT, PERMISSIONS.REQUESTS_APPROVE_ALL]),
  bulkRejectRequests
)

