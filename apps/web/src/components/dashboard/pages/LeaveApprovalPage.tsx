import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  type LeaveRequest,
} from '@/services/leaveService'
import { toast } from 'sonner'
import type { ErrorWithMessage } from '@/types'
import { useAuth } from '@/context/AuthContext'

const LEAVE_TYPE_LABELS: Record<string, string> = {
  leave: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
  compensatory: 'Nghỉ bù',
  maternity: 'Nghỉ thai sản',
}

export const LeaveApprovalPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common'])
  const { user } = useAuth()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [processing, setProcessing] = useState(false)
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
      const result = await getAllLeaveRequests({
        page: currentPage,
        limit: 20,
        status: 'pending',
        search: searchQuery || undefined,
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
  }, [currentPage, searchQuery])

  const handleApprove = async () => {
    if (!selectedRequest) return

    setProcessing(true)
    try {
      await approveLeaveRequest(selectedRequest.id, comments || undefined)
      toast.success('Đã duyệt đơn nghỉ thành công')
      setActionDialog(null)
      setSelectedRequest(null)
      setComments('')
      fetchRequests()
    } catch (error) {
      const err = error as ErrorWithMessage
      toast.error(err.message || 'Không thể duyệt đơn nghỉ')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    setProcessing(true)
    try {
      await rejectLeaveRequest(selectedRequest.id, comments || undefined)
      toast.success('Đã từ chối đơn nghỉ')
      setActionDialog(null)
      setSelectedRequest(null)
      setComments('')
      fetchRequests()
    } catch (error) {
      const err = error as ErrorWithMessage
      toast.error(err.message || 'Không thể từ chối đơn nghỉ')
    } finally {
      setProcessing(false)
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

  if (loading && requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--text-sub)]">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[var(--text-main)]">Duyệt đơn nghỉ phép</h1>
        <p className="text-[var(--text-sub)] mt-1">
          Xem và duyệt các đơn nghỉ phép đang chờ xử lý
        </p>
      </div>

      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-sub)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên nhân viên, email..."
                className="border-[var(--border)] bg-[var(--shell)] pl-10"
              />
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[var(--text-sub)]" />
              <p className="text-[var(--text-sub)]">Không có đơn nghỉ nào đang chờ duyệt</p>
            </div>
          ) : (
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
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white flex items-center justify-center">
                            {request.employeeName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <h3 className="text-[var(--text-main)]">
                              {request.employeeName || 'N/A'}
                            </h3>
                            <p className="text-xs text-[var(--text-sub)]">
                              {request.employeeEmail || 'N/A'} • {request.department || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge className={getTypeColor(request.type)}>
                            {LEAVE_TYPE_LABELS[request.type] || request.type}
                          </Badge>
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
                      </div>

                      <div className="flex gap-2 md:flex-col">
                        <Button
                          onClick={() => {
                            setSelectedRequest(request)
                            setActionDialog('approve')
                          }}
                          className="bg-[var(--success)] hover:bg-[var(--success)]/90"
                          size="sm"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Duyệt
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request)
                            setActionDialog('reject')
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--border)]">
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
        </CardContent>
      </Card>

      <Dialog
        open={actionDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null)
            setSelectedRequest(null)
            setComments('')
          }
        }}
      >
        <DialogContent className="bg-[var(--surface)] border-[var(--border)]">
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'approve' ? 'Duyệt đơn nghỉ' : 'Từ chối đơn nghỉ'}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {actionDialog === 'approve'
                ? 'Bạn có chắc chắn muốn duyệt đơn nghỉ này?'
                : 'Bạn có chắc chắn muốn từ chối đơn nghỉ này?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--text-sub)]">Nhân viên:</p>
                <p className="text-[var(--text-main)]">{selectedRequest.employeeName}</p>
                <p className="text-sm text-[var(--text-sub)]">Loại nghỉ:</p>
                <p className="text-[var(--text-main)]">
                  {LEAVE_TYPE_LABELS[selectedRequest.type] || selectedRequest.type}
                </p>
                <p className="text-sm text-[var(--text-sub)]">Thời gian:</p>
                <p className="text-[var(--text-main)]">
                  {selectedRequest.startDate}
                  {selectedRequest.endDate && selectedRequest.endDate !== selectedRequest.startDate
                    ? ` → ${selectedRequest.endDate}`
                    : ''}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-main)]">
                {actionDialog === 'approve' ? 'Ghi chú (tùy chọn)' : 'Lý do từ chối'}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  actionDialog === 'approve'
                    ? 'Nhập ghi chú nếu có...'
                    : 'Nhập lý do từ chối...'
                }
                className="min-h-[80px] border-[var(--border)] bg-[var(--input-bg)]"
                required={actionDialog === 'reject'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog(null)
                setSelectedRequest(null)
                setComments('')
              }}
              className="border-[var(--border)]"
              disabled={processing}
            >
              Hủy
            </Button>
            <Button
              onClick={actionDialog === 'approve' ? handleApprove : handleReject}
              disabled={processing || (actionDialog === 'reject' && !comments.trim())}
              className={
                actionDialog === 'approve'
                  ? 'bg-[var(--success)] hover:bg-[var(--success)]/90'
                  : 'bg-[var(--error)] hover:bg-[var(--error)]/90'
              }
            >
              {processing
                ? 'Đang xử lý...'
                : actionDialog === 'approve'
                  ? 'Duyệt'
                  : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

