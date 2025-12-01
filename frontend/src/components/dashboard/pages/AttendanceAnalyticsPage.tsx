import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Download,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Progress } from '../../ui/progress'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { getAttendanceAnalytics, exportAttendanceAnalytics } from '../../../services/attendanceService'

type Period = '7days' | '30days' | '90days'

interface DailyData {
  date: string
  present: number
  late: number
  absent: number
}

interface DepartmentStat {
  department: string
  onTime: number
  late: number
  absent: number
}

interface TopPerformer {
  name: string
  avgCheckIn: string
  onTime: number
  late: number
  absent: number
  punctuality: number
}

interface Summary {
  attendanceRate: number
  avgPresent: number
  avgLate: number
  avgAbsent: number
  trend: number
  totalEmployees: number
}

interface AnalyticsData {
  dailyData: DailyData[]
  departmentStats: DepartmentStat[]
  topPerformers: TopPerformer[]
  summary: Summary
}

interface AnalyticsParams {
  from?: string
  to?: string
  department?: string
}

const AttendanceAnalyticsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('7days')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AnalyticsData>({
    dailyData: [],
    departmentStats: [],
    topPerformers: [],
    summary: {
      attendanceRate: 0,
      avgPresent: 0,
      avgLate: 0,
      avgAbsent: 0,
      trend: 0,
      totalEmployees: 150
    }
  })

  // Fetch analytics data from API
  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const params: AnalyticsParams = {}
      const today = new Date()
      const from = new Date()

      if (selectedPeriod === '7days') {
        from.setDate(today.getDate() - 7)
      } else if (selectedPeriod === '30days') {
        from.setDate(today.getDate() - 30)
      } else if (selectedPeriod === '90days') {
        from.setDate(today.getDate() - 90)
      }

      params.from = from.toISOString().split('T')[0]
      params.to = today.toISOString().split('T')[0]

      if (selectedDepartment !== 'all') {
        params.department = selectedDepartment
      }

      const result = await getAttendanceAnalytics(params) as AnalyticsData
      if (result) {
        setData({
          dailyData: result.dailyData || [],
          departmentStats: result.departmentStats || [],
          topPerformers: result.topPerformers || [],
          summary: {
            ...result.summary,
            totalEmployees: result.summary?.totalEmployees || 150
          }
        })
      }
    } catch (error) {
      console.error('[AttendanceAnalytics] fetch error:', error)
      toast.error(t('dashboard:attendanceAnalytics.error'))
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, selectedDepartment])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])


  const handleExport = async (): Promise<void> => {
    try {
      const params: AnalyticsParams = {}
      const today = new Date()
      const from = new Date()

      if (selectedPeriod === '7days') {
        from.setDate(today.getDate() - 7)
      } else if (selectedPeriod === '30days') {
        from.setDate(today.getDate() - 30)
      } else if (selectedPeriod === '90days') {
        from.setDate(today.getDate() - 90)
      }

      params.from = from.toISOString().split('T')[0]
      params.to = today.toISOString().split('T')[0]

      if (selectedDepartment !== 'all') {
        params.department = selectedDepartment
      }

      toast.loading('📥 Đang xuất báo cáo phân tích...', { id: 'export' })
      await exportAttendanceAnalytics(params)
      toast.success(t('dashboard:attendanceAnalytics.export') + ' ' + t('common:success'), { id: 'export' })
    } catch (error) {
      toast.error(t('dashboard:attendanceAnalytics.export') + ' ' + t('common:error'), { id: 'export' })
    }
  }

  const { dailyData, departmentStats, topPerformers, summary } = data
  const totalEmployees = summary.totalEmployees || 150

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            {t('dashboard:attendanceAnalytics.title')}
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            {t('dashboard:attendanceAnalytics.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
            <SelectTrigger className="w-[150px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
              <SelectValue placeholder="7 ngày qua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 ngày qua</SelectItem>
              <SelectItem value="30days">30 ngày qua</SelectItem>
              <SelectItem value="90days">90 ngày qua</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('dashboard:attendanceAnalytics.export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.attendanceRate')}</p>
                  <p className="text-3xl text-[var(--success)] mt-2">{summary.attendanceRate}%</p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">TB {summary.avgPresent}/{totalEmployees} người</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[var(--success)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.avgLate')}</p>
                  <p className="text-3xl text-[var(--warning)] mt-2">{summary.avgLate}</p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">người/ngày</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-[var(--warning)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.avgAbsent')}</p>
                  <p className="text-3xl text-[var(--error)] mt-2">{summary.avgAbsent}</p>
                  <p className="text-xs text-[var(--text-sub)] mt-1">người/ngày</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--error)]/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-[var(--error)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.trend')}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-6 w-6 text-[var(--success)]" />
                    <p className="text-2xl text-[var(--success)]">+{summary.trend}%</p>
                  </div>
                  <p className="text-xs text-[var(--text-sub)] mt-2">{t('dashboard:attendanceAnalytics.comparedToLastWeek')}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-[var(--accent-cyan)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-sub)]">Đang tải dữ liệu...</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">{t('dashboard:attendanceAnalytics.charts.dailyTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-sub)" />
                <YAxis stroke="var(--text-sub)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10B981" name={t('dashboard:attendanceAnalytics.stats.avgPresent')} strokeWidth={2} />
                <Line type="monotone" dataKey="late" stroke="#F59E0B" name={t('dashboard:attendanceAnalytics.stats.late')} strokeWidth={2} />
                <Line type="monotone" dataKey="absent" stroke="#EF4444" name={t('dashboard:attendanceAnalytics.stats.absent')} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">{t('dashboard:attendanceAnalytics.charts.departmentStats')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="department" stroke="var(--text-sub)" />
                <YAxis stroke="var(--text-sub)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)'
                  }}
                />
                <Legend />
                <Bar dataKey="onTime" fill="#10B981" name={`${t('dashboard:attendanceAnalytics.stats.onTime')} (%)`} />
                <Bar dataKey="late" fill="#F59E0B" name={`${t('dashboard:attendanceAnalytics.stats.late')} (%)`} />
                <Bar dataKey="absent" fill="#EF4444" name={`${t('dashboard:attendanceAnalytics.stats.absent')} (%)`} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Department Details */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
            <CardTitle className="text-[var(--text-main)]">{t('dashboard:attendanceAnalytics.departmentDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentStats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--text-sub)]">{t('common:noData')}</p>
              </div>
            ) : (
              departmentStats.map((dept, index) => (
                <motion.div
                  key={dept.department}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[var(--text-main)]">{dept.department}</h3>
                    <Badge className={dept.onTime >= 95 ? 'bg-[var(--success)]/20 text-[var(--success)]' :
                      dept.onTime >= 85 ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                        'bg-[var(--error)]/20 text-[var(--error)]'}>
                      {dept.onTime}% {t('dashboard:attendanceAnalytics.stats.onTime')}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.onTime')}</span>
                        <span className="text-sm text-[var(--success)]">{dept.onTime}%</span>
                      </div>
                      <Progress value={dept.onTime} className="h-2 [&>div]:bg-[var(--success)]" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.late')}</span>
                        <span className="text-sm text-[var(--warning)]">{dept.late}%</span>
                      </div>
                      <Progress value={dept.late} className="h-2 [&>div]:bg-[var(--warning)]" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.absent')}</span>
                        <span className="text-sm text-[var(--error)]">{dept.absent}%</span>
                      </div>
                      <Progress value={dept.absent} className="h-2 [&>div]:bg-[var(--error)]" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">{t('dashboard:attendanceAnalytics.charts.topPerformers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--text-sub)]">{t('common:noData')}</p>
              </div>
            ) : (
              topPerformers.map((employee, index) => (
                <motion.div
                  key={employee.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${index === 0 ? 'bg-yellow-500/20' :
                        index === 1 ? 'bg-gray-400/20' :
                          index === 2 ? 'bg-orange-600/20' : 'bg-[var(--primary)]/20'
                      }`}>
                      <span className={`${index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-600' : 'text-[var(--primary)]'
                        }`}>
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[var(--text-main)]">{employee.name}</h3>
                      <p className="text-sm text-[var(--text-sub)]">
                        Giờ vào TB: {employee.avgCheckIn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.onTime')}</p>
                      <p className="text-lg text-[var(--success)]">{employee.onTime}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[var(--text-sub)]">Muộn</p>
                      <p className="text-lg text-[var(--warning)]">{employee.late}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[var(--text-sub)]">{t('dashboard:attendanceAnalytics.stats.vắng')}</p>
                      <p className="text-lg text-[var(--error)]">{employee.absent}</p>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <Badge className="bg-[var(--success)]/20 text-[var(--success)]">
                        {employee.punctuality}%
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AttendanceAnalyticsPage




