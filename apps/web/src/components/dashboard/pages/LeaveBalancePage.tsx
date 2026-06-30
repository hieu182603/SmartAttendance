import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useRolePath } from '@/hooks/useRolePath'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import {
  Calendar,
  CalendarDays,
  TrendingUp,
  Activity,
  Wallet,
  RotateCcw,
  Heart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  History,
  Info,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getLeaveBalance, getLeaveHistory } from '@/services/dashboardService'
import type { ErrorWithMessage } from '@/types'
import { CreateRequestModal } from '@/components/dashboard/requests/CreateRequestModal'

type LeaveStatus = 'approved' | 'pending' | 'rejected'

interface LeaveTypeConfig {
  icon: ReactNode
  color: string
  iconColor: string
  description: string
}

interface LeaveType {
  id: string
  name?: string
  description?: string
  total?: number | null
  used?: number
  remaining?: number | null
  pending?: number
}

interface LeaveHistory {
  id?: string
  type?: string
  status?: LeaveStatus
  startDate?: string
  endDate?: string
  days?: number
  reason?: string
  approver?: string
  approvedAt?: string
}

type TranslationFn = ReturnType<typeof useTranslation<['dashboard', 'common']>>['t']

// Helper function để lấy icon và color dựa trên loại nghỉ phép
const getLeaveTypeConfig = (typeId: string, t: TranslationFn): LeaveTypeConfig => {
  const descriptions = {
    annual: t('dashboard:leaveBalance.types.descriptions.annual'),
    sick: t('dashboard:leaveBalance.types.descriptions.sick'),
    unpaid: t('dashboard:leaveBalance.types.descriptions.unpaid'),
    compensatory: t('dashboard:leaveBalance.types.descriptions.compensatory'),
    maternity: t('dashboard:leaveBalance.types.descriptions.maternity'),
  }

  const configs: Record<string, LeaveTypeConfig> = {
    annual: {
      icon: <CalendarDays className="h-5 w-5" />,
      color: 'bg-blue-500',
      iconColor: 'text-white',
      description: descriptions.annual,
    },
    sick: {
      icon: <Activity className="h-5 w-5" />,
      color: 'bg-red-500',
      iconColor: 'text-white',
      description: descriptions.sick,
    },
    unpaid: {
      icon: <Wallet className="h-5 w-5" />,
      color: 'bg-gray-500',
      iconColor: 'text-white',
      description: descriptions.unpaid,
    },
    compensatory: {
      icon: <RotateCcw className="h-5 w-5" />,
      color: 'bg-purple-500',
      iconColor: 'text-white',
      description: descriptions.compensatory,
    },
    maternity: {
      icon: <Heart className="h-5 w-5" />,
      color: 'bg-pink-500',
      iconColor: 'text-white',
      description: descriptions.maternity,
    },
  }
  return configs[typeId] || {
    icon: <Calendar className="h-5 w-5" />,
    color: 'bg-gray-500',
    iconColor: 'text-white',
    description: '',
  }
}

