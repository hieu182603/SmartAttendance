import { RequestModel } from './request.model.js'
import { RequestTypeModel } from './request-type.model.js'
import { BranchModel } from '../branches/branch.model.js'
import { DepartmentModel } from '../departments/department.model.js'

const formatDate = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('vi-VN')
}

const buildDuration = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1)
  return diff === 1 ? '1 ngày' : `${diff} ngày`
}

const getTitleByType = (type) => {
  const typeMap = {
    'leave': 'Nghỉ phép',
    'sick': 'Nghỉ ốm',
    'unpaid': 'Nghỉ không lương',
    'compensatory': 'Nghỉ bù',
    'maternity': 'Nghỉ thai sản',
    'overtime': 'Tăng ca',
    'remote': 'Làm từ xa',
    'late': 'Đi muộn',
    'correction': 'Sửa công',
    'other': 'Yêu cầu khác'
  }
  return typeMap[type] || 'Yêu cầu'
}

const DEFAULT_REQUEST_TYPES = [
  { value: 'leave', label: 'Nghỉ phép' },
  { value: 'sick', label: 'Nghỉ ốm' },
  { value: 'unpaid', label: 'Nghỉ không lương' },
  { value: 'compensatory', label: 'Nghỉ bù' },
  { value: 'maternity', label: 'Nghỉ thai sản' },
  { value: 'overtime', label: 'Tăng ca' },
  { value: 'remote', label: 'Làm từ xa' },
  { value: 'late', label: 'Đi muộn' },
  { value: 'correction', label: 'Sửa công' },
  { value: 'other', label: 'Yêu cầu khác' }
]

const ensureDefaultRequestTypes = async () => {
  await Promise.all(
    DEFAULT_REQUEST_TYPES.map((type, index) =>
      RequestTypeModel.updateOne(
        { value: type.value },
        {
          $setOnInsert: {
            label: type.label,
            description: type.label,
            sortOrder: index,
            isActive: true,
            isSystem: true,
          },
        },
        { upsert: true }
      )
    )
  )
}

