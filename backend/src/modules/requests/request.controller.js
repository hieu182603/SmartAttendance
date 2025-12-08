import mongoose from 'mongoose'
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
        { path: 'department', select: 'name managerId', populate: { path: 'managerId', select: 'name email' } },
        { path: 'branch', select: 'name' }
      ]
    })

    // Send notification to manager/admin
    try {
      const { NotificationService } = await import('../notifications/notification.service.js');
      const { UserModel } = await import('../users/user.model.js');

      // Get managers/admins who should be notified
      const notifiedUserIds = new Set();

      // Add department manager if exists
      if (doc.userId?.department?.managerId) {
        const deptManagerId = doc.userId.department.managerId._id?.toString() || doc.userId.department.managerId.toString();
        notifiedUserIds.add(deptManagerId);
      }

      // Add all managers in the same department
      if (doc.userId?.department) {
        const departmentManagers = await UserModel.find({
          department: doc.userId.department._id || doc.userId.department,
          role: { $in: ['MANAGER', 'HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
          isActive: true
        }).select('_id');

        departmentManagers.forEach(user => {
          notifiedUserIds.add(user._id.toString());
        });
      }

      // Add HR managers and admins (for all requests)
      const hrManagersAndAdmins = await UserModel.find({
        role: { $in: ['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
        isActive: true
      }).select('_id');

      hrManagersAndAdmins.forEach(user => {
        notifiedUserIds.add(user._id.toString());
      });

      // Send notification to each manager/admin
      for (const managerId of notifiedUserIds) {
        try {
          await NotificationService.createRequestCreatedNotification(doc, managerId);
        } catch (err) {
          console.error(`[requests] Failed to send notification to manager ${managerId}:`, err);
          // Continue even if one notification fails
        }
      }
    } catch (notificationError) {
      console.error('[requests] Failed to send request created notifications:', notificationError);
      // Don't fail request creation if notification fails
    }

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
      } catch (scheduleError) {
        // Silent fail - schedule update không critical
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
      // Silent fail - notification không critical
    }

    res.json({
      id: request._id.toString(),
      status: request.status,
      approvedAt: formatDate(request.approvedAt),
      message: 'Đã phê duyệt yêu cầu'
    })
  } catch (error) {
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
      // Silent fail - notification không critical
    }

    res.json({
      id: request._id.toString(),
      status: request.status,
      approvedAt: formatDate(request.approvedAt),
      message: 'Đã từ chối yêu cầu'
    })
  } catch (error) {
    res.status(500).json({ message: 'Không thể từ chối yêu cầu' })
  }
}

/**
 * Helper function: Kiểm tra quyền approve request
 * @param {Object} request - Request object với userId populated
 * @param {Object} approver - Approver user object với role và department
 * @returns {boolean} - true nếu có quyền approve
 */
const canApproveRequest = (request, approver) => {
  // SUPER_ADMIN, ADMIN, HR_MANAGER có quyền approve tất cả
  if (['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(approver.role)) {
    return true
  }

  // MANAGER chỉ có quyền approve request của nhân viên cùng department
  if (approver.role === 'MANAGER') {
    // Lấy department ID của approver
    const approverDepartmentId = approver.department?._id || approver.department

    if (!approverDepartmentId) {
      // Approver không có department → không có quyền
      return false
    }

    // Kiểm tra request.userId đã được populate chưa
    if (!request.userId) {
      return false
    }

    // Nếu request.userId là ObjectId (chưa populate), không thể kiểm tra
    if (request.userId.constructor.name === 'ObjectId' || typeof request.userId === 'string') {
      return false
    }

    // Lấy department ID của request user
    const requestDepartmentId = request.userId.department?._id || request.userId.department

    if (!requestDepartmentId) {
      // Request user không có department → không thể approve
      return false
    }

    // So sánh department ID (hỗ trợ cả ObjectId và string)
    const approverDeptIdStr = approverDepartmentId.toString()
    const requestDeptIdStr = requestDepartmentId.toString()

    return approverDeptIdStr === requestDeptIdStr
  }

  // Các role khác không có quyền approve
  return false
}

/**
 * Bulk approve requests với transaction và validation đầy đủ
 * Mỗi request được xử lý trong transaction riêng để đảm bảo atomicity
 */
export const bulkApproveRequests = async (req, res) => {
  try {
    const { ids, comments } = req.body
    const approverId = req.user.userId

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    const UserModel = (await import('../users/user.model.js')).UserModel
    const approver = await UserModel.findById(approverId)
      .select('name email role department')
      .populate('department', '_id')

    if (!approver) {
      return res.status(404).json({ message: 'Không tìm thấy người duyệt' })
    }

    // Find all pending requests với populate đầy đủ để kiểm tra quyền
    const requests = await RequestModel.find({
      _id: { $in: ids },
      status: 'pending'
    }).populate({
      path: 'userId',
      select: 'name email department',
      populate: { path: 'department', select: '_id' }
    })

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

    // Process each request với transaction riêng để đảm bảo atomicity
    for (const request of requests) {
      const requestSession = await mongoose.startSession()
      requestSession.startTransaction()

      try {
        // Validate permission cho từng request
        if (!canApproveRequest(request, approver)) {
          throw new Error('Không có quyền approve request này')
        }

        // Validate status (kiểm tra lại vì có thể đã thay đổi)
        const currentRequest = await RequestModel.findById(request._id).session(requestSession)
        if (!currentRequest || currentRequest.status !== 'pending') {
          throw new Error('Yêu cầu đã được xử lý hoặc không tồn tại')
        }

        // Approve request trong transaction
        currentRequest.approve(approverId, comments)
        await currentRequest.save({ session: requestSession })

        // Apply leave to schedule if applicable (trong transaction)
        if (leaveTypes.includes(currentRequest.type)) {
          await scheduleGenerationService.applyLeaveToSchedule(currentRequest, requestSession)
        }

        // Commit transaction cho request này
        await requestSession.commitTransaction()
        requestSession.endSession()

        // Send notification (ngoài transaction - không critical)
        try {
          await NotificationService.createRequestApprovalNotification(
            currentRequest,
            approver?.name || 'Quản lý',
            true,
            comments
          )
        } catch (notifError) {
          console.error('[requests] notification error', notifError)
          // Không throw - notification không critical
        }

        results.success.push({
          id: currentRequest._id.toString(),
          status: currentRequest.status
        })
      } catch (error) {
        // Rollback transaction cho request này
        await requestSession.abortTransaction()
        requestSession.endSession()

        results.failed.push({
          id: request._id.toString(),
          error: error.message || 'Lỗi không xác định'
        })
      }
    }

    res.json({
      message: `Đã phê duyệt ${results.success.length} yêu cầu${results.failed.length > 0 ? `, ${results.failed.length} yêu cầu thất bại` : ''}`,
      success: results.success,
      failed: results.failed,
      total: requests.length,
      successCount: results.success.length,
      failedCount: results.failed.length
    })
  } catch (error) {
    res.status(500).json({ message: 'Không thể phê duyệt hàng loạt yêu cầu', error: error.message })
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
    res.status(500).json({ message: 'Không thể từ chối hàng loạt yêu cầu' })
  }
}

