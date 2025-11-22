import React from "react";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle, XCircle, TrendingUp, Activity, FileText, BarChart3, Home, Shield, UserCog, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserRole, getRoleName, getRoleColor } from "../../utils/roles";
import {
  LineChart,
  Line,
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

const attendanceData = [
  { date: "T2", present: 45, late: 5, absent: 2 },
  { date: "T3", present: 48, late: 3, absent: 1 },
  { date: "T4", present: 46, late: 4, absent: 2 },
  { date: "T5", present: 49, late: 2, absent: 1 },
  { date: "T6", present: 47, late: 3, absent: 2 },
  { date: "T7", present: 50, late: 1, absent: 1 },
  { date: "CN", present: 0, late: 0, absent: 0 },
];

const kpiData = [
  {
    title: "Tổng nhân viên",
    value: "52",
    icon: Users,
    color: "text-[var(--accent-cyan)]",
    bgColor: "bg-[var(--accent-cyan)]/10",
  },
  {
    title: "Có mặt hôm nay",
    value: "47",
    icon: CheckCircle,
    color: "text-[var(--success)]",
    bgColor: "bg-[var(--success)]/10",
  },
  {
    title: "Đi muộn",
    value: "3",
    icon: Clock,
    color: "text-[var(--warning)]",
    bgColor: "bg-[var(--warning)]/10",
  },
  {
    title: "Vắng mặt",
    value: "2",
    icon: XCircle,
    color: "text-[var(--error)]",
    bgColor: "bg-[var(--error)]/10",
  },
];

// Role-based welcome messages
const getRoleWelcomeMessage = (role) => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return {
        greeting: "Xin chào, Quản trị hệ thống!",
        subtitle: "Toàn quyền quản lý và giám sát hệ thống chấm công",
        icon: Shield,
        gradient: "from-purple-500 to-pink-500",
      };
    case UserRole.ADMIN:
      return {
        greeting: "Xin chào, Quản trị viên!",
        subtitle: "Quản lý toàn bộ hệ thống chấm công và nhân sự",
        icon: UserCog,
        gradient: "from-red-500 to-orange-500",
      };
    case UserRole.HR_MANAGER:
      return {
        greeting: "Xin chào, Trưởng phòng Nhân sự!",
        subtitle: "Quản lý nhân sự, lương bổng và đánh giá hiệu suất",
        icon: Users,
        gradient: "from-blue-500 to-cyan-500",
      };
    case UserRole.MANAGER:
      return {
        greeting: "Xin chào, Quản lý!",
        subtitle: "Quản lý nhóm và theo dõi hiệu suất làm việc",
        icon: Activity,
        gradient: "from-green-500 to-teal-500",
      };
    default:
      return {
        greeting: "Xin chào, Admin!",
        subtitle: "Tổng quan hệ thống chấm công",
        icon: Activity,
        gradient: "from-[var(--primary)] to-[var(--accent-cyan)]",
      };
  }
};

export const DashboardOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || UserRole.MANAGER;
  const roleInfo = getRoleColor(userRole);
  const roleName = getRoleName(userRole);
  const welcomeMsg = getRoleWelcomeMessage(userRole);
  const WelcomeIcon = welcomeMsg.icon;

  const currentTime = new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Enhanced Welcome Banner with Role-based Customization */}
      <motion.div
        className={`bg-gradient-to-r ${welcomeMsg.gradient} rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
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
                <Badge className={`${roleInfo.bg} ${roleInfo.text} border-white/30 font-semibold`}>
                  {roleName}
                </Badge>
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

          <motion.div
            className="text-right hidden md:block"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="text-6xl font-bold mb-2 drop-shadow-lg"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {currentTime}
            </motion.div>
            <div className="flex items-center justify-end space-x-2">
              <Sparkles className="h-5 w-5 drop-shadow-md" />
              <span className="text-lg font-medium drop-shadow-sm">Hệ thống hoạt động tốt</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
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
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.4, type: "spring", stiffness: 200 }}
                      >
                        {kpi.value}
                      </motion.p>
                      <motion.div
                        className="flex items-center mt-2 text-xs font-semibold text-[var(--success)]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.6 }}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>+8.2%</span>
                      </motion.div>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
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
              Truy cập nhanh các tính năng quản lý quan trọng
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dashboard Home - Primary */}
              <motion.button
                onClick={() => navigate("/employee")}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--primary)] hover:shadow-2xl transition-all duration-300 text-white text-left overflow-hidden group"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
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
                  <p className="text-sm opacity-90">Tổng quan và thống kê hệ thống</p>
                </div>
              </motion.button>

              {/* Approve Requests - Secondary */}
              <motion.button
                onClick={() => navigate("/employee/approve-requests")}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-2xl transition-all duration-300 text-white text-left overflow-hidden group"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <FileText className="h-10 w-10" />
                    <Badge className="bg-white/20 text-white border-white/30">Quản lý</Badge>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Phê duyệt yêu cầu</h3>
                  <p className="text-sm opacity-90">Xử lý đơn nghỉ phép, WFH</p>
                </div>
              </motion.button>

              {/* Attendance Analytics - Secondary */}
              <motion.button
                onClick={() => navigate("/employee/attendance-analytics")}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 hover:shadow-2xl transition-all duration-300 text-white text-left overflow-hidden group"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <BarChart3 className="h-10 w-10" />
                    <Badge className="bg-white/20 text-white border-white/30">Phân tích</Badge>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Phân tích chấm công</h3>
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
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent-cyan)]" />
                <span>Xu hướng chấm công tuần này</span>
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
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1 }}
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
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
                <div className="text-sm">Quản lý User</div>
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
