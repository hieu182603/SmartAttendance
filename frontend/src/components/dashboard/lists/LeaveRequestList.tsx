import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMyLeaveRequests, type LeaveRequest } from '@/services/leaveService'
import { toast } from 'sonner'
import type { ErrorWithMessage } from '@/types'

interface LeaveRequestListProps {
  status?: 'pending' | 'approved' | 'rejected' | 'all'
  onRefresh?: () => void
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  leave: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
  compensatory: 'Nghỉ bù',
  maternity: 'Nghỉ thai sản',
}

export const LeaveRequestList: React.FC<LeaveRequestListProps> = ({
  status = 'all',
  onRefresh,
}) => {
  const { t } = useTranslation(['dashboard', 'common'])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const result = await getMyLeaveRequests({
        page: currentPage,
        limit: 20,
        status: status === 'all' ? undefined : status,
      })
      setRequests(result.requests || [])
      setPagination(result.pagination || pagination)
    } catch (error) {
      const err = error as ErrorWithMessage
      toast.error(err.message || 'Không thể tải danh sách đơn nghỉ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [currentPage, status])

  useEffect(() => {
    if (onRefresh) {
      onRefresh()
    }
  }, [requests])

  const getStatusBadge = (requestStatus: string) => {
    switch (requestStatus) {
      case 'pending':
        return (
          <Badge className="bg-[var(--warning)]/20 text-[var(--warning)]">
            <Clock className="mr-1 h-3 w-3" />
            Chờ duyệt
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-[var(--success)]/20 text-[var(--success)]">
            <CheckCircle className="mr-1 h-3 w-3" />
            Đã duyệt
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-[var(--error)]/20 text-[var(--error)]">
            <XCircle className="mr-1 h-3 w-3" />
            Đã từ chối
          </Badge>
        )
      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'leave':
        return 'bg-blue-500/20 text-blue-500'
      case 'sick':
        return 'bg-red-500/20 text-red-500'
      case 'unpaid':
        return 'bg-gray-500/20 text-gray-500'
      case 'compensatory':
        return 'bg-green-500/20 text-green-500'
      case 'maternity':
        return 'bg-pink-500/20 text-pink-500'
      default:
        return 'bg-gray-500/20 text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--text-sub)]">Đang tải...</p>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[var(--text-sub)]" />
        <p className="text-[var(--text-sub)]">Chưa có đơn nghỉ nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card
          key={request.id}
          className="bg-[var(--shell)] border border-[var(--border)] transition-all hover:border-[var(--accent-cyan)]"
        >
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className={getTypeColor(request.type)}>
                    {LEAVE_TYPE_LABELS[request.type] || request.type}
                  </Badge>
                  {getStatusBadge(request.status)}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="border-[var(--border)] text-[var(--text-sub)]"
                  >
                    <Calendar className="mr-1 h-3 w-3" />
                    {request.startDate}
                    {request.endDate && request.endDate !== request.startDate
                      ? ` → ${request.endDate}`
                      : ''}
                  </Badge>
                  {request.duration && (
                    <Badge
                      variant="outline"
                      className="border-[var(--border)] text-[var(--text-sub)]"
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {request.duration}
                    </Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm text-[var(--text-sub)] mb-1">Lý do:</p>
                  <p className="text-[var(--text-main)]">{request.reason}</p>
                </div>

                {request.submittedAt && (
                  <p className="text-xs text-[var(--text-sub)]">
                    Gửi lúc: {request.submittedAt}
                  </p>
                )}

                {request.approver && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-3 text-sm">
                    <p className="text-xs text-[var(--text-sub)] mb-1">
                      {request.approver} • {request.approvedAt}
                    </p>
                    {request.comments && (
                      <p className="text-[var(--text-main)]">{request.comments}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-sub)]">
            Trang {pagination.page} / {pagination.totalPages} ({pagination.total} đơn)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-[var(--border)]"
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage >= pagination.totalPages}
              className="border-[var(--border)]"
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

