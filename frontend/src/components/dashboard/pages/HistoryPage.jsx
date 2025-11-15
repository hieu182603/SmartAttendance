//History

import { useState } from 'react'
import { Calendar, Search, Download, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'

const attendanceData = [
  { id: 1, date: '27/10/2024', day: 'Thứ 2', checkIn: '08:45', checkOut: '17:30', hours: '8h 45m', status: 'ontime', location: 'Văn phòng HN', notes: '' },
  { id: 2, date: '26/10/2024', day: 'Thứ 7', checkIn: '09:15', checkOut: '17:35', hours: '8h 20m', status: 'late', location: 'Văn phòng HN', notes: 'Trễ 15 phút' },
  { id: 3, date: '25/10/2024', day: 'Thứ 6', checkIn: '08:30', checkOut: '17:20', hours: '8h 50m', status: 'ontime', location: 'Văn phòng HN', notes: '' },
  { id: 4, date: '24/10/2024', day: 'Thứ 5', checkIn: '08:50', checkOut: '17:25', hours: '8h 35m', status: 'ontime', location: 'Văn phòng HN', notes: '' },
  { id: 5, date: '23/10/2024', day: 'Thứ 4', checkIn: '-', checkOut: '-', hours: '-', status: 'absent', location: '-', notes: 'Nghỉ phép' },
  { id: 6, date: '22/10/2024', day: 'Thứ 3', checkIn: '08:35', checkOut: '17:15', hours: '8h 40m', status: 'ontime', location: 'Văn phòng HN', notes: '' },
  { id: 7, date: '21/10/2024', day: 'Thứ 2', checkIn: '08:40', checkOut: '18:30', hours: '9h 50m', status: 'overtime', location: 'Văn phòng HN', notes: 'Tăng ca 1.5h' },
  { id: 8, date: '20/10/2024', day: 'CN', checkIn: '-', checkOut: '-', hours: '-', status: 'weekend', location: '-', notes: 'Cuối tuần' },
]

const getStatusBadge = (status) => {
  switch (status) {
    case 'ontime':
      return <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30">Đúng giờ</Badge>
    case 'late':
      return <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30">Đi muộn</Badge>
    case 'absent':
      return <Badge className="bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30">Vắng</Badge>
    case 'overtime':
      return <Badge className="bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30">Tăng ca</Badge>
    case 'weekend':
      return <Badge className="bg-[var(--text-sub)]/20 text-[var(--text-sub)] border-[var(--text-sub)]/30">Nghỉ</Badge>
    default:
      return null
  }
}

const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[var(--text-main)]">Lịch sử chấm công</h1>
        <p className="text-[var(--text-sub)]">Xem và xuất báo cáo chấm công của bạn</p>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
                <Input
                  placeholder="Tìm kiếm theo ngày, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
            </div>
            <div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-main)]">
                <Filter className="h-4 w-4 mr-2" />
                Bộ lọc nâng cao
              </Button>
            </div>
            <Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-main)]">
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)]">Tổng ngày công</p>
            <p className="text-2xl text-[var(--text-main)] mt-1">18</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)]">Đi muộn</p>
            <p className="text-2xl text-[var(--warning)] mt-1">2</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)]">Vắng mặt</p>
            <p className="text-2xl text-[var(--error)] mt-1">1</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)]">Tăng ca</p>
            <p className="text-2xl text-[var(--primary)] mt-1">3</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">Chi tiết chấm công</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--shell)]">
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Ngày</th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Thứ</th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Giờ vào</th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Giờ ra</th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Tổng giờ</th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Địa điểm</th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Trạng thái</th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record, index) => (
                  <tr 
                    key={record.id} 
                    className={`border-b border-[var(--border)] hover:bg-[var(--shell)] transition-colors ${
                      index % 2 === 0 ? 'bg-[var(--shell)]/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-[var(--text-main)]">{record.date}</td>
                    <td className="py-3 px-4 text-[var(--text-sub)]">{record.day}</td>
                    <td className="py-3 px-4 text-[var(--text-main)]">{record.checkIn}</td>
                    <td className="py-3 px-4 text-[var(--text-main)]">{record.checkOut}</td>
                    <td className="py-3 px-4 text-[var(--text-main)]">{record.hours}</td>
                    <td className="py-3 px-4 text-[var(--text-sub)]">{record.location}</td>
                    <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                    <td className="py-3 px-4 text-[var(--text-sub)] text-sm">{record.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HistoryPage
