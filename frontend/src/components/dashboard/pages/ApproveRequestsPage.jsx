import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileText,
  Search,
  AlertCircle,
  MessageSquare,
  Send,
  Briefcase,
  Moon,
  Sunset,
  Sun as SunIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Badge } from '../../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog'
import { Label } from '../../ui/label'
import { toast } from 'sonner'
import { getAllRequests, approveRequest, rejectRequest } from '../../../services/requestService'

const ApproveRequestsPage = () => {
  const [requests, setRequests] = useState([])
  const [selectedTab, setSelectedTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [actionType, setActionType] = useState(null)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch requests from API
  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedTab !== 'all') params.status = selectedTab
      if (filterType !== 'all') params.type = filterType
      if (filterDepartment !== 'all') params.department = filterDepartment
      if (searchQuery) params.search = searchQuery

      const result = await getAllRequests(params)
      setRequests(result.requests || [])
    } catch (error) {
      console.error('[ApproveRequests] fetch error:', error)
      toast.error('Không thể tải danh sách yêu cầu')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [selectedTab, filterType, filterDepartment, searchQuery])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Filter requests - đầy đủ logic như dự án tham khảo
  const filteredRequests = requests.filter(req => {
    // Tab filter
    if (selectedTab !== 'all' && req.status !== selectedTab) return false

    // Search filter
    if (searchQuery && !req.employeeName?.toLowerCase().includes(searchQuery.toLowerCase())
      && !req.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false

    // Type filter
    if (filterType !== 'all' && req.type !== filterType) return false

    // Department filter
    if (filterDepartment !== 'all' && req.department !== filterDepartment) return false

    return true
  })

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total: requests.length,
  }

  const handleOpenDialog = (request, action) => {
    setSelectedRequest(request)
    setActionType(action)
    setIsDialogOpen(true)
    setComments('')
  }

  // Handle approve/reject request via API
  const handleSubmitAction = async () => {
    if (!selectedRequest || !actionType) return

    try {
      if (actionType === 'approve') {
        await approveRequest(selectedRequest.id, comments)
        toast.success(`✅ Đã phê duyệt yêu cầu`)
      } else {
        await rejectRequest(selectedRequest.id, comments)
        toast.success(`❌ Đã từ chối yêu cầu`)
      }
      setIsDialogOpen(false)
      setSelectedRequest(null)
      setActionType(null)
      setComments('')
      // Refresh requests list
      await fetchRequests()
    } catch (error) {
      console.error('[ApproveRequests] action error:', error)
      toast.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra')
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'leave': return <Moon className="h-4 w-4" />
      case 'overtime': return <Sunset className="h-4 w-4" />
      case 'late': return <Clock className="h-4 w-4" />
      case 'remote': return <Briefcase className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'leave': return 'Nghỉ phép'
      case 'overtime': return 'Tăng ca'
      case 'late': return 'Đi muộn'
      case 'remote': return 'Remote'
      default: return type
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'leave': return 'bg-blue-500/20 text-blue-500'
      case 'overtime': return 'bg-orange-500/20 text-orange-500'
      case 'late': return 'bg-yellow-500/20 text-yellow-500'
      case 'remote': return 'bg-purple-500/20 text-purple-500'
      default: return 'bg-gray-500/20 text-gray-500'
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'bg-red-500/20 text-red-500'
      case 'medium': return 'bg-yellow-500/20 text-yellow-500'
      case 'low': return 'bg-green-500/20 text-green-500'
      default: return 'bg-gray-500/20 text-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
          Phê duyệt yêu cầu
        </h1>
        <p className="text-[var(--text-sub)] mt-2">
          Quản lý và phê duyệt các yêu cầu của nhân viên
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Chờ duyệt</p>
                  <p className="text-3xl text-[var(--warning)] mt-2">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-[var(--warning)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Đã duyệt</p>
                  <p className="text-3xl text-[var(--success)] mt-2">{stats.approved}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Từ chối</p>
                  <p className="text-3xl text-[var(--error)] mt-2">{stats.rejected}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--error)]/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-[var(--error)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Tổng số</p>
                  <p className="text-3xl text-[var(--accent-cyan)] mt-2">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-[var(--accent-cyan)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
                <Input
                  placeholder="Tìm theo tên nhân viên hoặc tiêu đề..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder="Loại yêu cầu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="leave">Nghỉ phép</SelectItem>
                <SelectItem value="overtime">Tăng ca</SelectItem>
                <SelectItem value="late">Đi muộn</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder="Phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Nhân sự">Nhân sự</SelectItem>
                <SelectItem value="Kinh doanh">Kinh doanh</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List with Tabs */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">Danh sách yêu cầu</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v)}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pending">Chờ duyệt ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">Đã duyệt ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Từ chối ({stats.rejected})</TabsTrigger>
              <TabsTrigger value="all">Tất cả ({stats.total})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-[var(--text-sub)]">Đang tải...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-[var(--text-sub)] mx-auto mb-4" />
                  <p className="text-[var(--text-sub)]">Không có yêu cầu nào</p>
                </div>
              ) : (
                filteredRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-[var(--shell)] border-[var(--border)] hover:border-[var(--primary)] transition-all">
                      <CardContent className="p-6 mt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center text-white">
                                {request.employeeName?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <h3 className="text-[var(--text-main)]">{request.employeeName || 'N/A'}</h3>
                                <p className="text-xs text-[var(--text-sub)]">{request.department} • {request.branch}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className={getTypeColor(request.type)}>
                                <span className="mr-1">{getTypeIcon(request.type)}</span>
                                {getTypeLabel(request.type)}
                              </Badge>
                              {request.urgency && (
                                <Badge className={getUrgencyColor(request.urgency)}>
                                  {request.urgency === 'high' ? 'Gấp' : request.urgency === 'medium' ? 'Bình thường' : 'Không gấp'}
                                </Badge>
                              )}
                              <Badge variant="outline" className="border-[var(--border)] text-[var(--text-sub)]">
                                <Calendar className="h-3 w-3 mr-1" />
                                {request.startDate} {request.endDate !== request.startDate && `→ ${request.endDate}`}
                              </Badge>
                              <Badge variant="outline" className="border-[var(--border)] text-[var(--text-sub)]">
                                {request.duration}
                              </Badge>
                            </div>

                            <h4 className="text-[var(--text-main)] mb-2">{request.title}</h4>
                            <p className="text-sm text-[var(--text-sub)] mb-3">{request.description || request.reason}</p>

                            <div className="text-xs text-[var(--text-sub)]">
                              Gửi lúc: {request.submittedAt}
                            </div>

                            {request.approver && (
                              <div className="mt-3 p-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 text-[var(--accent-cyan)] mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-xs text-[var(--text-sub)]">
                                      {request.approver} • {request.approvedAt}
                                    </p>
                                    <p className="text-sm text-[var(--text-main)] mt-1">{request.comments}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="ml-4 mt-2 flex flex-col gap-2">
                            {request.status === 'pending' ? (
                              <>
                                <Button
                                  onClick={() => handleOpenDialog(request, 'approve')}
                                  className="bg-[var(--success)] hover:bg-[var(--success)]/80 text-white"
                                  size="sm"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Duyệt
                                </Button>
                                <Button
                                  onClick={() => handleOpenDialog(request, 'reject')}
                                  variant="outline"
                                  className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/10"
                                  size="sm"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Từ chối
                                </Button>
                              </>
                            ) : (
                              <Badge className={request.status === 'approved' ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-red-500/20 text-red-500'}>
                                {request.status === 'approved' ? '✓ Đã duyệt' : '✗ Đã từ chối'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Phê duyệt yêu cầu' : 'Từ chối yêu cầu'}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {selectedRequest && (
                <>
                  <strong>{selectedRequest.employeeName}</strong> - {selectedRequest.title}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-[var(--text-main)]">Nhận xét (tùy chọn)</Label>
              <Textarea
                placeholder={actionType === 'approve' ? 'Nhập nhận xét về yêu cầu...' : 'Nhập lý do từ chối...'}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)] mt-2"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitAction}
              className={actionType === 'approve'
                ? 'bg-[var(--success)] hover:bg-[var(--success)]/80 text-white'
                : 'bg-[var(--error)] hover:bg-[var(--error)]/80 text-white'
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {actionType === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApproveRequestsPage
