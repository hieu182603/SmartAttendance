import React from "react";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle, XCircle, TrendingUp, Activity, FileText, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useNavigate } from "react-router-dom";
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

export const DashboardOverview = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl text-[var(--text-main)] flex items-center space-x-3">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Activity className="h-8 w-8 text-[var(--accent-cyan)]" />
          </motion.span>
          <span>Dashboard Admin</span>
        </h1>
        <p className="text-[var(--text-sub)]">Tổng quan hệ thống chấm công</p>
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
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all relative overflow-hidden group">
                {/* Animated background gradient */}
                <motion.div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${kpi.bgColor.replace("/10", "/30")}`}
                  initial={false}
                />

                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-sub)]">{kpi.title}</p>
                      <motion.p
                        className="text-3xl mt-2 text-[var(--text-main)]"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                      >
                        {kpi.value}
                      </motion.p>
                      <motion.div
                        className="flex items-center mt-2 text-xs text-[var(--success)]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>+8.2%</span>
                      </motion.div>
                    </div>
                    <motion.div
                      className={`p-3 rounded-xl ${kpi.bgColor}`}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className={`h-6 w-6 ${kpi.color}`} />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">Xu hướng chấm công tuần này</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={attendanceData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#E2E8F0",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fill="url(#colorPresent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">Phân tích trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#E2E8F0",
                  }}
                />
                <Bar dataKey="present" fill="#10B981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="late" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                <Bar dataKey="absent" fill="#EF4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              onClick={() => navigate("/employee/attendance-analytics")}
              className="p-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity text-white text-center"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-2xl mb-2">
                <BarChart3 className="h-8 w-8 mx-auto" />
              </div>
              <div className="text-sm">Phân tích chấm công</div>
            </motion.button>
            <motion.button
              onClick={() => navigate("/employee/approve-requests")}
              className="p-4 rounded-xl bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors text-[var(--text-main)] text-center border border-[var(--border)]"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-2xl mb-2">
                <FileText className="h-8 w-8 mx-auto text-[var(--accent-cyan)]" />
              </div>
              <div className="text-sm">Phê duyệt yêu cầu</div>
            </motion.button>
            <motion.button
              className="p-4 rounded-xl bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors text-[var(--text-main)] text-center border border-[var(--border)]"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-2xl mb-2">
                <Users className="h-8 w-8 mx-auto text-[var(--primary)]" />
              </div>
              <div className="text-sm">Quản lý User</div>
            </motion.button>
            <motion.button
              className="p-4 rounded-xl bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors text-[var(--text-main)] text-center border border-[var(--border)]"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-2xl mb-2">
                <Clock className="h-8 w-8 mx-auto text-[var(--warning)]" />
              </div>
              <div className="text-sm">Tạo ca làm</div>
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
