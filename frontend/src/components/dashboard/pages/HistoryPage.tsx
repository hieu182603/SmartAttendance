//History

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Search, Download, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { getAttendanceHistory } from '../../../services/attendanceService'

type AttendanceStatus = 'ontime' | 'late' | 'absent' | 'overtime' | 'weekend'

interface AttendanceRecord {
  id?: string
  date: string
  day: string
  checkIn: string
  checkOut: string
  hours: string
  location: string
  status: AttendanceStatus
  notes: string
}

const getStatusBadge = (status: AttendanceStatus): React.JSX.Element | null => {
  switch (status) {
    case 'ontime':
      return <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30">Đúng giờ</Badge>
    case 'late':
      return <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30">Đi muộn</Badge>
    case 'absent':
      return <Badge variant="error">Vắng</Badge>
    case 'overtime':
      return <Badge className="bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30">Tăng ca</Badge>
    case 'weekend':
      return <Badge className="bg-[var(--text-sub)]/20 text-[var(--text-sub)] border-[var(--text-sub)]/30">Nghỉ</Badge>
    default:
      return null
  }
}

const HistoryPage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getAttendanceHistory({
          from: dateFrom || undefined,
          to: dateTo || undefined,
        }) as AttendanceRecord[]
        if (isMounted) {
          setRecords(data)
        }
      } catch (err) {
        if (isMounted) {
          const error = err as Error
          setError(error.message || 'Không thể tải dữ liệu')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [dateFrom, dateTo])

  const filteredData = useMemo(() => {
    const rawKeyword = searchTerm.trim().toLowerCase()
    let keyword = rawKeyword
    const isoMatch = rawKeyword.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      keyword = `${day}/${month}/${year}`
    }

    if (!keyword) return records

    return records.filter((record) => {
      return (
        record.date.toLowerCase().includes(keyword) ||
        record.day.toLowerCase().includes(keyword) ||
        record.location.toLowerCase().includes(keyword) ||
        record.notes.toLowerCase().includes(keyword) ||
        record.status.toLowerCase().includes(keyword)
      )
    })
  }, [records, searchTerm])

  const summary = useMemo(() => {
    const total = records.length
    const late = records.filter((item) => item.status === 'late').length
    const absent = records.filter((item) => item.status === 'absent').length
    const overtime = records.filter((item) => item.status === 'overtime').length
    return { total, late, absent, overtime }
  }, [records])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[var(--text-main)]">Lịch sử chấm công</h1>
        <p className="text-[var(--text-sub)]">Xem và xuất báo cáo chấm công của bạn</p>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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
            <p className="text-sm text-[var(--text-sub)] mt-2">Tổng ngày công</p>
            <p className="text-2xl text-[var(--text-main)] mt-1">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">Đi muộn</p>
            <p className="text-2xl text-[var(--warning)] mt-1">{summary.late}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">Vắng mặt</p>
            <p className="text-2xl text-[var(--error)] mt-1">{summary.absent}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">Tăng ca</p>
            <p className="text-2xl text-[var(--primary)] mt-1">{summary.overtime}</p>
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
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-[var(--text-sub)]">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-[var(--error)]">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-[var(--text-sub)]">
                      Không có dữ liệu phù hợp
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredData.map((record, index) => (
                  <tr 
                    key={record.id || index} 
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




