import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { getAllRequests, approveRequest, rejectRequest, bulkApproveRequests, bulkRejectRequests } from '@/services/requestService'
import { getPendingEarlyCheckouts, approveEarlyCheckout } from '@/services/attendanceService'
import { useAuth } from '@/context/AuthContext'
import type { ErrorWithMessage } from '@/types'

type RequestStatus = 'pending' | 'approved' | 'rejected'
type RequestType = 'leave' | 'overtime' | 'late' | 'remote' | 'early_checkout' // ⚠️ MỚI
type ActionType = 'approve' | 'reject' | null
type Urgency = 'high' | 'medium' | 'low'

interface Request {
  id: string
  attendanceId?: string // ⚠️ MỚI: ID của attendance record (cho early checkout)
  status: RequestStatus
  type: RequestType
  employeeName?: string
  title?: string
  description?: string
  reason?: string
  department?: string
  branch?: string
  startDate?: string
  endDate?: string
  duration?: string
  urgency?: Urgency
  submittedAt?: string
  approver?: string
  approvedAt?: string
  comments?: string
  // ⚠️ MỚI: Early checkout specific fields
  checkIn?: string
  checkOut?: string
  hoursWorked?: number
  minutesWorked?: number
  workCredit?: number
  earlyCheckoutReason?: 'machine_issue' | 'personal_emergency' | 'manager_request'
  reasonText?: string
  date?: string
}

interface GetAllRequestsResponse {
  requests?: Request[]
}

interface Stats {
  pending: number
  approved: number
  rejected: number
  total: number
}

const ApproveRequestsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const [allRequests, setAllRequests] = useState<Request[]>([]) // Lưu tất cả requests để tính stats
  const [requests, setRequests] = useState<Request[]>([]) // Requests đã filter theo tab
  const [selectedTab, setSelectedTab] = useState<string>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<ActionType>(null)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<ActionType>(null)
  const [bulkComments, setBulkComments] = useState('')
  const [processingBulk, setProcessingBulk] = useState(false)

  const typeLabelMap = useMemo(
    () => ({
      leave: t('dashboard:approveRequests.types.leave'),
      overtime: t('dashboard:approveRequests.types.overtime'),
      late: t('dashboard:approveRequests.types.late'),
      remote: t('dashboard:approveRequests.types.remote'),
      early_checkout: 'Check-out sớm', // ⚠️ MỚI
    }),
    [t]
  )

  const typeOptions = useMemo(
    () => [
      { value: 'all', label: t('dashboard:approveRequests.filters.allTypes') },
      { value: 'leave', label: typeLabelMap.leave },
      { value: 'overtime', label: typeLabelMap.overtime },
      { value: 'late', label: typeLabelMap.late },
      { value: 'remote', label: typeLabelMap.remote },
      { value: 'early_checkout', label: typeLabelMap.early_checkout }, // ⚠️ MỚI
    ],
    [t, typeLabelMap]
  )

  // Extract unique departments from requests data (no API call needed)
  // This avoids permission issues since the departments endpoint requires ADMIN/SUPER_ADMIN
  useEffect(() => {
    if (allRequests.length > 0) {
      // Extract unique departments from requests
      const uniqueDepartments = Array.from(
        new Set(
          allRequests
            .map((req) => req.department)
            .filter((dept): dept is string => Boolean(dept && dept.trim() !== ''))
        )
      ).sort()

      // Convert to the format expected by the component
      const deptList = uniqueDepartments.map((name) => ({
        _id: name, // Use name as ID since we don't have actual IDs
        name: name,
      }))
      setDepartments(deptList)
    } else {
      // Reset to empty if no requests
      setDepartments([])
    }
  }, [allRequests])

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: t('dashboard:approveRequests.filters.allDepartments') },
      ...departments.map((dept) => ({
        value: dept.name,
        label: dept.name,
      })),
    ],
    [t, departments]
  )

  const urgencyLabels = useMemo(
    () => ({
      high: t('dashboard:approveRequests.urgency.high'),
      medium: t('dashboard:approveRequests.urgency.medium'),
      low: t('dashboard:approveRequests.urgency.low'),
    }),
    [t]
  )

  const getTypeLabel = useCallback(
    (type: RequestType): string => typeLabelMap[type] ?? type,
    [typeLabelMap]
  )

  const getUrgencyLabel = useCallback(
    (urgency: Urgency): string => urgencyLabels[urgency],
    [urgencyLabels]
  )

  // Fetch tất cả requests để tính stats (không filter theo status)
  const fetchAllRequests = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (filterType !== 'all' && filterType !== 'early_checkout') params.type = filterType
      if (filterDepartment !== 'all') params.department = filterDepartment
      if (debouncedSearchQuery) params.search = debouncedSearchQuery
      // Không filter theo status để lấy tất cả

      // For SUPERVISOR, only show requests from their department
      // Note: User type may not include department, but API will handle filtering
      if (user?.role === 'SUPERVISOR') {
        // Backend will automatically filter by supervisor's department
        // No need to pass department param here
      }

      // Fetch regular requests
      const [requestsResult, earlyCheckoutsResult] = await Promise.all([
        filterType === 'all' || filterType !== 'early_checkout'
          ? getAllRequests(params).catch(() => ({ requests: [] }))
          : Promise.resolve({ requests: [] }),
        filterType === 'all' || filterType === 'early_checkout'
          ? getPendingEarlyCheckouts({
              search: debouncedSearchQuery || undefined,
              page: 1,
              limit: 1000, // Get all for stats
            }).catch(() => ({ records: [] }))
          : Promise.resolve({ records: [] }),
      ])

      // Convert early checkouts to request format
      const earlyCheckoutRequests: Request[] = (earlyCheckoutsResult.records || []).map((record: any) => {
        const hoursWorked = record.hoursWorked ?? 0;
        const minutesWorked = record.minutesWorked ?? 0;
        const reasonText = record.reasonText || 'Không có lý do';
        
        return {
          id: record.attendanceId || record.id,
          attendanceId: record.attendanceId || record.id,
          status: 'pending' as RequestStatus,
          type: 'early_checkout' as RequestType,
          employeeName: record.employeeName,
          title: `Check-out sớm - ${reasonText}`,
          description: `Đã làm việc ${minutesWorked} phút (${hoursWorked.toFixed(2)} giờ). Lý do: ${reasonText}`,
          reason: reasonText,
          department: record.department,
          branch: record.branch,
          startDate: record.date,
          endDate: record.date,
          duration: `${minutesWorked} phút`,
          urgency: 'high' as Urgency,
          submittedAt: record.submittedAt,
          // Early checkout specific
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          hoursWorked,
          minutesWorked,
          workCredit: record.workCredit ?? 0,
          earlyCheckoutReason: record.earlyCheckoutReason,
          reasonText,
          date: record.date,
        };
      })

      // Merge requests - ensure type compatibility
      const regularRequests: Request[] = (requestsResult.requests || []) as Request[]
      const allRequestsList: Request[] = [
        ...regularRequests,
        ...earlyCheckoutRequests,
      ]

      setAllRequests(allRequestsList)
    } catch (error) {
      console.error('[ApproveRequests] fetch all error:', error)
      toast.error(t('dashboard:approveRequests.actions.error'))
      setAllRequests([])
    }
  }, [filterType, filterDepartment, debouncedSearchQuery, t, user])

  // Filter requests theo selectedTab từ allRequests
  useEffect(() => {
    if (selectedTab === 'all') {
      setRequests(allRequests)
    } else {
      setRequests(allRequests.filter(req => req.status === selectedTab))
    }
  }, [selectedTab, allRequests])

  // Fetch tất cả requests khi component mount hoặc filters thay đổi
  useEffect(() => {
    setLoading(true)
    fetchAllRequests().finally(() => setLoading(false))
  }, [fetchAllRequests])

  // Filter requests - đầy đủ logic như dự án tham khảo (memoized for performance)
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Tab filter
      if (selectedTab !== 'all' && req.status !== selectedTab) return false

      // Search filter (using debounced value)
      if (debouncedSearchQuery && !req.employeeName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        && !req.title?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) return false

      // Type filter
      if (filterType !== 'all' && req.type !== filterType) return false

      // Department filter
      if (filterDepartment !== 'all' && req.department !== filterDepartment) return false

      return true
    })
  }, [requests, selectedTab, debouncedSearchQuery, filterType, filterDepartment])

  // Tính stats từ allRequests (tất cả requests, không filter theo tab)
  const stats: Stats = {
    pending: allRequests.filter(r => r.status === 'pending').length,
    approved: allRequests.filter(r => r.status === 'approved').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
    total: allRequests.length,
  }

  const handleOpenDialog = (request: Request, action: ActionType): void => {
    setSelectedRequest(request)
    setActionType(action)
    setIsDialogOpen(true)
    setComments('')
  }

  // Handle approve/reject request via API
  const handleSubmitAction = async (): Promise<void> => {
    if (!selectedRequest || !actionType) return

    try {
      // ⚠️ MỚI: Early checkout sử dụng API khác
      if (selectedRequest.type === 'early_checkout' && selectedRequest.attendanceId) {
        const approvalStatus = actionType === 'approve' ? 'APPROVED' : 'REJECTED'
        await approveEarlyCheckout(selectedRequest.attendanceId, approvalStatus, {
          notes: comments || undefined,
          // workCredit có thể được thêm vào đây nếu cần override giá trị tính toán
        })
        toast.success(
          actionType === 'approve'
            ? 'Đã phê duyệt yêu cầu check-out sớm'
            : 'Đã từ chối yêu cầu check-out sớm'
        )
      } else {
        // Regular requests
        if (actionType === 'approve') {
          await approveRequest(selectedRequest.id, comments)
          toast.success(t('dashboard:approveRequests.actions.approveSuccess'))
        } else {
          await rejectRequest(selectedRequest.id, comments)
          toast.success(t('dashboard:approveRequests.actions.rejectSuccess'))
        }
      }
      setIsDialogOpen(false)
      setSelectedRequest(null)
      setActionType(null)
      setComments('')
      // Refresh requests list
      await fetchAllRequests()
    } catch (error) {
      console.error('[ApproveRequests] action error:', error)
      const err = error as ErrorWithMessage
      toast.error((err.response?.data as { message?: string })?.message || err.message || t('dashboard:approveRequests.actions.error'))
    }
  }

  // Handle bulk approve/reject
  const handleBulkAction = async (): Promise<void> => {
    if (selectedIds.size === 0 || !bulkActionType) return

    setProcessingBulk(true)
    try {
      const ids = Array.from(selectedIds)
      let result
      
      if (bulkActionType === 'approve') {
        result = await bulkApproveRequests(ids, bulkComments)
      } else {
        result = await bulkRejectRequests(ids, bulkComments)
      }

      if (result.successCount > 0) {
        toast.success(result.message || `Đã ${bulkActionType === 'approve' ? 'phê duyệt' : 'từ chối'} ${result.successCount} yêu cầu`)
      }
      
      if (result.failedCount > 0) {
        toast.warning(`${result.failedCount} yêu cầu không thể xử lý`)
      }

      setIsBulkDialogOpen(false)
      setBulkActionType(null)
      setBulkComments('')
      setSelectedIds(new Set())
      
      // Refresh requests list
      await fetchAllRequests()
    } catch (error) {
      console.error('[ApproveRequests] bulk action error:', error)
      const err = error as ErrorWithMessage
      toast.error((err.response?.data as { message?: string })?.message || err.message || 'Không thể xử lý hàng loạt yêu cầu')
    } finally {
      setProcessingBulk(false)
    }
  }

  // Toggle select all
  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      const pendingIds = filteredRequests
        .filter(req => req.status === 'pending')
        .map(req => req.id)
      setSelectedIds(new Set(pendingIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Toggle single selection
  const handleToggleSelect = (id: string): void => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Open bulk action dialog
  const handleOpenBulkDialog = (action: ActionType): void => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một yêu cầu')
      return
    }
    setBulkActionType(action)
    setIsBulkDialogOpen(true)
    setBulkComments('')
  }

  // Get pending requests count for select all
  const pendingRequestsCount = useMemo(() => {
    return filteredRequests.filter(req => req.status === 'pending').length
  }, [filteredRequests])

  const isAllSelected = useMemo(() => {
    return pendingRequestsCount > 0 && selectedIds.size === pendingRequestsCount &&
      filteredRequests.filter(req => req.status === 'pending').every(req => selectedIds.has(req.id))
  }, [selectedIds, pendingRequestsCount, filteredRequests])

  const getTypeIcon = (type: RequestType): ReactNode => {
    switch (type) {
      case 'leave': return <Moon className="h-4 w-4" />
      case 'overtime': return <Sunset className="h-4 w-4" />
      case 'late': return <Clock className="h-4 w-4" />
      case 'remote': return <Briefcase className="h-4 w-4" />
      case 'early_checkout': return <Clock className="h-4 w-4" /> // ⚠️ MỚI
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: RequestType): string => {
    switch (type) {
      case 'leave': return 'bg-blue-500/20 text-blue-500'
      case 'overtime': return 'bg-orange-500/20 text-orange-500'
      case 'late': return 'bg-yellow-500/20 text-yellow-500'
      case 'remote': return 'bg-purple-500/20 text-purple-500'
      case 'early_checkout': return 'bg-red-500/20 text-red-500' // ⚠️ MỚI
      default: return 'bg-gray-500/20 text-gray-500'
    }
  }

  const getUrgencyColor = (urgency?: Urgency): string => {
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
          {t('dashboard:approveRequests.title')}
        </h1>
        <p className="text-[var(--text-sub)] mt-2">
          {t('dashboard:approveRequests.description')}
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
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:approveRequests.stats.pending')}</p>
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
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:approveRequests.stats.approved')}</p>
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
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:approveRequests.stats.rejected')}</p>
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
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:approveRequests.stats.total')}</p>
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
                  placeholder={t('dashboard:approveRequests.filters.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder={t('dashboard:approveRequests.filters.requestType')} />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder={t('dashboard:approveRequests.filters.department')} />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List with Tabs */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            {t('dashboard:approveRequests.request.listTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions Bar */}
          {selectedTab === 'pending' && filteredRequests.filter(req => req.status === 'pending').length > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--border)] bg-gradient-to-r from-[var(--shell)] to-[var(--surface)] p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className={`border-[var(--primary)] ${isAllSelected ? 'bg-[var(--primary)]' : ''}`}
                  />
                  <Label className="text-sm font-medium text-[var(--text-main)] cursor-pointer">
                    Chọn tất cả <span className="text-[var(--primary)]">({selectedIds.size} đã chọn)</span>
                  </Label>
                </div>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleOpenBulkDialog('approve')}
                    className="bg-[var(--success)] hover:bg-[var(--success)]/80 text-white"
                    size="sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Duyệt ({selectedIds.size})
                  </Button>
                  <Button
                    onClick={() => handleOpenBulkDialog('reject')}
                    variant="outline"
                    className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/10"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Từ chối ({selectedIds.size})
                  </Button>
                </div>
              )}
            </div>
          )}

          <Tabs value={selectedTab} onValueChange={(v) => {
            setSelectedTab(v)
            setSelectedIds(new Set()) // Clear selection when switching tabs
          }}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pending">{t('dashboard:approveRequests.tabs.pending')} ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">{t('dashboard:approveRequests.tabs.approved')} ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected">{t('dashboard:approveRequests.tabs.rejected')} ({stats.rejected})</TabsTrigger>
              <TabsTrigger value="all">{t('dashboard:approveRequests.tabs.all')} ({stats.total})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-[var(--text-sub)]">{t('dashboard:approveRequests.request.loading')}</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-[var(--text-sub)] mx-auto mb-4" />
                  <p className="text-[var(--text-sub)]">{t('dashboard:approveRequests.request.noRequests')}</p>
                </div>
              ) : (
                filteredRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`bg-[var(--shell)] border-[var(--border)] hover:border-[var(--primary)] transition-all ${selectedIds.has(request.id) ? 'border-[var(--primary)] bg-[var(--primary)]/5' : ''}`}>
                      <CardContent className="p-6 mt-4">
                        <div className="flex items-start justify-between gap-4">
                          {/* Checkbox for pending requests */}
                          {request.status === 'pending' && (
                            <div className="pt-1">
                              <Checkbox
                                checked={selectedIds.has(request.id)}
                                onCheckedChange={() => handleToggleSelect(request.id)}
                                className="border-[var(--border)]"
                              />
                            </div>
                          )}
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
                                  {getUrgencyLabel(request.urgency)}
                                </Badge>
                              )}
                              <Badge variant="outline" className="border-[var(--border)] text-[var(--text-sub)]">
                                <Calendar className="h-3 w-3 mr-1" />
                                {request.startDate} {request.endDate !== request.startDate && `→ ${request.endDate}`}
                              </Badge>
                              {request.duration && (
                                <Badge variant="outline" className="border-[var(--border)] text-[var(--text-sub)]">
                                  {request.duration}
                                </Badge>
                              )}
                            </div>

                            <h4 className="text-[var(--text-main)] mb-2">{request.title}</h4>
                            <p className="text-sm text-[var(--text-sub)] mb-3">{request.description || request.reason}</p>

                            {/* ⚠️ MỚI: Early checkout specific info */}
                            {request.type === 'early_checkout' && (
                              <div className="mt-3 p-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-[var(--text-sub)]">Ngày:</span>
                                    <span className="text-[var(--text-main)] ml-2 font-medium">{request.date}</span>
                                  </div>
                                  <div>
                                    <span className="text-[var(--text-sub)]">Thời gian làm:</span>
                                    <span className="text-[var(--text-main)] ml-2 font-medium">
                                      {request.minutesWorked ?? 0} phút ({request.hoursWorked?.toFixed(2) ?? '0.00'} giờ)
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[var(--text-sub)]">Check-in:</span>
                                    <span className="text-[var(--text-main)] ml-2 font-medium">{request.checkIn || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[var(--text-sub)]">Check-out:</span>
                                    <span className="text-[var(--text-main)] ml-2 font-medium">{request.checkOut || '-'}</span>
                                  </div>
                                  {request.workCredit !== undefined && (
                                    <div className="col-span-2">
                                      <span className="text-[var(--text-sub)]">Số công:</span>
                                      <span className="text-[var(--text-main)] ml-2 font-medium">
                                        {request.workCredit === 0 ? '0' : request.workCredit === 0.5 ? '0.5' : request.workCredit === 1.0 ? '1.0' : request.workCredit.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {request.submittedAt && (
                              <div className="text-xs text-[var(--text-sub)] mt-2">
                                {t('dashboard:approveRequests.request.sentAt', {
                                  time: request.submittedAt,
                                })}
                              </div>
                            )}

                            {request.approver && (
                              <div className="mt-3 p-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 text-[var(--accent-cyan)] mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-xs text-[var(--text-sub)]">
                                      {t('dashboard:approveRequests.request.approvedBy', {
                                        approver: request.approver,
                                      })}
                                      {request.approvedAt &&
                                        ` • ${t('dashboard:approveRequests.request.atTime', {
                                          time: request.approvedAt,
                                        })}`}
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
                                  {t('dashboard:approveRequests.actions.approve')}
                                </Button>
                                <Button
                                  onClick={() => handleOpenDialog(request, 'reject')}
                                  variant="outline"
                                  className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/10"
                                  size="sm"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  {t('dashboard:approveRequests.actions.reject')}
                                </Button>
                              </>
                            ) : (
                              <Badge className={request.status === 'approved' ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-red-500/20 text-red-500'}>
                                {request.status === 'approved' ? `✓ ${t('dashboard:approveRequests.stats.approved')}` : `✗ ${t('dashboard:approveRequests.stats.rejected')}`}
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
              {actionType === 'approve' ? t('dashboard:approveRequests.actions.approveTitle') : t('dashboard:approveRequests.actions.rejectTitle')}
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
              <Label className="text-[var(--text-main)]">{t('dashboard:approveRequests.actions.comments')}</Label>
              <Textarea
                placeholder={t('dashboard:approveRequests.actions.commentsPlaceholder')}
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
              {t('dashboard:approveRequests.actions.cancel')}
            </Button>
            <Button
              onClick={handleSubmitAction}
              className={actionType === 'approve'
                ? 'bg-[var(--success)] hover:bg-[var(--success)]/80 text-white'
                : 'bg-[var(--error)] hover:bg-[var(--error)]/80 text-white'
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {t('dashboard:approveRequests.actions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === 'approve' ? 'Phê duyệt hàng loạt' : 'Từ chối hàng loạt'}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Bạn đang {bulkActionType === 'approve' ? 'phê duyệt' : 'từ chối'} {selectedIds.size} yêu cầu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-[var(--text-main)]">Ghi chú (tùy chọn)</Label>
              <Textarea
                placeholder={bulkActionType === 'approve' ? 'Nhập ghi chú phê duyệt...' : 'Nhập lý do từ chối...'}
                value={bulkComments}
                onChange={(e) => setBulkComments(e.target.value)}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)] mt-2"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
              disabled={processingBulk}
            >
              Hủy
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={processingBulk}
              className={bulkActionType === 'approve'
                ? 'bg-[var(--success)] hover:bg-[var(--success)]/80 text-white'
                : 'bg-[var(--error)] hover:bg-[var(--error)]/80 text-white'
              }
            >
              {processingBulk ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApproveRequestsPage




