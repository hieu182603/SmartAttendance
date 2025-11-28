import { RequestModel } from './request.model.js'
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

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.userId
    const { status, search, page = 1, limit = 20 } = req.query

    const query = { userId }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status
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

    res.status(201).json({
      id: doc._id.toString(),
      type: doc.type,
      title: getTitleByType(doc.type),
      date: formatDate(doc.startDate),
      duration: buildDuration(doc.startDate, doc.endDate),
      status: doc.status,
      reason: doc.reason,
      createdAt: formatDate(doc.createdAt),
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