export const getRequestTypes = async (_req, res) => {
  try {
    await ensureDefaultRequestTypes()
    const docs = await RequestTypeModel.find({ isActive: true })
      .sort({ sortOrder: 1, label: 1 })
      .lean()

    const types =
      docs.map((doc) => ({ value: doc.value, label: doc.label })) ||
      DEFAULT_REQUEST_TYPES

    res.json({ types })
  } catch (error) {
    console.error('[requests] getRequestTypes error', error)
    res.status(500).json({ message: 'Không lấy được danh sách loại đơn' })
  }
}

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.userId
    const { status, search, type, department, page = 1, limit = 20 } = req.query

    const query = { userId }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status
    }

    if (type && type !== 'all') {
      query.type = type
    }

    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ]
    }

    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const skip = (pageNum - 1) * limitNum

    const [docs, total] = await Promise.all([
      RequestModel.find(query)
        .populate({
          path: 'userId',
          select: 'name department branch',
          populate: [
            { path: 'department', select: 'name' },
            { path: 'branch', select: 'name' }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      RequestModel.countDocuments(query)
    ])

    const data = docs.map(doc => ({
      id: doc._id.toString(),
      employeeName: doc.userId?.name || 'N/A',
      department: doc.userId?.department?.name || 'N/A',
      branch: doc.userId?.branch?.name || 'N/A',

      type: doc.type,
      title: getTitleByType(doc.type),
      date: formatDate(doc.startDate),
      duration: buildDuration(doc.startDate, doc.endDate),
      status: doc.status,
      reason: doc.reason,
      description: doc.description || doc.reason,
      urgency: doc.urgency || 'medium',
      createdAt: formatDate(doc.createdAt),
    }))

    res.json({
      requests: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('[requests] fetch error', error)
    res.status(500).json({ message: 'Không lấy được danh sách yêu cầu' })
  }
}


export const createRequest = async (req, res) => {
  try {
    const userId = req.user.userId
    const { type, startDate, endDate, reason, description, urgency } = req.body

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' })
    }

    const doc = await RequestModel.create({
      userId,
      type,
      startDate,
      endDate,
      reason,
      description: description || reason,
      urgency: urgency || 'medium',
    })

    // Populate user info to match getMyRequests format
    await doc.populate({
      path: 'userId',
      select: 'name department branch',
      populate: [
        { path: 'department', select: 'name' },
        { path: 'branch', select: 'name' }
      ]
    })

    res.status(201).json({
      id: doc._id.toString(),
      employeeName: doc.userId?.name || 'N/A',
      department: doc.userId?.department?.name || 'N/A',
      branch: doc.userId?.branch?.name || 'N/A',
      type: doc.type,
      title: getTitleByType(doc.type),
      date: formatDate(doc.startDate),
      startDate: formatDate(doc.startDate),
      endDate: formatDate(doc.endDate),
      duration: buildDuration(doc.startDate, doc.endDate),
      status: doc.status,
      reason: doc.reason,
      description: doc.description || doc.reason,
      urgency: doc.urgency || 'medium',
      createdAt: formatDate(doc.createdAt),
      submittedAt: formatDate(doc.createdAt),
    })
  } catch (error) {
    console.error('[requests] create error', error)
    res.status(500).json({ message: 'Không tạo được yêu cầu' })
  }
}

export const getAllRequests = async (req, res) => {
  try {
    const { status, type, department, search, page = 1, limit = 20 } = req.query

    const query = {}

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status
    }

    if (type) {
      query.type = type
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const UserModel = (await import('../users/user.model.js')).UserModel

    let userQuery = {}
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    if (department && department !== 'all') {
      userQuery.department = department
    }

    let userIds = []
    if (Object.keys(userQuery).length > 0) {
      const users = await UserModel.find(userQuery).select('_id')
      userIds = users.map(u => u._id)
      if (userIds.length === 0) {
        return res.json({
          requests: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        })
      }
      query.userId = { $in: userIds }
    }

    const [docs, total] = await Promise.all([
      RequestModel.find(query)
        .populate({
          path: 'userId',
          select: 'name email department branch role',
          populate: [
            {
              path: 'branch',
              select: 'name'
            },
            {
              path: 'department',
              select: 'name code'
            }
          ]
        })
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      RequestModel.countDocuments(query)
    ])

    const filteredDocs = docs

    const data = filteredDocs.map((doc) => ({
      id: doc._id.toString(),
      employeeId: doc.userId?._id?.toString(),
      employeeName: doc.userId?.name || 'N/A',
      employeeEmail: doc.userId?.email || 'N/A',
      department: doc.userId?.department?.name || doc.userId?.department?.toString() || 'N/A',
      branch: doc.userId?.branch?.name || doc.userId?.branch?.toString() || 'N/A',
      type: doc.type,
      title: getTitleByType(doc.type),
      startDate: formatDate(doc.startDate),
      endDate: formatDate(doc.endDate),
      duration: buildDuration(doc.startDate, doc.endDate),
      status: doc.status,
      reason: doc.reason,
      description: doc.description || doc.reason,
      urgency: doc.urgency || 'medium',
      submittedAt: doc.createdAt ? new Date(doc.createdAt).toLocaleString('vi-VN') : 'N/A',
      approver: doc.approvedBy?.name || undefined,
      approvedAt: doc.approvedAt ? new Date(doc.approvedAt).toLocaleString('vi-VN') : undefined,
      comments: doc.status === 'approved' ? (doc.approvalComments || undefined) : (doc.rejectionReason || undefined),
    }))

    res.json({
      requests: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredDocs.length,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('[requests] getAllRequests error', error)
    res.status(500).json({ message: 'Không lấy được danh sách yêu cầu' })
  }
}

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { comments } = req.body
    const approverId = req.user.userId

    const UserModel = (await import('../users/user.model.js')).UserModel
    const approver = await UserModel.findById(approverId).select('name email')

    const request = await RequestModel.findById(id).populate('userId', 'name email')
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu đã được xử lý' })
    }

    request.approve(approverId, comments)
    await request.save()

    const leaveTypes = ['leave', 'sick', 'unpaid', 'compensatory', 'maternity']
    if (leaveTypes.includes(request.type)) {
      try {
        const { scheduleGenerationService } = await import('../schedule/scheduleGeneration.service.js')
        await scheduleGenerationService.applyLeaveToSchedule(request)
        console.log(`[requests] Applied leave to schedule for request ${request._id}`)
      } catch (scheduleError) {
        console.error('[requests] Error applying leave to schedule:', scheduleError)
      }
    }

    const NotificationService = (await import('../notifications/notification.service.js')).NotificationService
    try {
      await NotificationService.createRequestApprovalNotification(
        request,
        approver?.name || 'Quản lý',
        true,
        comments
      )
    } catch (notifError) {
      console.error('[requests] notification error', notifError)
    }

    res.json({
      id: request._id.toString(),
      status: request.status,
      approvedAt: formatDate(request.approvedAt),
      message: 'Đã phê duyệt yêu cầu'
    })
  } catch (error) {
    console.error('[requests] approve error', error)
    res.status(500).json({ message: 'Không thể phê duyệt yêu cầu' })
  }
}

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { comments } = req.body
    const approverId = req.user.userId

    const UserModel = (await import('../users/user.model.js')).UserModel
    const approver = await UserModel.findById(approverId).select('name email')

    const request = await RequestModel.findById(id).populate('userId', 'name email')
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu đã được xử lý' })
    }

    request.reject(comments || 'Không có lý do')
    request.approvedBy = approverId
    await request.save()

    const NotificationService = (await import('../notifications/notification.service.js')).NotificationService
    try {
      await NotificationService.createRequestApprovalNotification(
        request,
        approver?.name || 'Quản lý',
        false,
        comments || 'Không có lý do'
      )
    } catch (notifError) {
      console.error('[requests] notification error', notifError)
    }

    res.json({
      id: request._id.toString(),
      status: request.status,
      approvedAt: formatDate(request.approvedAt),
      message: 'Đã từ chối yêu cầu'
    })
  } catch (error) {
    console.error('[requests] reject error', error)
    res.status(500).json({ message: 'Không thể từ chối yêu cầu' })
  }
}

