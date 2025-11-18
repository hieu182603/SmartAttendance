

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  Briefcase,
  Moon,
  Sun,
  AlertCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestType, setRequestType] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestDateRange, setRequestDateRange] = useState({
    start: "",
    end: "",
  });
  const [comments, setComments] = useState("");

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    total: requests.length,
  };

  const applyFilters = (tabValue) => {
    return requests.filter((req) => {
      if (tabValue !== "all" && req.status !== tabValue) return false;
      if (
        searchQuery &&
        !req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !req.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterType !== "all" && req.type !== filterType) return false;
      if (filterDepartment !== "all" && req.department !== filterDepartment) {
        return false;
      }
      return true;
    });
  };

  const handleCreateRequest = () => {
    if (!requestType || !requestReason || !requestDateRange.start) {
      toast.error("Vui lòng điền đầy đủ thông tin đơn yêu cầu");
      return;
    }

    const newRequest = {
      id: `REQ${String(requests.length + 1).padStart(3, "0")}`,
      employeeId: "EMP_CURRENT",
      employeeName: "Bạn",
      type: requestType,
      status: "pending",
      title:
        requestType === "leave"
          ? "Nghỉ phép"
          : requestType === "overtime"
          ? "Tăng ca"
          : requestType === "remote"
          ? "Làm việc từ xa"
          : "Sửa công",
      description: requestReason,
      startDate: requestDateRange.start,
      endDate: requestDateRange.end || requestDateRange.start,
      duration: requestType === "overtime" ? "2 giờ" : "1 ngày",
      submittedAt: new Date().toLocaleString("vi-VN"),
      department: "N/A",
      branch: "N/A",
      urgency: "medium",
    };

    setRequests([newRequest, ...requests]);
    setIsCreateDialogOpen(false);
    setRequestType("");
    setRequestReason("");
    setRequestDateRange({ start: "", end: "" });
    toast.success("Đơn yêu cầu đã được gửi!");
  };

  const handleOpenActionDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setComments("");
    setIsActionDialogOpen(true);
  };

  const handleSubmitAction = () => {
    if (!selectedRequest || !actionType) return;

    const updatedRequests = requests.map((req) => {
      if (req.id === selectedRequest.id) {
        return {
          ...req,
          status: actionType === "approve" ? "approved" : "rejected",
          approver: "Current User",
          approvedAt: new Date().toLocaleString("vi-VN"),
          comments: comments || undefined,
        };
      }
      return req;
    });

    setRequests(updatedRequests);
    setIsActionDialogOpen(false);
    setSelectedRequest(null);
    setActionType(null);
    setComments("");

    toast.success(
      actionType === "approve"
        ? "✅ Đã phê duyệt yêu cầu"
        : "❌ Đã từ chối yêu cầu"
    );
  };

  const getTypeIconLabel = (type) => {
    switch (type) {
      case "leave":
        return { icon: <Moon className="h-4 w-4" />, label: "Nghỉ phép" };
      case "overtime":
        return { icon: <Sun className="h-4 w-4" />, label: "Tăng ca" };
      case "remote":
        return { icon: <Briefcase className="h-4 w-4" />, label: "Remote" };
      case "correction":
      default:
        return { icon: <Clock className="h-4 w-4" />, label: "Sửa công" };
    }
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case "leave":
        return "bg-blue-500/20 text-blue-500";
      case "overtime":
        return "bg-orange-500/20 text-orange-500";
      case "remote":
        return "bg-purple-500/20 text-purple-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "bg-red-500/20 text-red-500";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500";
      case "low":
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const renderRequests = (tabValue) => {
    const data = applyFilters(tabValue);

    if (data.length === 0) {
      return (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[var(--text-sub)]" />
          <p className="text-[var(--text-sub)]">Không có yêu cầu nào</p>
        </div>
      );
    }

    return data.map((request) => {
      const { icon, label } = getTypeIconLabel(request.type);
      return (
        <Card
          key={request.id}
          className="bg-[var(--shell)] border border-[var(--border)] transition-all hover:border-[var(--accent-cyan)]"
        >
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white flex items-center justify-center">
                  {request.employeeName?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-[var(--text-main)]">{request.employeeName}</h3>
                  <p className="text-xs text-[var(--text-sub)]">
                    {request.department} • {request.branch}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={getBadgeColor(request.type)}>
                  <span className="mr-1">{icon}</span>
                  {label}
                </Badge>
                <Badge className={getUrgencyColor(request.urgency)}>
                  {request.urgency === "high"
                    ? "Gấp"
                    : request.urgency === "medium"
                    ? "Bình thường"
                    : "Không gấp"}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-[var(--border)] text-[var(--text-sub)]"
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {request.startDate}
                  {request.endDate && request.endDate !== request.startDate
                    ? ` → ${request.endDate}`
                    : ""}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-[var(--border)] text-[var(--text-sub)]"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {request.duration}
                </Badge>
              </div>

              <div>
                <h4 className="text-[var(--text-main)]">{request.title}</h4>
                <p className="text-sm text-[var(--text-sub)]">
                  {request.description}
                </p>
              </div>

              <div className="text-xs text-[var(--text-sub)]">
                Gửi lúc: {request.submittedAt}
              </div>

              {request.approver && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-3 text-sm text-[var(--text-main)]">
                  <p className="text-xs text-[var(--text-sub)]">
                    {request.approver} • {request.approvedAt}
                  </p>
                  <p>{request.comments}</p>
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto">
              {request.status === "pending" ? (
                <>
                  <Button
                    onClick={() => handleOpenActionDialog(request, "approve")}
                    className="bg-[var(--success)] text-white hover:bg-[var(--success)]/80"
                    size="sm"
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Duyệt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenActionDialog(request, "reject")}
                    className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/10"
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Từ chối
                  </Button>
                </>
              ) : (
                <Badge
                  className={
                    request.status === "approved"
                      ? "bg-[var(--success)]/20 text-[var(--success)]"
                      : "bg-[var(--error)]/20 text-[var(--error)]"
                  }
                >
                  {request.status === "approved" ? "✓ Đã duyệt" : "✗ Đã từ chối"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      );
    });
  };
=======
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
 main

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl text-[var(--text-main)]">Yêu cầu & Đơn từ</h1>
          <p className="text-[var(--text-sub)]">
            Quản lý nghỉ phép, tăng ca, sửa công và phê duyệt trực tiếp
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
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
                  <SelectTrigger className="border-[var(--border)] bg-[var(--input-bg)]">
                    <SelectValue placeholder="Chọn loại đơn" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                    <SelectItem value="leave">Nghỉ phép</SelectItem>
                    <SelectItem value="overtime">Tăng ca</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="correction">Sửa công</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Từ ngày</Label>
                  <Input
                    type="date"

                    value={requestDateRange.start}
                    onChange={(e) =>
                      setRequestDateRange((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                    className="border-[var(--border)] bg-[var(--input-bg)]"

                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[var(--input-bg)] border-[var(--border)]"

                  />
                </div>
                <div className="space-y-2">
                  <Label>Đến ngày</Label>
                  <Input
                    type="date"

                    value={requestDateRange.end}
                    onChange={(e) =>
                      setRequestDateRange((prev) => ({
                        ...prev,
                        end: e.target.value,
                      }))
                    }
                   className="border-[var(--border)] bg-[var(--input-bg)]"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[var(--input-bg)] border-[var(--border)]"

                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lý do</Label>
                <Textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết..."

                  className="min-h-[120px] border-[var(--border)] bg-[var(--input-bg)]"
                />
              </div>

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
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">

            <p className="text-sm text-[var(--text-sub)]">Chờ duyệt</p>
            <p className="mt-1 text-2xl text-[var(--warning)]">{stats.pending}</p>

            <p className="text-sm text-[var(--text-sub)] mt-2">Tổng đơn</p>
            <p className="text-2xl text-[var(--text-main)] mt-1">{summary.total}</p>
 main
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">

            <p className="text-sm text-[var(--text-sub)]">Đã duyệt</p>
            <p className="mt-1 text-2xl text-[var(--success)]">{stats.approved}</p>

            <p className="text-sm text-[var(--text-sub)] mt-2">Chờ duyệt</p>
            <p className="text-2xl text-[var(--warning)] mt-1">{summary.pending}</p>
 main
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">

            <p className="text-sm text-[var(--text-sub)]">Từ chối</p>
            <p className="mt-1 text-2xl text-[var(--error)]">{stats.rejected}</p>

            <p className="text-sm text-[var(--text-sub)] mt-2">Đã duyệt</p>
            <p className="text-2xl text-[var(--success)] mt-1">{summary.approved}</p>
 main
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">

            <p className="text-sm text-[var(--text-sub)]">Tổng đơn</p>
            <p className="mt-1 text-2xl text-[var(--accent-cyan)]">{stats.total}</p>

            <p className="text-sm text-[var(--text-sub)] mt-2">Từ chối</p>
            <p className="text-2xl text-[var(--error)] mt-1">{summary.rejected}</p>
 main
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-sub)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên nhân viên hoặc tiêu đề..."
                  className="border-[var(--border)] bg-[var(--shell)] pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full border-[var(--border)] bg-[var(--shell)] text-left md:w-[200px]">
                <SelectValue placeholder="Loại yêu cầu" />
              </SelectTrigger>
              <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="leave">Nghỉ phép</SelectItem>
                <SelectItem value="overtime">Tăng ca</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="correction">Sửa công</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full border-[var(--border)] bg-[var(--shell)] text-left md:w-[200px]">
                <SelectValue placeholder="Phòng ban" />
              </SelectTrigger>
              <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Nhân sự">Nhân sự</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Kinh doanh">Kinh doanh</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Chờ duyệt ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Đã duyệt ({stats.approved})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Từ chối ({stats.rejected})
              </TabsTrigger>
              <TabsTrigger value="all">Tất cả ({stats.total})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6 space-y-4">
              {renderRequests("pending")}
            </TabsContent>
            <TabsContent value="approved" className="mt-6 space-y-4">
              {renderRequests("approved")}
            </TabsContent>
            <TabsContent value="rejected" className="mt-6 space-y-4">
              {renderRequests("rejected")}
            </TabsContent>
            <TabsContent value="all" className="mt-6 space-y-4">
              {renderRequests("all")}
            </TabsContent>
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
 main
        </CardContent>
      </Card>

      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Phê duyệt yêu cầu" : "Từ chối yêu cầu"}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {selectedRequest && (
                <>
                  <strong>{selectedRequest.employeeName}</strong> •{" "}
                  {selectedRequest.title}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Label className="text-[var(--text-main)]">Nhận xét (tùy chọn)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                actionType === "approve"
                  ? "Nhập nhận xét về yêu cầu..."
                  : "Nhập lý do từ chối..."
              }
              className="border-[var(--border)] bg-[var(--shell)]"
              rows={4}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsActionDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitAction}
              className={
                actionType === "approve"
                  ? "bg-[var(--success)] hover:bg-[var(--success)]/80 text-white"
                  : "bg-[var(--error)] hover:bg-[var(--error)]/80 text-white"
              }
            >
              {actionType === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RequestsPage
