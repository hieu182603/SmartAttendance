import { AttendanceModel } from './attendance.model.js'

const formatDateLabel = (date) => {
  const pad = (value) => String(value).padStart(2, '0')
  const d = new Date(date)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

const formatTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  const pad = (v) => String(v).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const deriveStatus = (doc) => {
  const dow = new Date(doc.date).getDay()
  if (dow === 0 || dow === 6) {
    return 'weekend'
  }
  if (doc.status === 'absent') return 'absent'
  if (doc.status === 'late') return 'late'
  if (doc.workHours && doc.workHours > 8) return 'overtime'
  if (!doc.checkIn && !doc.checkOut) return 'absent'
  return 'ontime'
}

export const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.userId
    const { from, to, search } = req.query

    const query = { userId }

    if (from || to) {
      query.date = {}
      if (from) query.date.$gte = new Date(from)
      if (to) query.date.$lte = new Date(to)
    }

    const docs = await AttendanceModel.find(query)
      .populate('locationId')
      .sort({ date: -1 })

    const keyword = search?.trim().toLowerCase()

    const data = docs
      .map((doc) => {
        const dayLabel = new Date(doc.date).toLocaleDateString('vi-VN', { weekday: 'long' })
        return {
          id: doc._id.toString(),
          date: formatDateLabel(doc.date),
          day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
          checkIn: formatTime(doc.checkIn),
          checkOut: formatTime(doc.checkOut),
          hours: doc.workHours ? `${doc.workHours}h` : '-',
          status: deriveStatus(doc),
          location: doc.locationId?.name || 'Văn phòng',
          notes: doc.notes || '',
        }
      })
      .filter((record) => {
        if (!keyword) return true
        return (
          record.date.toLowerCase().includes(keyword) ||
          record.day.toLowerCase().includes(keyword) ||
          record.location.toLowerCase().includes(keyword) ||
          record.notes.toLowerCase().includes(keyword) ||
          record.status.toLowerCase().includes(keyword)
        )
      })

    res.json(data)
  } catch (error) {
    console.error('[attendance] history error', error)
    res.status(500).json({ message: 'Không lấy được lịch sử chấm công' })
  }
}

