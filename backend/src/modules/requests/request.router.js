import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { createRequest, getMyRequests } from './request.controller.js'

export const requestRouter = Router()

requestRouter.use(authMiddleware)

requestRouter.get('/my', getMyRequests)
requestRouter.post('/', createRequest)