const LeaveBalancePage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const basePath = useRolePath()
  const [activeTab, setActiveTab] = useState('overview')
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const fetchLeaveData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [balanceData, historyData] = await Promise.all([
        getLeaveBalance(),
        getLeaveHistory(),
      ])

      setLeaveTypes(balanceData as LeaveType[])
      setLeaveHistory(historyData as LeaveHistory[])
    } catch (err) {
      console.error('Error fetching leave data:', err)
      const error = err as ErrorWithMessage
      setError(error.message || t('dashboard:leaveBalance.error'))
      toast.error(t('dashboard:leaveBalance.error'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch leave balance data
  useEffect(() => {
    fetchLeaveData()
  }, [])

  const totalUsed = leaveTypes.reduce((sum, type) => {
    if (type.id === 'annual' || type.id === 'compensatory') return sum + (type.used || 0)
    return sum
  }, 0)

  const totalRemaining = leaveTypes.reduce((sum, type) => {
    if (type.id === 'annual' || type.id === 'compensatory') return sum + (type.remaining || 0)
    return sum
  }, 0)

  const totalPending = leaveTypes.reduce((sum, type) => sum + (type.pending || 0), 0)

  const annualLeaveTotal = leaveTypes.reduce((sum, type) => {
    if (type.id === 'annual' || type.id === 'compensatory') return sum + (type.total || 0)
    return sum
  }, 0)

  const getStatusColor = (status?: LeaveStatus): string => {
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

  const getStatusIcon = (status?: LeaveStatus): ReactNode => {
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

  const handleRequestLeave = (): void => {
    navigate(`${basePath}/requests`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-sub)]">
            {t('dashboard:leaveBalance.loadingState.loading')}
          </p>
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
              {t('dashboard:leaveBalance.loadingState.errorTitle')}
            </h3>
            <p className="text-sm text-[var(--text-sub)] mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              {t('dashboard:leaveBalance.loadingState.retry')}
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
            {t('dashboard:leaveBalance.title')}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-sub)] mt-2">
            {t('dashboard:leaveBalance.description')}
          </p>
        </div>
        <CreateRequestModal 
          isOpen={isCreateModalOpen} 
          onOpenChange={setIsCreateModalOpen} 
          onSuccess={fetchLeaveData} 
        />
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white w-full sm:w-auto hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{t('dashboard:leaveBalance.createRequest')}</span>
          <span className="sm:hidden">{t('dashboard:leaveBalance.createRequestShort')}</span>
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
                  <p className="text-xs sm:text-sm text-[var(--text-sub)]">{t('dashboard:leaveBalance.stats.totalAnnual')}</p>
                  <p className="text-2xl sm:text-3xl text-[var(--primary)] mt-2">
                    {annualLeaveTotal}
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">{t('dashboard:leaveBalance.overview.daysPerYear')}</p>
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
                  <p className="text-xs sm:text-sm text-[var(--text-sub)]">{t('dashboard:leaveBalance.stats.used')}</p>
                  <p className="text-2xl sm:text-3xl text-[var(--warning)] mt-2">{totalUsed}</p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">{t('dashboard:leaveBalance.overview.days')}</p>
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
                  <p className="text-xs sm:text-sm text-[var(--text-sub)]">{t('dashboard:leaveBalance.stats.remaining')}</p>
                  <p className="text-2xl sm:text-3xl text-[var(--success)] mt-2">
                    {totalRemaining}
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">{t('dashboard:leaveBalance.overview.days')}</p>
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
                <span className="hidden sm:inline">{t('dashboard:leaveBalance.overview.title')}</span>
                <span className="sm:hidden">{t('dashboard:leaveBalance.overview.title')}</span>
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('dashboard:leaveBalance.history.title')} ({leaveHistory.length})</span>
                <span className="sm:hidden">{t('dashboard:leaveBalance.history.title')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              {leaveTypes.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-[var(--text-sub)] mx-auto mb-4 opacity-50" />
                  <p className="text-[var(--text-sub)]">{t('dashboard:leaveBalance.overview.noData')}</p>
                  <p className="text-xs text-[var(--text-sub)] mt-2">
                    {t('dashboard:leaveBalance.overview.noDataDescription')}
                  </p>
                </div>
              ) : (
                <>
                <div className="flex items-center space-x-3 mb-4 mt-8">
                  <CalendarDays className="h-6 w-6 text-[var(--primary)]" />
                  <h3 className="text-xl font-bold text-[var(--text-main)]">
                    Chi tiết hạn mức các loại phép
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leaveTypes.map((type, index) => {
                    const config = getLeaveTypeConfig(type.id, t)
                    return (
                      <motion.div
                        key={type.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={index === leaveTypes.length - 1 && leaveTypes.length % 2 !== 0 ? "md:col-span-2" : ""}
                      >
                        <Card className="bg-[var(--shell)] border-[var(--border)] overflow-hidden relative">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div
                                  className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg ${config.color} bg-opacity-20 flex items-center justify-center flex-shrink-0`}
                                >
                                  <span
                                    className={`${config.iconColor} flex items-center justify-center`}
                                  >
                                    {config.icon}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm sm:text-base text-[var(--text-main)] truncate">
                                    {type.name || t('dashboard:leaveBalance.types.defaultName')}
                                  </h3>
                                  <p className="text-xs text-[var(--text-sub)] line-clamp-1">
                                    {type.description || config.description}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)] font-bold text-sm sm:text-base px-3 py-1 ml-2 flex-shrink-0 shadow-sm normal-case lowercase"
                              >
                                {type.total === 999 || type.total === null
                                  ? '∞'
                                  : type.total || 0}{' '}
                                {t('dashboard:leaveBalance.overview.days')}
                              </Badge>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs sm:text-sm font-medium text-[var(--text-main)]">
                                    {t('dashboard:leaveBalance.stats.used')}
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                                    {type.used || 0} {t('dashboard:leaveBalance.overview.days')}
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    type.total === 999 || type.total === null || type.total === 0
                                      ? 0
                                      : ((type.used || 0) / (type.total ?? 0)) * 100
                                  }
                                  className="h-2.5 bg-[var(--border)]/50"
                                  indicatorClassName="bg-[var(--primary)]"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm text-[var(--text-sub)]">
                                  {t('dashboard:leaveBalance.history.remaining')}
                                </span>
                                <span className="text-xs sm:text-sm font-medium text-[var(--success)]">
                                  {type.remaining === 999 || type.remaining === null
                                    ? '∞'
                                    : Math.max(0, (type.remaining || 0) - (type.pending || 0))}{' '}
                                  {t('dashboard:leaveBalance.overview.days')}
                                </span>
                              </div>


                              {(type.pending ?? 0) > 0 && (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 mt-3 mb-3">
                                  <span className="text-xs sm:text-sm font-medium text-[var(--warning)]">
                                    {t('dashboard:leaveBalance.overview.pending')}
                                  </span>
                                  <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] normal-case lowercase">
                                    {type.pending} {t('dashboard:leaveBalance.overview.days')}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
                </>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {leaveHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-[var(--text-sub)] mx-auto mb-4 opacity-50" />
                  <p className="text-[var(--text-sub)]">{t('dashboard:leaveBalance.history.noHistory')}</p>
                  <p className="text-xs text-[var(--text-sub)] mt-2">
                    {t('dashboard:leaveBalance.history.description')}
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
                                {history.type || t('dashboard:leaveBalance.types.defaultName')}
                              </Badge>
                              <Badge className={getStatusColor(history.status)}>
                                <span className="mr-1">{getStatusIcon(history.status)}</span>
                                {history.status === 'approved'
                                  ? t('dashboard:leaveBalance.status.approved')
                                  : history.status === 'pending'
                                    ? t('dashboard:leaveBalance.status.pending')
                                    : t('dashboard:leaveBalance.status.rejected')}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-[var(--accent-cyan)] flex-shrink-0" />
                                <span className="text-[var(--text-main)]">
                                  {history.startDate ? history.startDate.split('-').reverse().join('/') : ''} → {history.endDate ? history.endDate.split('-').reverse().join('/') : ''}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-[var(--border)] text-[var(--text-sub)]"
                                >
                                  {history.days || 0} {t('dashboard:leaveBalance.overview.days')}
                                </Badge>
                              </div>

                              {history.reason && (
                                <p className="text-xs sm:text-sm text-[var(--text-sub)]">
                                  <strong>{t('dashboard:requests.reason')}:</strong> {history.reason}
                                </p>
                              )}

                              {history.approver && (
                                <p className="text-xs text-[var(--text-sub)]">
                                  {t('dashboard:leaveBalance.history.approvedBy', {
                                    approver: history.approver,
                                  })}{' '}
                                  {history.approvedAt &&
                                    t('dashboard:leaveBalance.history.approvedAt', {
                                      time: history.approvedAt,
                                    })}
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




