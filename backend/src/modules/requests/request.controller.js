import { RequestModel } from './request.model.js'

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
  if (type === 'leave') return 'Nghỉ phép'
  if (type === 'overtime') return 'Tăng ca'
  if (type === 'correction') return 'Sửa công'
  return 'Yêu cầu'
}

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.userId
    const { status } = req.query

    const query = { userId }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status
    }

    const docs = await RequestModel.find(query).sort({ createdAt: -1 })

    const data = docs.map((doc) => ({
      id: doc._id.toString(),
      type: doc.type,
      title: getTitleByType(doc.type),
      date: formatDate(doc.startDate),
      duration: buildDuration(doc.startDate, doc.endDate),
      status: doc.status,
      reason: doc.reason,
      createdAt: formatDate(doc.createdAt),
    }))

    res.json(data)
  } catch (error) {
    console.error('[requests] fetch error', error)
    res.status(500).json({ message: 'Không lấy được danh sách yêu cầu' })
  }
}

export const createRequest = async (req, res) => {
  try {
    const userId = req.user.userId
    const { type, startDate, endDate, reason } = req.body

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' })
    }

    const doc = await RequestModel.create({
      userId,
      type,
      startDate,
      endDate,
      reason,
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

