import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { Users, Clock, CheckCircle, XCircle, TrendingUp, Activity, FileText, BarChart3, Home, Shield, UserCog, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserRole, type UserRoleType, getRoleName, getRoleColor, getRoleBasePath } from "@/utils/roles";
import { getDashboardStats } from "@/services/dashboardService";
import { toast } from "sonner";
import { Clock as ClockComponent } from "@/components/common/Clock";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WelcomeMessage {
  greeting: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
}


interface KPIData {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
}

interface AttendanceDataPoint {
  date: string;
  present?: number;
  late?: number;
  absent?: number;
  [key: string]: unknown;
}

interface DashboardStats {
  kpi: KPIData;
  attendanceData: AttendanceDataPoint[];
  growthPercentage: number;
}

interface KPICard {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole: UserRoleType = (user?.role as UserRoleType) || UserRole.MANAGER;
  const { t } = useTranslation(['dashboard', 'common']);
  
  // Role-based welcome messages - defined inside component to avoid deep type inference
  const welcomeMsg = useMemo((): WelcomeMessage => {
    switch (userRole) {
      case UserRole.SUPER_ADMIN:
        return {
          greeting: t('dashboard:overview.welcome.superAdmin'),
          subtitle: t('dashboard:overview.subtitle.superAdmin'),
          icon: Shield,
          gradient: "from-purple-500 to-pink-500",
        };
      case UserRole.ADMIN:
        return {
          greeting: t('dashboard:overview.welcome.admin'),
          subtitle: t('dashboard:overview.subtitle.admin'),
          icon: UserCog,
          gradient: "from-red-500 to-orange-500",
        };
      case UserRole.HR_MANAGER:
        return {
          greeting: t('dashboard:overview.welcome.hrManager'),
          subtitle: t('dashboard:overview.subtitle.hrManager'),
          icon: Users,
          gradient: "from-blue-500 to-cyan-500",
        };
      case UserRole.MANAGER:
        return {
          greeting: t('dashboard:overview.welcome.manager'),
          subtitle: t('dashboard:overview.subtitle.manager'),
          icon: Activity,
          gradient: "from-green-500 to-teal-500",
        };
      default:
        return {
          greeting: t('dashboard:overview.welcome.default'),
          subtitle: t('dashboard:overview.subtitle.default'),
          icon: Activity,
          gradient: "from-[var(--primary)] to-[var(--accent-cyan)]",
        };
    }
  }, [userRole, t]);
  
  const WelcomeIcon = welcomeMsg.icon;

