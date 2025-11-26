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
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]) // For summary stats
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [pagination, setPagination] = useState<{
    total: number
    page: number
    limit: number
    totalPages: number
  }>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  })

  // Fetch all records for summary stats (without pagination)
  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        const result = await getAttendanceHistory({
          from: dateFrom || undefined,
          to: dateTo || undefined,
          limit: 1000, // Get all for stats
        })
        if (isMounted && result.records) {
          setAllRecords(result.records)
        }
      } catch (err) {
        console.error('[HistoryPage] Stats fetch error:', err)
      }
    }
    fetchStats()
    return () => {
      isMounted = false
    }
  }, [dateFrom, dateTo])

  // Fetch paginated records
  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const params: {
          from?: string
          to?: string
          search?: string
          page?: number
          limit?: number
        } = {
          from: dateFrom || undefined,
          to: dateTo || undefined,
          page: currentPage,
          limit: itemsPerPage,
        }

        // Search filter
        if (searchTerm) {
          params.search = searchTerm
        }

        const result = await getAttendanceHistory(params)
        if (isMounted) {
          setRecords(result.records || [])
          if (result.pagination) {
            setPagination(result.pagination)
          }
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
  }, [dateFrom, dateTo, searchTerm, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFrom, dateTo, searchTerm])

  // Server-side filtering - no client-side filtering needed
  const filteredData = records

  // Calculate summary from allRecords (not paginated data)
  const summary = useMemo(() => {
    const total = allRecords.length
    const late = allRecords.filter((item) => item.status === 'late').length
    const absent = allRecords.filter((item) => item.status === 'absent').length
    const overtime = allRecords.filter((item) => item.status === 'overtime').length
    return { total, late, absent, overtime }
  }, [allRecords])

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
          
          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 text-sm text-[var(--text-sub)]">
                <span>
                  Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} của {pagination.total}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  ‹
                </Button>

                <span className="px-4 text-sm text-[var(--text-main)]">
                  Trang {currentPage} / {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={currentPage >= pagination.totalPages}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  »
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default HistoryPage