/**
 * Bulk approve requests
 */
export const bulkApproveRequests = async (req, res) => {
  try {
    const { ids, comments } = req.body
    const approverId = req.user.userId

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    const UserModel = (await import('../users/user.model.js')).UserModel
    const approver = await UserModel.findById(approverId).select('name email')

    // Find all pending requests
    const requests = await RequestModel.find({
      _id: { $in: ids },
      status: 'pending'
    }).populate('userId', 'name email')

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu nào ở trạng thái chờ duyệt' })
    }

    const leaveTypes = ['leave', 'sick', 'unpaid', 'compensatory', 'maternity']
    const NotificationService = (await import('../notifications/notification.service.js')).NotificationService
    const { scheduleGenerationService } = await import('../schedule/scheduleGeneration.service.js')

    const results = {
      success: [],
      failed: []
    }

    // Process each request
    for (const request of requests) {
      try {
        request.approve(approverId, comments)
        await request.save()

        // Apply leave to schedule if applicable
        if (leaveTypes.includes(request.type)) {
          try {
            await scheduleGenerationService.applyLeaveToSchedule(request)
            console.log(`[requests] Applied leave to schedule for request ${request._id}`)
          } catch (scheduleError) {
            console.error('[requests] Error applying leave to schedule:', scheduleError)
          }
        }

        // Send notification
        try {
          await NotificationService.createRequestApprovalNotification(
            request,
            approver?.name || 'Quản lý',
            true,
            comments
          )
        } catch (notifError) {
          console.error('[requests] notification error', notifError)
        }

        results.success.push({
          id: request._id.toString(),
          status: request.status
        })
      } catch (error) {
        console.error(`[requests] Error approving request ${request._id}:`, error)
        results.failed.push({
          id: request._id.toString(),
          error: error.message
        })
      }
    }

    res.json({
      message: `Đã phê duyệt ${results.success.length} yêu cầu`,
      success: results.success,
      failed: results.failed,
      total: requests.length,
      successCount: results.success.length,
      failedCount: results.failed.length
    })
  } catch (error) {
    console.error('[requests] bulk approve error', error)
    res.status(500).json({ message: 'Không thể phê duyệt hàng loạt yêu cầu' })
  }
}

/**
 * Bulk reject requests
 */
export const bulkRejectRequests = async (req, res) => {
  try {
    const { ids, comments } = req.body
    const approverId = req.user.userId

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    const UserModel = (await import('../users/user.model.js')).UserModel
    const approver = await UserModel.findById(approverId).select('name email')

    // Find all pending requests
    const requests = await RequestModel.find({
      _id: { $in: ids },
      status: 'pending'
    }).populate('userId', 'name email')

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu nào ở trạng thái chờ duyệt' })
    }

    const NotificationService = (await import('../notifications/notification.service.js')).NotificationService
    const rejectionReason = comments || 'Không có lý do'

    const results = {
      success: [],
      failed: []
    }

    // Process each request
    for (const request of requests) {
      try {
        request.reject(rejectionReason)
        request.approvedBy = approverId
        await request.save()

        // Send notification
        try {
          await NotificationService.createRequestApprovalNotification(
            request,
            approver?.name || 'Quản lý',
            false,
            rejectionReason
          )
        } catch (notifError) {
          console.error('[requests] notification error', notifError)
        }

        results.success.push({
          id: request._id.toString(),
          status: request.status
        })
      } catch (error) {
        console.error(`[requests] Error rejecting request ${request._id}:`, error)
        results.failed.push({
          id: request._id.toString(),
          error: error.message
        })
      }
    }

    res.json({
      message: `Đã từ chối ${results.success.length} yêu cầu`,
      success: results.success,
      failed: results.failed,
      total: requests.length,
      successCount: results.success.length,
      failedCount: results.failed.length
    })
  } catch (error) {
    console.error('[requests] bulk reject error', error)
    res.status(500).json({ message: 'Không thể từ chối hàng loạt yêu cầu' })
  }
}