  // Track if component has mounted to prevent re-animation
  const [hasMounted, setHasMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats>({
    kpi: {
      totalEmployees: 0,
      presentToday: 0,
      lateToday: 0,
      absentToday: 0,
    },
    attendanceData: [],
    growthPercentage: 0,
  });

  // Hàm fetch stats cho initial load (có loading state)
  const fetchDashboardStatsInitial = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats() as DashboardStats;
      setDashboardData(data);
    } catch (error) {
      console.error("[DashboardOverview] fetch error:", error);
      toast.error(t('dashboard:common.loading'));
      // Set default values on error
      setDashboardData({
        kpi: {
          totalEmployees: 0,
          presentToday: 0,
          lateToday: 0,
          absentToday: 0,
        },
        attendanceData: [],
        growthPercentage: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Hàm fetch stats cho polling (không có loading state để tránh re-render)
  const fetchDashboardStatsSilent = useCallback(async () => {
    try {
      const data = await getDashboardStats() as DashboardStats;
      setDashboardData(data);
    } catch (error) {
      console.error("[DashboardOverview] silent fetch error:", error);
      // Không hiển thị toast khi polling để tránh spam
    }
  }, []);

  // Mark component as mounted after initial render
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Initial load với loading state
  useEffect(() => {
    void fetchDashboardStatsInitial();
  }, [fetchDashboardStatsInitial]);

  // Polling mỗi 60s – không có loading state để tránh re-render
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchDashboardStatsSilent();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchDashboardStatsSilent]);

  // Lắng nghe sự kiện realtime khi attendance được cập nhật
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAttendanceUpdated = ((event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const data = customEvent.detail;

      // Refetch dashboard stats để cập nhật KPI và charts mà không cần F5 (silent update)
      fetchDashboardStatsSilent();
    }) as EventListener;

    window.addEventListener('attendance-updated', handleAttendanceUpdated);

    return () => {
      window.removeEventListener('attendance-updated', handleAttendanceUpdated);
    };
  }, [fetchDashboardStatsSilent]);

  // Get base path based on user role
  const basePath = useMemo(() => getRoleBasePath(userRole), [userRole]);

  // Prepare KPI data from API - đảm bảo luôn có giá trị mặc định
  const kpiData: KPICard[] = [
    {
      title: t('dashboard:overview.kpi.totalEmployees'),
      value: (dashboardData?.kpi?.totalEmployees ?? 0).toString(),
      icon: Users,
      color: "text-[var(--accent-cyan)]",
      bgColor: "bg-[var(--accent-cyan)]/10",
    },
    {
      title: t('dashboard:overview.kpi.presentToday'),
      value: (dashboardData?.kpi?.presentToday ?? 0).toString(),
      icon: CheckCircle,
      color: "text-[var(--success)]",
      bgColor: "bg-[var(--success)]/10",
    },
    {
      title: t('dashboard:overview.kpi.lateToday'),
      value: (dashboardData?.kpi?.lateToday ?? 0).toString(),
      icon: Clock,
      color: "text-[var(--warning)]",
      bgColor: "bg-[var(--warning)]/10",
    },
    {
      title: t('dashboard:overview.kpi.absentToday'),
      value: (dashboardData?.kpi?.absentToday ?? 0).toString(),
      icon: XCircle,
      color: "text-[var(--error)]",
      bgColor: "bg-[var(--error)]/10",
    },
  ];

  const attendanceData = dashboardData?.attendanceData || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
          <p className="text-[var(--text-sub)]">{t('dashboard:common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Welcome Banner with Role-based Customization */}
      <motion.div
        className={`bg-gradient-to-r ${welcomeMsg.gradient} rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl`}
        initial={!hasMounted ? { opacity: 0, y: -20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={!hasMounted ? { duration: 0.6 } : { duration: 0 }}
        key="welcome-banner"
      >
        {/* Animated background elements - reduced opacity */}
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="flex items-center justify-between relative z-10">
          <motion.div
            initial={!hasMounted ? { opacity: 0, x: -20 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={!hasMounted ? { delay: 0.2 } : { duration: 0 }}
            className="flex items-start space-x-4"
          >
            <motion.div
              className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <WelcomeIcon className="h-12 w-12 drop-shadow-lg" />
            </motion.div>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-4xl font-bold drop-shadow-md">{welcomeMsg.greeting}</h1>
              </div>
              <p className="text-lg font-medium drop-shadow-sm">{welcomeMsg.subtitle}</p>
              <p className="text-sm opacity-90 mt-2 drop-shadow-sm">
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </motion.div>

          <div className="hidden md:block">
            <ClockComponent />
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={index}
              initial={!hasMounted ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={!hasMounted ? { delay: index * 0.1 + 0.2 } : { duration: 0 }}
              whileHover={{ y: -8, scale: 1.03 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all duration-300 relative overflow-hidden group shadow-lg hover:shadow-2xl">
                {/* Enhanced animated background gradient */}
                <motion.div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 ${kpi.bgColor.replace("/10", "/30")}`}
                  initial={false}
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                <CardContent className="p-6 relative z-10 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-sub)] font-medium">{kpi.title}</p>
                      <motion.p
                        className="text-4xl mt-2 text-[var(--text-main)] font-bold"
                        initial={!hasMounted ? { scale: 0 } : false}
                        animate={{ scale: 1 }}
                        transition={!hasMounted ? { delay: index * 0.1 + 0.4, type: "spring", stiffness: 200 } : { duration: 0 }}
                      >
                        {kpi.value}
                      </motion.p>
                      {(dashboardData?.growthPercentage ?? 0) !== 0 && (
                        <motion.div
                          className={`flex items-center mt-2 text-xs font-semibold ${
                            (dashboardData?.growthPercentage ?? 0) > 0
                              ? "text-[var(--success)]"
                              : "text-[var(--error)]"
                          }`}
                          initial={!hasMounted ? { opacity: 0, x: -10 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={!hasMounted ? { delay: index * 0.1 + 0.6 } : { duration: 0 }}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>
                            {(dashboardData?.growthPercentage ?? 0) > 0 ? "+" : ""}
                            {dashboardData?.growthPercentage ?? 0}%
                          </span>
                        </motion.div>
                      )}
                    </div>
                    <motion.div
                      className={`p-4 mt-4 rounded-2xl ${kpi.bgColor} shadow-lg`}
                      whileHover={{ rotate: 360, scale: 1.15 }}
                      transition={{ duration: 0.6, type: "spring" }}
                    >
                      <Icon className={`h-7 w-7 ${kpi.color}`} />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Main Admin Actions - Highlighted 3 Pages */}
      <motion.div
        initial={!hasMounted ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={!hasMounted ? { delay: 0.6 } : { duration: 0 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-[var(--accent-cyan)]" />
              <CardTitle className="text-[var(--text-main)] text-xl">
                Chức năng quản trị chính
              </CardTitle>
            </div>
            <p className="text-sm text-[var(--text-sub)] mt-1">
              {t('dashboard:overview.quickAccess')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dashboard Home - Primary */}
              <motion.button
                onClick={() => navigate(basePath)}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--primary)] hover:shadow-2xl transition-all duration-300 text-white text-left overflow-hidden group"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                initial={!hasMounted ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={!hasMounted ? { delay: 0.7 } : { duration: 0 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"
                  animate={{
                    backgroundPosition: ["0% 0%", "100% 100%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Home className="h-10 w-10" />
                    <Badge className="bg-white/20 text-white border-white/30">Trang chính</Badge>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Admin Dashboard</h3>
                  <p className="text-sm opacity-90">{t('dashboard:overview.systemOverview')}</p>
                </div>
              </motion.button>

              {/* Approve Requests - Secondary */}
              <motion.button
                onClick={() => navigate(`${basePath}/approve-requests`)}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-2xl transition-all duration-300 text-white text-left overflow-hidden group"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                initial={!hasMounted ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={!hasMounted ? { delay: 0.8 } : { duration: 0 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <FileText className="h-10 w-10" />
                    <Badge className="bg-white/20 text-white border-white/30">{t('dashboard:overview.management')}</Badge>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Phê duyệt yêu cầu</h3>
                  <p className="text-sm opacity-90">Xử lý đơn nghỉ phép, WFH</p>
                </div>
              </motion.button>

              {/* Attendance Analytics - Secondary */}
              <motion.button
                onClick={() => navigate(`${basePath}/attendance-analytics`)}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 hover:shadow-2xl transition-all duration-300 text-white text-left overflow-hidden group"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                initial={!hasMounted ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={!hasMounted ? { delay: 0.9 } : { duration: 0 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <BarChart3 className="h-10 w-10" />
                    <Badge className="bg-white/20 text-white border-white/30">Phân tích</Badge>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('dashboard:overview.attendanceAnalysis')}</h3>
                  <p className="text-sm opacity-90">Báo cáo và insights chi tiết</p>
                </div>
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <motion.div
          initial={!hasMounted ? { opacity: 0, x: -20 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={!hasMounted ? { delay: 1.0 } : { duration: 0 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent-cyan)]" />
                <span>{t('dashboard:overview.charts.attendanceTrend')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={attendanceData}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#E2E8F0",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="#06B6D4"
                    strokeWidth={3}
                    fill="url(#colorPresent)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div
          initial={!hasMounted ? { opacity: 0, x: 20 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={!hasMounted ? { delay: 1.1 } : { duration: 0 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
                <span>Phân tích trạng thái</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#E2E8F0",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    }}
                  />
                  <Bar dataKey="present" fill="#10B981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="late" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="absent" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Additional Quick Actions */}
      <motion.div
        initial={!hasMounted ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={!hasMounted ? { delay: 1.2 } : { duration: 0 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">Thao tác bổ sung</CardTitle>
            <p className="text-sm text-[var(--text-sub)] mt-1">Các tính năng khác đang phát triển</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.button
                className="p-4 rounded-xl bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors text-[var(--text-main)] text-center border border-[var(--border)] hover:border-[var(--accent-cyan)]"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-2xl mb-2">
                  <Users className="h-8 w-8 mx-auto text-[var(--primary)]" />
                </div>
                <div className="text-sm">{t('dashboard:overview.userManagement')}</div>
                <div className="text-xs text-[var(--text-sub)] mt-1">Sắp ra mắt</div>
              </motion.button>
              <motion.button
                className="p-4 rounded-xl bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors text-[var(--text-main)] text-center border border-[var(--border)] hover:border-[var(--warning)]"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-2xl mb-2">
                  <Clock className="h-8 w-8 mx-auto text-[var(--warning)]" />
                </div>
                <div className="text-sm">Tạo ca làm</div>
                <div className="text-xs text-[var(--text-sub)] mt-1">Sắp ra mắt</div>
              </motion.button>
              <motion.button
                className="p-4 rounded-xl bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors text-[var(--text-main)] text-center border border-[var(--border)] hover:border-[var(--success)]"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-2xl mb-2">
                  <CheckCircle className="h-8 w-8 mx-auto text-[var(--success)]" />
                </div>
                <div className="text-sm">Báo cáo</div>
                <div className="text-xs text-[var(--text-sub)] mt-1">Sắp ra mắt</div>
              </motion.button>
              <motion.button
                className="p-4 rounded-xl bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors text-[var(--text-main)] text-center border border-[var(--border)] hover:border-[var(--error)]"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-2xl mb-2">
                  <Activity className="h-8 w-8 mx-auto text-[var(--error)]" />
                </div>
                <div className="text-sm">Cài đặt</div>
                <div className="text-xs text-[var(--text-sub)] mt-1">Sắp ra mắt</div>
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardOverview;




