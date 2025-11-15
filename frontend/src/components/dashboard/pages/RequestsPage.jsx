//Request

import { toast } from 'sonner'
import { useState } from 'react'
import { Plus, FileText, Clock, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog'
import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

const initialRequests = [
  { id: 1, type: 'leave', title: 'Nghỉ phép', date: '23/10/2024', duration: '1 ngày', status: 'approved', reason: 'Việc gia đình', createdAt: '20/10/2024' },
  { id: 2, type: 'overtime', title: 'Tăng ca', date: '21/10/2024', duration: '1.5 giờ', status: 'approved', reason: 'Hoàn thành dự án', createdAt: '21/10/2024' },
  { id: 3, type: 'correction', title: 'Sửa công', date: '19/10/2024', duration: '-', status: 'pending', reason: 'Quên chấm công ra', createdAt: '20/10/2024' },
  { id: 4, type: 'leave', title: 'Nghỉ phép', date: '15/10/2024', duration: '0.5 ngày', status: 'rejected', reason: 'Khám bệnh', createdAt: '14/10/2024' },
]

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30">Đã duyệt</Badge>
    case 'pending':
      return <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30">Chờ duyệt</Badge>
    case 'rejected':
      return <Badge className="bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30">Từ chối</Badge>
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
  const [requests, setRequests] = useState(initialRequests)

  const filteredRequests = activeTab === 'all' 
    ? requests 
    : requests.filter(r => r.status === activeTab)

  const handleCreateRequest = () => {
    const newRequest = {
      id: requests.length + 1,
      type: requestType,
      title: requestType === 'leave' ? 'Nghỉ phép' : requestType === 'overtime' ? 'Tăng ca' : 'Sửa công',
      date: '25/10/2024', // Example date
      duration: requestType === 'leave' ? '1 ngày' : requestType === 'overtime' ? '1.5 giờ' : '-',
      status: 'pending',
      reason: 'Lý do chi tiết...', // Example reason
      createdAt: '25/10/2024', // Example creation date
    }

    setRequests([...requests, newRequest])
    toast.success('Đơn yêu cầu đã được gửi!')
    setIsDialogOpen(false)
    setRequestType('')
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
                  <Input type="date" className="bg-[var(--input-bg)] border-[var(--border)]" />
                </div>
                <div className="space-y-2">
                  <Label>Đến ngày</Label>
                  <Input type="date" className="bg-[var(--input-bg)] border-[var(--border)]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lý do</Label>
                <Textarea 
                  placeholder="Nhập lý do chi tiết..."
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
                  className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
                >
                  Gửi yêu cầu
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
            <p className="text-sm text-[var(--text-sub)]">Tổng đơn</p>
            <p className="text-2xl text-[var(--text-main)] mt-1">{requests.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)]">Chờ duyệt</p>
            <p className="text-2xl text-[var(--warning)] mt-1">{requests.filter(r => r.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)]">Đã duyệt</p>
            <p className="text-2xl text-[var(--success)] mt-1">{requests.filter(r => r.status === 'approved').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)]">Từ chối</p>
            <p className="text-2xl text-[var(--error)] mt-1">{requests.filter(r => r.status === 'rejected').length}</p>
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
            {filteredRequests.map((request) => (
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
