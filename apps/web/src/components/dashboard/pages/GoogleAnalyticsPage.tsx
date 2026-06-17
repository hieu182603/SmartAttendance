import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  Users,
  Globe,
  Laptop,
  Smartphone,
  Tablet,
  RefreshCw,
  Radio,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  getAnalyticsReport,
  getRealtimeUsers,
  type AnalyticsReport,
  type DateRange,
} from '@/services/analyticsService';

const SUFFIX_MAP: Record<string, string> = {
  '/scan': 'Chấm công',
  '/history': 'Lịch sử chấm công',
  '/schedule': 'Lịch làm việc',
  '/company-calendar': 'Lịch công ty',
  '/requests': 'Yêu cầu',
  '/leave-balance': 'Số ngày phép',
  '/profile': 'Hồ sơ',
  '/my-payslip': 'Phiếu lương của tôi',
  '/chatbot': 'Trợ lý AI',
  '/company-management': 'Quản lý công ty',
  '/ticket-management': 'Quản lý thanh toán',
  '/feature-toggles': 'Quản lý chức năng',
  '/google-analytics': 'Google Analytics',
  '/employee-management': 'Quản lý nhân viên',
  '/departments': 'Quản lý phòng ban',
  '/branches': 'Quản lý chi nhánh',
  '/approve-requests': 'Phê duyệt yêu cầu',
  '/admin-attendance': 'Quản lý chấm công',
  '/shifts': 'Quản lý ca làm việc',
  '/leave-types': 'Quản lý loại phép',
  '/performance-review': 'Đánh giá hiệu suất',
  '/attendance-analytics': 'Phân tích chấm công',
  '/admin-reports': 'Báo cáo & Thống kê',
  '/payroll': 'Bảng lương',
  '/payroll-reports': 'Báo cáo lương',
  '/salary-matrix': 'Thang lương',
  '/system-health': 'Trạng thái hệ thống',
  '/active-sessions': 'Phiên đăng nhập',
  '/audit-logs': 'Nhật ký hệ thống',
  '/system-config': 'Cấu hình hệ thống',
  '/role-management': 'Cấu hình quyền theo role',
  '/face-recognition-logs': 'Nhật ký khuôn mặt',
  '/ai-billing': 'Quản lý chi phí AI',
  '/regulations': 'AI Knowledge Base',
};

function getPageTitle(path: string): string {
  // 1. Strip query string and hash
  let cleanPath = path.split('?')[0].split('#')[0];
  
  // 2. Strip trailing slash unless it's just "/"
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // 3. Static pages at root
  if (cleanPath === '/') return 'Trang chủ (Landing)';
  if (cleanPath === '/login') return 'Đăng nhập';
  if (cleanPath === '/pricing') return 'Bảng giá dịch vụ';
  if (cleanPath === '/features') return 'Tính năng';

  // 4. Role home pages
  if (cleanPath === '/employee') return 'Trang chủ nhân viên';
  if (cleanPath === '/admin') return 'Trang chủ Admin';
  if (cleanPath === '/hr') return 'Trang chủ HR';
  if (cleanPath === '/manager') return 'Trang chủ Quản lý';

  // 5. Suffix maps directly if matched
  if (cleanPath in SUFFIX_MAP) {
    return SUFFIX_MAP[cleanPath];
  }

  // 6. Normalize path by extracting suffix after the first segment (if prefix is a role)
  // e.g., /admin/shifts -> suffix /shifts, /hr/payroll -> suffix /payroll
  const segments = cleanPath.split('/');
  if (segments.length > 2) {
    const prefix = segments[1];
    if (['employee', 'admin', 'hr', 'manager'].includes(prefix)) {
      const suffix = '/' + segments.slice(2).join('/');
      if (suffix in SUFFIX_MAP) {
        return SUFFIX_MAP[suffix];
      }
    }
  }

  return cleanPath;
}

