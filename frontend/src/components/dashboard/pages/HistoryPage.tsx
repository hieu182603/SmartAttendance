import { useEffect, useMemo, useState } from 'react'
import { Search, Eye, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
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
  checkInPhoto?: string
  checkOutPhoto?: string
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
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin')
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
  }, [dateFrom, dateTo, searchTerm, currentPage, itemsPerPage, statusFilter])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFrom, dateTo, searchTerm, statusFilter])

  // Client-side filtering by status if needed
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return records
    return records.filter(record => record.status === statusFilter)
  }, [records, statusFilter])

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
        <CardContent className="p-6 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <Input
                placeholder="Tìm kiếm theo ngày, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | AttendanceStatus)}>
              <SelectTrigger className="md:w-48 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="ontime">Đúng giờ</SelectItem>
                <SelectItem value="late">Đi muộn</SelectItem>
                <SelectItem value="absent">Vắng</SelectItem>
                <SelectItem value="overtime">Tăng ca</SelectItem>
                <SelectItem value="weekend">Nghỉ cuối tuần</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Chọn ngày"
              className="md:w-48 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
            />
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
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">Xem ảnh</th>
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
                    className={`border-b border-[var(--border)] hover:bg-[var(--shell)] transition-colors ${index % 2 === 0 ? 'bg-[var(--shell)]/50' : ''
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
                    <td className="py-3 px-4 text-center">
                      {(record.notes?.includes('http') || record.location?.includes('http')) ? (
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
                          title="Xem ảnh chấm công"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
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

      {/* Image Modal */}
      {selectedRecord && (() => {
        // Parse URLs
        const allUrls = selectedRecord.notes?.match(/\[Ảnh[^\]]*:\s*(https?:\/\/[^\]]+)\]/g) || [];
        const checkInMatch = allUrls[0]?.match(/https?:\/\/[^\]]+/);
        const checkInUrl = checkInMatch?.[0] || selectedRecord.location?.match(/https?:\/\/[^\s]+/)?.[0];
        const checkOutMatch = selectedRecord.notes?.match(/\[Ảnh check-out:\s*(https?:\/\/[^\]]+)\]/i);
        const checkOutUrl = checkOutMatch?.[1];

        const currentUrl = activeTab === 'checkin' ? checkInUrl : checkOutUrl;
        const currentTime = activeTab === 'checkin' ? selectedRecord.checkIn : selectedRecord.checkOut;

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => {
              setSelectedRecord(null);
              setActiveTab('checkin');
            }}
          >
            <div 
              className="relative bg-[var(--surface)] rounded-lg overflow-hidden w-full max-w-[800px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setActiveTab('checkin');
                }}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[var(--shell)] hover:bg-[var(--border)] text-[var(--text-main)] transition-colors"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Tabs */}
              <div className="flex border-b border-[var(--border)]">
                <button
                  onClick={() => setActiveTab('checkin')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'checkin'
                      ? 'text-[var(--primary)] bg-[var(--primary)]/5'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--shell)]'
                  }`}
                >
                  Check-in
                  {activeTab === 'checkin' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('checkout')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'checkout'
                      ? 'text-[var(--primary)] bg-[var(--primary)]/5'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--shell)]'
                  }`}
                >
                  Check-out
                  {activeTab === 'checkout' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
                  )}
                </button>
              </div>

              {/* Image Container */}
              <div className="bg-[var(--shell)] flex items-center justify-center">
                {currentUrl ? (
                  <img
                    src={currentUrl}
                    alt={`Ảnh ${activeTab === 'checkin' ? 'check-in' : 'check-out'}`}
                    className="w-full h-auto object-contain max-h-[80vh]"
                  />
                ) : (
                  <div className="text-center py-24">
                    <p className="text-[var(--text-sub)] text-sm">
                      {activeTab === 'checkin' ? 'Không có ảnh check-in' : 'Chưa check-out'}
                    </p>
                  </div>
                )}
              </div>

              {/* Info Footer */}
              <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--shell)]/50">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-[var(--text-sub)] mb-1.5">Thời gian</p>
                    <p className="text-base font-semibold text-[var(--text-main)]">
                      {currentTime || '-'}
                    </p>
                  </div>
                  <div className="border-l border-[var(--border)] pl-6">
                    <p className="text-xs text-[var(--text-sub)] mb-1.5">Vị trí</p>
                    <p className="text-base font-semibold text-[var(--text-main)] truncate">
                      {selectedRecord.location && !selectedRecord.location.startsWith('http')
                        ? selectedRecord.location
                        : 'Văn phòng'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  )
}

export default HistoryPage




