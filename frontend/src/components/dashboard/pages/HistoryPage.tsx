import { useEffect, useMemo, useState } from 'react'
import { Search, Eye } from 'lucide-react'
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
  const [quickFilter, setQuickFilter] = useState<'all' | '7days' | 'thisMonth' | 'lastMonth'>('all')
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

  // Handle quick filter
  const handleQuickFilter = (filter: 'all' | '7days' | 'thisMonth' | 'lastMonth') => {
    setQuickFilter(filter)
    const today = new Date()
    
    switch (filter) {
      case '7days': {
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(today.getDate() - 7)
        setDateFrom(sevenDaysAgo.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
        break
      }
      case 'thisMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        setDateFrom(firstDay.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
        break
      }
      case 'lastMonth': {
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
        setDateFrom(firstDayLastMonth.toISOString().split('T')[0])
        setDateTo(lastDayLastMonth.toISOString().split('T')[0])
        break
      }
      case 'all':
      default:
        setDateFrom('')
        setDateTo('')
        break
    }
    setCurrentPage(1)
  }

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
          setAllRecords(result.records as unknown as AttendanceRecord[])
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
          setRecords((result.records || []) as unknown as AttendanceRecord[])
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
          <div className="flex flex-col gap-4">
            {/* Row 1: Quick Filter và Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Filter Dropdown */}
              <div>
                <label className="block text-sm text-[var(--text-sub)] mb-2">Lọc nhanh</label>
                <select
                  value={quickFilter}
                  onChange={(e) => handleQuickFilter(e.target.value as 'all' | '7days' | 'thisMonth' | 'lastMonth')}
                  className="w-full h-10 px-3 rounded-md bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="all">Tất cả</option>
                  <option value="7days">7 ngày qua</option>
                  <option value="thisMonth">Tháng này</option>
                  <option value="lastMonth">Tháng trước</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm text-[var(--text-sub)] mb-2">Tìm kiếm</label>
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
            </div>

            {/* Row 2: Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date From */}
              <div>
                <label className="block text-sm text-[var(--text-sub)] mb-2">Từ ngày</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setQuickFilter('all')
                  }}
                  className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm text-[var(--text-sub)] mb-2">Đến ngày</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setQuickFilter('all')
                  }}
                  className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
            </div>
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
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">Xem ảnh</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-[var(--text-sub)]">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-[var(--error)]">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-[var(--text-sub)]">
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
                    <td className="py-3 px-4 text-[var(--text-sub)]">
                      {record.location && !record.location.startsWith('http') 
                        ? record.location 
                        : record.location?.includes('attendance') 
                          ? 'Văn phòng' 
                          : record.location || '-'}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                    <td className="py-3 px-4 text-[var(--text-sub)] text-sm">
                      {record.notes && !record.notes.startsWith('[Ảnh:') && !record.notes.startsWith('http')
                        ? record.notes
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(record.notes?.includes('http') || record.location?.includes('http')) ? (
                        <a
                          href={record.notes?.match(/https?:\/\/[^\s\]]+/)?.[0] || record.location?.match(/https?:\/\/[^\s\]]+/)?.[0] || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
                          title="Xem ảnh chấm công"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-[var(--text-sub)]">-</span>
                      )}
                    </td>
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