export default function GoogleAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeUsersHistory, setActiveUsersHistory] = useState<number[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const abortRef = useRef<AbortController | null>(null);

  // Fetch full report
  const fetchReport = useCallback(async (range: DateRange, isRefresh = false) => {
    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getAnalyticsReport(range, { signal: controller.signal });
      setReport(data);
      setActiveUsers(data.activeUsers);
      setActiveUsersHistory(prev => [...prev.slice(-19), data.activeUsers]);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const error = err as Error & { name?: string };
      if (error.name !== 'CanceledError') {
        const msg = error.message || 'Không thể tải dữ liệu analytics';
        if (report) {
          toast.error(msg);
        } else {
          setError(msg);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load & dateRange change
  useEffect(() => {
    fetchReport(dateRange);
    return () => { abortRef.current?.abort(); };
  }, [dateRange, fetchReport]);

  // Poll realtime active users every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getRealtimeUsers();
        if (data.configured) {
          setActiveUsers(data.activeUsers);
          setActiveUsersHistory(prev => [...prev.slice(-19), data.activeUsers]);
        }
      } catch {
        // silent
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const refreshAnalytics = useCallback(() => {
    fetchReport(dateRange, true);
  }, [dateRange, fetchReport]);

  // ── Not configured state ────────────────────────────────────────
  if (report && !report.configured) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
              <WifiOff className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Google Analytics chưa được cấu hình</h2>
            <p className="text-sm text-[var(--text-sub)]">
              Thiết lập <code className="bg-[var(--shell)] px-1.5 py-0.5 rounded text-xs">GA_PROPERTY_ID</code> và{' '}
              <code className="bg-[var(--shell)] px-1.5 py-0.5 rounded text-xs">GA_SERVICE_ACCOUNT_KEY_PATH</code>{' '}
              trong file <code className="bg-[var(--shell)] px-1.5 py-0.5 rounded text-xs">.env</code> của backend để bắt đầu.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading state (initial only) ────────────────────────────────
  if (loading && !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)] mx-auto" />
          <p className="text-sm text-[var(--text-sub)]">Đang tải dữ liệu Google Analytics...</p>
        </div>
      </div>
    );
  }

  // ── Error state (initial only) ──────────────────────────────────
  if (error && !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Lỗi tải dữ liệu</h2>
            <p className="text-sm text-[var(--text-sub)]">{error}</p>
            <Button variant="outline" onClick={() => fetchReport(dateRange)} className="border-[var(--border)]">
              <RefreshCw className="h-4 w-4 mr-2" /> Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = report?.overview;
  const dateRangeLabel = dateRange === 'today' ? 'Hôm nay' : dateRange === '7days' ? '7 ngày qua' : dateRange === '30days' ? '30 ngày qua' : '90 ngày qua';

  return (
    <div className={`space-y-4 transition-all duration-300 ${(loading || refreshing) ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent flex items-center gap-2 font-bold">
            <BarChart3 className="h-7 w-7 text-[var(--primary)]" />
            Google Analytics
          </h1>
          <p className="text-[var(--text-sub)] mt-1 flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Measurement ID: <span className="font-semibold text-[var(--text-main)]">G-E04ZBDG8VQ</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">Connected</span>
            <span className="text-[10px] text-[var(--text-sub)]">
              Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[var(--shell)] border border-[var(--border)] p-1 rounded-xl flex gap-1">
            {(['today', '7days', '30days', '90days'] as DateRange[]).map((range) => (
              <button
                key={range}
                disabled={loading || refreshing}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  dateRange === range
                    ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-md'
                    : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface)]'
                } ${
                  (loading || refreshing) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {range === 'today' ? 'Hôm nay' : range === '7days' ? '7 ngày' : range === '30days' ? '30 ngày' : '90 ngày'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshAnalytics}
            disabled={loading || refreshing}
            className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--shell)]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
            {(loading || refreshing) ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
      </div>

      {/* Real-time Widget & Key KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Real-time Card */}
        <Card className="bg-[var(--surface)] border-[var(--border)] relative overflow-hidden shadow-lg">
          <CardContent className="p-5 pt-5 flex flex-col justify-between h-full min-h-[140px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-sub)] flex items-center gap-1.5">
                  <Radio className="h-3 w-3 text-red-500 animate-pulse" />
                  Đang hoạt động
                </span>
                <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px]">Live</Badge>
              </div>
              <h2 className="text-4xl font-black text-[var(--text-main)] mt-3 tracking-tight flex items-baseline gap-1">
                {activeUsers}
                <span className="text-[10px] text-[var(--text-sub)] font-normal">users</span>
              </h2>
            </div>
            
            {/* Sparkline */}
            <div className="mt-4 flex items-end gap-[3px] h-8">
              {(activeUsersHistory.length > 0 ? activeUsersHistory : [0]).map((val, idx) => {
                const maxVal = Math.max(...(activeUsersHistory.length > 0 ? activeUsersHistory : [1]), 1);
                return (
                  <motion.div
                    key={idx}
                    initial={{ height: 0 }}
                    animate={{ height: `${(val / maxVal) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                    className={`w-full rounded-t-sm transition-all duration-300 min-h-[2px] ${
                      idx === activeUsersHistory.length - 1
                        ? 'bg-red-500'
                        : 'bg-[var(--primary)] opacity-40'
                    }`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pageviews KPI */}
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-5 pt-5 flex justify-between items-center h-full">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-sub)]">Tổng lượt xem trang</p>
              <h3 className="text-2xl font-bold text-[var(--text-main)]">
                {overview?.pageviews?.toLocaleString('vi-VN') ?? '—'}
              </h3>
              {overview && (
                <p className={`text-[10px] flex items-center gap-0.5 ${overview.pageviewsTrend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {overview.pageviewsTrend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {overview.pageviewsTrend >= 0 ? '+' : ''}{overview.pageviewsTrend}%
                  <span className="text-[var(--text-sub)] ml-0.5">vs kỳ trước</span>
                </p>
              )}
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
              <Eye className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Users KPI */}
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-5 pt-5 flex justify-between items-center h-full">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-sub)]">Người dùng duy nhất</p>
              <h3 className="text-2xl font-bold text-[var(--text-main)]">
                {overview?.users?.toLocaleString('vi-VN') ?? '—'}
              </h3>
              {overview && (
                <p className={`text-[10px] flex items-center gap-0.5 ${overview.usersTrend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {overview.usersTrend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {overview.usersTrend >= 0 ? '+' : ''}{overview.usersTrend}%
                  <span className="text-[var(--text-sub)] ml-0.5">vs kỳ trước</span>
                </p>
              )}
            </div>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Duration / Bounce Rate */}
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-5 pt-5 flex justify-between items-center h-full">
            <div className="space-y-2 w-full">
              <div className="flex justify-between items-baseline border-b border-[var(--border)] pb-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-sub)]">Thời lượng TB</p>
                  <p className="text-base font-bold text-[var(--text-main)] mt-0.5">{overview?.sessionDuration ?? '—'}</p>
                </div>
                {overview && (
                  <span className={`text-[10px] flex items-center ${overview.sessionDurationTrend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {overview.sessionDurationTrend >= 0 ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />}
                    {Math.abs(overview.sessionDurationTrend)}%
                  </span>
                )}
              </div>
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-sub)]">Tỷ lệ thoát</p>
                  <p className="text-base font-bold text-[var(--text-main)] mt-0.5">{overview?.bounceRate ?? '—'}</p>
                </div>
                {overview && (
                  <span className={`text-[10px] flex items-center ${overview.bounceRateTrend <= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                    {Math.abs(overview.bounceRateTrend)}%
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Traffic Trend Chart */}
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-[var(--text-main)] text-base font-bold">Xu hướng lưu lượng truy cập</CardTitle>
              <p className="text-[10px] text-[var(--text-sub)] mt-0.5">
                Pageviews và Users — {dateRangeLabel}
              </p>
            </div>
            {overview && (
              <Badge className="bg-[var(--shell)] text-[var(--text-sub)] border border-[var(--border)] text-[10px]">
                {overview.sessions?.toLocaleString('vi-VN')} sessions
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {(report?.trafficTrend?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={report!.trafficTrend}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Lượt xem (Pageviews)"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Người dùng (Users)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-sub)]">
                Không có dữ liệu cho khoảng thời gian này
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Channels */}
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg lg:col-span-1 flex flex-col justify-between">
          <CardHeader className="pb-0">
            <CardTitle className="text-[var(--text-main)] text-base font-bold">Nguồn lưu lượng</CardTitle>
            <p className="text-[10px] text-[var(--text-sub)] mt-0.5">Các kênh truy cập chính</p>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-center items-center">
            {(report?.channels?.length ?? 0) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={report!.channels}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {report!.channels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] w-full mt-4">
                  {report!.channels.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[var(--text-sub)]">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.name}</span>
                      <span className="font-bold text-[var(--text-main)] ml-auto">{c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-xs text-[var(--text-sub)]">Không có dữ liệu</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Top Pages Table */}
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-[var(--text-main)] text-base font-bold">Trang được xem nhiều nhất</CardTitle>
            <p className="text-[10px] text-[var(--text-sub)] mt-0.5">Lượt xem và tỷ lệ thoát theo trang — {dateRangeLabel}</p>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            {(report?.topPages?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-t border-[var(--border)]">
                  <thead>
                    <tr className="text-[10px] text-[var(--text-sub)] uppercase bg-[var(--shell)] border-b border-[var(--border)]">
                      <th className="px-4 py-3 font-bold">Tên Trang</th>
                      <th className="px-4 py-3 font-bold">Đường dẫn</th>
                      <th className="px-4 py-3 font-bold text-right">Lượt Xem</th>
                      <th className="px-4 py-3 font-bold text-right">Tỷ lệ thoát</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {report!.topPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-[var(--shell)] transition-all">
                        <td className="px-4 py-3 font-medium text-[var(--text-main)] text-xs">
                          {getPageTitle(page.path)}
                        </td>
                        <td className="px-4 py-3 text-[10px] text-[var(--text-sub)] font-mono">{page.path}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--text-main)] text-xs">
                          {page.views.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-right text-[10px] text-slate-400">{page.bounceRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-sub)]">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devices & Locations */}
        <div className="space-y-4 lg:col-span-1">
          {/* Devices */}
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[var(--text-main)] text-base font-bold">Thiết bị</CardTitle>
              <p className="text-[10px] text-[var(--text-sub)] mt-0.5">Loại thiết bị truy cập</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(report?.devices?.length ?? 0) > 0 ? (
                report!.devices.map((dev, idx) => {
                  const DevIcon = dev.name === 'Desktop' ? Laptop : dev.name === 'Mobile' ? Smartphone : Tablet;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${dev.color}15` }}>
                        <DevIcon className="h-4 w-4" style={{ color: dev.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[var(--text-main)]">{dev.name}</span>
                          <span className="text-[var(--text-sub)]">{dev.value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dev.value}%`, backgroundColor: dev.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-[80px] text-xs text-[var(--text-sub)]">Không có dữ liệu</div>
              )}
            </CardContent>
          </Card>

          {/* Locations */}
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[var(--text-main)] text-base font-bold flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-[var(--text-sub)]" />
                Theo tỉnh thành
              </CardTitle>
              <p className="text-[10px] text-[var(--text-sub)] mt-0.5">Tỉnh thành truy cập nhiều nhất</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(report?.locations?.length ?? 0) > 0 ? (
                report!.locations.map((loc, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--text-main)]">{loc.city}</span>
                      <span className="text-[var(--text-sub)]">{loc.count} ({loc.percent}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] transition-all duration-500"
                        style={{ width: `${loc.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-[80px] text-xs text-[var(--text-sub)]">Không có dữ liệu</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
