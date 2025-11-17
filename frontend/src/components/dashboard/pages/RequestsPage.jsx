
import { toast } from 'sonner'
import { useEffect, useMemo, useState } from 'react'
import { Plus, FileText, Clock, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog'
import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { getMyRequests, createRequest as createRequestApi } from '../../../services/requestService'

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return <Badge variant="success">Đã duyệt</Badge>
    case 'pending':
      return <Badge variant="warning">Chờ duyệt</Badge>
    case 'rejected':
      return <Badge variant="error">Từ chối</Badge>
    default:
      return null
  }
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'leave':
      return <Calendar className="h-4 w-4" />
    case 'overtime':
      return <Clock className="h-4 w-4" />
    case 'correction':
      return <FileText className="h-4 w-4" />
    default:
      return null
  }
}

const RequestsPage = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [requestType, setRequestType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await getMyRequests()
        if (isMounted) {
          setRequests(data)
        }
      } catch (error) {
        toast.error(error.message || 'Không thể tải yêu cầu')
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
  }, [])

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests
    return requests.filter((request) => request.status === activeTab)
  }, [activeTab, requests])

  const summary = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }
  }, [requests])

  const resetForm = () => {
    setRequestType('')
    setStartDate('')
    setEndDate('')
    setReason('')
  }

  const handleCreateRequest = async () => {
    if (!requestType || !startDate || !endDate || !reason.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        type: requestType,
        startDate,
        endDate,
        reason: reason.trim(),
      }
      const newRequest = await createRequestApi(payload)
      setRequests((prev) => [newRequest, ...prev])
      toast.success('Đơn yêu cầu đã được gửi!')
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error.message || 'Không thể gửi yêu cầu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[var(--text-main)]">Yêu cầu & Đơn từ</h1>
          <p className="text-[var(--text-sub)]">Quản lý nghỉ phép, tăng ca, sửa công</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Tạo đơn mới
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
            <DialogHeader>
              <DialogTitle>Tạo đơn yêu cầu mới</DialogTitle>
              <DialogDescription className="text-[var(--text-sub)]">
                Điền thông tin chi tiết cho đơn yêu cầu của bạn
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Loại đơn</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger className="bg-[var(--input-bg)] border-[var(--border)]">
                    <SelectValue placeholder="Chọn loại đơn" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="leave">Nghỉ phép</SelectItem>
                    <SelectItem value="overtime">Tăng ca</SelectItem>
                    <SelectItem value="correction">Sửa công</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Từ ngày</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đến ngày</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lý do</Label>
                <Textarea 
                  placeholder="Nhập lý do chi tiết..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-[var(--input-bg)] border-[var(--border)] min-h-[100px]"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="border-[var(--border)] text-[var(--text-main)]"
                >
                  Hủy
                </Button>
                <Button 
                  onClick={handleCreateRequest}
                  disabled={submitting}
                  className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">Tổng đơn</p>
            <p className="text-2xl text-[var(--text-main)] mt-1">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">Chờ duyệt</p>
            <p className="text-2xl text-[var(--warning)] mt-1">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">Đã duyệt</p>
            <p className="text-2xl text-[var(--success)] mt-1">{summary.approved}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">Từ chối</p>
            <p className="text-2xl text-[var(--error)] mt-1">{summary.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & List */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[var(--shell)]">
              <TabsTrigger value="all" className="data-[state=active]:bg-[var(--accent-cyan)] data-[state=active]:text-white">
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-[var(--accent-cyan)] data-[state=active]:text-white">
                Chờ duyệt
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-[var(--accent-cyan)] data-[state=active]:text-white">
                Đã duyệt
              </TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-[var(--accent-cyan)] data-[state=active]:text-white">
                Từ chối
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading && (
              <div className="p-6 text-center text-[var(--text-sub)]">Đang tải yêu cầu...</div>
            )}
            {!loading && filteredRequests.length === 0 && (
              <div className="p-6 text-center text-[var(--text-sub)]">Không có yêu cầu nào</div>
            )}
            {!loading && filteredRequests.map((request) => (
              <div 
                key={request.id}
                className="p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)] hover:border-[var(--accent-cyan)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                      {getTypeIcon(request.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[var(--text-main)] mb-1">{request.title}</h3>
                      <p className="text-sm text-[var(--text-sub)] mb-2">{request.reason}</p>
                      <div className="flex items-center gap-4 text-sm text-[var(--text-sub)]">
                        <span>📅 {request.date}</span>
                        <span>⏱️ {request.duration}</span>
                        <span>📝 Tạo: {request.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RequestsPage
