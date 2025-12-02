import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
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
import { toast } from 'sonner'
import { getAllRequests, approveRequest, rejectRequest } from '@/services/requestService'
import type { ErrorWithMessage } from '@/types'

type RequestStatus = 'pending' | 'approved' | 'rejected'
type RequestType = 'leave' | 'overtime' | 'late' | 'remote'
type ActionType = 'approve' | 'reject' | null
type Urgency = 'high' | 'medium' | 'low'

interface Request {
  id: string
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
  const [allRequests, setAllRequests] = useState<Request[]>([]) // Lưu tất cả requests để tính stats
  const [requests, setRequests] = useState<Request[]>([]) // Requests đã filter theo tab
  const [selectedTab, setSelectedTab] = useState<string>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<ActionType>(null)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)

  const typeLabelMap = useMemo(
    () => ({
      leave: t('dashboard:approveRequests.types.leave'),
      overtime: t('dashboard:approveRequests.types.overtime'),
      late: t('dashboard:approveRequests.types.late'),
      remote: t('dashboard:approveRequests.types.remote'),
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
    ],
    [t, typeLabelMap]
  )

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: t('dashboard:approveRequests.filters.allDepartments') },
      { value: 'IT', label: t('dashboard:approveRequests.departments.it') },
      { value: 'Nhân sự', label: t('dashboard:approveRequests.departments.hr') },
      { value: 'Kinh doanh', label: t('dashboard:approveRequests.departments.sales') },
      { value: 'Marketing', label: t('dashboard:approveRequests.departments.marketing') },
    ],
    [t]
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
      if (filterType !== 'all') params.type = filterType
      if (filterDepartment !== 'all') params.department = filterDepartment
      if (searchQuery) params.search = searchQuery
      // Không filter theo status để lấy tất cả

      const result = await getAllRequests(params) as GetAllRequestsResponse
      setAllRequests(result.requests || [])
    } catch (error) {
      console.error('[ApproveRequests] fetch all error:', error)
      toast.error(t('dashboard:approveRequests.actions.error'))
      setAllRequests([])
    }
  }, [filterType, filterDepartment, searchQuery])

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
      if (actionType === 'approve') {
        await approveRequest(selectedRequest.id, comments)
        toast.success(t('dashboard:approveRequests.actions.approveSuccess'))
      } else {
        await rejectRequest(selectedRequest.id, comments)
        toast.success(t('dashboard:approveRequests.actions.rejectSuccess'))
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

  const getTypeIcon = (type: RequestType): ReactNode => {
    switch (type) {
      case 'leave': return <Moon className="h-4 w-4" />
      case 'overtime': return <Sunset className="h-4 w-4" />
      case 'late': return <Clock className="h-4 w-4" />
      case 'remote': return <Briefcase className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: RequestType): string => {
    switch (type) {
      case 'leave': return 'bg-blue-500/20 text-blue-500'
      case 'overtime': return 'bg-orange-500/20 text-orange-500'
      case 'late': return 'bg-yellow-500/20 text-yellow-500'
      case 'remote': return 'bg-purple-500/20 text-purple-500'
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
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v)}>
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

                            {request.submittedAt && (
                              <div className="text-xs text-[var(--text-sub)]">
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
    </div>
  )
}

export default ApproveRequestsPage




