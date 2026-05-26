import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  DollarSign,
  Clock,
  BarChart3,
  Building2,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Loader2,
  CreditCard,
  Settings,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getSuperAdminStats, type SuperAdminStats } from "@/services/dashboardService";
import { toast } from "sonner";
import { Clock as ClockComponent } from "@/components/common/Clock";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PLAN_COLORS: Record<string, string> = {
  premium: "#a855f7",
  standard: "#06b6d4",
  starter: "#10b981",
  trial: "#f59e0b",
};

const PLAN_LABELS: Record<string, string> = {
  premium: "Premium",
  standard: "Standard",
  starter: "Starter",
  trial: "Dùng thử",
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

function monthLabel(year: number, month: number): string {
  return `T${month}/${String(year).slice(2)}`;
}

const defaultStats: SuperAdminStats = {
  billing: { totalRevenue: 0, pendingCount: 0, monthCount: 0, monthlyStats: [], planStats: [] },
  companies: { total: 0, active: 0, byPlan: { trial: 0, starter: 0, standard: 0, premium: 0 } },
  attendance: {
    kpi: { totalEmployees: 0, presentToday: 0, lateToday: 0, absentToday: 0 },
    attendanceData: [],
    growthPercentage: 0,
  },
};

export const SuperAdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SuperAdminStats>(defaultStats);

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getSuperAdminStats();
      setStats(data);
    } catch {
      if (!silent) toast.error("Không thể tải thống kê. Vui lòng thử lại.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const id = window.setInterval(() => void fetchStats(true), 60000);
    return () => window.clearInterval(id);
  }, [fetchStats]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const revenueChartData = [...stats.billing.monthlyStats]
    .reverse()
    .map((m) => ({
      label: monthLabel(m._id.year, m._id.month),
      revenue: m.revenue,
      orders: m.count,
    }));

  const planPieData = Object.entries(stats.companies.byPlan)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: PLAN_LABELS[key] ?? key, value, color: PLAN_COLORS[key] ?? "#94a3b8" }));

  const { kpi, attendanceData, growthPercentage } = stats.attendance;

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Banner skeleton */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 animate-pulse h-36" />
        {/* KPI skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
        <div className="flex items-center justify-center py-8 text-[var(--text-sub)]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Đang tải thống kê nền tảng…</span>
        </div>
      </div>
    );
  }

  const anim = (delay = 0) =>
    !hasMounted ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay } } : {};

  return (
    <div className="space-y-6">
      {/* ── Banner ── */}
      <motion.div
        className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl"
        {...(anim())}
      >
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-start space-x-4">
            <motion.div
              className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <Shield className="h-12 w-12 drop-shadow-lg" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold drop-shadow-md">
                Xin chào, {user?.name ?? "Super Admin"}
              </h1>
              <p className="text-lg font-medium mt-1 drop-shadow-sm opacity-90">
                Tổng quan nền tảng SmartAttendance
              </p>
              <p className="text-sm opacity-80 mt-1">{today}</p>
            </div>
          </div>
          <div className="hidden md:block">
            <ClockComponent />
          </div>
        </div>
      </motion.div>

      {/* ── Billing KPIs ── */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-3 ml-1">
          Doanh thu &amp; Đơn hàng
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {[
            {
              title: "Tổng doanh thu",
              value: formatCurrency(stats.billing.totalRevenue),
              icon: DollarSign,
              color: "text-purple-400",
              bg: "bg-purple-400/10",
              delay: 0.1,
            },
            {
              title: "Đơn chờ xử lý",
              value: stats.billing.pendingCount.toString(),
              icon: AlertCircle,
              color: "text-amber-400",
              bg: "bg-amber-400/10",
              delay: 0.15,
            },
            {
              title: "Đơn tháng này",
              value: stats.billing.monthCount.toString(),
              icon: CreditCard,
              color: "text-cyan-400",
              bg: "bg-cyan-400/10",
              delay: 0.2,
            },
            {
              title: "Gói đang dùng (paid)",
              value: (stats.billing.planStats.reduce((s, p) => s + p.count, 0)).toString(),
              icon: BarChart3,
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
              delay: 0.25,
            },
          ].map(({ title, value, icon: Icon, color, bg, delay }) => (
            <motion.div key={title} className="h-full" {...anim(delay)} whileHover={{ y: -6, scale: 1.02 }}>
              <Card className="h-full bg-[var(--surface)] border-[var(--border)] hover:border-purple-400/50 transition-all shadow-lg hover:shadow-xl">
                <CardContent className="!mt-4 !p-5 h-full">
                  <div className="flex h-full items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-xs font-medium text-[var(--text-sub)]">{title}</p>
                      <p className="mt-2 text-2xl font-bold leading-tight text-[var(--text-main)] break-words">
                        {value}
                      </p>
                    </div>
                    <div className={`shrink-0 rounded-xl p-3 ${bg}`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Company KPIs ── */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider mb-3 ml-1">
          Công ty &amp; Gói dịch vụ
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {[
            { title: "Tổng công ty", value: stats.companies.total, color: "text-blue-400", bg: "bg-blue-400/10", icon: Building2, delay: 0.3 },
            { title: "Đang hoạt động", value: stats.companies.active, color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle, delay: 0.35 },
            { title: "Gói Premium", value: stats.companies.byPlan.premium, color: "text-purple-400", bg: "bg-purple-400/10", icon: Shield, delay: 0.4 },
            { title: "Dùng thử (Trial)", value: stats.companies.byPlan.trial, color: "text-amber-400", bg: "bg-amber-400/10", icon: Clock, delay: 0.45 },
          ].map(({ title, value, color, bg, icon: Icon, delay }) => (
            <motion.div key={title} className="h-full" {...anim(delay)} whileHover={{ y: -6, scale: 1.02 }}>
              <Card className="h-full bg-[var(--surface)] border-[var(--border)] hover:border-blue-400/50 transition-all shadow-lg hover:shadow-xl">
                <CardContent className="!mt-4 !p-5 h-full">
                  <div className="flex h-full items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-xs font-medium text-[var(--text-sub)]">{title}</p>
                      <p className="mt-2 text-2xl font-bold leading-tight text-[var(--text-main)]">{value}</p>
                    </div>
                    <div className={`shrink-0 rounded-xl p-3 ${bg}`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div {...anim(0.5)}>
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-purple-400" />
              <CardTitle className="text-[var(--text-main)] text-xl">Chức năng nền tảng</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Quản lý công ty",
                  desc: "Xem, sửa, tắt công ty",
                  gradient: "from-purple-500 to-pink-500",
                  icon: Building2,
                  path: "/admin/companies",
                  badge: "Platform",
                },
                {
                  label: "Đơn hàng & Billing",
                  desc: "Xác nhận thanh toán",
                  gradient: "from-amber-500 to-orange-500",
                  icon: CreditCard,
                  path: "/admin/billing",
                  badge: stats.billing.pendingCount > 0 ? `${stats.billing.pendingCount} chờ` : "Billing",
                },
                {
                  label: "System Health",
                  desc: "Monitor hệ thống",
                  gradient: "from-cyan-500 to-blue-500",
                  icon: Activity,
                  path: "/admin/system-health",
                  badge: "System",
                },
                {
                  label: "Feature Toggles",
                  desc: "Bật/tắt tính năng",
                  gradient: "from-emerald-500 to-teal-500",
                  icon: Settings,
                  path: "/admin/feature-toggles",
                  badge: "Config",
                },
              ].map(({ label, desc, gradient, icon: Icon, path, badge }) => (
                <motion.button
                  key={label}
                  onClick={() => navigate(path)}
                  className={`relative p-5 rounded-2xl bg-gradient-to-br ${gradient} hover:shadow-2xl transition-all duration-300 text-white text-left overflow-hidden group`}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="h-8 w-8" />
                      <Badge className="bg-white/20 text-white border-white/30 text-xs">{badge}</Badge>
                    </div>
                    <p className="font-bold text-base leading-tight">{label}</p>
                    <p className="text-xs opacity-80 mt-1">{desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <motion.div {...anim(0.6)}>
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <span>Doanh thu theo tháng</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChartData.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-[var(--text-sub)] text-sm">
                  Chưa có dữ liệu doanh thu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "12px", color: "#E2E8F0" }}
                      formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={3} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan Distribution */}
        <motion.div {...anim(0.65)}>
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                <span>Phân bổ gói dịch vụ</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planPieData.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-[var(--text-sub)] text-sm">
                  Chưa có dữ liệu công ty
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={planPieData} cx="50%" cy="45%" outerRadius={90} dataKey="value" label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {planPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "12px", color: "#E2E8F0" }}
                      formatter={(value: number, name: string) => [`${value} công ty`, name]}
                    />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Attendance Summary (secondary) ── */}
      <motion.div {...anim(0.7)}>
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <Users className="h-5 w-5 text-cyan-400" />
                <span>Điểm danh hôm nay (toàn hệ thống)</span>
              </CardTitle>
              {growthPercentage !== 0 && (
                <div className={`flex items-center text-xs font-semibold ${growthPercentage > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {growthPercentage > 0 ? "+" : ""}{growthPercentage}% so với tuần trước
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Tổng nhân viên", value: kpi.totalEmployees, icon: Users, color: "text-cyan-400", bg: "bg-cyan-400/10" },
                { label: "Có mặt hôm nay", value: kpi.presentToday, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { label: "Đi trễ", value: kpi.lateToday, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
                { label: "Vắng mặt", value: kpi.absentToday, icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`flex items-center space-x-3 p-3 rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color} shrink-0`} />
                  <div>
                    <p className="text-xs text-[var(--text-sub)]">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SuperAdminOverview;
