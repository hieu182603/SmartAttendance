import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  History,
  Info,
  Award,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Progress } from '../../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { toast } from 'sonner'
import { getLeaveBalance, getLeaveHistory } from '../../../services/dashboardService'

// Helper function để lấy icon và color dựa trên loại nghỉ phép
const getLeaveTypeConfig = (typeId) => {
  const configs = {
    annual: {
      icon: <Calendar className="h-5 w-5" />,
      color: 'bg-blue-500',
      description: 'Nghỉ phép hàng năm theo quy định',
    },
    sick: {
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'bg-red-500',
      description: 'Nghỉ ốm có lương',
    },
    unpaid: {
      icon: <XCircle className="h-5 w-5" />,
      color: 'bg-gray-500',
      description: 'Nghỉ không hưởng lương',
    },
    compensatory: {
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-purple-500',
      description: 'Nghỉ bù do làm thêm giờ',
    },
    maternity: {
      icon: <Award className="h-5 w-5" />,
      color: 'bg-pink-500',
      description: 'Nghỉ thai sản theo luật lao động',
    },
  }
  return configs[typeId] || {
    icon: <Calendar className="h-5 w-5" />,
    color: 'bg-gray-500',
    description: '',
  }
}

const LeaveBalancePage = () => {
  const [selectedType, setSelectedType] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveHistory, setLeaveHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch leave balance data
  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [balanceData, historyData] = await Promise.all([
          getLeaveBalance(),
          getLeaveHistory(),
        ])

        setLeaveTypes(balanceData)
        setLeaveHistory(historyData)
      } catch (err) {
        console.error('Error fetching leave data:', err)
        setError(err.message || 'Không thể tải dữ liệu ngày phép')
        toast.error('Không thể tải dữ liệu ngày phép')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaveData()
  }, [])

  const totalUsed = leaveTypes.reduce((sum, type) => {
    if (type.id !== 'unpaid' && type.id !== 'maternity') return sum + (type.used || 0)
    return sum
  }, 0)

  const totalRemaining = leaveTypes.reduce((sum, type) => {
    if (type.id !== 'unpaid' && type.id !== 'maternity') return sum + (type.remaining || 0)
    return sum
  }, 0)

  const annualLeaveTotal = leaveTypes.find((t) => t.id === 'annual')?.total || 0

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-[var(--success)]/20 text-[var(--success)]'
      case 'pending':
        return 'bg-[var(--warning)]/20 text-[var(--warning)]'
      case 'rejected':
        return 'bg-[var(--error)]/20 text-[var(--error)]'
      default:
        return 'bg-gray-500/20 text-gray-500'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const handleRequestLeave = () => {
    toast.success('📝 Chuyển đến trang yêu cầu nghỉ phép...')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-sub)]">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-[var(--surface)] border-[var(--border)] max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-[var(--error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
              Lỗi tải dữ liệu
            </h3>
            <p className="text-sm text-[var(--text-sub)] mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            Số ngày phép
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-sub)] mt-2">
            Theo dõi số ngày phép còn lại và lịch sử nghỉ phép
          </p>
        </div>
        <Button
          onClick={handleRequestLeave}
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Tạo yêu cầu nghỉ phép</span>
          <span className="sm:hidden">Tạo yêu cầu</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-sub)]">Tổng phép năm</p>
                  <p className="text-2xl sm:text-3xl text-[var(--primary)] mt-2">
                    {annualLeaveTotal}
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">ngày/năm</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--primary)]" />
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
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-sub)]">Đã sử dụng</p>
                  <p className="text-2xl sm:text-3xl text-[var(--warning)] mt-2">{totalUsed}</p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">ngày</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--warning)]" />
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
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-sub)]">Còn lại</p>
                  <p className="text-2xl sm:text-3xl text-[var(--success)] mt-2">
                    {totalRemaining}
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">ngày</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--success)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
              <TabsTrigger value="overview">
                <Info className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Tổng quan</span>
                <span className="sm:hidden">Tổng quan</span>
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Lịch sử ({leaveHistory.length})</span>
                <span className="sm:hidden">Lịch sử</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              {leaveTypes.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-[var(--text-sub)] mx-auto mb-4 opacity-50" />
                  <p className="text-[var(--text-sub)]">Chưa có dữ liệu ngày phép</p>
                  <p className="text-xs text-[var(--text-sub)] mt-2">
                    Dữ liệu sẽ được hiển thị khi có thông tin từ hệ thống
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leaveTypes.map((type, index) => {
                    const config = getLeaveTypeConfig(type.id)
                    return (
                      <motion.div
                        key={type.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          className="bg-[var(--shell)] border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer"
                          onClick={() =>
                            setSelectedType(selectedType === type.id ? null : type.id)
                          }
                        >
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div
                                  className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg ${config.color} bg-opacity-20 flex items-center justify-center flex-shrink-0`}
                                >
                                  <span
                                    className={`${config.color.replace('bg-', 'text-')} flex items-center justify-center`}
                                  >
                                    {config.icon}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm sm:text-base text-[var(--text-main)] truncate">
                                    {type.name || 'Nghỉ phép'}
                                  </h3>
                                  <p className="text-xs text-[var(--text-sub)] line-clamp-1">
                                    {type.description || config.description}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="border-[var(--border)] text-[var(--text-sub)] ml-2 flex-shrink-0"
                              >
                                {type.total === 999 || type.total === null
                                  ? '∞'
                                  : type.total || 0}{' '}
                                ngày
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs sm:text-sm text-[var(--text-sub)]">
                                    Đã dùng
                                  </span>
                                  <span className="text-xs sm:text-sm text-[var(--warning)]">
                                    {type.used || 0} ngày
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    type.total === 999 || type.total === null || type.total === 0
                                      ? 0
                                      : ((type.used || 0) / type.total) * 100
                                  }
                                  className="h-2"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs sm:text-sm text-[var(--text-sub)]">
                                    Còn lại
                                  </span>
                                  <span className="text-xs sm:text-sm text-[var(--success)]">
                                    {type.remaining === 999 || type.remaining === null
                                      ? '∞'
                                      : type.remaining || 0}{' '}
                                    ngày
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    type.total === 999 || type.total === null || type.total === 0
                                      ? 100
                                      : ((type.remaining || 0) / type.total) * 100
                                  }
                                  className="h-2"
                                />
                              </div>


                              {type.pending > 0 && (
                                <div className="flex items-center justify-between p-2 rounded bg-[var(--warning)]/10">
                                  <span className="text-xs sm:text-sm text-[var(--text-sub)]">
                                    Đang chờ duyệt
                                  </span>
                                  <Badge className="bg-[var(--warning)]/20 text-[var(--warning)]">
                                    {type.pending} ngày
                                  </Badge>
                                </div>
                              )}
                            </div>

                            {selectedType === type.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-[var(--border)]"
                              >
                                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                                  <div>
                                    <p className="text-xl sm:text-2xl text-[var(--primary)]">
                                      {type.total === 999 || type.total === null
                                        ? '∞'
                                        : type.total || 0}
                                    </p>
                                    <p className="text-xs text-[var(--text-sub)] mt-1">Tổng số</p>
                                  </div>
                                  <div>
                                    <p className="text-xl sm:text-2xl text-[var(--warning)]">
                                      {type.used || 0}
                                    </p>
                                    <p className="text-xs text-[var(--text-sub)] mt-1">Đã dùng</p>
                                  </div>
                                  <div>
                                    <p className="text-xl sm:text-2xl text-[var(--success)]">
                                      {type.remaining === 999 || type.remaining === null
                                        ? '∞'
                                        : type.remaining || 0}
                                    </p>
                                    <p className="text-xs text-[var(--text-sub)] mt-1">Còn lại</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {leaveHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-[var(--text-sub)] mx-auto mb-4 opacity-50" />
                  <p className="text-[var(--text-sub)]">Chưa có lịch sử nghỉ phép</p>
                  <p className="text-xs text-[var(--text-sub)] mt-2">
                    Lịch sử sẽ được hiển thị khi bạn có đơn nghỉ phép
                  </p>
                </div>
              ) : (
                leaveHistory.map((history, index) => (
                  <motion.div
                    key={history.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-[var(--shell)] border-[var(--border)]">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                              <Badge
                                variant="outline"
                                className="border-[var(--border)] text-[var(--text-main)]"
                              >
                                {history.type || 'Nghỉ phép'}
                              </Badge>
                              <Badge className={getStatusColor(history.status)}>
                                <span className="mr-1">{getStatusIcon(history.status)}</span>
                                {history.status === 'approved'
                                  ? 'Đã duyệt'
                                  : history.status === 'pending'
                                    ? 'Chờ duyệt'
                                    : 'Từ chối'}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-[var(--accent-cyan)] flex-shrink-0" />
                                <span className="text-[var(--text-main)]">
                                  {history.startDate || ''} → {history.endDate || ''}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-[var(--border)] text-[var(--text-sub)]"
                                >
                                  {history.days || 0} ngày
                                </Badge>
                              </div>

                              {history.reason && (
                                <p className="text-xs sm:text-sm text-[var(--text-sub)]">
                                  <strong>Lý do:</strong> {history.reason}
                                </p>
                              )}

                              {history.approver && (
                                <p className="text-xs text-[var(--text-sub)]">
                                  Phê duyệt bởi <strong>{history.approver}</strong>
                                  {history.approvedAt && ` lúc ${history.approvedAt}`}
                                </p>
                              )}
                            </div>
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
    </div>
  )
}

export default LeaveBalancePage

